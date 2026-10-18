import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const routeSource = readFileSync(join(process.cwd(),'src/app/api/team/members/remove/route.ts'),'utf8');
const actionSource = readFileSync(join(process.cwd(),'src/server/actions/members.ts'),'utf8');
const adapterSource = readFileSync(join(process.cwd(),'src/server/queries/audit-events.ts'),'utf8');
const auditedMigration = readFileSync(join(process.cwd(),'supabase/migrations/20261018113000_atomic_member_removal_with_chained_audit.sql'),'utf8');
const migrationSource = readFileSync(join(process.cwd(),'supabase/migrations/20260715124500_atomic_team_member_removal.sql'),'utf8');

describe('audited atomic member removal source contract',()=>{
  it('preserves identity, trusted origin, step-up, tenant-scoped lookup and no-store response',()=>{
    for(const x of ['requireApiUser','requirePermission','requireTrustedMutation','requireStepUpForRequest','noStoreJson',".eq('organization_id', organization.id)"])expect(routeSource).toContain(x);
  });
  it('checks payload UUID before the Supabase client',()=>{
    expect(routeSource.indexOf('memberId: z.string().trim().uuid()')).toBeGreaterThan(-1);
    expect(routeSource.indexOf('if (!parsed.success)')).toBeLessThan(routeSource.indexOf('const supabase = createAdminClient()'));
  });
  it('uses only the signed single-transaction writer, never inserts a client-side compensation row',()=>{
    expect(routeSource).toContain('removeMemberWithChainedAuditAtomic');
    expect(routeSource).not.toContain('createAuditEvent(');
    expect(routeSource).not.toContain('rollbackError');
    expect(adapterSource).toContain("admin.rpc('remove_organization_member_audited_atomic'");
    expect(adapterSource).toContain("if (!payload.chain.signature)");
  });
  it('denies ordinary admins removing owners and refuses unaudited Clerk-only removals',()=>{
    expect(routeSource).toContain("error: 'owner_removal_requires_owner'");
    expect(routeSource).toContain("error: 'clerk_only_removal_requires_review'");
    expect(routeSource).toContain("error: 'self_removal_blocked'");
  });
  it('disables the alternative unstepped Server Action entry point',()=>{
    const removal=actionSource.slice(actionSource.indexOf('export async function removeOrganizationMember('));
    expect(removal).toContain("throw actionError('Member removal requires the step-up protected API route.')");
    expect(removal).not.toContain('supabase.rpc(');
  });
  it('migrates after P0-B and appends both audit records atomically',()=>{
    expect(auditedMigration).toContain('remove_organization_member_audited_atomic');
    expect(auditedMigration).toContain('public.remove_organization_member_atomic(');
    expect(auditedMigration).toContain('public.append_audit_event_chained(');
    expect(auditedMigration).toContain('insert into public.audit_logs');
    expect(auditedMigration).toContain("p_audit_hash_signature !~ '^[a-f0-9]{64}$'");
    expect(auditedMigration).toContain("status = 'active'");
    expect(auditedMigration).toContain('order by om.id for update');
    expect(auditedMigration).toContain('to service_role');
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
