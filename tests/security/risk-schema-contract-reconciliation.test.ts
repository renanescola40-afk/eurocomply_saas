import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migrationPath = 'supabase/migrations/20261003171225_reconcile_risk_schema_contract.sql';
const migration = readFileSync(migrationPath, 'utf8');

describe('risk schema contract reconciliation', () => {
  it('adds the canonical fields required by the application and atomic RPC', () => {
    expect(migration).toContain('add column if not exists owner_user_id uuid');
    expect(migration).toContain('add column if not exists mitigation text');
    expect(migration).toContain('add column if not exists due_date date');
  });

  it('preserves legacy owner and treatment data when those columns exist', () => {
    expect(migration).toContain("column_name = 'owner_id'");
    expect(migration).toContain('set owner_user_id = owner_id');
    expect(migration).toContain("column_name = 'treatment_plan'");
    expect(migration).toContain('set mitigation = treatment_plan');
  });

  it('keeps legacy non-generated risk scores synchronized without rewriting canonical generated scores', () => {
    expect(migration).toContain("score_generation = 'NEVER'");
    expect(migration).toContain('new.risk_score := new.likelihood::text::integer * new.impact::text::integer');
    expect(migration).toContain('create trigger sync_legacy_risk_score');
  });
});
