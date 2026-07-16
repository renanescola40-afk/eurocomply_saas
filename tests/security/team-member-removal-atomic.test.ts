import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const routeSource = readFileSync(join(process.cwd(), 'src/app/api/team/members/remove/route.ts'), 'utf8');
const actionSource = readFileSync(join(process.cwd(), 'src/server/actions/members.ts'), 'utf8');
const migrationSource = readFileSync(
  join(process.cwd(), 'supabase/migrations/20260715124500_atomic_team_member_removal.sql'),
  'utf8',
);

describe('team member removal route security contract', () => {
  it('preserves identity, permission, trusted mutation, step-up, tenant lookup, and no-store controls', () => {
    expect(routeSource).toContain('requireApiUser');
    expect(routeSource).toContain('requirePermission');
    expect(routeSource).toContain('requireTrustedMutation');
    expect(routeSource).toContain('requireStepUpForRequest');
    expect(routeSource).toContain('noStoreJson');
    expect(routeSource).toContain(".eq('organization_id', organization.id)");
  });

  it('rejects malformed member IDs before constructing the Supabase client', () => {
    const uuidValidation = routeSource.indexOf('memberId: z.string().trim().uuid()');
    const parseGuard = routeSource.indexOf('if (!parsed.success)');
    const clientCreation = routeSource.indexOf('const supabase = createAdminClient()');

    expect(uuidValidation).toBeGreaterThan(-1);
    expect(parseGuard).toBeGreaterThan(uuidValidation);
    expect(clientCreation).toBeGreaterThan(parseGuard);
    expect(routeSource).toContain("error: 'invalid_team_member_payload'");
  });

  it('delegates deletion to the backend-only atomic RPC with expected state', () => {
    expect(routeSource).toContain("const ATOMIC_MEMBER_REMOVAL_RPC = 'remove_organization_member_atomic'");
    expect(routeSource).toContain('supabase.rpc(ATOMIC_MEMBER_REMOVAL_RPC');
    expect(routeSource).toContain('p_organization_id: organization.id');
    expect(routeSource).toContain('p_member_id: parsed.data.memberId');
    expect(routeSource).toContain('p_expected_user_id: member.user_id');
    expect(routeSource).toContain('p_expected_role: member.role');
    expect(routeSource).not.toContain(".from('organization_members')\n      .delete()");
    expect(routeSource).not.toContain(".select('id', { count: 'exact', head: true })");
  });

  it('maps last-owner and stale-state outcomes before writing success audit evidence', () => {
    const lastOwnerGuard = routeSource.indexOf("removal.outcome === 'last_owner'");
    const stateChangedGuard = routeSource.indexOf("removal.outcome === 'state_changed'");
    const auditWrite = routeSource.indexOf('const audit = await createAuditEvent');

    expect(lastOwnerGuard).toBeGreaterThan(-1);
    expect(stateChangedGuard).toBeGreaterThan(lastOwnerGuard);
    expect(routeSource).toContain("error: 'last_owner_removal_blocked'");
    expect(routeSource).toContain("error: 'team_member_state_changed'");
    expect(auditWrite).toBeGreaterThan(stateChangedGuard);
  });
});

describe('team member removal action security contract', () => {
  it('uses the same atomic removal boundary as the API route', () => {
    expect(actionSource).toContain("const ATOMIC_MEMBER_REMOVAL_RPC = 'remove_organization_member_atomic'");
    expect(actionSource).toContain('supabase.rpc(ATOMIC_MEMBER_REMOVAL_RPC');
    expect(actionSource).toContain('p_organization_id: input.organizationId');
    expect(actionSource).toContain('p_expected_user_id: member.user_id');
    expect(actionSource).toContain('p_expected_role: member.role');
    expect(actionSource).not.toContain(".select('id', { count: 'exact', head: true })");
    expect(actionSource).not.toContain(".from('organization_members')\n    .delete()");
  });

  it('handles concurrency outcomes before recording successful audit evidence', () => {
    const lastOwnerGuard = actionSource.indexOf("removal.outcome === 'last_owner'");
    const stateChangedGuard = actionSource.indexOf("removal.outcome === 'state_changed'");
    const auditWrite = actionSource.lastIndexOf('await logAuditEvent');

    expect(lastOwnerGuard).toBeGreaterThan(-1);
    expect(stateChangedGuard).toBeGreaterThan(lastOwnerGuard);
    expect(auditWrite).toBeGreaterThan(stateChangedGuard);
  });
});

describe('atomic team member removal migration', () => {
  it('serializes organization membership state before owner counting and deletion', () => {
    const lockIndex = migrationSource.indexOf('for update;');
    const ownerCountIndex = migrationSource.indexOf("lower(coalesce(om.role, '')) = 'owner'");
    const deleteIndex = migrationSource.indexOf('delete from public.organization_members as om');

    expect(lockIndex).toBeGreaterThan(-1);
    expect(ownerCountIndex).toBeGreaterThan(lockIndex);
    expect(deleteIndex).toBeGreaterThan(ownerCountIndex);
    expect(migrationSource).toContain('order by om.id');
  });

  it('verifies the expected member identity and role and blocks deleting the final owner', () => {
    expect(migrationSource).toContain('v_user_id is distinct from p_expected_user_id');
    expect(migrationSource).toContain('v_previous_role is distinct from p_expected_role');
    expect(migrationSource).toContain("'state_changed'::text");
    expect(migrationSource).toContain('if v_owner_count <= 1 then');
    expect(migrationSource).toContain("'last_owner'::text");
    expect(migrationSource).toContain('om.user_id = p_expected_user_id');
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
