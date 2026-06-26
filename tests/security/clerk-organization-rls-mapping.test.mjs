import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

function readMigrations() {
  return fs.readdirSync(path.join('supabase', 'migrations'))
    .filter((file) => file.endsWith('.sql'))
    .sort()
    .map((file) => fs.readFileSync(path.join('supabase', 'migrations', file), 'utf8'))
    .join('\n\n');
}

function readMigration(fileName) {
  return fs.readFileSync(path.join('supabase', 'migrations', fileName), 'utf8');
}

describe('Clerk organization RLS mapping', () => {
  it('has database mapping columns and indexes for Clerk organization identities', () => {
    const sql = readMigrations();

    expect(sql).toContain('clerk_org_id');
    expect(sql).toContain('created_by_clerk_user_id');
    expect(sql).toContain('clerk_user_id');
    expect(sql).toContain('clerk_membership_id');
    expect(sql).toContain('organizations_clerk_org_id_key');
    expect(sql).toContain('organization_members_org_clerk_user_key');
  });

  it('teaches RLS helpers to resolve Clerk user identities', () => {
    const sql = readMigrations();

    expect(sql).toContain('current_clerk_user_id');
    expect(sql).toContain("current_setting('request.jwt.claim.sub', true)");
    expect(sql).toContain('clerk_user_id = public.current_clerk_user_id()');
    expect(sql).toContain('create or replace function public.is_org_member');
    expect(sql).toContain('create or replace function public.has_org_role');
  });

  it('keeps the Clerk hardening migration UUID-safe and role-gated', () => {
    const sql = readMigration('20260626120000_clerk_uuid_safe_rls_helpers.sql');

    expect(sql).toContain('create or replace function public.current_legacy_user_id()');
    expect(sql).toContain('create or replace function public.current_clerk_user_id()');
    expect(sql).not.toContain('auth.uid()');
    expect(sql).toContain("public.current_jwt_subject() ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'");
    expect(sql).toContain('create or replace function public.live_rls_validation_is_org_member');
    expect(sql).toContain('select public.is_org_member(target_organization_id);');
    expect(sql).toContain('drop policy if exists live_rls_tasks_insert_writer on public.tasks');
    expect(sql).toContain("with check (public.has_org_role(organization_id, array['owner','admin','editor']))");
    expect(sql).toContain("using (public.has_org_role(organization_id, array['owner','admin']))");
  });
});
