import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migrationPath = 'supabase/migrations/20260719094000_enforce_ai_literacy_member_scope.sql';
const migration = readFileSync(migrationPath, 'utf8');

describe('AI literacy organization member scope migration', () => {
  it('validates user-backed references against organization membership', () => {
    expect(migration).toContain('create or replace function public.enforce_ai_literacy_member_scope()');
    expect(migration).toContain('membership.organization_id = new.organization_id');
    expect(migration).toContain('membership.user_id = scoped_user_id');
    expect(migration).toContain("raise exception 'ai_literacy_user_not_organization_member'");
    expect(migration).toContain("using errcode = 'check_violation'");
  });

  it('covers program owners and assignment assignees on insert and scope-changing updates', () => {
    expect(migration).toContain("tg_table_name = 'ai_literacy_programs'");
    expect(migration).toContain('scoped_user_id := new.owner_user_id');
    expect(migration).toContain("tg_table_name = 'ai_literacy_assignments'");
    expect(migration).toContain('scoped_user_id := new.assignee_user_id');
    expect(migration).toContain('before insert or update of organization_id, owner_user_id');
    expect(migration).toContain('before insert or update of organization_id, assignee_user_id');
  });

  it('preserves nullable external-assignee and default-owner flows', () => {
    expect(migration).toContain('if scoped_user_id is null then');
    expect(migration).toContain('return new;');
  });

  it('does not expose the security-definer function for direct execution', () => {
    expect(migration).toContain("security definer\nset search_path = ''");
    expect(migration).toContain('revoke all on function public.enforce_ai_literacy_member_scope() from public;');
    expect(migration).toContain('revoke all on function public.enforce_ai_literacy_member_scope() from anon;');
    expect(migration).toContain('revoke all on function public.enforce_ai_literacy_member_scope() from authenticated;');
  });
});
