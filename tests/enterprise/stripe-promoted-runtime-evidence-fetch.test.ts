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
const SOURCE_RUN_ID = '987654321';
const REPOSITORY = 'renanescola40-afk/eurocomply_saas';
const WORKFLOW_PATH = '.github/workflows/stripe-runtime-evidence-promotion.yml';
const SOURCE_WORKFLOW_PATH = '.github/workflows/stripe-entitlement-runtime-proof.yml';

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
      'replaySafe',
    ],
    runtimeProof: {
      executed: true,
      stripeTestModeConfirmed: true,
      signedWebhookDelivered: true,
      entitlementSnapshotObserved: true,
      canonicalSeatPolicyObserved: true,
      reconciliationLedgerObserved: true,
      replaySafetyObserved: true,
      sourceRunId: SOURCE_RUN_ID,
      sourceWorkflow: SOURCE_WORKFLOW_PATH,
      sourceArtifactName: `stripe-entitlement-runtime-proof-${SHA}`,
    },
    sourceEvidenceDigest: 'b'.repeat(64),
    sourceReplayDigest: 'd'.repeat(64),
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
  it('selects successful automatic promotion or explicit manual recovery for exact main SHA', () => {
    const automatic = {
      id: Number(RUN_ID),
      path: WORKFLOW_PATH,
      head_sha: SHA,
      head_branch: 'main',
      event: 'workflow_run',
      status: 'completed',
      conclusion: 'success',
      updated_at: '2026-08-09T14:02:00Z',
    };
    const manual = {
      ...automatic,
      id: Number(RUN_ID) - 1,
      event: 'workflow_dispatch',
      updated_at: '2026-08-09T14:01:00Z',
    };
    expect(selectExactShaRun([
      manual,
      { ...automatic, id: 1, head_sha: 'b'.repeat(40) },
      { ...automatic, id: 2, head_branch: 'feature' },
      { ...automatic, id: 3, event: 'push' },
      { ...automatic, id: 4, conclusion: 'failure' },
      automatic,
    ], SHA)).toEqual(automatic);
    expect(selectExactShaRun([automatic], SHA, '999')).toBeNull();
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

  it('rejects uncorrelated, sensitive, non-test-mode, stale-SHA or source-unbound promoted proof', () => {
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

    expect(validateDownloadedEvidence({ ...promotedEvidence(), runtimeProof: { ...promotedEvidence().runtimeProof, sourceRunId: '' } }, {
      targetSha: SHA,
      repository: REPOSITORY,
      now: new Date('2026-08-09T14:05:00.000Z'),
    }).passed).toBe(false);

    expect(validateDownloadedEvidence({ ...promotedEvidence(), runtimeProof: { ...promotedEvidence().runtimeProof, sourceArtifactName: `stripe-entitlement-runtime-proof-${'b'.repeat(40)}` } }, {
      targetSha: SHA,
      repository: REPOSITORY,
      now: new Date('2026-08-09T14:05:00.000Z'),
    }).passed).toBe(false);

    expect(validateDownloadedEvidence({ ...promotedEvidence(), sourceReplayDigest: '' }, {
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
    expect(p0).toContain("github.event.workflow_run.path == '.github/workflows/stripe-runtime-evidence-promotion.yml'");
    expect(p0).not.toContain("github.event.workflow.path == '.github/workflows/stripe-runtime-evidence-promotion.yml'");
    expect(p0).toContain('node scripts/enterprise/fetch-stripe-promoted-runtime-evidence.mjs');
    expect(p0).toContain('STRIPE_RUNTIME_EVIDENCE_REQUIRED');
  });
});
