import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migrationPath = 'supabase/migrations/20260805223500_remove_permissive_tenant_rls_bypasses.sql';
const migration = readFileSync(migrationPath, 'utf8');

const forbiddenPolicies = [
  ['organization_members', 'Users can insert their own memberships'],
  ['audit_logs', 'Authenticated can insert audit logs'],
  ['audit_logs', 'Authenticated can read audit logs'],
  ['compliance_tasks', 'Authenticated can read compliance tasks'],
  ['compliance_tasks', 'Authenticated can write compliance tasks'],
  ['documents', 'Authenticated can read documents'],
  ['documents', 'Authenticated can write documents'],
  ['risks', 'Authenticated can read risks'],
  ['risks', 'Authenticated can write risks'],
  ['vendors', 'Authenticated can read vendors'],
  ['vendors', 'Authenticated can write vendors'],
  ['subscriptions', 'Authenticated can read subscriptions'],
  ['subscriptions', 'Authenticated can write subscriptions'],
] as const;

const requiredTenantPolicies = [
  'Admins can add members',
  'Members can view memberships',
  'rls_audit_logs_select_member',
  'rls_audit_logs_insert_backend_only',
  'rls_compliance_tasks_select_member',
  'rls_compliance_tasks_insert_writer',
  'rls_compliance_tasks_update_writer',
  'rls_compliance_tasks_delete_admin',
  'rls_documents_select_member',
  'rls_documents_insert_writer',
  'rls_documents_update_writer',
  'rls_documents_delete_admin',
  'rls_risks_select_member',
  'rls_risks_insert_writer',
  'rls_risks_update_writer',
  'rls_risks_delete_admin',
  'rls_vendors_select_member',
  'rls_vendors_insert_writer',
  'rls_vendors_update_writer',
  'rls_vendors_delete_admin',
  'rls_subscriptions_select_member',
  'rls_subscriptions_insert_backend_only',
  'rls_subscriptions_update_backend_only',
  'rls_subscriptions_delete_backend_only',
] as const;

describe('permissive tenant RLS bypass cleanup migration', () => {
  it('drops every observed global or arbitrary-membership bypass idempotently', () => {
    for (const [table, policy] of forbiddenPolicies) {
      expect(migration).toContain(`drop policy if exists \"${policy}\"`);
      expect(migration).toContain(`on public.${table};`);
    }
  });

  it('fails closed unless the tenant-safe replacement chain exists', () => {
    expect(migration).toContain('do $migration_guard$');
    expect(migration).toContain("from pg_catalog.pg_policies policy");
    expect(migration).toContain("raise exception 'Required tenant-safe RLS policy %.% is missing'");

    for (const policy of requiredTenantPolicies) {
      expect(migration).toContain(`'${policy}'`);
    }
  });

  it('does not remove the constrained live-validation policies in this surgical change', () => {
    expect(migration).not.toMatch(/drop policy[^;]*live_rls_/i);
    expect(migration).not.toContain('disable row level security');
    expect(migration).not.toContain('using (true)');
    expect(migration).not.toContain('with check (true)');
  });

  it('is transactional and verifies no bypass remains', () => {
    expect(migration.trimStart()).toMatch(/^--/);
    expect(migration).toMatch(/\nbegin;\n/);
    expect(migration).toContain('A permissive tenant RLS bypass policy remains after cleanup');
    expect(migration.trimEnd()).toMatch(/commit;$/);
  });
});
