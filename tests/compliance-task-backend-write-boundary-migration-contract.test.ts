import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migrationPath =
  'supabase/migrations/20260720061000_lock_compliance_task_writes_behind_backend.sql';
const migration = readFileSync(migrationPath, 'utf8');

describe('compliance task backend write boundary migration', () => {
  it('fails closed when the required table is absent', () => {
    expect(migration).toContain("to_regclass('public.compliance_tasks') is null");
    expect(migration).toContain(
      "raise exception 'required table public.compliance_tasks is missing'"
    );
  });

  it('removes the authenticated manager write policies', () => {
    expect(migration).toContain(
      'drop policy if exists "Managers can create compliance tasks" on public.compliance_tasks;'
    );
    expect(migration).toContain(
      'drop policy if exists "Managers can update compliance tasks" on public.compliance_tasks;'
    );
  });

  it('revokes direct client DML while preserving authenticated reads', () => {
    expect(migration).toContain(
      'revoke insert, update, delete on table public.compliance_tasks from anon;'
    );
    expect(migration).toContain(
      'revoke insert, update, delete on table public.compliance_tasks from authenticated;'
    );
    expect(migration).toContain(
      'grant select on table public.compliance_tasks to authenticated;'
    );
  });

  it('installs explicit authenticated deny policies for every mutation', () => {
    expect(migration).toContain('deny_authenticated_compliance_task_insert');
    expect(migration).toContain('deny_authenticated_compliance_task_update');
    expect(migration).toContain('deny_authenticated_compliance_task_delete');
    expect(migration.match(/with check \(false\)/g)).toHaveLength(2);
    expect(migration.match(/using \(false\)/g)).toHaveLength(2);
  });

  it('keeps the trusted backend role capable of supported writes', () => {
    expect(migration).toContain(
      'grant select, insert, update, delete on table public.compliance_tasks to service_role;'
    );
    expect(migration).toContain(
      'alter table public.compliance_tasks force row level security;'
    );
  });
});
