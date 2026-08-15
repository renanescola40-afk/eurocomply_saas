import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/billing-lifecycle-runtime-proof.yml', 'utf8');
const sql = readFileSync('scripts/enterprise/billing-lifecycle-runtime-proof.sql', 'utf8');
const auditChainSql = readFileSync('scripts/enterprise/billing-lifecycle-audit-chain.sql', 'utf8');
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

type VerificationOverrides = {
  runtimeReleaseShaVerified?: boolean;
  auditChainCryptographicallyVerified?: boolean;
};

function generateEvidence(
  observation: Record<string, boolean>,
  targetEnvironment: 'staging' | 'production' = 'staging',
  verification: VerificationOverrides = {},
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
      RUNTIME_RELEASE_SHA_VERIFIED: verification.runtimeReleaseShaVerified === false ? 'false' : 'true',
      AUDIT_CHAIN_CRYPTOGRAPHICALLY_VERIFIED: verification.auditChainCryptographicallyVerified === false ? 'false' : 'true',
    },
  });
  return { evidence, summary, result };
}

describe('billing lifecycle runtime proof', () => {
  it('is a protected exact-main read-only observation workflow with shell-safe inputs', () => {
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain('permissions:\n  contents: read');
    expect(workflow).toContain('CONFIRMATION_INPUT: ${{ inputs.confirmation }}');
    expect(workflow).toContain('test "$CONFIRMATION_INPUT" = "PROVE_BILLING_LIFECYCLE_RUNTIME"');
    expect(workflow).not.toContain('test "${{ inputs.confirmation }}"');
    expect(workflow).toContain('persist-credentials: false');
    expect(workflow).toContain('PGOPTIONS: -c default_transaction_read_only=on');
    expect(sql).toContain('default_transaction_read_only=on');
    expect(workflow).not.toContain('contents: write');
    expect(workflow).not.toContain('pull_request_target');
    expect(workflow).not.toContain('continue-on-error');
    expect(workflow).not.toContain('STRIPE_SECRET_KEY');
  });

  it('binds evidence to the independently reported deployed runtime SHA', () => {
    expect(workflow).toContain('HEALTHCHECK_TOKEN: ${{ secrets.HEALTHCHECK_TOKEN }}');
    expect(workflow).toContain('https://www.risckcomply.com');
    expect(workflow).toContain('node scripts/release/verify-runtime-release-sha.mjs');
    expect(workflow).toContain('RUNTIME_RELEASE_SHA_VERIFIED=true');
    expect(builderSource).toContain('runtimeReleaseShaVerified');
    expect(builderSource).toContain('exactDeployedRuntimeShaRequired: true');
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

  it('compares the latest selected cancel and reactivation rather than any historical pair', () => {
    expect(sql).toContain("from latest_completed c");
    expect(sql).toContain("join latest_completed r on r.action='reactivate'");
    expect(sql).toContain("where c.action='cancel'");
    expect(sql).toContain('c.completed_at <= r.completed_at');
  });

  it('binds each lifecycle request to its chained audit event and runs the canonical verifier', () => {
    expect(sql).toContain("a.action='billing.subscription_' || r.action");
    expect(sql).toContain("a.entity_type='stripe_subscription'");
    expect(sql).toContain("a.metadata->>'lifecycleRequestId'");
    expect(auditChainSql).toContain("where a.organization_id = :'organization_id'::uuid");
    expect(auditChainSql).toContain('order by a.created_at asc, a.id asc');
    expect(auditChainSql).toContain("'eventHash', a.event_hash");
    expect(workflow).toContain('node scripts/security/verify-audit-chain.mjs');
    expect(workflow).toContain('AUDIT_CHAIN_CRYPTOGRAPHICALLY_VERIFIED=true');
    expect(builderSource).toContain('auditChainCryptographicallyVerified');
    expect(builderSource).toContain('canonicalAuditHashChainVerificationRequired: true');
  });

  it('allows staging evidence without falsely claiming live authority', () => {
    const generated = generateEvidence(baseObservation, 'staging');
    expect(generated.result.status).toBe(0);
    const evidence = JSON.parse(readFileSync(generated.evidence, 'utf8'));
    expect(evidence.status).toBe('Complete');
    expect(evidence.outcome).toBe('passed');
    expect(evidence.authorityPolicy.productionRequiresLiveStripeAuthority).toBe(true);
    expect(evidence.authorityPolicy.liveStripeAuthorityRequired).toBe(false);
    expect(evidence.checks.runtimeReleaseShaVerified).toBe(true);
    expect(evidence.checks.auditChainCryptographicallyVerified).toBe(true);
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

  it('fails closed when deployed SHA or canonical audit verification is absent', () => {
    const missingSha = generateEvidence(baseObservation, 'staging', { runtimeReleaseShaVerified: false });
    const missingShaEvidence = JSON.parse(readFileSync(missingSha.evidence, 'utf8'));
    expect(missingShaEvidence.status).toBe('Open');
    expect(missingShaEvidence.failures).toContain('check_failed:runtimeReleaseShaVerified');

    const missingAudit = generateEvidence(baseObservation, 'staging', { auditChainCryptographicallyVerified: false });
    const missingAuditEvidence = JSON.parse(readFileSync(missingAudit.evidence, 'utf8'));
    expect(missingAuditEvidence.status).toBe('Open');
    expect(missingAuditEvidence.failures).toContain('check_failed:auditChainCryptographicallyVerified');
  });

  it('fails closed when any lifecycle control is absent', () => {
    const generated = generateEvidence({ ...baseObservation, downgradeScheduledForPeriodEnd: false });
    const evidence = JSON.parse(readFileSync(generated.evidence, 'utf8'));
    expect(evidence.status).toBe('Open');
    expect(evidence.failures).toContain('check_failed:downgradeScheduledForPeriodEnd');
  });

  it('retains only bounded identifier suffixes and no provider credentials or raw audit events', () => {
    const generated = generateEvidence(baseObservation);
    const evidenceText = readFileSync(generated.evidence, 'utf8');
    const evidence = JSON.parse(evidenceText);
    expect(evidence.correlation.rawIdentifiersStored).toBe(false);
    expect(evidence.integrity.providerPayloadStored).toBe(false);
    expect(evidence.integrity.rawAuditEventsStored).toBe(false);
    expect(evidence.integrity.auditVerifierOutputStored).toBe(false);
    expect(evidenceText).not.toContain('13ff8175-04f8-45c9-80d4-46d76bfd1895');
    expect(evidenceText).not.toContain('sub_1TyzFjCJ9hVhCOFD12345678');
    expect(evidenceText).not.toContain('evt_1TyzFjCJ9hVhCOFDwVcc3S4h');
    expect(builderSource).not.toContain('STRIPE_SECRET_KEY');
  });
});
