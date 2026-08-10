import { describe, expect, it } from 'vitest';

import {
  cleanupEphemeralMfaUser,
  createEphemeralMfaUser,
} from '../../scripts/security/lib/ephemeral-mfa-fixture.mjs';

function fakeAdmin() {
  const state = { userId: null as string | null, hardDeleteObserved: false };
  return {
    state,
    admin: {
      auth: {
        admin: {
          createUser: async () => {
            state.userId = 'user-1';
            return { data: { user: { id: 'user-1' } }, error: null };
          },
          deleteUser: async (id: string, softDelete?: boolean) => {
            state.hardDeleteObserved = id === state.userId && softDelete !== true;
            if (state.hardDeleteObserved) state.userId = null;
            return { error: null };
          },
          getUserById: async (id: string) => state.userId === id
            ? { data: { user: { id } }, error: null }
            : { data: { user: null }, error: { status: 404, message: 'User not found' } },
        },
      },
    },
  };
}

describe('ephemeral MFA fixture lifecycle', () => {
  it('creates a disposable confirmed user and verifies hard-delete cleanup', async () => {
    const { admin, state } = fakeAdmin();
    const fixture = await createEphemeralMfaUser(admin, { purpose: 'unit-mfa-proof' });

    expect(fixture.id).toBe('user-1');
    expect(fixture.email).toContain('unit-mfa-proof-');
    expect(fixture.password.length).toBeGreaterThan(20);

    const cleanup = await cleanupEphemeralMfaUser(admin, fixture.id);
    expect(cleanup).toEqual({ verified: true, failure: null });
    expect(state.hardDeleteObserved).toBe(true);
    expect(state.userId).toBeNull();
  });

  it('fails closed when the provider still exposes the user after deletion', async () => {
    const { admin } = fakeAdmin();
    const fixture = await createEphemeralMfaUser(admin);
    admin.auth.admin.deleteUser = async () => ({ error: null });

    await expect(cleanupEphemeralMfaUser(admin, fixture.id)).resolves.toEqual({
      verified: false,
      failure: 'ephemeral_mfa_user_cleanup_not_verified',
    });
  });
});
