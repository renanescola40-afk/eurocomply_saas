import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync('supabase/migrations/20260720190000_eu_ai_act_governance_lifecycle.sql', 'utf8');

describe('AI governance lifecycle migration contract', () => {
  it('creates tenant-scoped cases, evidence and immutable decisions', () => {
    expect(migration).toContain('create table if not exists public.ai_governance_cases');
    expect(migration).toContain('create table if not exists public.ai_governance_evidence');
    expect(migration).toContain('create table if not exists public.ai_governance_decisions');
    expect(migration).toContain('record_ai_governance_decision');
  });

  it('fails closed for approved, blocked and retired lifecycle invariants', () => {
    expect(migration).toContain("(lifecycle_stage = 'approved') = (production_use_allowed and approved_at is not null and approval_decision = 'approved')");
    expect(migration).toContain("lifecycle_stage <> 'blocked' or production_use_allowed = false");
    expect(migration).toContain("lifecycle_stage <> 'retired' or production_use_allowed = false");
  });

  it('requires owner and approver separation and same-tenant actors', () => {
    expect(migration).toContain('accountable_owner_id is null or accountable_owner_id <> approver_id');
    expect(migration).toContain('enforce_ai_governance_actor_scope');
    expect(migration).toContain('governance actor must belong to the case organization');
  });

  it('forces RLS and removes direct browser mutations', () => {
    for (const table of ['ai_governance_cases', 'ai_governance_evidence', 'ai_governance_decisions']) {
      expect(migration).toContain(`alter table public.${table} force row level security`);
      expect(migration).toContain(`revoke insert, update, delete on public.${table} from anon, authenticated`);
    }
  });

  it('stores decision snapshots without raw evidence bodies', () => {
    expect(migration).toContain("'missingControlIds', new.missing_control_ids");
    expect(migration).not.toContain("'prohibitedPractices', new.prohibited_practices");
    expect(migration).not.toContain("'controls', new.controls");
  });
});
