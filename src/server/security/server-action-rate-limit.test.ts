import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  checkDistributedRateLimit: vi.fn(),
  logAuditEvent: vi.fn(),
  reportError: vi.fn(),
}));

vi.mock('@/lib/security/rate-limit', () => ({
  checkDistributedRateLimit: mocks.checkDistributedRateLimit,
}));

vi.mock('@/server/actions/audit', () => ({
  logAuditEvent: mocks.logAuditEvent,
}));

vi.mock('@/lib/observability/report-error', () => ({
  reportError: mocks.reportError,
}));

import { enforceServerActionRateLimit, ServerActionRateLimitError } from './server-action-rate-limit';

const baseResult = {
  allowed: false,
  limit: 5,
  remaining: 0,
  resetAt: Date.now() + 60_000,
  retryAfterSeconds: 60,
  category: 'team' as const,
  policy: 'team-management' as const,
  highRisk: true,
  failureMode: 'fail-closed' as const,
  audit: true,
  key: 'opaque-internal-key',
  userId: 'user-1',
  organizationId: null,
  route: 'server-action:acceptInvitation',
  action: 'team.invitation_accept',
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.logAuditEvent.mockResolvedValue({ persisted: true });
});

describe('server action rate-limit enforcement', () => {
  it('returns an allowed result without writing a block audit', async () => {
    mocks.checkDistributedRateLimit.mockResolvedValue({ ...baseResult, allowed: true, audit: false });

    await expect(enforceServerActionRateLimit({ policy: 'team-management' })).resolves.toMatchObject({
      allowed: true,
    });
    expect(mocks.logAuditEvent).not.toHaveBeenCalled();
  });

  it('audits abuse without leaking the resolved key and throws a rate-limited error', async () => {
    mocks.checkDistributedRateLimit.mockResolvedValue(baseResult);

    await expect(
      enforceServerActionRateLimit({
        policy: 'team-management',
        rateLimitedMessage: 'Too many invitation acceptance attempts.',
      }),
    ).rejects.toMatchObject({
      code: 'rate_limited',
      message: 'Too many invitation acceptance attempts.',
      retryAfterSeconds: 60,
    });

    expect(mocks.logAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: null,
      actorUserId: 'user-1',
      action: 'high_risk_rate_limit_blocked',
      metadata: expect.not.objectContaining({ key: expect.anything() }),
    }));
  });

  it('distinguishes fail-closed backend unavailability from client abuse', async () => {
    mocks.checkDistributedRateLimit.mockResolvedValue({ ...baseResult, reason: 'redis_unavailable' });

    const promise = enforceServerActionRateLimit({
      policy: 'team-management',
      unavailableMessage: 'Invitation security is temporarily unavailable.',
    });

    await expect(promise).rejects.toBeInstanceOf(ServerActionRateLimitError);
    await expect(promise).rejects.toMatchObject({
      code: 'security_control_unavailable',
      message: 'Invitation security is temporarily unavailable.',
    });
  });

  it('keeps the mutation blocked when the block audit cannot be persisted', async () => {
    mocks.checkDistributedRateLimit.mockResolvedValue(baseResult);
    mocks.logAuditEvent.mockResolvedValue({ persisted: false });

    await expect(enforceServerActionRateLimit({ policy: 'team-management' })).rejects.toMatchObject({
      code: 'rate_limited',
    });
    expect(mocks.reportError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ area: 'server_action_rate_limit_audit' }),
    );
  });
});
