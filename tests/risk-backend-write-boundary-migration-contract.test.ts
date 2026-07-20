import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migrationPath =
  'supabase/migrations/20260720075000_lock_risk_writes_behind_backend.sql';
const migration = readFileSync(migrationPath, 'utf8');

describe('risk backend write boundary migration', () => {
  it('fails closed when the required table is absent', () => {
    expect(migration).toContain("to_regclass('public.risks') is null");
    expect(migration).toContain("raise exception 'required table public.risks is missing'");
  });

  it('removes the original broad manager write policy', () => {
    expect(migration).toContain(
      'drop policy if exists "Managers can manage risks" on public.risks;'
    );
  });

  it('revokes direct client DML while preserving authenticated reads', () => {
    expect(migration).toContain(
      'revoke insert, update, delete on table public.risks from anon;'
    );
    expect(migration).toContain(
      'revoke insert, update, delete on table public.risks from authenticated;'
    );
    expect(migration).toContain(
      'grant select on table public.risks to authenticated;'
    );
  });

  it('installs explicit authenticated deny policies for every mutation', () => {
    expect(migration).toContain('Authenticated clients cannot insert risks');
    expect(migration).toContain('Authenticated clients cannot update risks');
    expect(migration).toContain('Authenticated clients cannot delete risks');
    expect(migration.match(/with check \(false\)/g)).toHaveLength(2);
    expect(migration.match(/using \(false\)/g)).toHaveLength(2);
  });

  it('keeps the trusted backend role capable of supported writes', () => {
    expect(migration).toContain(
      'grant select, insert, update, delete on table public.risks to service_role;'
    );
    expect(migration).toContain('alter table public.risks force row level security;');
  });
});
