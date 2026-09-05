import { describe, expect, it } from 'vitest';

import {
  cleanupEphemeralAuthFixtures,
  createEphemeralAuthFixtures,
} from '../../scripts/security/lib/ephemeral-auth-fixtures.mjs';

type FakeOptions = {
  failOrganizationNumber?: number;
  ambiguousCommitOrganizationNumber?: number;
  transientOrganizationNumber?: number;
  transientOrganizationReadbacks?: number;
  fetchFailureOrganizationNumber?: number;
  fetchFailureOrganizationReadbacks?: number;
};

function fakeAdmin({
  failOrganizationNumber = 0,
  ambiguousCommitOrganizationNumber = 0,
  transientOrganizationNumber = 0,
  transientOrganizationReadbacks = 0,
  fetchFailureOrganizationNumber = 0,
  fetchFailureOrganizationReadbacks = 0,
}: FakeOptions = {}) {
  const state = {
    users: new Set<string>(),
    organizations: new Set<string>(),
    memberships: new Set<string>(),
    enterpriseContracts: new Map<string, string>(),
    organizationEntitlements: new Map<string, string>(),
  };
  let userCounter = 0;
  let organizationInsertCounter = 0;
  let organizationReadCounter = 0;
  let contractCounter = 0;
  let entitlementCounter = 0;

  const idsForTable = (table: string, column: string, ids: string[]) => {
    if (table === 'organizations' && column === 'id') {
      return ids.filter((id) => state.organizations.has(id)).map((id) => ({ id }));
    }
    if (table === 'organization_members' && column === 'id') {
      return ids.filter((id) => state.memberships.has(id)).map((id) => ({ id }));
    }
    if (table === 'enterprise_contracts' && column === 'organization_id') {
      return [...state.enterpriseContracts.entries()]
        .filter(([, organizationId]) => ids.includes(organizationId))
        .map(([id]) => ({ id }));
    }
    if (table === 'organization_entitlements' && column === 'organization_id') {
      return [...state.organizationEntitlements.values()]
        .filter((organizationId) => ids.includes(organizationId))
        .map((organizationId) => ({ organization_id: organizationId }));
    }
    return [];
  };

  const recordById = (table: string, id: string) => {
    if (table === 'organizations' && state.organizations.has(id)) return { id };
    if (table === 'organization_members' && state.memberships.has(id)) return { id };
    return null;
  };

  const provisionOrganization = (id: string) => {
    if (state.organizations.has(id)) return;
    state.organizations.add(id);

    // Production provisions these records automatically for a new tenant.
    const contractId = `contract-${++contractCounter}`;
    const entitlementId = `entitlement-${++entitlementCounter}`;
    state.enterpriseContracts.set(contractId, id);
    state.organizationEntitlements.set(entitlementId, id);
  };

  const deleteByOrganizationIds = (table: string, ids: string[]) => {
    if (table === 'organization_entitlements') {
      for (const [id, organizationId] of state.organizationEntitlements.entries()) {
        if (ids.includes(organizationId)) state.organizationEntitlements.delete(id);
      }
      return { error: null };
    }
    if (table === 'enterprise_contracts') {
      const blocked = [...state.organizationEntitlements.values()]
        .some((organizationId) => ids.includes(organizationId));
      if (blocked) return { error: { message: 'organization entitlement restricts contract deletion' } };
      for (const [id, organizationId] of state.enterpriseContracts.entries()) {
        if (ids.includes(organizationId)) state.enterpriseContracts.delete(id);
      }
      return { error: null };
    }
    return { error: { message: 'unexpected organization-scoped delete' } };
  };

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
      insert: (row: { id?: string }) => ({
        select: () => ({
          single: async () => {
            const id = String(row.id || '');
            if (!id) return { data: null, error: { message: 'stable id required' }, status: 400 };

            if (table === 'organizations') {
              organizationInsertCounter += 1;
              if (failOrganizationNumber === organizationInsertCounter) {
                return { data: null, error: { message: 'synthetic failure' }, status: 400 };
              }
              if (fetchFailureOrganizationNumber === organizationInsertCounter) {
                return {
                  data: null,
                  error: {
                    message: 'TypeError: fetch failed',
                    details: 'getaddrinfo ENOTFOUND synthetic.supabase.co',
                  },
                  status: 0,
                };
              }
              if (transientOrganizationNumber === organizationInsertCounter) {
                return {
                  data: null,
                  error: { message: 'Internal Server Error' },
                  status: 504,
                };
              }
              if (ambiguousCommitOrganizationNumber === organizationInsertCounter) {
                provisionOrganization(id);
                return {
                  data: null,
                  error: { message: 'Internal Server Error' },
                  status: 504,
                };
              }
              if (state.organizations.has(id)) {
                return { data: null, error: { code: '23505', message: 'duplicate key' }, status: 409 };
              }
              provisionOrganization(id);
              return { data: { id }, error: null, status: 201 };
            }
            if (table === 'organization_members') {
              if (state.memberships.has(id)) {
                return { data: null, error: { code: '23505', message: 'duplicate key' }, status: 409 };
              }
              state.memberships.add(id);
              return { data: { id }, error: null, status: 201 };
            }
            return { data: null, error: { message: 'unexpected table' }, status: 400 };
          },
        }),
      }),
      delete: () => ({
        eq: async (_column: string, id: string) => {
          if (table === 'organizations') {
            const restricted = [...state.enterpriseContracts.values()].includes(id);
            if (restricted) return { error: { message: 'enterprise contract restricts organization deletion' } };
            state.organizations.delete(id);
          }
          if (table === 'organization_members') state.memberships.delete(id);
          return { error: null };
        },
        in: async (_column: string, ids: string[]) => deleteByOrganizationIds(table, ids),
      }),
      select: (columns = '*') => ({
        in: async (column: string, ids: string[]) => {
          if (table === 'organization_entitlements' && columns.split(',').map((value) => value.trim()).includes('id')) {
            return {
              data: null,
              error: { message: 'column organization_entitlements.id does not exist' },
            };
          }
          return {
            data: idsForTable(table, column, ids),
            error: null,
          };
        },
        eq: (_column: string, id: string) => ({
          maybeSingle: async () => {
            if (table === 'organizations') {
              organizationReadCounter += 1;
              if (organizationReadCounter <= fetchFailureOrganizationReadbacks) {
                return {
                  data: null,
                  error: {
                    message: 'TypeError: fetch failed',
                    details: 'socket hang up ECONNRESET',
                  },
                  status: 0,
                };
              }
              if (organizationReadCounter <= fetchFailureOrganizationReadbacks + transientOrganizationReadbacks) {
                return {
                  data: null,
                  error: { message: 'Internal Server Error' },
                  status: 504,
                };
              }
            }
            return {
              data: recordById(table, id),
              error: null,
              status: 200,
            };
          },
        }),
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
    expect(state.enterpriseContracts.size).toBe(2);
    expect(state.organizationEntitlements.size).toBe(2);

    const cleanup = await cleanupEphemeralAuthFixtures(admin, fixtures.created);
    expect(cleanup).toEqual({ verified: true, failures: [] });
    expect(state.users.size).toBe(0);
    expect(state.organizations.size).toBe(0);
    expect(state.memberships.size).toBe(0);
    expect(state.enterpriseContracts.size).toBe(0);
    expect(state.organizationEntitlements.size).toBe(0);
  });

  it('cleans partial setup when the second organization creation fails', async () => {
    const { admin, state } = fakeAdmin({ failOrganizationNumber: 2 });

    await expect(createEphemeralAuthFixtures(admin, { purpose: 'partial-proof' }))
      .rejects.toThrow('ephemeral_organizations_create_failed');

    expect(state.users.size).toBe(0);
    expect(state.organizations.size).toBe(0);
    expect(state.memberships.size).toBe(0);
    expect(state.enterpriseContracts.size).toBe(0);
    expect(state.organizationEntitlements.size).toBe(0);
  });

  it('reconciles a response-level 504 when the organization insert committed', async () => {
    const { admin, state } = fakeAdmin({ ambiguousCommitOrganizationNumber: 1 });

    const fixtures = await createEphemeralAuthFixtures(admin, { purpose: 'ambiguous-commit-proof' });

    expect(fixtures.created.organizations).toHaveLength(2);
    expect(new Set(fixtures.created.organizations).size).toBe(2);
    expect(state.organizations.size).toBe(2);

    const cleanup = await cleanupEphemeralAuthFixtures(admin, fixtures.created);
    expect(cleanup).toEqual({ verified: true, failures: [] });
    expect(state.organizations.size).toBe(0);
  });

  it('retries the same stable organization id after a response-level 504 that did not commit', async () => {
    const { admin, state } = fakeAdmin({ transientOrganizationNumber: 1 });

    const fixtures = await createEphemeralAuthFixtures(admin, { purpose: 'transient-retry-proof' });

    expect(fixtures.created.organizations).toHaveLength(2);
    expect(new Set(fixtures.created.organizations).size).toBe(2);
    expect(state.organizations.size).toBe(2);

    const cleanup = await cleanupEphemeralAuthFixtures(admin, fixtures.created);
    expect(cleanup).toEqual({ verified: true, failures: [] });
    expect(state.organizations.size).toBe(0);
  });

  it('keeps bounded reconciliation alive through transient readbacks and a duplicate retry', async () => {
    const { admin, state } = fakeAdmin({
      ambiguousCommitOrganizationNumber: 1,
      transientOrganizationReadbacks: 2,
    });

    const fixtures = await createEphemeralAuthFixtures(admin, { purpose: 'multi-request-outage-proof' });

    expect(fixtures.created.organizations).toHaveLength(2);
    expect(new Set(fixtures.created.organizations).size).toBe(2);
    expect(state.organizations.size).toBe(2);

    const cleanup = await cleanupEphemeralAuthFixtures(admin, fixtures.created);
    expect(cleanup).toEqual({ verified: true, failures: [] });
    expect(state.organizations.size).toBe(0);
  });

  it('retries the same stable id through status-zero fetch and network failures', async () => {
    const { admin, state } = fakeAdmin({
      fetchFailureOrganizationNumber: 1,
      fetchFailureOrganizationReadbacks: 1,
    });

    const fixtures = await createEphemeralAuthFixtures(admin, { purpose: 'fetch-transport-proof' });

    expect(fixtures.created.organizations).toHaveLength(2);
    expect(new Set(fixtures.created.organizations).size).toBe(2);
    expect(state.organizations.size).toBe(2);

    const cleanup = await cleanupEphemeralAuthFixtures(admin, fixtures.created);
    expect(cleanup).toEqual({ verified: true, failures: [] });
    expect(state.organizations.size).toBe(0);
  });
});