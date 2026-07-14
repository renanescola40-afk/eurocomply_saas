import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  assertCurrentUserCan: vi.fn(),
  createAdminClient: vi.fn(),
  logAuditEvent: vi.fn(),
  reportError: vi.fn(),
  requireCurrentUser: vi.fn(),
  removedMember: { id: 'member-1' } as { id: string } | null,
  deleteEq: vi.fn(),
}));

vi.mock('@/lib/email/client', () => ({
  sendEmail: vi.fn(),
}));

vi.mock('@/lib/observability/report-error', () => ({
  reportError: mocks.reportError,
}));

vi.mock('@/lib/security/rate-limit', () => ({
  checkDistributedRateLimit: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: mocks.createAdminClient,
}));

vi.mock('@/server/actions/audit', () => ({
  logAuditEvent: mocks.logAuditEvent,
}));

vi.mock('@/server/auth/permissions', () => ({
  assertCurrentUserCan: mocks.assertCurrentUserCan,
}));

vi.mock('@/server/queries/auth', () => ({
  requireCurrentUser: mocks.requireCurrentUser,
}));

import { removeOrganizationMember } from './members';

const organizationId = '11111111-1111-4111-8111-111111111111';
const actorUserId = '22222222-2222-4222-8222-222222222222';
const memberId = '33333333-3333-4333-8333-333333333333';
const removedUserId = '44444444-4444-4444-8444-444444444444';

function installSupabaseMock() {
  const lookupChain = {
    select: vi.fn(() => lookupChain),
    eq: vi.fn(() => lookupChain),
    maybeSingle: vi.fn(async () => ({
      data: {
        id: memberId,
        user_id: removedUserId,
        role: 'member',
        organization_id: organizationId,
      },
      error: null,
    })),
  };

  const deleteChain = {
    eq: mocks.deleteEq,
    select: vi.fn(() => deleteChain),
    maybeSingle: vi.fn(async () => ({ data: mocks.removedMember, error: null })),
  };
  mocks.deleteEq.mockImplementation(() => deleteChain);

  mocks.createAdminClient.mockReturnValue({
    from: vi.fn(() => ({
      select: lookupChain.select,
      delete: vi.fn(() => deleteChain),
    })),
  });
}

describe('member removal state transition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.removedMember = { id: memberId };
    mocks.requireCurrentUser.mockResolvedValue({ id: actorUserId });
    mocks.assertCurrentUserCan.mockResolvedValue(undefined);
    mocks.logAuditEvent.mockResolvedValue(undefined);
    installSupabaseMock();
  });

  it('records success only after the tenant-scoped delete returns the affected member', async () => {
    await removeOrganizationMember({ organizationId, memberId });

    expect(mocks.assertCurrentUserCan).toHaveBeenCalledWith(organizationId, actorUserId, 'team:remove');
    expect(mocks.deleteEq).toHaveBeenNthCalledWith(1, 'id', memberId);
    expect(mocks.deleteEq).toHaveBeenNthCalledWith(2, 'organization_id', organizationId);
    expect(mocks.logAuditEvent).toHaveBeenCalledWith({
      organizationId,
      actorUserId,
      action: 'team.member_removed',
      entityType: 'organization_member',
      entityId: memberId,
      metadata: { removedUserId, role: 'member' },
    });
  });

  it('rejects a stale concurrent removal and does not write false success evidence', async () => {
    mocks.removedMember = null;

    await expect(removeOrganizationMember({ organizationId, memberId })).rejects.toThrow(
      'Member state changed before removal completed',
    );

    expect(mocks.logAuditEvent).not.toHaveBeenCalled();
  });
});
