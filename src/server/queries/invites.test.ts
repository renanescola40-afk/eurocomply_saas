import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createAdminClient: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: mocks.createAdminClient,
}));

import {
  createOrganizationInvite,
  restoreOrganizationInvite,
} from './invites';

function installClient(input: { outcome?: string; error?: { code: string } | null } = {}) {
  const outcome = input.outcome ?? 'created';
  const rpc = vi.fn(async () => ({
    data: input.error
      ? null
      : [
          {
            outcome,
            invitation_id: outcome === 'created' ? 'invite_1' : null,
            organization_id: 'org_a',
            email: 'new.user@example.test',
            applied_role: 'editor',
            applied_seat_type: 'participant',
            expires_at: '2026-07-23T18:00:00.000Z',
            created_at: '2026-07-16T18:00:00.000Z',
          },
        ],
    error: input.error ?? null,
  }));
  const maybeSingle = vi.fn(async () => ({ data: { name: 'Acme Corp' }, error: null }));
  const builder = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle,
  };
  builder.select.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  const from = vi.fn(() => builder);
  mocks.createAdminClient.mockReturnValue({ rpc, from });
  return { rpc, from };
}

function installRestoreClient(error: { code?: string | null } | null = null) {
  const insert = vi.fn(async () => ({ error }));
  const from = vi.fn(() => ({ insert }));
  mocks.createAdminClient.mockReturnValue({ from });
  return { from, insert };
}

const invitationSnapshot = {
  id: 'invite_1',
  organization_id: 'org_a',
  email: 'new.user@example.test',
  role: 'editor',
  seat_type: 'participant',
  token: 'original-token',
  invited_by: 'user_admin',
  accepted_at: null,
  revoked_at: null,
  expires_at: '2026-07-23T18:00:00.000Z',
  created_at: '2026-07-16T18:00:00.000Z',
};

describe('organization invitation persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates the invitation and reserves its seat through one tenant-serialized RPC', async () => {
    const { rpc, from } = installClient();

    const result = await createOrganizationInvite({
      organizationId: 'org_a',
      invitedBy: 'user_admin',
      email: ' NEW.USER@EXAMPLE.TEST ',
      role: 'Editor',
      seatType: 'participant',
    });

    expect(rpc).toHaveBeenCalledWith(
      'create_billing_organization_invitation_atomic',
      expect.objectContaining({
        p_organization_id: 'org_a',
        p_invited_by: 'user_admin',
        p_email: 'new.user@example.test',
        p_role: 'editor',
        p_seat_type: 'participant',
        p_token: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    );
    expect(from).toHaveBeenCalledWith('organizations');
    expect(result).toMatchObject({
      persisted: true,
      organizationName: 'Acme Corp',
      invite: {
        id: 'invite_1',
        email: 'new.user@example.test',
        role: 'editor',
        seat_type: 'participant',
        status: 'pending',
      },
    });
    expect(result.token).toMatch(/^[a-f0-9]{64}$/);
    expect(result.tokenFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(result.tokenFingerprint).not.toBe(result.token);
  });

  it('keeps a compatible safe default seat type for older callers', async () => {
    const { rpc } = installClient();

    await createOrganizationInvite({
      organizationId: 'org_a',
      invitedBy: 'user_admin',
      email: 'new.user@example.test',
      role: 'Visualizador',
    });

    expect(rpc).toHaveBeenCalledWith(
      'create_billing_organization_invitation_atomic',
      expect.objectContaining({ p_seat_type: 'viewer' }),
    );
  });

  it('surfaces quota outcomes without exposing provider details', async () => {
    installClient({ outcome: 'seat_limit_reached' });

    await expect(
      createOrganizationInvite({
        organizationId: 'org_a',
        invitedBy: 'user_admin',
        email: 'new.user@example.test',
        role: 'Editor',
      }),
    ).rejects.toMatchObject({
      name: 'OrganizationInviteError',
      code: 'seat_limit_reached',
    });
  });

  it('fails closed when the canonical invitation cannot be persisted', async () => {
    installClient({ error: { code: 'provider_failure' } });

    await expect(
      createOrganizationInvite({
        organizationId: 'org_a',
        invitedBy: 'user_admin',
        email: 'new.user@example.test',
        role: 'Visualizador',
      }),
    ).rejects.toMatchObject({
      name: 'OrganizationInviteError',
      code: 'invitation_persistence_unavailable',
    });
  });

  it('restores every original field for the exact tenant-scoped pending invitation', async () => {
    const { from, insert } = installRestoreClient();

    const result = await restoreOrganizationInvite({
      organizationId: 'org_a',
      invitationId: 'invite_1',
      invitation: invitationSnapshot,
    });

    expect(from).toHaveBeenCalledWith('invitations');
    expect(insert).toHaveBeenCalledWith(invitationSnapshot);
    expect(result).toEqual({ restored: true, providerCode: null });
  });
});
