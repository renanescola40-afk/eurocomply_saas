import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/auth-onboarding-billing-runtime-proof.yml', 'utf8');
const sql = readFileSync('scripts/identity/auth-onboarding-billing-runtime-proof.sql', 'utf8');
const reconciliationMigration = readFileSync(
  'supabase/migrations/20260802153000_reconcile_onboarding_runtime_schema.sql',
  'utf8',
);
const builder = 'scripts/identity/build-auth-onboarding-billing-evidence.mjs';
const validator = 'scripts/identity/check-auth-onboarding-billing-evidence.mjs';
const builderSource = readFileSync(builder, 'utf8');
const validatorSource = readFileSync(validator, 'utf8');

const passingObservation = {
  schemaReady: true,
  organizationObserved: true,
  organizationOnboardingCompleted: true,
  organizationPlanMatches: true,
  activationRunObserved: true,
  activationPlanMatches: true,
  subscriptionObserved: true,
  subscriptionActive: true,
  subscriptionPlanMatches: true,
  stripeBindingPresent: true,
  entitlementsPresent: true,
  stripeEventProcessed: true,
  stripeEventLiveMode: true,
  stripeEventAuthoritativeType: true,
  stripeEventBindingMatches: true,
  productionLiveAuthorityRequired: false,
  webhookAuditObserved: true,
  subscriptionUpdatedAuditObserved: true,
  subscriptionSyncedAuditObserved: true,
  auditHashesPresent: true,
  auditPredecessorLinksResolve: true,
};

function generateEvidence(
  observation: Record<string, boolean>,
  targetEnvironment: 'staging' | 'production' = 'staging',
) {
  const directory = mkdtempSync(join(tmpdir(), 'auth-onboarding-proof-'));
  const raw = join(directory, 'raw.json');
  const evidence = join(directory, 'evidence.json');
  const summary = join(directory, 'summary.md');
  writeFileSync(raw, JSON.stringify(observation));
  const result = spawnSync(process.execPath, [builder, raw, evidence, summary], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: {
      ...process.env,
      RELEASE_SHA: 'a'.repeat(40),
      REPOSITORY: 'renanescola40-afk/eurocomply_saas',
      TARGET_ENVIRONMENT: targetEnvironment,
      ORGANIZATION_ID: '13ff8175-04f8-45c9-80d4-46d76bfd1895',
      STRIPE_EVENT_ID: 'evt_1TyzFjCJ9hVhCOFDwVcc3S4h',
      EXPECTED_PLAN: 'professional',
      GITHUB_RUN_ID: '123456789',
    },
  });
  return { directory, raw, evidence, summary, result };
}

describe('auth onboarding billing runtime proof', () => {
  it('uses protected exact-main read-only execution', () => {
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain('permissions:\n  contents: read');
    expect(workflow).toContain('PROVE_AUTH_ONBOARDING_BILLING_RUNTIME');
    expect(workflow).toContain('persist-credentials: false');
    expect(workflow).toContain('--tuples-only');
    expect(workflow).toContain('--no-align');
    expect(workflow).toContain('--set target_environment="$TARGET_ENVIRONMENT"');
    expect(workflow).toContain('Remove raw database observation');
    expect(workflow).not.toContain('continue-on-error');
    expect(workflow).not.toContain('contents: write');
    expect(workflow).not.toContain('pull_request_target');
  });

  it('observes onboarding, billing, exact Stripe authority and chained audit controls', () => {
    for (const token of [
      'complete_onboarding_activation_atomic',
      'organizationOnboardingCompleted',
      'activationRunObserved',
      'subscriptionActive',
      'stripeEventProcessed',
      'stripeEventLiveMode',
      'stripeEventAuthoritativeType',
      'stripeEventBindingMatches',
      "customer.subscription.created",
      "customer.subscription.updated",
      'billing.subscription_updated',
      'subscription_synced',
      'auditPredecessorLinksResolve',
    ]) expect(sql).toContain(token);
  });

  it('binds the selected subscription row to the Stripe event payload', () => {
    expect(sql).toContain("to_jsonb(e) #>> '{payload,data,object,id}'");
    expect(sql).toContain("to_jsonb(e) #>> '{payload,data,object,customer}'");
    expect(sql).toContain('join stripe_event_state e on e.payload_subscription_id = s.stripe_subscription_id');
    expect(sql).toContain('e.payload_customer_id = s.stripe_customer_id');
  });

  it('reads optional rollout columns without parse-time physical-column references', () => {
    for (const token of [
      "to_jsonb(o) ->> 'onboarding_status'",
      "to_jsonb(o) ->> 'onboarding_completed_at'",
      "to_jsonb(o) ->> 'selected_plan'",
      "to_jsonb(s) ->> 'tier'",
      "to_jsonb(s) -> 'entitlements'",
      "to_jsonb(e) ->> 'organization_id'",
      "to_jsonb(e) ->> 'livemode'",
      "to_jsonb(e) ->> 'type'",
    ]) expect(sql).toContain(token);

    for (const unsafeReference of [
      'o.onboarding_status',
      'o.onboarding_completed_at',
      'o.selected_plan',
      "lower(coalesce(s.tier, s.plan, ''))",
      'jsonb_typeof(s.entitlements)',
      '    e.organization_id\n  from public.stripe_events_processed e',
      'e.livemode',
      'e.type',
      'e.payload',
    ]) expect(sql).not.toContain(unsafeReference);
  });

  it('ships an additive idempotent reconciliation migration with bounded backfill', () => {
    for (const token of [
      'add column if not exists onboarding_status text',
      'add column if not exists onboarding_completed_at timestamptz',
      'add column if not exists selected_plan text',
      "where lower(coalesce(status, '')) = 'completed'",
      "onboarding_status = 'completed'",
      'organizations_onboarding_status_check',
      'Rollback guidance:',
    ]) expect(reconciliationMigration).toContain(token);

    expect(reconciliationMigration).toContain("to_regclass('public.onboarding_activation_runs') is not null");
    expect(reconciliationMigration).not.toContain('drop column');
    expect(reconciliationMigration).not.toContain('truncate');
    expect(reconciliationMigration).not.toContain('delete from');
  });

  it('builds and validates passing sanitized staging evidence without claiming live authority', () => {
    const generated = generateEvidence(passingObservation);
    expect(generated.result.status).toBe(0);
    const parsed = JSON.parse(readFileSync(generated.evidence, 'utf8'));
    expect(parsed.status).toBe('Complete');
    expect(parsed.outcome).toBe('passed');
    expect(parsed.authorityPolicy.productionRequiresLiveStripeAuthority).toBe(true);
    expect(parsed.authorityPolicy.liveStripeAuthorityRequired).toBe(false);
    expect(parsed.correlation.rawIdentifiersStored).toBe(false);
    expect(JSON.stringify(parsed)).not.toContain('13ff8175-04f8-45c9-80d4-46d76bfd1895');
    expect(JSON.stringify(parsed)).not.toContain('evt_1TyzFjCJ9hVhCOFDwVcc3S4h');
    const validation = spawnSync(process.execPath, [validator, generated.evidence], { encoding: 'utf8' });
    expect(validation.status).toBe(0);
  });

  it('requires live-mode authority for production evidence', () => {
    const failed = generateEvidence({
      ...passingObservation,
      stripeEventLiveMode: false,
      productionLiveAuthorityRequired: true,
    }, 'production');
    const failedEvidence = JSON.parse(readFileSync(failed.evidence, 'utf8'));
    expect(failedEvidence.status).toBe('Open');
    expect(failedEvidence.failures).toContain('check_failed:stripeEventLiveMode');
    expect(spawnSync(process.execPath, [validator, failed.evidence], { encoding: 'utf8' }).status).not.toBe(0);

    const passed = generateEvidence({
      ...passingObservation,
      productionLiveAuthorityRequired: true,
    }, 'production');
    const passedEvidence = JSON.parse(readFileSync(passed.evidence, 'utf8'));
    expect(passedEvidence.status).toBe('Complete');
    expect(passedEvidence.authorityPolicy.liveStripeAuthorityRequired).toBe(true);
    expect(spawnSync(process.execPath, [validator, passed.evidence], { encoding: 'utf8' }).status).toBe(0);
  });

  it('preserves diagnostic evidence but fails closed on a missing runtime control', () => {
    const generated = generateEvidence({ ...passingObservation, activationRunObserved: false });
    expect(generated.result.status).toBe(0);
    const parsed = JSON.parse(readFileSync(generated.evidence, 'utf8'));
    expect(parsed.status).toBe('Open');
    expect(parsed.failures).toContain('check_failed:activationRunObserved');
    const validation = spawnSync(process.execPath, [validator, generated.evidence], { encoding: 'utf8' });
    expect(validation.status).not.toBe(0);
  });

  it('locks truth and redaction boundaries in both implementation layers', () => {
    for (const token of [
      'rawIdentifiersStored: false',
      'connectionStringsStored: false',
      'rawDatabaseRowsStored: false',
      'productionRequiresLiveStripeAuthority: true',
      'sourceSha256',
    ]) expect(builderSource).toContain(token);
    for (const token of [
      'status_not_complete',
      'auditPredecessorLinksResolve',
      'stripeEventLiveMode',
      'stripeEventBindingMatches',
      'production_live_authority_requirement_missing',
      'forbidden_pattern',
      'source_digest_invalid',
    ]) expect(validatorSource).toContain(token);
  });
});
