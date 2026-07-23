import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync('supabase/migrations/20260723170000_qualified_review_workspace.sql', 'utf8');

describe('qualified review workspace migration', () => {
  it('creates tenant-scoped cases, reviewers and append-only decisions', () => {
    expect(migration).toContain('create table if not exists public.qualified_review_cases');
    expect(migration).toContain('create table if not exists public.qualified_reviewers');
    expect(migration).toContain('create table if not exists public.qualified_review_decisions');
    expect(migration).toContain('organization_id uuid not null');
  });

  it('forces RLS and blocks authenticated direct mutation', () => {
    expect(migration.match(/force row level security/g)?.length).toBe(3);
    expect(migration).toContain('revoke insert, update, delete on public.qualified_review_cases from anon, authenticated');
    expect(migration).toContain('grant execute on function public.transition_qualified_review_case');
  });

  it('uses an atomic locked transition with optimistic concurrency', () => {
    expect(migration).toContain('for update');
    expect(migration).toContain('v_case.version <> p_expected_version');
    expect(migration).toContain('insert into public.qualified_review_decisions');
    expect(migration).toContain('preparer cannot approve');
    expect(migration).toContain('security definer set search_path = public, pg_temp');
  });
});
