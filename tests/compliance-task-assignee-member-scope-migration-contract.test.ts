import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migrationPath =
  'supabase/migrations/20260719174000_enforce_compliance_task_assignee_member_scope.sql';
const migration = readFileSync(migrationPath, 'utf8');

describe('compliance task assignee organization member scope migration', () => {
  it('validates assignees against organization membership', () => {
    expect(migration).toContain(
      'create or replace function public.enforce_compliance_task_assignee_member_scope()',
    );
    expect(migration).toContain('membership.organization_id = new.organization_id');
    expect(migration).toContain('membership.user_id = new.assigned_to');
    expect(migration).toContain(
      "raise exception 'compliance_task_assignee_not_organization_member'",
    );
    expect(migration).toContain("using errcode = 'check_violation'");
  });

  it('covers inserts and changes to tenant or assignee scope', () => {
    expect(migration).toContain(
      'before insert or update of organization_id, assigned_to',
    );
    expect(migration).toContain('on public.compliance_tasks');
  });

  it('preserves unassigned task workflows', () => {
    expect(migration).toContain('if new.assigned_to is null then');
    expect(migration).toContain('return new;');
  });

  it('does not expose the security-definer function for direct execution', () => {
    expect(migration).toContain("security definer\nset search_path = ''");
    expect(migration).toContain(
      'revoke all on function public.enforce_compliance_task_assignee_member_scope() from public;',
    );
    expect(migration).toContain(
      'revoke all on function public.enforce_compliance_task_assignee_member_scope() from anon;',
    );
    expect(migration).toContain(
      'revoke all on function public.enforce_compliance_task_assignee_member_scope() from authenticated;',
    );
  });
});
