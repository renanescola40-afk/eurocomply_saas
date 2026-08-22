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
  'supabase/migrations/20260822123540_v19_reconcile_step_up_challenges_runtime.sql',
  'utf8',
);
const iDup07 = fs.readFileSync(
  'docs/security/evidence/human-review/split-reviews/i-dup-07-live-object-evidence.md',
  'utf8',
);
const subscriptionDefaults = fs.readFileSync(
  'supabase/migrations/20260822123542_v19_reconcile_subscription_schema_defaults.sql',
  'utf8',
);
const billingPlans = fs.readFileSync('src/lib/billing/plans.ts', 'utf8');

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

describe('Supabase I-DUP-07 technical split review', () => {
  it('keeps the evolved identity helper lineage non-replayable', () => {
    expect(iDup07).toContain('Technical disposition candidate: `ALREADY_PRESENT_IN_SCHEMA`');
    expect(iDup07).toContain('20260804230433_move_rls_helpers_to_private_schema.sql');
    expect(iDup07).toContain('app_private.is_org_member(uuid)');
  });

  it('locks future subscription defaults to the canonical four-plan catalog without row rewrites', () => {
    expect(subscriptionDefaults).toContain("alter column plan set default 'starter'");
    expect(subscriptionDefaults).toContain("alter column tier set default 'starter'");
    expect(subscriptionDefaults).toContain("alter column status set default 'inactive'");
    expect(subscriptionDefaults).toContain("check (plan in ('starter', 'professional', 'business', 'enterprise'))");
    expect(subscriptionDefaults).toContain("check (tier in ('starter', 'professional', 'business', 'enterprise'))");
    expect(subscriptionDefaults).not.toMatch(/update\s+public\.subscriptions/i);
    expect(billingPlans).toContain("id: 'starter'");
    expect(billingPlans).toContain("id: 'professional'");
    expect(billingPlans).toContain("id: 'business'");
    expect(billingPlans).toContain("id: 'enterprise'");
  });

  it('preserves the I-DUP-07 non-authorizing evidence boundary', () => {
    expect(iDup07).toContain('productionWriteAuthorized = false');
    expect(iDup07).toContain('migrationExecutionAuthorized = false');
    expect(iDup07).toContain('independentApprovalPresent = false');
    expect(iDup07).toContain('canonicalDecisionAccepted = false');
  });
});
