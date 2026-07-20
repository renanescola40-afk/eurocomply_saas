import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migrationPath =
  'supabase/migrations/20260720034200_enforce_ai_literacy_assignment_actor_scope.sql';
const migration = readFileSync(migrationPath, 'utf8');

describe('AI literacy assignment actor scope migration', () => {
  it('requires user assignees to belong to the assignment organization', () => {
    expect(migration).toContain(
      'create or replace function public.enforce_ai_literacy_assignment_actor_scope()'
    );
    expect(migration).toContain(
      'assignee_membership.organization_id = new.organization_id'
    );
    expect(migration).toContain(
      'assignee_membership.user_id = new.assignee_user_id'
    );
    expect(migration).toContain(
      "raise exception 'ai_literacy_assignee_not_in_organization'"
    );
  });

  it('requires assignment and waiver actors to belong to the same organization', () => {
    expect(migration).toContain(
      'assigner_membership.user_id = new.assigned_by'
    );
    expect(migration).toContain(
      'approver_membership.user_id = new.waiver_approved_by'
    );
    expect(migration).toContain(
      "raise exception 'ai_literacy_assigner_not_in_organization'"
    );
    expect(migration).toContain(
      "raise exception 'ai_literacy_waiver_approver_not_in_organization'"
    );
    expect(migration).toContain("using errcode = 'check_violation'");
  });

  it('covers inserts and all actor-scope updates', () => {
    expect(migration).toContain('on public.ai_literacy_assignments');
    expect(migration).toContain(
      'before insert or update of organization_id, assignee_user_id, assigned_by, waiver_approved_by'
    );
  });

  it('hardens the trigger function against direct invocation', () => {
    expect(migration).toContain("security definer\nset search_path = ''");
    expect(migration).toContain(
      'revoke all on function public.enforce_ai_literacy_assignment_actor_scope() from public;'
    );
    expect(migration).toContain(
      'revoke all on function public.enforce_ai_literacy_assignment_actor_scope() from anon;'
    );
    expect(migration).toContain(
      'revoke all on function public.enforce_ai_literacy_assignment_actor_scope() from authenticated;'
    );
  });
});
