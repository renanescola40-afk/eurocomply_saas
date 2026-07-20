import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migrationPath =
  'supabase/migrations/20260719154500_enforce_ai_assessment_system_tenant_scope.sql';
const migration = readFileSync(migrationPath, 'utf8');

describe('AI assessment system tenant scope migration', () => {
  it('requires the referenced AI system to belong to the assessment organization', () => {
    expect(migration).toContain(
      'create or replace function public.enforce_ai_assessment_system_tenant_scope()'
    );
    expect(migration).toContain('scoped_system.id = new.ai_system_id');
    expect(migration).toContain('scoped_system.organization_id = new.organization_id');
    expect(migration).toContain("raise exception 'ai_assessment_system_not_in_organization'");
    expect(migration).toContain("using errcode = 'check_violation'");
  });

  it('covers inserts and relevant scope-changing updates', () => {
    expect(migration).toContain('on public.ai_assessments');
    expect(migration).toContain(
      'before insert or update of organization_id, ai_system_id'
    );
  });

  it('preserves assessments without an AI system reference', () => {
    expect(migration).toContain('if new.ai_system_id is null then');
    expect(migration).toContain('return new;');
  });

  it('hardens the trigger function against direct invocation', () => {
    expect(migration).toContain("security definer\nset search_path = ''");
    expect(migration).toContain(
      'revoke all on function public.enforce_ai_assessment_system_tenant_scope() from public;'
    );
    expect(migration).toContain(
      'revoke all on function public.enforce_ai_assessment_system_tenant_scope() from anon;'
    );
    expect(migration).toContain(
      'revoke all on function public.enforce_ai_assessment_system_tenant_scope() from authenticated;'
    );
  });
});
