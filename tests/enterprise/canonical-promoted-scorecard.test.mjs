import assert from 'node:assert/strict';
import test from 'node:test';

import { buildCanonicalPromotedScorecard } from '../../scripts/enterprise/build-canonical-promoted-scorecard.mjs';

const SHA = 'a'.repeat(40);
const RUN = '12345';
const REPOSITORY = 'renanescola40-afk/eurocomply_saas';

function control(index, status = index < 46 ? 'PASS' : 'NOT_VERIFIED') {
  const special = { 46: 'REC-01', 47: 'SEC-10', 48: 'REL-10' }[index];
  const id = special ?? `CTL-${String(index + 1).padStart(2, '0')}`;
  return {
    id,
    domain: `domain-${Math.floor(index / 10) + 1}`,
    title: id,
    critical: index >= 40,
    weight: 1,
    status,
    earnedWeight: status === 'PASS' ? 1 : 0,
    evidencePath: `evidence/${id}.json`,
    evidenceCheck: null,
    reason: status === 'PASS' ? 'verified' : 'evidence_file_missing',
  };
}

function baseline() {
  const controls = Array.from({ length: 100 }, (_, index) => control(index));
  return {
    schema: 'risck-comply.enterprise-readiness-scorecard.v1',
    generatedFromRealEvidence: true,
    scorePercent: 46,
    scoreOutOfTen: 4.6,
    completedPercent: 46,
    remainingPercent: 54,
    classification: 'NOT_READY',
    releaseDecision: 'NO_GO',
    publishRecommendation: 'DO_NOT_PUBLISH',
    criticalOpen: 54,
    criticalFailed: 0,
    counts: { PASS: 46, NOT_VERIFIED: 54 },
    domains: [],
    controls,
  };
}

function promotion(promoted = ['CTL-50', 'CTL-51']) {
  const source = baseline();
  const controls = source.controls.map((item) => promoted.includes(item.id)
    ? { ...item, status: 'PASS', evidence: [{ evidenceItem: `proof-${item.id}`, runId: RUN, generatedAt: '2026-07-22T10:00:00Z' }] }
    : { ...item, evidence: item.status === 'PASS' ? [{ evidenceItem: `baseline-${item.id}`, runId: RUN, generatedAt: '2026-07-22T10:00:00Z' }] : [] });
  const completePercent = controls.filter((item) => item.status === 'PASS').length;
  return {
    schema: 'risck-comply.enterprise-scorecard-promotion.v1',
    generatedAt: '2026-07-22T10:00:00Z',
    targetSha: SHA,
    score: { completePercent, remainingPercent: 100 - completePercent },
    counts: { PASS: completePercent, NOT_VERIFIED: 100 - completePercent },
    releaseDecision: 'NO_GO',
    criticalOpen: controls.filter((item) => item.critical && item.status !== 'PASS').map((item) => item.id),
    rejectedEvidence: [],
    controls,
    integrity: { sha256: 'b'.repeat(64) },
  };
}

function closeout(decision = 'PARTIAL_SAFE_EVIDENCE_PROMOTED') {
  return {
    schema: 'risck-comply.enterprise-promotion-closeout.v4',
    generatedAt: '2026-07-22T10:00:00Z',
    repository: REPOSITORY,
    targetSha: SHA,
    workflowRunId: RUN,
    profile: 'safe',
    runtimeCampaignDecision: 'READY_FOR_PARTIAL_SAFE_PROMOTION',
    evidenceManifestDecision: 'READY_FOR_PROMOTION',
    baseline: { completedPercent: 46 },
    promoted: { completePercent: 48, remainingPercent: 52 },
    promotedDeltaPercent: 2,
    closeoutDecision: decision,
    releaseDecision: 'NO_GO',
    criticalOpen: [],
    rejectedEvidence: 0,
    coherencePromoted: false,
    promotedLanes: ['IAM-RBAC'],
    blockedLanes: ['TEN-RLS'],
    laneEvidenceCounts: { 'IAM-RBAC': 1, 'TEN-RLS': 0 },
    integrity: {},
  };
}

test('builds a canonical monotonic NO_GO scorecard from partial safe evidence', () => {
  const result = buildCanonicalPromotedScorecard({ baseline: baseline(), promotion: promotion(), closeout: closeout(), targetSha: SHA, sourceRunId: RUN, generatedAt: '2026-07-22T11:00:00Z' });
  assert.equal(result.completedPercent, 48);
  assert.equal(result.remainingPercent, 52);
  assert.equal(result.releaseDecision, 'NO_GO');
  assert.deepEqual(result.promotionProvenance.promotedLanes, ['IAM-RBAC']);
  assert.deepEqual(result.promotionProvenance.blockedLanes, ['TEN-RLS']);
  assert.match(result.integrity.sha256, /^[a-f0-9]{64}$/);
});

test('rejects promotion of Recovery, Assurance proxy and final coherence controls', () => {
  for (const id of ['REC-01', 'SEC-10', 'REL-10']) {
    assert.throws(() => buildCanonicalPromotedScorecard({ baseline: baseline(), promotion: promotion([id]), closeout: closeout(), targetSha: SHA, sourceRunId: RUN }), new RegExp(`cannot promote ${id}`));
  }
});

test('rejects baseline downgrades and any rejected evidence', () => {
  const downgraded = promotion();
  downgraded.controls[0] = { ...downgraded.controls[0], status: 'NOT_VERIFIED', evidence: [] };
  assert.throws(() => buildCanonicalPromotedScorecard({ baseline: baseline(), promotion: downgraded, closeout: closeout(), targetSha: SHA, sourceRunId: RUN }), /downgrades baseline control/);

  const rejected = promotion();
  rejected.rejectedEvidence = [{ evidenceItem: 'bad', failures: ['bad'] }];
  assert.throws(() => buildCanonicalPromotedScorecard({ baseline: baseline(), promotion: rejected, closeout: closeout(), targetSha: SHA, sourceRunId: RUN }), /rejected evidence must be zero/);
});

test('rejects wrong SHA, wrong run and any safe bundle claiming GO', () => {
  assert.throws(() => buildCanonicalPromotedScorecard({ baseline: baseline(), promotion: promotion(), closeout: closeout(), targetSha: 'c'.repeat(40), sourceRunId: RUN }), /exact-SHA promotion provenance mismatch/);
  assert.throws(() => buildCanonicalPromotedScorecard({ baseline: baseline(), promotion: promotion(), closeout: closeout(), targetSha: SHA, sourceRunId: '9' }), /source workflow run mismatch/);
  const unsafe = promotion();
  unsafe.releaseDecision = 'GO';
  assert.throws(() => buildCanonicalPromotedScorecard({ baseline: baseline(), promotion: unsafe, closeout: closeout(), targetSha: SHA, sourceRunId: RUN }), /must remain NO_GO/);
});
