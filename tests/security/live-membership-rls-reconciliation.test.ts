import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migrationPath =
  'supabase/migrations/20260807091341_reconcile_membership_rls_and_remove_permissive_bypasses.sql';
const migration = readFileSync(migrationPath, 'utf8');

const permissivePolicies = [
  'Users can insert their own memberships',
  'Admins can add members',
  'Admins can update members',
  'Admins can remove members',
  'Authenticated can insert audit logs',
  'Authenticated can read audit logs',
  'Authenticated can read compliance tasks',
  'Authenticated can write compliance tasks',
  'Authenticated can read documents',
  'Authenticated can write documents',
  'Authenticated can read risks',
  'Authenticated can write risks',
  'Authenticated can read vendors',
  'Authenticated can write vendors',
  'Authenticated can read subscriptions',
  'Authenticated can write subscriptions',
] as const;

const canonicalMembershipPolicies = [
  'rls_organization_members_select_member',
  'rls_organization_members_insert_backend_only',
  'rls_organization_members_update_backend_only',
  'rls_organization_members_delete_backend_only',
] as const;

describe('live membership RLS reconciliation migration', () => {
  it('uses the hardened private helper without recreating privileged public functions', () => {
    expect(migration).toContain('using (app_private.is_org_member(organization_id));');
    expect(migration).not.toContain('create or replace function public.is_org_member');
    expect(migration).not.toContain('create or replace function public.has_org_role');
    expect(migration).not.toContain('security definer');
  });

  it('rebuilds the canonical membership policy chain with backend-only writes', () => {
    for (const policy of canonicalMembershipPolicies) {
      expect(migration).toContain(`create policy "${policy}"`);
    }

    expect(migration).toContain('for insert\n  to authenticated\n  with check (false);');
    expect(migration).toContain(
      'for update\n  to authenticated\n  using (false)\n  with check (false);',
    );
    expect(migration).toContain('for delete\n  to authenticated\n  using (false);');
  });

  it('removes every observed permissive bypass idempotently', () => {
    for (const policy of permissivePolicies) {
      expect(migration).toContain(`drop policy if exists "${policy}"`);
    }
  });

  it('fails closed unless the complete tenant-safe replacement chain exists', () => {
    expect(migration).toContain('do $migration_guard$');
    expect(migration).toContain('from pg_catalog.pg_policies policy');
    expect(migration).toContain(
      "raise exception 'Required tenant-safe RLS policy %.% is missing'",
    );
    expect(migration).toContain(
      "raise exception 'A permissive tenant RLS bypass policy remains after cleanup'",
    );
  });

  it('is transactional and does not contain row mutations', () => {
    expect(migration.trimStart().startsWith('--')).toBe(true);
    expect(migration).toContain('\nbegin;');
    expect(migration.trimEnd().endsWith('commit;')).toBe(true);
    expect(migration).not.toMatch(/\b(insert into|update public\.|delete from|truncate)\b/i);
  });
});
