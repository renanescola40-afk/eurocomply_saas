import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createAdminClient: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: mocks.createAdminClient,
}));

import { createOrganizationInvite } from './invites';

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
});
