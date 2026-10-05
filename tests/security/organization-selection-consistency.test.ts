import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ rows: [] as unknown[], error: null as { code: string } | null }));
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => {
    const query = {
      select: () => query,
      eq: () => query,
      order: () => query,
      range: async () => ({ data: state.rows, error: state.error }),
    };
    return { from: () => query };
  },
}));
vi.mock('@/server/security/enterprise-sso-access', () => ({
  enforceMandatoryEnterpriseSsoAccess: async (memberships: unknown[]) => memberships,
}));

import { getCurrentOrganizationForUser as canonical } from '@/server/queries/current-organization';
import { getCurrentOrganizationForUser as legacy } from '@/server/queries/organizations';

function member(id: string, completed: boolean, status = 'active') {
  return {
    organization_id: id, role: 'admin', status,
    organizations: {
      id, name: id, slug: id,
      onboarding_status: completed ? 'completed' : 'not_started',
      onboarding_completed_at: completed ? '2026-01-01T00:00:00Z' : null,
      selected_plan: 'professional',
    },
  };
}

describe('organization selection across dashboard and compatibility routes', () => {
  beforeEach(() => { state.rows = []; state.error = null; });

  it('selects the completed active organization instead of the first unfinished membership', async () => {
    state.rows = [member('older-qa', false), member('current-qa', true)];
    expect((await canonical('qa-user'))?.id).toBe('current-qa');
    expect((await legacy('qa-user'))?.id).toBe('current-qa');
  });

  it('preserves the established fallback when no organization has completed onboarding', async () => {
    state.rows = [member('first-qa', false), member('second-qa', false)];
    expect((await canonical('qa-user'))?.id).toBe('first-qa');
    expect((await legacy('qa-user'))?.id).toBe('first-qa');
  });

  it('does not select an inactive completed membership', async () => {
    state.rows = [member('inactive-qa', true, 'suspended'), member('active-qa', false)];
    expect((await legacy('qa-user'))?.id).toBe('active-qa');
  });

  it('returns null for no membership and propagates lookup failures', async () => {
    expect(await legacy('qa-user')).toBeNull();
    state.error = { code: 'UNEXPECTED_PROVIDER_ERROR' };
    await expect(legacy('qa-user')).rejects.toThrow('organization_memberships_unavailable');
  });
});
