import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migrationPath =
  'supabase/migrations/20260720002000_lock_ai_assessment_writes_behind_backend.sql';
const migration = readFileSync(migrationPath, 'utf8');

describe('AI assessment backend write boundary migration', () => {
  it('fails closed when the required table is absent', () => {
    expect(migration).toContain("to_regclass('public.ai_assessments') is null");
    expect(migration).toContain(
      "raise exception 'required table public.ai_assessments is missing'"
    );
  });

  it('removes the known authenticated write policies', () => {
    expect(migration).toContain(
      'drop policy if exists "rls_ai_assessments_insert_writer" on public.ai_assessments;'
    );
    expect(migration).toContain(
      'drop policy if exists "rls_ai_assessments_update_writer" on public.ai_assessments;'
    );
    expect(migration).toContain(
      'drop policy if exists "rls_ai_assessments_delete_admin" on public.ai_assessments;'
    );
  });

  it('revokes direct client DML while preserving authenticated reads', () => {
    expect(migration).toContain(
      'revoke insert, update, delete on table public.ai_assessments from anon;'
    );
    expect(migration).toContain(
      'revoke insert, update, delete on table public.ai_assessments from authenticated;'
    );
    expect(migration).toContain(
      'grant select on table public.ai_assessments to authenticated;'
    );
  });

  it('installs explicit authenticated deny policies for every mutation', () => {
    expect(migration).toContain('deny_authenticated_ai_assessment_insert');
    expect(migration).toContain('deny_authenticated_ai_assessment_update');
    expect(migration).toContain('deny_authenticated_ai_assessment_delete');
    expect(migration.match(/with check \(false\)/g)).toHaveLength(2);
    expect(migration.match(/using \(false\)/g)).toHaveLength(2);
  });

  it('keeps the trusted backend role capable of supported writes', () => {
    expect(migration).toContain(
      'grant select, insert, update, delete on table public.ai_assessments to service_role;'
    );
    expect(migration).toContain(
      'alter table public.ai_assessments force row level security;'
    );
  });
});
