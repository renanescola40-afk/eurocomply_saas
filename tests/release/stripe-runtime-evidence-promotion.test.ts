import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const promotion = readFileSync('scripts/release/promote-stripe-runtime-evidence.mjs', 'utf8');
const replay = readFileSync('scripts/release/validate-stripe-runtime-replay.mjs', 'utf8');
const fetcher = readFileSync('scripts/enterprise/fetch-stripe-entitlement-runtime-proof.mjs', 'utf8');
const workflow = readFileSync('.github/workflows/stripe-runtime-evidence-promotion.yml', 'utf8');

describe('Stripe runtime evidence promotion contract', () => {
  it('requires exact SHA and all runtime correlations', () => {
    expect(promotion).toContain('RELEASE_SHA');
    expect(promotion).toContain('eventProcessed');
    expect(promotion).toContain('snapshotObserved');
    expect(promotion).toContain('policyObserved');
    expect(promotion).toContain('reconciliationObserved');
    expect(promotion).toContain('rawEvidenceDeleted');
  });

  it('rejects unsafe or invented evidence', () => {
    expect(promotion).toContain('containsSensitiveValues');
    expect(promotion).toContain('runtimeProofInvented: false');
    expect(promotion).toContain("status: 'Complete'");
    expect(promotion).toContain("validationStatus: 'passed'");
  });

  it('requires replay stability', () => {
    expect(replay).toContain('secondDeliveryDuplicate');
    expect(replay).toContain('snapshotCountStable');
    expect(replay).toContain('policyVersionStable');
    expect(replay).toContain('noSecondReconciliation');
  });

  it('auto-promotes only an exact successful source runtime proof', () => {
    expect(workflow).toContain('workflow_run:');
    expect(workflow).toContain('Stripe Entitlement Runtime Proof');
    expect(workflow).toContain('RUNTIME_PROOF_RUN_ID');
    expect(workflow).toContain('/commits/main');
    expect(workflow).toContain('fetch-stripe-entitlement-runtime-proof.mjs');
    expect(fetcher).toContain("const WORKFLOW_PATH = '.github/workflows/stripe-entitlement-runtime-proof.yml'");
    expect(fetcher).toContain('source_artifact_missing_or_ambiguous');
    expect(fetcher).toContain('sanitized_proof_invalid');
  });

  it('retains explicit manual recovery but not as the normal promotion path', () => {
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain('PROMOTE_STRIPE_RUNTIME_EVIDENCE');
    expect(workflow).toContain("if [[ \"$GITHUB_EVENT_NAME\" == 'workflow_dispatch' ]]");
    expect(workflow).toContain('retention-days: 365');
  });

  it('revalidates promoted output with the authoritative P0 validator', () => {
    expect(workflow).toContain('validate-stripe-runtime-evidence.mjs');
    expect(workflow).toContain('expectedCommitSha:process.env.RELEASE_SHA');
  });
});
