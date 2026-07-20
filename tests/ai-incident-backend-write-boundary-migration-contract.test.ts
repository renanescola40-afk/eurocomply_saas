import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const migrationPath = join(
  process.cwd(),
  'supabase/migrations/20260720044000_lock_ai_incident_writes_behind_backend.sql',
);
const migration = readFileSync(migrationPath, 'utf8');

describe('AI-incident backend write-boundary migration', () => {
  it('fails closed when the required table is unavailable', () => {
    expect(migration).toContain("to_regclass('public.ai_incidents')");
    expect(migration).toContain("raise exception 'required table public.ai_incidents is missing'");
  });

  it('removes direct-client mutation policies without depending on legacy names', () => {
    expect(migration).toContain("tablename = 'ai_incidents'");
    expect(migration).toContain("cmd in ('ALL', 'INSERT', 'UPDATE', 'DELETE')");
    expect(migration).toContain("roles && array['public', 'anon', 'authenticated']::name[]");
    expect(migration).toContain("'drop policy if exists %I on public.ai_incidents'");
  });

  it('revokes browser DML while preserving authenticated reads and backend writes', () => {
    expect(migration).toContain(
      'revoke insert, update, delete on table public.ai_incidents from authenticated;',
    );
    expect(migration).toContain('grant select on table public.ai_incidents to authenticated;');
    expect(migration).toContain(
      'grant select, insert, update, delete on table public.ai_incidents to service_role;',
    );
  });

  it('adds explicit fail-closed policies and keeps forced RLS enabled', () => {
    expect(migration).toContain('alter table public.ai_incidents force row level security;');
    expect(migration).toContain('deny_authenticated_ai_incident_insert');
    expect(migration).toContain('deny_authenticated_ai_incident_update');
    expect(migration).toContain('deny_authenticated_ai_incident_delete');
    expect(migration.match(/(?:using|with check) \(false\)/g)?.length).toBeGreaterThanOrEqual(4);
  });
});
