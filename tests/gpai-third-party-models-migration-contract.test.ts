import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = path.join(
  process.cwd(),
  'supabase/migrations/20260721123000_gpai_third_party_model_governance.sql',
);
const sql = fs.readFileSync(migrationPath, 'utf8');

describe('GPAI third-party model migration contract', () => {
  it('creates the complete tenant-scoped model governance domain', () => {
    expect(sql).toContain('create table if not exists public.ai_model_registry');
    expect(sql).toContain('create table if not exists public.ai_model_governance_evidence');
    expect(sql).toContain('create table if not exists public.ai_model_governance_decisions');
    expect(sql.match(/organization_id uuid not null/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it('forces RLS on every governance table', () => {
    for (const table of [
      'ai_model_registry',
      'ai_model_governance_evidence',
      'ai_model_governance_decisions',
    ]) {
      expect(sql).toContain(`alter table public.${table} enable row level security`);
      expect(sql).toContain(`alter table public.${table} force row level security`);
    }
  });

  it('binds evidence and decisions to the same organization as the model', () => {
    expect(sql.match(/registry\.organization_id = organization_id/g)?.length).toBeGreaterThanOrEqual(2);
    expect(sql).toContain('public.is_organization_member(organization_id)');
    expect(sql).toContain('public.is_organization_admin(organization_id)');
  });

  it('keeps material decisions append-oriented', () => {
    expect(sql).toContain('revoke update, delete on public.ai_model_governance_decisions from anon, authenticated');
    expect(sql).toContain('grant select, insert on public.ai_model_governance_decisions to authenticated');
    expect(sql).not.toContain('grant select, insert, update, delete on public.ai_model_governance_decisions');
  });

  it('requires approval evidence and separation of duties', () => {
    expect(sql).toContain("check ((lifecycle_status <> 'approved') or (approver_id is not null and approved_at is not null))");
    expect(sql).toContain('check (approver_id is null or approver_id <> accountable_owner_id)');
    expect(sql).toContain("evidence_digest ~ '^[a-f0-9]{64}$'");
  });
});
