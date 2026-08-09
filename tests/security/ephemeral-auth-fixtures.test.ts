import { describe, expect, it } from 'vitest';

import {
  cleanupEphemeralAuthFixtures,
  createEphemeralAuthFixtures,
} from '../../scripts/security/lib/ephemeral-auth-fixtures.mjs';

function fakeAdmin({ failOrganizationNumber = 0 } = {}) {
  const state = {
    users: new Set<string>(),
    organizations: new Set<string>(),
    memberships: new Set<string>(),
  };
  let userCounter = 0;
  let organizationCounter = 0;
  let membershipCounter = 0;

  const admin = {
    auth: {
      admin: {
        createUser: async () => {
          const id = `user-${++userCounter}`;
          state.users.add(id);
          return { data: { user: { id } }, error: null };
        },
        deleteUser: async (id: string) => {
          state.users.delete(id);
          return { error: null };
        },
        getUserById: async (id: string) => state.users.has(id)
          ? { data: { user: { id } }, error: null }
          : { data: { user: null }, error: { status: 404, message: 'User not found' } },
      },
    },
    from: (table: string) => ({
      insert: (_row: unknown) => ({
        select: () => ({
          single: async () => {
            if (table === 'organizations') {
              organizationCounter += 1;
              if (failOrganizationNumber === organizationCounter) {
                return { data: null, error: { message: 'synthetic failure' } };
              }
              const id = `org-${organizationCounter}`;
              state.organizations.add(id);
              return { data: { id }, error: null };
            }
            if (table === 'organization_members') {
              const id = `membership-${++membershipCounter}`;
              state.memberships.add(id);
              return { data: { id }, error: null };
            }
            return { data: null, error: { message: 'unexpected table' } };
          },
        }),
      }),
      delete: () => ({
        eq: async (_column: string, id: string) => {
          if (table === 'organizations') state.organizations.delete(id);
          if (table === 'organization_members') state.memberships.delete(id);
          return { error: null };
        },
      }),
      select: () => ({
        in: async (_column: string, ids: string[]) => {
          const source = table === 'organizations' ? state.organizations : state.memberships;
          return {
            data: ids.filter((id) => source.has(id)).map((id) => ({ id })),
            error: null,
          };
        },
      }),
    }),
  };

  return { admin, state };
}

describe('ephemeral Supabase Auth fixture lifecycle', () => {
  it('creates a complete isolated identity/tenant fixture and verifies cleanup', async () => {
    const { admin, state } = fakeAdmin();
    const fixtures = await createEphemeralAuthFixtures(admin, { purpose: 'unit-proof' });

    expect(fixtures.created.users).toHaveLength(3);
    expect(fixtures.created.organizations).toHaveLength(2);
    expect(fixtures.created.memberships).toHaveLength(3);
    expect(state.users.size).toBe(3);
    expect(state.organizations.size).toBe(2);
    expect(state.memberships.size).toBe(3);

    const cleanup = await cleanupEphemeralAuthFixtures(admin, fixtures.created);
    expect(cleanup).toEqual({ verified: true, failures: [] });
    expect(state.users.size).toBe(0);
    expect(state.organizations.size).toBe(0);
    expect(state.memberships.size).toBe(0);
  });

  it('cleans partial setup when the second organization creation fails', async () => {
    const { admin, state } = fakeAdmin({ failOrganizationNumber: 2 });

    await expect(createEphemeralAuthFixtures(admin, { purpose: 'partial-proof' }))
      .rejects.toThrow('ephemeral_organizations_create_failed');

    expect(state.users.size).toBe(0);
    expect(state.organizations.size).toBe(0);
    expect(state.memberships.size).toBe(0);
  });
});
