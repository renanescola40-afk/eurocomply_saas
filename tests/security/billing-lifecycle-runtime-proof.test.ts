import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/billing-lifecycle-runtime-proof.yml', 'utf8');
const sql = readFileSync('scripts/enterprise/billing-lifecycle-runtime-proof.sql', 'utf8');
const builder = 'scripts/enterprise/build-billing-lifecycle-runtime-proof.mjs';
const builderSource = readFileSync(builder, 'utf8');

const baseObservation = {
  schemaReady: true,
  subscriptionObserved: true,
  subscriptionActive: true,
  subscriptionCustomerBound: true,
  stripeEventProcessed: true,
  stripeEventAuthoritativeType: true,
  stripeEventBindingMatches: true,
  stripeEventLiveMode: false,
  productionLiveAuthorityRequired: false,
  allLifecycleActionsPresent: true,
  allLifecycleRequestsCompleted: true,
  requestFingerprintsValid: true,
  resultSnapshotsBound: true,
  upgradeObserved: true,
  downgradeObserved: true,
  cancelObserved: true,
  reactivateObserved: true,
  cancelPrecedesReactivate: true,
  allLifecycleAuditsPresent: true,
  downgradeScheduledForPeriodEnd: true,
  cancelAuditMatches: true,
  reactivateAuditMatches: true,
  auditHashesPresent: true,
  auditPredecessorLinksResolve: true,
};

function generateEvidence(
  observation: Record<string, boolean>,
  targetEnvironment: 'staging' | 'production' = 'staging',
) {
  const directory = mkdtempSync(join(tmpdir(), 'billing-lifecycle-proof-'));
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
      STRIPE_SUBSCRIPTION_ID: 'sub_1TyzFjCJ9hVhCOFD12345678',
      STRIPE_EVENT_ID: 'evt_1TyzFjCJ9hVhCOFDwVcc3S4h',
      GITHUB_RUN_ID: '123456789',
    },
  });
  return { evidence, summary, result };
}

describe('billing lifecycle runtime proof', () => {
  it('is a protected exact-main read-only observation workflow', () => {
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain('permissions:\n  contents: read');
    expect(workflow).toContain('PROVE_BILLING_LIFECYCLE_RUNTIME');
    expect(workflow).toContain('persist-credentials: false');
    expect(workflow).toContain('PGOPTIONS: -c default_transaction_read_only=on');
    expect(sql).toContain('default_transaction_read_only=on');
    expect(workflow).not.toContain('contents: write');
    expect(workflow).not.toContain('pull_request_target');
    expect(workflow).not.toContain('continue-on-error');
    expect(workflow).not.toContain('STRIPE_SECRET_KEY');
  });

  it('correlates authoritative Stripe state to the exact subscription and tenant', () => {
    for (const token of [
      "customer.subscription.created",
      "customer.subscription.updated",
      "payload_subscription_id",
      "payload_customer_id",
      "stripeEventBindingMatches",
      "stripeEventLiveMode",
      "e.organization_id=i.organization_id::text",
    ]) expect(sql).toContain(token);
  });

  it('requires completed durable evidence for the four commercial lifecycle actions', () => {
    for (const token of [
      "('upgrade','downgrade','cancel','reactivate')",
      'allLifecycleActionsPresent',
      'requestFingerprintsValid',
      'resultSnapshotsBound',
      'upgradeObserved',
      'downgradeObserved',
      'cancelObserved',
      'reactivateObserved',
      'cancelPrecedesReactivate',
      'downgradeScheduledForPeriodEnd',
    ]) expect(sql).toContain(token);
  });

  it('binds each lifecycle request to its chained audit event', () => {
    expect(sql).toContain("a.action='billing.subscription_' || r.action");
    expect(sql).toContain("a.entity_type='stripe_subscription'");
    expect(sql).toContain("a.metadata->>'lifecycleRequestId'");
    expect(sql).toContain('auditHashesPresent');
    expect(sql).toContain('auditPredecessorLinksResolve');
  });

  it('allows staging evidence without falsely claiming live authority', () => {
    const generated = generateEvidence(baseObservation, 'staging');
    expect(generated.result.status).toBe(0);
    const evidence = JSON.parse(readFileSync(generated.evidence, 'utf8'));
    expect(evidence.status).toBe('Complete');
    expect(evidence.outcome).toBe('passed');
    expect(evidence.authorityPolicy.productionRequiresLiveStripeAuthority).toBe(true);
    expect(evidence.authorityPolicy.liveStripeAuthorityRequired).toBe(false);
  });

  it('fails closed in production unless the correlated event is live mode', () => {
    const failed = generateEvidence({
      ...baseObservation,
      productionLiveAuthorityRequired: true,
      stripeEventLiveMode: false,
    }, 'production');
    const failedEvidence = JSON.parse(readFileSync(failed.evidence, 'utf8'));
    expect(failedEvidence.status).toBe('Open');
    expect(failedEvidence.failures).toContain('check_failed:stripeEventLiveMode');

    const passed = generateEvidence({
      ...baseObservation,
      productionLiveAuthorityRequired: true,
      stripeEventLiveMode: true,
    }, 'production');
    const passedEvidence = JSON.parse(readFileSync(passed.evidence, 'utf8'));
    expect(passedEvidence.status).toBe('Complete');
    expect(passedEvidence.authorityPolicy.liveStripeAuthorityRequired).toBe(true);
  });

  it('fails closed when any lifecycle control is absent', () => {
    const generated = generateEvidence({ ...baseObservation, downgradeScheduledForPeriodEnd: false });
    const evidence = JSON.parse(readFileSync(generated.evidence, 'utf8'));
    expect(evidence.status).toBe('Open');
    expect(evidence.failures).toContain('check_failed:downgradeScheduledForPeriodEnd');
  });

  it('retains only bounded identifier suffixes and no provider credentials', () => {
    const generated = generateEvidence(baseObservation);
    const evidenceText = readFileSync(generated.evidence, 'utf8');
    const evidence = JSON.parse(evidenceText);
    expect(evidence.correlation.rawIdentifiersStored).toBe(false);
    expect(evidence.integrity.providerPayloadStored).toBe(false);
    expect(evidenceText).not.toContain('13ff8175-04f8-45c9-80d4-46d76bfd1895');
    expect(evidenceText).not.toContain('sub_1TyzFjCJ9hVhCOFD12345678');
    expect(evidenceText).not.toContain('evt_1TyzFjCJ9hVhCOFDwVcc3S4h');
    expect(builderSource).not.toContain('STRIPE_SECRET_KEY');
  });
});
