import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';

import { assessConversationFinalCloseout } from '../../scripts/enterprise/assess-conversation-final-closeout.mjs';
import { derivePersistentExecutionState } from '../../scripts/enterprise/write-persistent-execution-state.mjs';

const SHA = 'a'.repeat(40);
const NOW = new Date('2026-07-29T20:00:00.000Z');
const PRODUCTION_PATHS = [
  'docs/security/evidence/runtime/stripe-billing-validation.json',
  'docs/security/evidence/runtime/enterprise-runtime-evidence.json',
  'docs/security/evidence/runtime/production-final-validation.json',
  'docs/security/evidence/runtime/release-go-no-go.json',
];
const SCORECARD_PATHS = [
  'artifacts/enterprise-readiness/enterprise-readiness-scorecard.json',
  'artifacts/enterprise-readiness/persistent-execution-state.json',
];
const GO_KEYS = [
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

function write(root, path, value) {
  const output = join(root, path);
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify(value, null, 2)}\n`);
}

function retrievalSource(key, workflow, artifactName, paths, runId, artifactId) {
  return {
    key,
    workflow,
    artifactName,
    expectedPaths: paths,
    extractedPaths: paths,
    status: 'Complete',
    runId,
    artifactId,
    runEvent: 'workflow_dispatch',
    runUpdatedAt: NOW.toISOString(),
    artifactUpdatedAt: NOW.toISOString(),
    failure: null,
  };
}

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'risck-closeout-'));
  const scorecard = {
    schema: 'risck-comply.enterprise-readiness-scorecard.v1',
    generatedFromRealEvidence: true,
    scorePercent: 100,
    completedPercent: 100,
    remainingPercent: 0,
    releaseDecision: 'GO',
    publishRecommendation: 'ENTERPRISE_PRODUCTION',
    criticalOpen: 0,
    criticalFailed: 0,
    controls: Array.from({ length: 100 }, (_, index) => ({
      id: `CTRL-${String(index + 1).padStart(3, '0')}`,
      status: 'PASS',
      critical: index < 10,
    })),
  };
  const scorecardBytes = Buffer.from(`${JSON.stringify(scorecard, null, 2)}\n`);
  const state = derivePersistentExecutionState({
    scorecard,
    assessedSha: SHA,
    runId: 123,
    runAttempt: 1,
    sourceScorecardSha256: createHash('sha256').update(scorecardBytes).digest('hex'),
    generatedAt: NOW.toISOString(),
  });
  const component = (commitBound = true) => ({
    present: true,
    parseable: true,
    status: 'Complete',
    outcome: 'passed',
    commitBound,
    shaMatches: commitBound ? true : null,
  });

  write(root, 'artifacts/enterprise-conversation-closeout/retrieval-manifest.json', {
    schema: 'risck-comply.enterprise-conversation-closeout-retrieval.v1',
    repository: 'renanescola40-afk/eurocomply_saas',
    targetSha: SHA,
    generatedAt: NOW.toISOString(),
    status: 'Complete',
    outcome: 'passed',
    sources: [
      retrievalSource(
        'enterpriseProductionFinal',
        'enterprise-production-gate.yml',
        `enterprise-production-final-evidence-${SHA}`,
        PRODUCTION_PATHS,
        '101',
        '201',
      ),
      retrievalSource(
        'enterpriseReadinessScorecard',
        'enterprise-readiness-scorecard.yml',
        `enterprise-readiness-scorecard-${SHA}`,
        SCORECARD_PATHS,
        '102',
        '202',
      ),
    ],
    blockers: [],
    noSecretsStored: true,
    truthBoundary: 'All mandatory exact-main-SHA workflow artifacts were retrieved.',
  });
  write(root, 'artifacts/enterprise-readiness/enterprise-readiness-scorecard.json', scorecard);
  write(root, 'artifacts/enterprise-readiness/persistent-execution-state.json', state);
  write(root, 'docs/security/evidence/runtime/stripe-billing-validation.json', {
    evidenceItem: 'stripe-billing-validation',
    status: 'Complete',
    validationStatus: 'passed',
    generatedAt: NOW.toISOString(),
    repository: 'renanescola40-afk/eurocomply_saas',
    branch: 'main',
    commitSha: SHA,
    runtimeProof: { headSha: SHA, runId: '123', artifactDigest: `sha256:${'b'.repeat(64)}` },
    checkout: { tested: true },
    portal: { tested: true },
    webhookSignature: { validSignatureRequiredBeforeDispatch: true },
    webhookIdempotency: { duplicateDoesNotMutateSubscriptionState: true },
    subscriptionSync: { customerMismatchRejected: true },
  });
  write(root, 'docs/security/evidence/runtime/enterprise-runtime-evidence.json', {
    schema: 'risck-comply.enterprise-runtime-evidence.v1',
    evidenceItem: 'enterprise-runtime-evidence',
    status: 'Complete',
    outcome: 'passed',
    releaseTarget: 'enterprise',
    commitSha: SHA,
    buildSha: SHA,
    failures: [],
    noSecretsStored: true,
  });
  write(root, 'docs/security/evidence/runtime/production-final-validation.json', {
    schema: 'risck-comply.production-final-validation.v2',
    evidenceItem: 'production-final-validation',
    status: 'Complete',
    outcome: 'passed',
    releaseTarget: 'enterprise',
    commitSha: SHA,
    buildSha: SHA,
    commandFailures: [],
    evidenceFailures: [],
    metadataFailures: [],
    noSecretsStored: true,
  });
  write(root, 'docs/security/evidence/runtime/release-go-no-go.json', {
    schema: 'risck-comply.release-go-no-go.v1',
    evidenceItem: 'release-go-no-go',
    status: 'Complete',
    outcome: 'passed',
    generatedAt: NOW.toISOString(),
    reviewedAt: NOW.toISOString(),
    releaseTarget: 'enterprise',
    commitSha: SHA,
    buildSha: SHA,
    finalDecision: 'Go',
    goCriteriaSatisfied: true,
    p0Blockers: [],
    deferredRisks: [],
    controlsVerified: ['all Enterprise controls'],
    noSecretsStored: true,
    evidenceIntegrity: {
      containsSensitiveValues: false,
      valuesRedacted: true,
      authorizationHeaderStored: false,
      cookiesStored: false,
    },
    evidenceFiles: Object.fromEntries(GO_KEYS.map((key) => [
      key,
      component(!['observabilitySmoke', 'productionSecretsProviderStores', 'branchProtectionRequiredChecks', 'externalSecurityReviewOrPentest'].includes(key)),
    ])),
  });
  return root;
}

test('completes only with strict runtime evidence, retrieval provenance and exact-SHA 100/100 state', () => {
  const root = fixture();
  try {
    const result = assessConversationFinalCloseout({ root, expectedSha: SHA, generatedAt: NOW.toISOString(), now: NOW });
    assert.equal(result.status, 'Complete');
    assert.equal(result.decision, 'CONVERSATION_COMPLETE');
    assert.equal(result.completionPercentage, 100);
    assert.deepEqual(result.blockers, []);
    assert.equal(result.retrievalSources.length, 2);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('remains open when the release evidence belongs to another SHA', () => {
  const root = fixture();
  try {
    const path = 'docs/security/evidence/runtime/release-go-no-go.json';
    const stale = JSON.parse(readFileSync(join(root, path), 'utf8'));
    stale.commitSha = 'b'.repeat(40);
    write(root, path, stale);
    const result = assessConversationFinalCloseout({ root, expectedSha: SHA, generatedAt: NOW.toISOString(), now: NOW });

    assert.equal(result.status, 'Open');
    assert.equal(result.decision, 'CONVERSATION_REMAINS_OPEN');
    assert.ok(result.blockers.some((blocker) => blocker.control === 'releaseGoNoGo'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('remains open when artifact retrieval provenance is incomplete', () => {
  const root = fixture();
  try {
    const path = 'artifacts/enterprise-conversation-closeout/retrieval-manifest.json';
    const manifest = JSON.parse(readFileSync(join(root, path), 'utf8'));
    manifest.status = 'Open';
    manifest.outcome = 'blocked';
    manifest.sources[0].status = 'Open';
    manifest.sources[0].failure = 'exact_sha_artifact_missing';
    manifest.sources[0].runId = null;
    manifest.sources[0].artifactId = null;
    manifest.sources[0].extractedPaths = [];
    manifest.blockers = [{
      key: 'enterpriseProductionFinal',
      workflow: 'enterprise-production-gate.yml',
      failure: 'exact_sha_artifact_missing',
    }];
    write(root, path, manifest);

    const result = assessConversationFinalCloseout({ root, expectedSha: SHA, generatedAt: NOW.toISOString(), now: NOW });
    assert.equal(result.status, 'Open');
    assert.ok(result.blockers.some((blocker) => blocker.control === 'retrievalManifest'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
