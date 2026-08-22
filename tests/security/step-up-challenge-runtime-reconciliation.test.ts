import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const migrationPath = 'supabase/migrations/20260822123540_v19_reconcile_step_up_challenges_runtime.sql';
const migration = fs.readFileSync(migrationPath, 'utf8');

describe('step-up challenge runtime reconciliation', () => {
  it('materializes the exact runtime store contract with short-lived replay-resistant challenges', () => {
    expect(migration).toContain('create table if not exists public.step_up_challenges');
    expect(migration).toContain('nonce text primary key');
    expect(migration).toContain('nonce_hash text not null unique');
    expect(migration).toContain("check (expires_at <= issued_at + interval '2 minutes')");
    expect(migration).toContain('consumed_at timestamptz');
    expect(migration).toContain('step_up_challenges_active_nonce_hash_idx');
    expect(migration).toContain('step_up_challenges_scope_idx');
    expect(migration).toContain('step_up_challenges_expiry_idx');
  });

  it('keeps the store backend-only with FORCE RLS', () => {
    expect(migration).toContain('alter table public.step_up_challenges enable row level security');
    expect(migration).toContain('alter table public.step_up_challenges force row level security');
    expect(migration).toContain('revoke all on table public.step_up_challenges from public');
    expect(migration).toContain('revoke all on table public.step_up_challenges from anon');
    expect(migration).toContain('revoke all on table public.step_up_challenges from authenticated');
    expect(migration).toContain('grant all on table public.step_up_challenges to service_role');
    expect(migration).toContain("raise exception 'browser roles unexpectedly retain step_up_challenges privileges'");
    expect(migration).toContain("raise exception 'service_role lacks required step_up_challenges privileges'");
  });

  it('hardens the trigger function and verifies postconditions fail closed', () => {
    expect(migration).toContain('create or replace function public.touch_step_up_challenges_updated_at()');
    expect(migration).toContain('set search_path = pg_catalog');
    expect(migration).toContain('revoke all on function public.touch_step_up_challenges_updated_at() from public');
    expect(migration).toContain('revoke all on function public.touch_step_up_challenges_updated_at() from anon');
    expect(migration).toContain('revoke all on function public.touch_step_up_challenges_updated_at() from authenticated');
    expect(migration).toContain('grant execute on function public.touch_step_up_challenges_updated_at() to service_role');
    expect(migration).toContain("raise exception 'step_up challenge trigger function search_path is not fixed'");
  });
});
