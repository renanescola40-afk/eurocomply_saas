import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql = readFileSync('supabase/migrations/20260721143000_fria_fundamental_rights_governance.sql','utf8');

describe('FRIA migration contract', () => {
  it('creates the complete tenant-scoped domain', () => {
    expect(sql).toContain('create table if not exists public.ai_fria_assessments');
    expect(sql).toContain('create table if not exists public.ai_fria_evidence');
    expect(sql).toContain('create table if not exists public.ai_fria_decisions');
    expect((sql.match(/organization_id uuid not null/g) ?? []).length).toBeGreaterThanOrEqual(3);
  });
  it('forces RLS on every FRIA table', () => {
    for (const table of ['ai_fria_assessments','ai_fria_evidence','ai_fria_decisions']) {
      expect(sql).toContain(`alter table public.${table} enable row level security`);
      expect(sql).toContain(`alter table public.${table} force row level security`);
    }
  });
  it('protects separation of duties and approved state', () => {
    expect(sql).toContain('reviewer_id <> owner_id');
    expect(sql).toContain('approver_id <> owner_id');
    expect(sql).toContain("stage <> 'approved'");
  });
  it('keeps material decisions append-oriented', () => {
    expect(sql).toContain('revoke update, delete on public.ai_fria_decisions from anon, authenticated');
  });
  it('requires digest-shaped evidence integrity', () => {
    expect((sql.match(/\^\[0-9a-f\]\{64\}\$/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });
});
