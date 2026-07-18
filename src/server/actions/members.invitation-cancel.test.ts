import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  assertCurrentUserCan: vi.fn(),
  checkDistributedRateLimit: vi.fn(),
  createAdminClient: vi.fn(),
  logAuditEvent: vi.fn(),
  reportError: vi.fn(),
  requireCurrentUser: vi.fn(),
  cancelledInvitation: { id: 'invite-1' } as { id: string } | null,
  deleteEq: vi.fn(),
  deleteIs: vi.fn(),
  deleteSelect: vi.fn(),
}));

vi.mock('@/lib/email/client', () => ({ sendEmail: vi.fn() }));
vi.mock('@/lib/observability/report-error', () => ({ reportError: mocks.reportError }));
vi.mock('@/lib/security/rate-limit', () => ({
  checkDistributedRateLimit: mocks.checkDistributedRateLimit,
}));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: mocks.createAdminClient }));
vi.mock('@/server/actions/audit', () => ({ logAuditEvent: mocks.logAuditEvent }));
vi.mock('@/server/auth/permissions', () => ({ assertCurrentUserCan: mocks.assertCurrentUserCan }));
vi.mock('@/server/queries/auth', () => ({ requireCurrentUser: mocks.requireCurrentUser }));

import { cancelOrganizationInvitation } from './members';

const organizationId = '11111111-1111-4111-8111-111111111111';
const actorUserId = '22222222-2222-4222-8222-222222222222';
const invitationId = '33333333-3333-4333-8333-333333333333';

function installSupabaseMock() {
  const lookupChain = {
    select: vi.fn(() => lookupChain),
    eq: vi.fn(() => lookupChain),
    maybeSingle: vi.fn(async () => ({
      data: {
        id: invitationId,
        email: 'member@example.com',
        role: 'member',
        organization_id: organizationId,
        accepted_at: null,
      },
      error: null,
    })),
  };

  const deleteChain = {
    eq: mocks.deleteEq,
    is: mocks.deleteIs,
    select: mocks.deleteSelect,
    maybeSingle: vi.fn(async () => ({ data: mocks.cancelledInvitation, error: null })),
  };
  mocks.deleteEq.mockImplementation(() => deleteChain);
  mocks.deleteIs.mockImplementation(() => deleteChain);
  mocks.deleteSelect.mockImplementation(() => deleteChain);

  mocks.createAdminClient.mockReturnValue({
    from: vi.fn(() => ({
      select: lookupChain.select,
      delete: vi.fn(() => deleteChain),
    })),
  });
}

describe('server-action invitation cancellation state transition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.cancelledInvitation = { id: invitationId };
    mocks.requireCurrentUser.mockResolvedValue({ id: actorUserId });
    mocks.assertCurrentUserCan.mockResolvedValue(undefined);
    mocks.checkDistributedRateLimit.mockResolvedValue({ allowed: true });
    mocks.logAuditEvent.mockResolvedValue(undefined);
    installSupabaseMock();
  });

  it('records success only after the tenant-scoped conditional delete returns the affected invitation', async () => {
    await cancelOrganizationInvitation({ organizationId, invitationId });

    expect(mocks.assertCurrentUserCan).toHaveBeenCalledWith(organizationId, actorUserId, 'team:remove');
    expect(mocks.checkDistributedRateLimit).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId,
        userId: actorUserId,
        policy: 'team-management',
        failureMode: 'fail-closed',
      }),
    );
    expect(mocks.deleteEq).toHaveBeenNthCalledWith(1, 'id', invitationId);
    expect(mocks.deleteEq).toHaveBeenNthCalledWith(2, 'organization_id', organizationId);
    expect(mocks.deleteIs).toHaveBeenCalledWith('accepted_at', null);
    expect(mocks.deleteSelect).toHaveBeenCalledWith('id');
    expect(mocks.logAuditEvent).toHaveBeenCalledWith({
      organizationId,
      actorUserId,
      action: 'team.invite_cancelled',
      entityType: 'invitation',
      entityId: invitationId,
      metadata: { email: 'member@example.com', role: 'member' },
    });
  });

  it('rejects a stale concurrent cancellation and does not write false success evidence', async () => {
    mocks.cancelledInvitation = null;

    await expect(cancelOrganizationInvitation({ organizationId, invitationId })).rejects.toThrow(
      'Invitation state changed before cancellation completed',
    );

    expect(mocks.logAuditEvent).not.toHaveBeenCalled();
  });
});