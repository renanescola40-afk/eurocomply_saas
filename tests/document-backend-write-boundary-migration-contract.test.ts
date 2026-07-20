import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migrationPath =
  'supabase/migrations/20260720084900_lock_document_writes_behind_backend.sql';
const migration = readFileSync(migrationPath, 'utf8');

describe('document backend write boundary migration', () => {
  it('fails closed when the required table is absent', () => {
    expect(migration).toContain("to_regclass('public.documents') is null");
    expect(migration).toContain(
      "raise exception 'required table public.documents is missing'"
    );
  });

  it('removes authenticated mutation policies without relying on policy names', () => {
    expect(migration).toContain("tablename = 'documents'");
    expect(migration).toContain("cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')");
    expect(migration).toContain(
      "roles && array['public', 'anon', 'authenticated']::name[]"
    );
    expect(migration).toContain(
      "drop policy if exists %I on public.documents"
    );
  });

  it('revokes direct client DML while preserving authenticated reads', () => {
    expect(migration).toContain(
      'revoke insert, update, delete on table public.documents from anon;'
    );
    expect(migration).toContain(
      'revoke insert, update, delete on table public.documents from authenticated;'
    );
    expect(migration).toContain(
      'grant select on table public.documents to authenticated;'
    );
  });

  it('installs explicit authenticated deny policies for every mutation', () => {
    expect(migration).toContain('Authenticated clients cannot insert documents');
    expect(migration).toContain('Authenticated clients cannot update documents');
    expect(migration).toContain('Authenticated clients cannot delete documents');
    expect(migration.match(/with check \(false\)/g)).toHaveLength(2);
    expect(migration.match(/using \(false\)/g)).toHaveLength(2);
  });

  it('keeps the trusted backend role capable of supported writes', () => {
    expect(migration).toContain(
      'grant select, insert, update, delete on table public.documents to service_role;'
    );
    expect(migration).toContain(
      'alter table public.documents force row level security;'
    );
  });
});
