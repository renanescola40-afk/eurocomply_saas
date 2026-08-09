import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  normalizeStripeEvidenceForP0,
  selectExactShaRun,
  validateDownloadedEvidence,
} from '../../scripts/enterprise/fetch-stripe-promoted-runtime-evidence.mjs';
import { p0EvidenceCatalog } from '../../scripts/security/p0-runtime-evidence-catalog.mjs';

const SHA = 'a'.repeat(40);
const RUN_ID = '123456789';
const REPOSITORY = 'renanescola40-afk/eurocomply_saas';
const WORKFLOW_PATH = '.github/workflows/stripe-runtime-evidence-promotion.yml';

function promotedEvidence() {
  return {
    id: 'stripe-entitlement-runtime-proof',
    evidenceItem: 'stripe-billing-validation',
    status: 'Complete',
    validationStatus: 'passed',
    outcome: 'passed',
    repository: REPOSITORY,
    branch: 'main',
    commitSha: SHA,
    reviewedAt: '2026-08-09T14:00:00.000Z',
    environment: 'production',
    controlsVerified: [
      'eventProcessed',
      'snapshotObserved',
      'policyObserved',
      'limitsMatch',
      'reconciliationObserved',
      'rawEvidenceDeleted',
    ],
    runtimeProof: {
      executed: true,
      stripeTestModeConfirmed: true,
      signedWebhookDelivered: true,
      entitlementSnapshotObserved: true,
      canonicalSeatPolicyObserved: true,
      reconciliationLedgerObserved: true,
      replaySafetyObserved: true,
    },
    sourceEvidenceDigest: 'b'.repeat(64),
    artifactDigest: 'c'.repeat(64),
    redactionConfirmation: 'Redaction confirmed for runtime evidence.',
    evidenceIntegrity: {
      placeholderOnly: false,
      runtimeProofInvented: false,
      customerFacingProof: false,
      containsSensitiveValues: false,
    },
  };
}

describe('promoted Stripe exact-SHA runtime evidence handoff', () => {
  it('selects only successful manual promotion for exact current main SHA', () => {
    const run = {
      id: Number(RUN_ID),
      path: WORKFLOW_PATH,
      head_sha: SHA,
      head_branch: 'main',
      event: 'workflow_dispatch',
      status: 'completed',
      conclusion: 'success',
      updated_at: '2026-08-09T14:01:00Z',
    };
    expect(selectExactShaRun([
      { ...run, id: 1, head_sha: 'b'.repeat(40) },
      { ...run, id: 2, head_branch: 'feature' },
      { ...run, id: 3, event: 'push' },
      { ...run, id: 4, conclusion: 'failure' },
      run,
    ], SHA)).toEqual(run);
    expect(selectExactShaRun([run], SHA, '999')).toBeNull();
  });

  it('accepts promoted entitlement proof and closes the authoritative Stripe P0 entry', () => {
    const proof = promotedEvidence();
    expect(validateDownloadedEvidence(proof, {
      targetSha: SHA,
      repository: REPOSITORY,
      now: new Date('2026-08-09T14:05:00.000Z'),
    })).toEqual({ passed: true, failures: [] });

    const canonical = normalizeStripeEvidenceForP0(proof);
    expect(canonical.reviewer).toContain('Stripe evidence promotion');
    expect(canonical.evidenceLocations.length).toBeGreaterThan(0);

    const entry = p0EvidenceCatalog.find((candidate) => candidate.item === 'Stripe billing runtime validation');
    expect(entry).toBeDefined();
    if (!entry?.validator) throw new Error('Stripe P0 catalog validator missing');
    expect(entry.validator(canonical, {
      now: new Date('2026-08-09T14:05:00.000Z'),
      expectedRepository: REPOSITORY,
      expectedBranch: 'main',
      expectedCommitSha: SHA,
    })).toEqual([]);
  });

  it('rejects uncorrelated, sensitive, non-test-mode, or stale-SHA promoted proof', () => {
    expect(validateDownloadedEvidence({ ...promotedEvidence(), commitSha: 'b'.repeat(40) }, {
      targetSha: SHA,
      repository: REPOSITORY,
      now: new Date('2026-08-09T14:05:00.000Z'),
    }).passed).toBe(false);

    expect(validateDownloadedEvidence({ ...promotedEvidence(), runtimeProof: { ...promotedEvidence().runtimeProof, stripeTestModeConfirmed: false } }, {
      targetSha: SHA,
      repository: REPOSITORY,
      now: new Date('2026-08-09T14:05:00.000Z'),
    }).passed).toBe(false);

    expect(validateDownloadedEvidence({ ...promotedEvidence(), evidenceIntegrity: { ...promotedEvidence().evidenceIntegrity, containsSensitiveValues: true } }, {
      targetSha: SHA,
      repository: REPOSITORY,
      now: new Date('2026-08-09T14:05:00.000Z'),
    }).passed).toBe(false);
  });

  it('wires the promotion workflow into the P0 exact-SHA aggregator', () => {
    const p0 = readFileSync('.github/workflows/p0-runtime-evidence.yml', 'utf8');
    expect(p0).toContain('- Stripe Runtime Evidence Promotion');
    expect(p0).toContain("github.event.workflow.path == '.github/workflows/stripe-runtime-evidence-promotion.yml'");
    expect(p0).toContain('node scripts/enterprise/fetch-stripe-promoted-runtime-evidence.mjs');
    expect(p0).toContain('STRIPE_RUNTIME_EVIDENCE_REQUIRED');
  });
});