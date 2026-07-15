import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const routeSource = readFileSync(join(process.cwd(), 'src/app/api/team/members/role/route.ts'), 'utf8');
const migrationSource = readFileSync(
  join(process.cwd(), 'supabase/migrations/20260715113500_atomic_team_member_role_transition.sql'),
  'utf8',
);

describe('team member role route security contract', () => {
  it('uses the central API guard helpers for identity, permission, mutation, step-up, and error handling', () => {
    expect(routeSource).toContain('requireApiUser');
    expect(routeSource).toContain('requirePermission');
    expect(routeSource).toContain('requireTrustedMutation');
    expect(routeSource).toContain('requireStepUpForRequest');
    expect(routeSource).toContain('secureApiError');
  });

  it('rejects malformed member IDs before constructing the Supabase client', () => {
    const uuidValidation = routeSource.indexOf('memberId: z.string().trim().uuid()');
    const parseGuard = routeSource.indexOf('if (!parsed.success)');
    const clientCreation = routeSource.indexOf('const supabase = createAdminClient()');

    expect(uuidValidation).toBeGreaterThan(-1);
    expect(parseGuard).toBeGreaterThan(uuidValidation);
    expect(clientCreation).toBeGreaterThan(parseGuard);
    expect(routeSource).toContain("error: 'invalid_team_role_payload'");
  });

  it('scopes member lookup by organization_id before invoking the transition', () => {
    const lookupStart = routeSource.indexOf(".from('organization_members')");
    const lookupEnd = routeSource.indexOf('.maybeSingle()', lookupStart);
    const lookupSource = routeSource.slice(lookupStart, lookupEnd);

    expect(lookupStart).toBeGreaterThan(-1);
    expect(lookupSource).toContain(".eq('id', parsed.data.memberId)");
    expect(lookupSource).toContain(".eq('organization_id', organization.id)");
  });

  it('delegates the mutation to the atomic backend-only RPC with expected state', () => {
    expect(routeSource).toContain("const ATOMIC_ROLE_TRANSITION_RPC = 'change_organization_member_role_atomic'");
    expect(routeSource).toContain('supabase.rpc(ATOMIC_ROLE_TRANSITION_RPC');
    expect(routeSource).toContain('p_organization_id: organization.id');
    expect(routeSource).toContain('p_member_id: parsed.data.memberId');
    expect(routeSource).toContain('p_expected_role: member.role');
    expect(routeSource).toContain('p_next_role: nextRole');
    expect(routeSource).not.toContain(".update({ role: nextRole })");
    expect(routeSource).not.toContain(".select('id', { count: 'exact', head: true })");
  });

  it('maps no-op, last-owner, stale-state, and invalid outcomes before success evidence', () => {
    const lastOwnerGuard = routeSource.indexOf("transition.outcome === 'last_owner'");
    const stateChangedGuard = routeSource.indexOf("transition.outcome === 'state_changed'");
    const unchangedGuard = routeSource.indexOf("transition.outcome === 'unchanged'");
    const auditWrite = routeSource.indexOf('const audit = await createAuditEvent');

    expect(lastOwnerGuard).toBeGreaterThan(-1);
    expect(stateChangedGuard).toBeGreaterThan(lastOwnerGuard);
    expect(unchangedGuard).toBeGreaterThan(stateChangedGuard);
    expect(routeSource).toContain("error: 'last_owner_role_change_blocked'");
    expect(routeSource).toContain("error: 'team_member_state_changed'");
    expect(auditWrite).toBeGreaterThan(unchangedGuard);
  });
});

describe('atomic team member role transition migration', () => {
  it('serializes all membership changes for the organization before owner counting', () => {
    const lockIndex = migrationSource.indexOf('for update;');
    const ownerCountIndex = migrationSource.indexOf("lower(coalesce(om.role, '')) = 'owner'");
    const updateIndex = migrationSource.indexOf('update public.organization_members as om');

    expect(lockIndex).toBeGreaterThan(-1);
    expect(ownerCountIndex).toBeGreaterThan(lockIndex);
    expect(updateIndex).toBeGreaterThan(ownerCountIndex);
    expect(migrationSource).toContain('order by om.id');
  });

  it('enforces expected state and blocks the final owner atomically', () => {
    expect(migrationSource).toContain('v_previous_role is distinct from p_expected_role');
    expect(migrationSource).toContain("'state_changed'::text");
    expect(migrationSource).toContain('if v_owner_count <= 1 then');
    expect(migrationSource).toContain("'last_owner'::text");
    expect(migrationSource).toContain('om.role is not distinct from p_expected_role');
  });

  it('is a fixed-search-path security-definer function executable only by service_role', () => {
    expect(migrationSource).toContain('security definer');
    expect(migrationSource).toContain('set search_path = public');
    expect(migrationSource).toContain('from public;');
    expect(migrationSource).toContain('from anon;');
    expect(migrationSource).toContain('from authenticated;');
    expect(migrationSource).toContain('to service_role;');
    expect(migrationSource).toContain("notify pgrst, 'reload schema'");
  });
});
