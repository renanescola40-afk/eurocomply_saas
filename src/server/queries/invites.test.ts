import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createAdminClient: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: mocks.createAdminClient,
}));

import { createOrganizationInvite, restoreOrganizationInvite } from './invites';

function installClient(error: { code: string } | null = null) {
  const upsert = vi.fn();
  const builder = {
    upsert,
    select: vi.fn(),
    single: vi.fn(async () => ({
      data: error
        ? null
        : {
            id: 'invite_1',
            email: 'new.user@example.test',
            role: 'editor',
            expires_at: '2026-07-23T18:00:00.000Z',
            created_at: '2026-07-16T18:00:00.000Z',
            organizations: { name: 'Acme Corp' },
          },
      error,
    })),
  };
  upsert.mockReturnValue(builder);
  builder.select.mockReturnValue(builder);
  const from = vi.fn(() => builder);
  mocks.createAdminClient.mockReturnValue({ from });
  return { from, upsert };
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
  token: 'original-token',
  invited_by: 'user_admin',
  accepted_at: null,
  expires_at: '2026-07-23T18:00:00.000Z',
  created_at: '2026-07-16T18:00:00.000Z',
};

describe('organization invitation persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a refreshable invitation in the same table consumed by acceptance', async () => {
    const { from, upsert } = installClient();

    const result = await createOrganizationInvite({
      organizationId: 'org_a',
      invitedBy: 'user_admin',
      email: ' NEW.USER@EXAMPLE.TEST ',
      role: 'Editor',
    });

    expect(from).toHaveBeenCalledWith('invitations');
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        organization_id: 'org_a',
        invited_by: 'user_admin',
        email: 'new.user@example.test',
        role: 'editor',
        accepted_at: null,
        token: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
      { onConflict: 'organization_id,email' },
    );
    expect(result).toMatchObject({
      persisted: true,
      organizationName: 'Acme Corp',
      invite: { id: 'invite_1', email: 'new.user@example.test', role: 'editor', status: 'pending' },
    });
    expect(result.token).toMatch(/^[a-f0-9]{64}$/);
    expect(result.tokenFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(result.tokenFingerprint).not.toBe(result.token);
  });

  it('fails closed when the canonical invitation cannot be persisted', async () => {
    installClient({ code: 'provider_failure' });

    await expect(
      createOrganizationInvite({
        organizationId: 'org_a',
        invitedBy: 'user_admin',
        email: 'new.user@example.test',
        role: 'Visualizador',
      }),
    ).rejects.toThrow('Unable to persist organization invitation.');
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

  it('refuses a mismatched or accepted compensation snapshot before using the privileged client', async () => {
    await expect(
      restoreOrganizationInvite({
        organizationId: 'org_b',
        invitationId: 'invite_1',
        invitation: invitationSnapshot,
      }),
    ).resolves.toEqual({ restored: false, providerCode: 'invalid_snapshot' });

    await expect(
      restoreOrganizationInvite({
        organizationId: 'org_a',
        invitationId: 'invite_1',
        invitation: { ...invitationSnapshot, accepted_at: '2026-07-19T13:00:00.000Z' },
      }),
    ).resolves.toEqual({ restored: false, providerCode: 'invalid_snapshot' });

    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it('returns only a sanitized provider code when exact restoration fails', async () => {
    installRestoreClient({ code: '23505' });

    await expect(
      restoreOrganizationInvite({
        organizationId: 'org_a',
        invitationId: 'invite_1',
        invitation: invitationSnapshot,
      }),
    ).resolves.toEqual({ restored: false, providerCode: '23505' });
  });
});
