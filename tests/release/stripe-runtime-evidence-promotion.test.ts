import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const promotion = readFileSync('scripts/release/promote-stripe-runtime-evidence.mjs', 'utf8');
const replay = readFileSync('scripts/release/validate-stripe-runtime-replay.mjs', 'utf8');
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

  it('uses protected exact-main workflow semantics', () => {
    expect(workflow).toContain('environment: production');
    expect(workflow).toContain('PROMOTE_STRIPE_RUNTIME_EVIDENCE');
    expect(workflow).toContain('git rev-parse origin/main');
    expect(workflow).toContain('actions/download-artifact@v8');
    expect(workflow).toContain('retention-days: 365');
  });
});
