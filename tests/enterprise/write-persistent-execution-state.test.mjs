import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  derivePersistentExecutionState,
  resolveAssessmentContext,
} from '../../scripts/enterprise/write-persistent-execution-state.mjs';

const SHA = 'a'.repeat(40);
const MAIN_SHA = 'c'.repeat(40);
const SCORECARD_SHA256 = 'b'.repeat(64);

function scorecard({ pass = 45, partial = 0, blocked = 1, fail = 0, notApplicable = 0 } = {}) {
  const notVerified = 100 - pass - partial - blocked - fail - notApplicable;
  const statuses = [
    ...Array(pass).fill('PASS'),
    ...Array(partial).fill('PARTIAL'),
    ...Array(blocked).fill('BLOCKED'),
    ...Array(fail).fill('FAIL'),
    ...Array(notVerified).fill('NOT_VERIFIED'),
    ...Array(notApplicable).fill('NOT_APPLICABLE'),
  ];
  const controls = statuses.map((status, index) => ({ id: `CTL-${String(index + 1).padStart(3, '0')}`, status, critical: index < 50 }));
  const applicable = 100 - notApplicable;
  const completedPercent = Number((((pass + partial * 0.5) / applicable) * 100).toFixed(1));
  const criticalOpen = controls.filter((control) => control.critical && control.status !== 'PASS').length;
  return {
    schema: 'risck-comply.enterprise-readiness-scorecard.v1',
    scorePercent: completedPercent,
    completedPercent,
    remainingPercent: Number((100 - completedPercent).toFixed(1)),
    criticalOpen,
    releaseDecision: completedPercent === 100 && criticalOpen === 0 ? 'GO' : 'NO_GO',
    controls,
  };
}

test('derives a fresh exact-SHA current-main NO_GO state without manual percentages', () => {
  const state = derivePersistentExecutionState({ scorecard: scorecard(), assessedSha: SHA, runId: 12345, sourceScorecardSha256: SCORECARD_SHA256, generatedAt: '2026-07-29T00:00:00.000Z' });
  assert.equal(state.official_completion_percent, 45);
  assert.equal(state.official_remaining_percent, 55);
  assert.equal(state.assessment_scope, 'main');
  assert.equal(state.is_current_main, true);
  assert.equal(state.observed_main_sha, SHA);
  assert.equal(state.current_decision, 'NO_GO');
  assert.equal(state.scorecard_decision, 'NO_GO');
  assert.equal(state.classification, 'VERIFIED_CURRENT_MAIN_NO_GO');
  assert.equal(state.evidence_freshness.status, 'FRESH_EXACT_SHA');
  assert.equal(state.last_verified_score_sha, SHA);
});

test('derives pull-request diagnostics without claiming current-main authority', () => {
  const state = derivePersistentExecutionState({
    scorecard: scorecard(),
    assessedSha: SHA,
    observedMainSha: MAIN_SHA,
    assessmentScope: 'pull_request',
    runId: 12345,
    sourceScorecardSha256: SCORECARD_SHA256,
  });

  assert.equal(state.assessment_scope, 'pull_request');
  assert.equal(state.is_current_main, false);
  assert.equal(state.observed_main_sha, MAIN_SHA);
  assert.equal(state.last_verified_score_sha, SHA);
  assert.equal(state.classification, 'VERIFIED_EXACT_SHA_DIAGNOSTIC');
  assert.equal(state.current_decision, 'NO_GO');
  assert.equal(state.scorecard_decision, 'NO_GO');
  assert.equal(state.publish_recommendation, 'DO_NOT_PUBLISH_AS_ENTERPRISE');
  assert.match(state.evidence_freshness.reason, /not protected-main release authority/);
});

test('never converts a 100% pull-request diagnostic into Enterprise GO', () => {
  const state = derivePersistentExecutionState({
    scorecard: scorecard({ pass: 100, blocked: 0 }),
    assessedSha: SHA,
    observedMainSha: MAIN_SHA,
    assessmentScope: 'pull_request',
    runId: 12345,
    sourceScorecardSha256: SCORECARD_SHA256,
  });

  assert.equal(state.scorecard_decision, 'GO');
  assert.equal(state.current_decision, 'NO_GO');
  assert.equal(state.classification, 'VERIFIED_EXACT_SHA_DIAGNOSTIC');
  assert.equal(state.is_current_main, false);
  assert.equal(state.publish_recommendation, 'DO_NOT_PUBLISH_AS_ENTERPRISE');
});

test('resolves pull-request scope from the GitHub event base SHA', () => {
  const directory = mkdtempSync(join(tmpdir(), 'risck-scorecard-event-'));
  const eventPath = join(directory, 'event.json');
  writeFileSync(eventPath, JSON.stringify({ pull_request: { base: { sha: MAIN_SHA } } }));

  try {
    assert.deepEqual(resolveAssessmentContext({
      eventName: 'pull_request',
      eventPath,
      ref: 'refs/pull/1784/merge',
      assessedSha: SHA,
    }), {
      assessmentScope: 'pull_request',
      observedMainSha: MAIN_SHA,
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('allows authoritative assessment only on protected main for GitHub workflow events', () => {
  assert.deepEqual(resolveAssessmentContext({
    eventName: 'push',
    ref: 'refs/heads/main',
    assessedSha: SHA,
  }), {
    assessmentScope: 'main',
    observedMainSha: SHA,
  });

  assert.throws(
    () => resolveAssessmentContext({
      eventName: 'workflow_dispatch',
      ref: 'refs/heads/feature',
      assessedSha: SHA,
    }),
    /cannot claim protected-main Enterprise authority/,
  );
});

test('preserves canonical partial and not-applicable scoring', () => {
  const state = derivePersistentExecutionState({
    scorecard: scorecard({ pass: 45, partial: 1, blocked: 1, notApplicable: 1 }),
    assessedSha: SHA,
    runId: 12345,
    sourceScorecardSha256: SCORECARD_SHA256,
  });
  assert.equal(state.official_completion_percent, 46);
  assert.equal(state.official_remaining_percent, 54);
  assert.equal(state.controls_partial, 1);
  assert.equal(state.controls_not_applicable, 1);
});

test('rejects a scorecard whose percentage was manually inflated', () => {
  const inflated = scorecard();
  inflated.scorePercent = 46;
  inflated.completedPercent = 46;
  inflated.remainingPercent = 54;
  assert.throws(
    () => derivePersistentExecutionState({ scorecard: inflated, assessedSha: SHA, runId: 12345, sourceScorecardSha256: SCORECARD_SHA256 }),
    /percentage does not match control statuses/,
  );
});

test('derives GO only when every control passes on current main', () => {
  const state = derivePersistentExecutionState({ scorecard: scorecard({ pass: 100, blocked: 0 }), assessedSha: SHA, runId: 12345, sourceScorecardSha256: SCORECARD_SHA256 });
  assert.equal(state.current_decision, 'GO');
  assert.equal(state.scorecard_decision, 'GO');
  assert.equal(state.classification, 'ENTERPRISE_READY');
  assert.equal(state.publish_recommendation, 'PUBLISH_AS_ENTERPRISE');
});

test('rejects duplicate controls and inconsistent release decisions', () => {
  const duplicate = scorecard();
  duplicate.controls[1].id = duplicate.controls[0].id;
  assert.throws(() => derivePersistentExecutionState({ scorecard: duplicate, assessedSha: SHA, runId: 12345, sourceScorecardSha256: SCORECARD_SHA256 }), /unique/);
  const inconsistent = scorecard();
  inconsistent.releaseDecision = 'GO';
  assert.throws(() => derivePersistentExecutionState({ scorecard: inconsistent, assessedSha: SHA, runId: 12345, sourceScorecardSha256: SCORECARD_SHA256 }), /release decision is inconsistent/);
});

test('rejects missing scorecard digest, invalid workflow attempt and invalid scope', () => {
  assert.throws(
    () => derivePersistentExecutionState({ scorecard: scorecard(), assessedSha: SHA, runId: 12345 }),
    /SHA-256 is invalid/,
  );
  assert.throws(
    () => derivePersistentExecutionState({ scorecard: scorecard(), assessedSha: SHA, runId: 12345, runAttempt: 0, sourceScorecardSha256: SCORECARD_SHA256 }),
    /run attempt/,
  );
  assert.throws(
    () => derivePersistentExecutionState({
      scorecard: scorecard(),
      assessedSha: SHA,
      observedMainSha: MAIN_SHA,
      assessmentScope: 'preview',
      runId: 12345,
      sourceScorecardSha256: SCORECARD_SHA256,
    }),
    /assessment scope/,
  );
});
