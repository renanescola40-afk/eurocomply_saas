import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  assertCurrentUserCan: vi.fn(),
  createAdminClient: vi.fn(),
  logAuditEvent: vi.fn(),
  reportError: vi.fn(),
  requireCurrentUser: vi.fn(),
  removalOutcome: 'removed' as 'removed' | 'last_owner' | 'state_changed' | 'not_found' | 'invalid_input',
  rpcError: null as Error | null,
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

  const rpc = vi.fn(async () => ({
    data: [
      {
        outcome: mocks.removalOutcome,
        affected_member_id: memberId,
        affected_user_id: removedUserId,
        previous_role: 'member',
      },
    ],
    error: mocks.rpcError,
  }));

  mocks.createAdminClient.mockReturnValue({
    from: vi.fn((table: string) => {
      if (table !== 'organization_members') throw new Error(`Unexpected table ${table}`);
      return {
        select: lookupChain.select,
      };
    }),
    rpc,
  });

  return { rpc };
}

describe('member removal state transition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.removalOutcome = 'removed';
    mocks.rpcError = null;
    mocks.requireCurrentUser.mockResolvedValue({ id: actorUserId });
    mocks.assertCurrentUserCan.mockResolvedValue(undefined);
    mocks.logAuditEvent.mockResolvedValue(undefined);
    installSupabaseMock();
  });

  it('delegates removal to the atomic RPC with the expected member state', async () => {
    const { rpc } = installSupabaseMock();

    await removeOrganizationMember({ organizationId, memberId });

    expect(mocks.assertCurrentUserCan).toHaveBeenCalledWith(organizationId, actorUserId, 'team:remove');
    expect(rpc).toHaveBeenCalledWith('remove_organization_member_atomic', {
      p_organization_id: organizationId,
      p_member_id: memberId,
      p_expected_user_id: removedUserId,
      p_expected_role: 'member',
    });
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
    mocks.removalOutcome = 'state_changed';

    await expect(removeOrganizationMember({ organizationId, memberId })).rejects.toThrow(
      'Member state changed before removal completed',
    );

    expect(mocks.logAuditEvent).not.toHaveBeenCalled();
  });

  it('blocks atomic removal of the final owner without success audit evidence', async () => {
    mocks.removalOutcome = 'last_owner';

    await expect(removeOrganizationMember({ organizationId, memberId })).rejects.toThrow(
      'Cannot remove the last organization owner',
    );

    expect(mocks.logAuditEvent).not.toHaveBeenCalled();
  });

  it('sanitizes provider errors and reports the internal failure', async () => {
    mocks.rpcError = new Error('provider detail');

    await expect(removeOrganizationMember({ organizationId, memberId })).rejects.toThrow('Unable to remove member.');

    expect(mocks.reportError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'provider detail' }),
      expect.objectContaining({ area: 'team_remove_member', organizationId, memberId }),
    );
    expect(mocks.logAuditEvent).not.toHaveBeenCalled();
  });
});
