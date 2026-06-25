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
});
