import assert from 'node:assert/strict';
import test from 'node:test';

import { validatePublicProductionGoNoGoEvidence } from '../../scripts/release/validate-public-production-go-no-go-evidence.mjs';

const SHA = 'a'.repeat(40);
const REQUIRED_KEYS = [
  'publicProductionEnvReadiness',
  'deploymentSmoke',
  'observabilitySmoke',
  'rollbackDryRun',
  'supabaseLiveRls',
  'branchProtectionRequiredChecks',
  'productionFinalValidation',
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

function decision(overrides = {}) {
  return {
    schema: 'risck-comply.public-production-go-no-go.v1',
    evidenceItem: 'release-go-no-go',
    profile: 'public-production',
    status: 'Complete',
    outcome: 'passed',
    generatedAt: '2026-07-29T18:00:00.000Z',
    reviewedAt: '2026-07-29T18:00:00.000Z',
    releaseTarget: 'public-production',
    commitSha: SHA,
    buildSha: SHA,
    finalDecision: 'Go',
    goCriteriaSatisfied: true,
    p0Blockers: [],
    deferredRisks: [],
    controlsVerified: ['exact-SHA public production release'],
    noSecretsStored: true,
    evidenceIntegrity: {
      containsSensitiveValues: false,
      valuesRedacted: true,
      authorizationHeaderStored: false,
      cookiesStored: false,
      rawUrlsStored: false,
      exactReleaseShaRequired: true,
      staleEvidenceAccepted: false,
    },
    evidenceFiles: Object.fromEntries(REQUIRED_KEYS.map((key) => [key, completeEvidence(
      !['observabilitySmoke', 'branchProtectionRequiredChecks'].includes(key),
    )])),
    ...overrides,
  };
}

const options = {
  expectedCommitSha: SHA,
  expectedBuildSha: SHA,
  expectedReleaseTarget: 'public-production',
};

test('accepts a complete exact-SHA public production Go decision', () => {
  assert.deepEqual(validatePublicProductionGoNoGoEvidence(decision(), options), []);
});

test('rejects stale decision and component evidence', () => {
  const document = decision({
    commitSha: 'b'.repeat(40),
    evidenceFiles: {
      ...decision().evidenceFiles,
      deploymentSmoke: { ...completeEvidence(), shaMatches: false },
    },
  });
  const failures = validatePublicProductionGoNoGoEvidence(document, options);

  assert.ok(failures.includes('commit_sha_mismatch'));
  assert.ok(failures.includes('evidence_deploymentSmoke_sha_mismatch'));
});

test('rejects blockers, deferred risks, unsafe evidence, and missing prerequisites', () => {
  const document = decision({
    p0Blockers: [{ id: 'P0-PUBLIC-001' }],
    deferredRisks: ['unreviewed risk'],
    noSecretsStored: false,
    evidenceIntegrity: {
      containsSensitiveValues: true,
      valuesRedacted: false,
      authorizationHeaderStored: true,
      cookiesStored: true,
      rawUrlsStored: true,
      exactReleaseShaRequired: false,
      staleEvidenceAccepted: true,
    },
  });
  delete document.evidenceFiles.productionFinalValidation;

  const failures = validatePublicProductionGoNoGoEvidence(document, options);
  assert.ok(failures.includes('p0_blockers_must_be_empty'));
  assert.ok(failures.includes('deferred_risks_must_be_empty'));
  assert.ok(failures.includes('no_secrets_stored_required'));
  assert.ok(failures.includes('sensitive_values_must_be_false'));
  assert.ok(failures.includes('raw_urls_must_not_be_stored'));
  assert.ok(failures.includes('exact_release_sha_required'));
  assert.ok(failures.includes('stale_evidence_must_not_be_accepted'));
  assert.ok(failures.includes('evidence_productionFinalValidation_missing'));
});

test('rejects enterprise profile substitution', () => {
  const failures = validatePublicProductionGoNoGoEvidence(decision({
    schema: 'risck-comply.release-go-no-go.v1',
    profile: 'enterprise',
    releaseTarget: 'enterprise',
  }), options);

  assert.ok(failures.includes('schema_invalid'));
  assert.ok(failures.includes('profile_invalid'));
  assert.ok(failures.includes('release_target_mismatch'));
});
