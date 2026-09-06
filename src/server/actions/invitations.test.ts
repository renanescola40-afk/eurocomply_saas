import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireCurrentUser: vi.fn(),
  enforceServerActionRateLimit: vi.fn(),
  rpc: vi.fn(),
  logAuditEvent: vi.fn(),
  reportError: vi.fn(),
}));

vi.mock('@/server/queries/auth', () => ({ requireCurrentUser: mocks.requireCurrentUser }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => ({ rpc: mocks.rpc }) }));
vi.mock('@/lib/observability/report-error', () => ({ reportError: mocks.reportError }));
vi.mock('@/server/security/server-action-rate-limit', () => ({
  enforceServerActionRateLimit: mocks.enforceServerActionRateLimit,
}));
vi.mock('./audit', () => ({ logAuditEvent: mocks.logAuditEvent }));

import { acceptInvitation } from './invitations';

const token = 'invitation-token-at-least-24-characters';

describe('acceptInvitation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCurrentUser.mockResolvedValue({ id: 'user-1', email: ' Member@Example.com ' });
    mocks.enforceServerActionRateLimit.mockResolvedValue({ allowed: true });
    mocks.rpc.mockResolvedValue({
      data: [{
        outcome: 'accepted',
        invitation_id: 'invite-1',
        organization_id: 'org-1',
        membership_id: 'membership-1',
        applied_role: 'member',
      }],
      error: null,
    });
  });

  it('passes server-derived identity to the atomic RPC and records the accepted membership', async () => {
    const result = await acceptInvitation({ token });

    expect(mocks.rpc).toHaveBeenCalledWith('accept_billing_organization_invitation_atomic', {
      p_token: token,
      p_user_id: 'user-1',
      p_email: 'member@example.com',
    });
    expect(mocks.enforceServerActionRateLimit).toHaveBeenCalledWith({
      key: 'team.invitation_accept:user-1',
      policy: 'team-management',
      userId: 'user-1',
      route: 'server-action:acceptInvitation',
      action: 'team.invitation_accept',
      limit: 5,
      windowMs: 600000,
      failureMode: 'fail-closed',
      rateLimitedMessage: 'Too many invitation acceptance attempts. Please try again later.',
      unavailableMessage: 'Invitation security is temporarily unavailable. Please try again later.',
    });
    expect(mocks.logAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: 'org-1',
      entityId: 'membership-1',
      action: 'member.invitation_accepted',
    }));
    expect(result).toMatchObject({ id: 'membership-1', organization_id: 'org-1', role: 'member' });
  });

  it('blocks before the RPC and never includes the invitation token in the limiter input', async () => {
    mocks.enforceServerActionRateLimit.mockRejectedValue(new Error('rate limited'));

    await expect(acceptInvitation({ token })).rejects.toThrow('rate limited');

    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(JSON.stringify(mocks.enforceServerActionRateLimit.mock.calls)).not.toContain(token);
    expect(mocks.logAuditEvent).not.toHaveBeenCalled();
  });

  it.each([
    ['not_found', 'Invitation not found or already accepted.'],
    ['already_accepted', 'Invitation not found or already accepted.'],
    ['email_mismatch', 'This invitation belongs to another email address.'],
    ['expired', 'Invitation has expired.'],
    ['invalid_role', 'Unable to accept invitation.'],
  ])('maps %s without writing an audit event', async (outcome, message) => {
    mocks.rpc.mockResolvedValue({ data: [{ outcome }], error: null });

    await expect(acceptInvitation({ token })).rejects.toThrow(message);
    expect(mocks.logAuditEvent).not.toHaveBeenCalled();
  });

  it('fails closed and reports provider errors', async () => {
    const providerError = { code: 'PGRST500' };
    mocks.rpc.mockResolvedValue({ data: null, error: providerError });

    await expect(acceptInvitation({ token })).rejects.toThrow('Unable to accept invitation.');
    expect(mocks.reportError).toHaveBeenCalledWith(providerError, expect.objectContaining({ area: 'invitation_accept' }));
    expect(mocks.logAuditEvent).not.toHaveBeenCalled();
  });
});
