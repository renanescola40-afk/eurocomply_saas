import assert from 'node:assert/strict';
import test from 'node:test';

import { buildRlsReconciliationClosureEvidence } from './write-rls-reconciliation-closure-evidence.mjs';

const SHA = 'a'.repeat(40);
const PASS_VERIFICATION = {
  status: 'PASS',
  errors: [],
  summary: {
    requiredRlsTables: 3,
    observedRlsTables: 3,
    requiredPolicies: 2,
    observedRequiredPolicies: 2,
    forbiddenWebhookPolicies: 0,
    migrationHistoryPresent: true,
  },
};
const PROOF = [
  'rls|permissions|true|true',
  'rls|role_permissions|true|true',
  'rls|stripe_webhook_events|true|true',
  'policy|permissions|permissions_authenticated_read|SELECT|authenticated',
  'policy|role_permissions|role_permissions_authenticated_read|SELECT|authenticated',
  'history|20260726070000|permissions_catalog_rls_hotfix',
  '',
].join('\n');

test('emits PASS evidence bound to the exact production SHA only after verified reconciliation', () => {
  const evidence = buildRlsReconciliationClosureEvidence({
    verification: PASS_VERIFICATION,
    proofText: PROOF,
    targetSha: SHA,
    runId: '12345',
    runUrl: 'https://github.com/owner/repo/actions/runs/12345',
    generatedAt: '2026-08-11T12:00:00.000Z',
  });

  assert.equal(evidence.status, 'PASS');
  assert.equal(evidence.outcome, 'passed');
  assert.equal(evidence.targetSha, SHA);
  assert.equal(evidence.expectedSha, SHA);
  assert.equal(evidence.environment, 'production');
  assert.equal(evidence.productionWritePerformed, true);
  assert.equal(evidence.evidenceIntegrity.containsSensitiveValues, false);
  assert.equal(evidence.evidenceIntegrity.exactShaBound, true);
  assert.match(evidence.evidenceDigests.verificationJson, /^sha256:[a-f0-9]{64}$/);
  assert.match(evidence.evidenceDigests.reconciliationProof, /^sha256:[a-f0-9]{64}$/);
});

test('refuses to emit closure evidence from a failed reconciliation verification', () => {
  assert.throws(
    () => buildRlsReconciliationClosureEvidence({
      verification: { ...PASS_VERIFICATION, status: 'FAIL', errors: ['missing policy'] },
      proofText: PROOF,
      targetSha: SHA,
      runId: '12345',
      runUrl: 'https://github.com/owner/repo/actions/runs/12345',
    }),
    /must be PASS/,
  );
});

test('refuses evidence that is not bound to a full lowercase SHA', () => {
  assert.throws(
    () => buildRlsReconciliationClosureEvidence({
      verification: PASS_VERIFICATION,
      proofText: PROOF,
      targetSha: 'ABC',
      runId: '12345',
      runUrl: 'https://github.com/owner/repo/actions/runs/12345',
    }),
    /40-character Git SHA/,
  );
});

test('refuses proof without the required reconciliation migration history', () => {
  assert.throws(
    () => buildRlsReconciliationClosureEvidence({
      verification: PASS_VERIFICATION,
      proofText: PROOF.replace('history|20260726070000|permissions_catalog_rls_hotfix', ''),
      targetSha: SHA,
      runId: '12345',
      runUrl: 'https://github.com/owner/repo/actions/runs/12345',
    }),
    /migration history 20260726070000/,
  );
});
