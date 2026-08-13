import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const dossier = fs.readFileSync(
  'docs/security/evidence/human-review/split-reviews/i-dup-06-live-object-evidence.md',
  'utf8',
);
const legacyInventory = fs.readFileSync(
  'supabase/migrations/20260623120000_live_rls_validation_inventory.sql',
  'utf8',
);
const repairedInventory = fs.readFileSync(
  'supabase/migrations/20260730204500_repair_live_rls_validation_inventory.sql',
  'utf8',
);
const legacyStepUp = fs.readFileSync(
  'supabase/migrations/20260623120000_step_up_challenge_store.sql',
  'utf8',
);
const canonicalStepUp = fs.readFileSync(
  'supabase/migrations/20260813194500_reconcile_step_up_challenges_runtime.sql',
  'utf8',
);

describe('Supabase I-DUP-06 technical split review', () => {
  it('binds the RLS inventory helper to the explicit privilege repair', () => {
    expect(legacyInventory).toContain('grant execute on function public.eurocomply_live_rls_inventory(text[]) to service_role');
    expect(legacyInventory).not.toContain('revoke all on function public.eurocomply_live_rls_inventory(text[]) from public');
    expect(repairedInventory).toContain('revoke all on function public.eurocomply_live_rls_inventory(text[]) from public');
    expect(repairedInventory).toContain('revoke execute on function public.eurocomply_live_rls_inventory(text[]) from anon');
    expect(repairedInventory).toContain('revoke execute on function public.eurocomply_live_rls_inventory(text[]) from authenticated');
    expect(dossier).toContain('20260730204500_repair_live_rls_validation_inventory.sql');
  });

  it('moves the challenge-store execution identity away from the duplicate timestamp', () => {
    expect(legacyStepUp).toContain('create table if not exists public.step_up_challenges');
    expect(legacyStepUp).not.toContain('alter table public.step_up_challenges force row level security');
    expect(canonicalStepUp).toContain('create table if not exists public.step_up_challenges');
    expect(canonicalStepUp).toContain('alter table public.step_up_challenges force row level security');
    expect(canonicalStepUp).toContain('set search_path = pg_catalog');
    expect(canonicalStepUp).toContain("raise exception 'browser roles unexpectedly retain step_up_challenges privileges'");
    expect(dossier).toContain('20260813194500_reconcile_step_up_challenges_runtime.sql');
  });

  it('preserves the non-authorizing evidence boundary', () => {
    expect(dossier).toContain('productionWriteAuthorized = false');
    expect(dossier).toContain('migrationExecutionAuthorized = false');
    expect(dossier).toContain('independentApprovalPresent = false');
    expect(dossier).toContain('canonicalDecisionAccepted = false');
  });
});
