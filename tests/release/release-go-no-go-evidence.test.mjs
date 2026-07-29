import assert from 'node:assert/strict';
import test from 'node:test';

import { validateReleaseGoNoGoEvidence } from '../../scripts/release/validate-release-go-no-go-evidence.mjs';

const SHA = 'a'.repeat(40);
const REQUIRED_KEYS = [
  'enterpriseEnvReadiness',
  'deploymentSmoke',
  'observabilitySmoke',
  'rollbackDryRun',
  'supabaseLiveRls',
  'productionSecretsProviderStores',
  'stripeBillingValidation',
  'uploadScannerValidation',
  'branchProtectionRequiredChecks',
  'authRbacFinalValidation',
  'stepUpMfaValidation',
  'auditChainLiveValidation',
  'externalSecurityReviewOrPentest',
];

function completeEvidence(commitBound = true) {
  return {
    present: true,
    parseable: true,
    status: 'Complete',
    outcome: 'passed',
    commitBound,
    shaMatches: commitBound ? true : null,
  };
}

function goNoGo(overrides = {}) {
  return {
    schema: 'risck-comply.release-go-no-go.v1',
    evidenceItem: 'release-go-no-go',
    status: 'Complete',
    outcome: 'passed',
    generatedAt: '2026-07-29T18:00:00.000Z',
    reviewedAt: '2026-07-29T18:00:00.000Z',
    releaseTarget: 'enterprise',
    commitSha: SHA,
    buildSha: SHA,
    finalDecision: 'Go',
    goCriteriaSatisfied: true,
    p0Blockers: [],
    deferredRisks: [],
    controlsVerified: ['exact-SHA enterprise release'],
    noSecretsStored: true,
    evidenceIntegrity: {
      containsSensitiveValues: false,
      valuesRedacted: true,
      authorizationHeaderStored: false,
      cookiesStored: false,
    },
    evidenceFiles: Object.fromEntries(REQUIRED_KEYS.map((key) => [key, completeEvidence(
      !['observabilitySmoke', 'productionSecretsProviderStores', 'branchProtectionRequiredChecks', 'externalSecurityReviewOrPentest'].includes(key),
    )])),
    ...overrides,
  };
}

test('accepts a complete exact-SHA Enterprise Go decision', () => {
  assert.deepEqual(validateReleaseGoNoGoEvidence(goNoGo(), {
    expectedCommitSha: SHA,
    expectedBuildSha: SHA,
    expectedReleaseTarget: 'enterprise',
  }), []);
});

test('rejects a stale release decision and stale component evidence', () => {
  const document = goNoGo({
    commitSha: 'b'.repeat(40),
    evidenceFiles: {
      ...goNoGo().evidenceFiles,
      deploymentSmoke: { ...completeEvidence(), shaMatches: false },
    },
  });
  const failures = validateReleaseGoNoGoEvidence(document, {
    expectedCommitSha: SHA,
    expectedBuildSha: SHA,
    expectedReleaseTarget: 'enterprise',
  });

  assert.ok(failures.includes('commit_sha_mismatch'));
  assert.ok(failures.includes('evidence_deploymentSmoke_sha_mismatch'));
});

test('rejects Go when blockers or deferred risks remain', () => {
  const failures = validateReleaseGoNoGoEvidence(goNoGo({
    p0Blockers: [{ id: 'P0-1' }],
    deferredRisks: ['unreviewed risk'],
  }), {
    expectedCommitSha: SHA,
    expectedBuildSha: SHA,
    expectedReleaseTarget: 'enterprise',
  });

  assert.ok(failures.includes('p0_blockers_must_be_empty'));
  assert.ok(failures.includes('deferred_risks_must_be_empty'));
});

test('rejects incomplete, unredacted or missing component evidence', () => {
  const document = goNoGo({
    noSecretsStored: false,
    evidenceIntegrity: {
      containsSensitiveValues: true,
      valuesRedacted: false,
      authorizationHeaderStored: true,
      cookiesStored: true,
    },
  });
  delete document.evidenceFiles.authRbacFinalValidation;

  const failures = validateReleaseGoNoGoEvidence(document, {
    expectedCommitSha: SHA,
    expectedBuildSha: SHA,
    expectedReleaseTarget: 'enterprise',
  });

  assert.ok(failures.includes('no_secrets_stored_required'));
  assert.ok(failures.includes('sensitive_values_must_be_false'));
  assert.ok(failures.includes('evidence_authRbacFinalValidation_missing'));
});
