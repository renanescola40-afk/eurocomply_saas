import { beforeEach, describe, expect, it, vi } from 'vitest';

// Exercises the real server membership boundary with a mocked provider result.
// These are deterministic source regression tests, NOT authenticated QA evidence.
const state = vi.hoisted(() => ({
  row: null as null | { organization_id: string; role: string | null; status: string | null },
  error: null as null | { code: string },
  eqCalls: [] as Array<[string, string]>,
  selects: [] as string[],
  providerCalls: 0,
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => {
    state.providerCalls += 1;
    const query = {
      select: (columns: string) => {
        state.selects.push(columns);
        return query;
      },
      eq: (field: string, value: string) => {
        state.eqCalls.push([field, value]);
        return query;
      },
      maybeSingle: async () => ({ data: state.row, error: state.error }),
    };
    return { from: (table: string) => {
      if (table !== 'organization_members') throw new Error('unexpected_table');
      return query;
    } };
  },
}));

import { getOrganizationMembership } from './rbac';

const userId = '11111111-1111-4111-8111-111111111111';
const organizationId = '22222222-2222-4222-8222-222222222222';

describe('SEC-02 canonical membership read is fail-closed', () => {
  beforeEach(() => {
    state.row = { organization_id: organizationId, role: 'member', status: 'active' };
    state.error = null;
    state.eqCalls = [];
    state.selects = [];
    state.providerCalls = 0;
  });

  it('preserves a valid active member while scoping the provider lookup to user and tenant', async () => {
    const result = await getOrganizationMembership(userId, organizationId);
    expect(result.error).toBeNull();
    expect(result.membership).toEqual(state.row);
    expect(state.eqCalls).toEqual([
      ['organization_id', organizationId],
      ['user_id', userId],
    ]);
    expect(state.selects).toEqual(['organization_id, role, status']);
  });

  it('denies active membership rows containing an unrecognized role', async () => {
    for (const rawRole of ['superuser', 'org:unknown', '', null]) {
      state.row = { organization_id: organizationId, role: rawRole, status: 'active' };
      const result = await getOrganizationMembership(userId, organizationId);
      expect(result.membership).toBeNull();
      expect(result.error).toBeNull();
    }
  });

  it('does not reinstate suspended, deprovisioned or status-less memberships', async () => {
    for (const status of ['suspended', 'deprovisioned', null]) {
      state.row = { organization_id: organizationId, role: 'admin', status };
      expect((await getOrganizationMembership(userId, organizationId)).membership).toBeNull();
    }
  });

  it('preserves a recognized compatibility role alias', async () => {
    state.row = { organization_id: organizationId, role: 'administrador', status: 'active' };
    expect((await getOrganizationMembership(userId, organizationId)).membership).toEqual(state.row);
  });

  it('fails closed and propagates provider errors without trusting a partial row', async () => {
    state.error = { code: 'PGRST_FAULT' };
    const result = await getOrganizationMembership(userId, organizationId);
    expect(result.membership).toBeNull();
    expect(result.error).toEqual({ code: 'PGRST_FAULT' });
  });

  it('does not contact the provider for malformed or absent user identity', async () => {
    const result = await getOrganizationMembership('not-a-supabase-uuid', organizationId);
    expect(result.membership).toBeNull();
    expect(result.error).toBeNull();
    expect(state.providerCalls).toBe(0);
  });
});
