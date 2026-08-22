import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePersistentExecutionState } from '../../scripts/enterprise/check-persistent-execution-state.mjs';

const HEAD = 'a'.repeat(40);
const OLD = 'b'.repeat(40);
const MAIN = 'c'.repeat(40);

function state(overrides = {}) {
  return {
    timestamp: '2026-07-29T00:00:00.000Z',
    observed_main_sha: HEAD,
    last_verified_score_sha: OLD,
    official_completion_percent: 45,
    official_remaining_percent: 55,
    controls_pass: 45,
    controls_partial: 0,
    controls_fail: 0,
    controls_blocked: 1,
    controls_not_verified: 54,
    controls_not_applicable: 0,
    controls_total: 100,
    critical_controls_open: 49,
    current_decision: 'NO_GO',
    classification: 'UNVERIFIED_CURRENT_MAIN',
    publish_recommendation: 'DO_NOT_PUBLISH_AS_ENTERPRISE',
    evidence_freshness: {
      status: 'STALE',
      last_verified_sha: OLD,
      scorecard_run_id: 12345,
      source_scorecard_schema: 'risck-comply.enterprise-readiness-scorecard.v1',
      source_scorecard_sha256: 'c'.repeat(64),
    },
    ...overrides,
  };
}

function diagnosticState(overrides = {}) {
  return state({
    assessment_scope: 'pull_request',
    is_current_main: false,
    observed_main_sha: MAIN,
    last_verified_score_sha: HEAD,
    official_completion_percent: null,
    official_remaining_percent: null,
    diagnostic_completion_percent: 45,
    diagnostic_remaining_percent: 55,
    classification: 'VERIFIED_EXACT_SHA_DIAGNOSTIC',
    scorecard_decision: 'NO_GO',
    evidence_freshness: {
      status: 'FRESH_EXACT_SHA',
      last_verified_sha: HEAD,
      scorecard_run_id: 12345,
      source_scorecard_schema: 'risck-comply.enterprise-readiness-scorecard.v1',
      source_scorecard_sha256: 'c'.repeat(64),
    },
    ...overrides,
  });
}

test('accepts an explicitly stale historical score without new scope fields', () => {
  assert.deepEqual(validatePersistentExecutionState(state(), HEAD), []);
});

test('rejects a historical score represented as fresh', () => {
  assert.ok(validatePersistentExecutionState(state({
    evidence_freshness: {
      status: 'FRESH_EXACT_SHA',
      last_verified_sha: OLD,
      scorecard_run_id: 12345,
      source_scorecard_schema: 'risck-comply.enterprise-readiness-scorecard.v1',
      source_scorecard_sha256: 'c'.repeat(64),
    },
  }), HEAD).includes('fresh_score_must_match_checked_out_sha'));
});

test('accepts fresh exact-SHA pull-request diagnostics against a distinct main base', () => {
  assert.deepEqual(validatePersistentExecutionState(diagnosticState(), HEAD), []);
});

test('rejects a pull-request diagnostic that publishes official percentages', () => {
  const failures = validatePersistentExecutionState(diagnosticState({
    official_completion_percent: 45,
    official_remaining_percent: 55,
  }), HEAD);

  assert.ok(failures.includes('pull_request_cannot_publish_official_percentages'));
});

test('rejects a pull-request diagnostic that claims current-main classification', () => {
  const failures = validatePersistentExecutionState(diagnosticState({
    classification: 'VERIFIED_CURRENT_MAIN_NO_GO',
  }), HEAD);

  assert.ok(failures.includes('pull_request_requires_diagnostic_classification'));
});

test('rejects Enterprise GO or publication authority in pull-request scope', () => {
  const failures = validatePersistentExecutionState(diagnosticState({
    diagnostic_completion_percent: 100,
    diagnostic_remaining_percent: 0,
    controls_pass: 100,
    controls_partial: 0,
    controls_fail: 0,
    controls_blocked: 0,
    controls_not_verified: 0,
    controls_not_applicable: 0,
    critical_controls_open: 0,
    scorecard_decision: 'GO',
    current_decision: 'GO',
    classification: 'ENTERPRISE_READY',
    publish_recommendation: 'PUBLISH_AS_ENTERPRISE',
  }), HEAD);

  assert.ok(failures.includes('go_requires_current_main_scope'));
  assert.ok(failures.includes('pull_request_cannot_publish_as_enterprise'));
  assert.ok(failures.includes('pull_request_requires_diagnostic_classification'));
  assert.ok(failures.includes('enterprise_ready_requires_current_main_scope'));
});

test('rejects a diagnostic classification in current-main scope', () => {
  const failures = validatePersistentExecutionState(state({
    assessment_scope: 'main',
    is_current_main: true,
    observed_main_sha: HEAD,
    last_verified_score_sha: HEAD,
    classification: 'VERIFIED_EXACT_SHA_DIAGNOSTIC',
    evidence_freshness: {
      status: 'FRESH_EXACT_SHA',
      last_verified_sha: HEAD,
      scorecard_run_id: 12345,
      source_scorecard_schema: 'risck-comply.enterprise-readiness-scorecard.v1',
      source_scorecard_sha256: 'c'.repeat(64),
    },
  }), HEAD);

  assert.ok(failures.includes('main_scope_cannot_be_diagnostic'));
});

test('rejects diagnostic percentages in current-main scope', () => {
  const failures = validatePersistentExecutionState(state({
    diagnostic_completion_percent: 45,
    diagnostic_remaining_percent: 55,
  }), HEAD);

  assert.ok(failures.includes('main_scope_cannot_publish_diagnostic_percentages'));
});

test('rejects GO without an exact-SHA score', () => {
  assert.ok(validatePersistentExecutionState(state({ current_decision: 'GO' }), HEAD)
    .includes('go_requires_fresh_exact_sha_score'));
});

test('rejects inconsistent control counts and percentages', () => {
  const failures = validatePersistentExecutionState(state({
    official_completion_percent: 46,
    official_remaining_percent: 55,
    controls_not_verified: 53,
  }), HEAD);

  assert.ok(failures.includes('completion_percent_must_match_weighted_counts'));
  assert.ok(failures.includes('completion_and_remaining_must_equal_100'));
  assert.ok(failures.includes('control_counts_must_equal_total'));
});

test('rejects inconsistent raw scorecard decision', () => {
  const failures = validatePersistentExecutionState(state({
    scorecard_decision: 'GO',
  }), HEAD);

  assert.ok(failures.includes('scorecard_decision_must_match_weighted_counts'));
  assert.ok(failures.includes('main_decision_must_match_scorecard_decision'));
});

test('rejects Enterprise publication without GO', () => {
  assert.ok(validatePersistentExecutionState(state({
    publish_recommendation: 'PUBLISH_AS_ENTERPRISE',
  }), HEAD).includes('enterprise_publication_requires_go'));
});

test('accepts GO only for a fresh exact-SHA 100-control current-main result', () => {
  const ready = state({
    assessment_scope: 'main',
    is_current_main: true,
    observed_main_sha: HEAD,
    last_verified_score_sha: HEAD,
    official_completion_percent: 100,
    official_remaining_percent: 0,
    diagnostic_completion_percent: null,
    diagnostic_remaining_percent: null,
    controls_pass: 100,
    controls_partial: 0,
    controls_fail: 0,
    controls_blocked: 0,
    controls_not_verified: 0,
    controls_not_applicable: 0,
    current_decision: 'GO',
    scorecard_decision: 'GO',
    classification: 'ENTERPRISE_READY',
    publish_recommendation: 'PUBLISH_AS_ENTERPRISE',
    critical_controls_open: 0,
    evidence_freshness: {
      status: 'FRESH_EXACT_SHA',
      last_verified_sha: HEAD,
      scorecard_run_id: 12345,
      source_scorecard_schema: 'risck-comply.enterprise-readiness-scorecard.v1',
      source_scorecard_sha256: 'c'.repeat(64),
    },
  });

  assert.deepEqual(validatePersistentExecutionState(ready, HEAD), []);
});

test('rejects a partial result represented as GO', () => {
  const failures = validatePersistentExecutionState(state({
    assessment_scope: 'main',
    is_current_main: true,
    observed_main_sha: HEAD,
    last_verified_score_sha: HEAD,
    current_decision: 'GO',
    classification: 'ENTERPRISE_READY',
    publish_recommendation: 'PUBLISH_AS_ENTERPRISE',
    evidence_freshness: {
      status: 'FRESH_EXACT_SHA',
      last_verified_sha: HEAD,
      scorecard_run_id: 12345,
      source_scorecard_schema: 'risck-comply.enterprise-readiness-scorecard.v1',
      source_scorecard_sha256: 'c'.repeat(64),
    },
  }), HEAD);

  assert.ok(failures.includes('go_requires_all_controls_pass'));
});

test('supports canonical half-credit for PARTIAL controls', () => {
  const partial = state({
    official_completion_percent: 45.5,
    official_remaining_percent: 54.5,
    controls_partial: 1,
    controls_not_verified: 53,
  });

  assert.deepEqual(validatePersistentExecutionState(partial, HEAD), []);
});

test('supports canonical half-credit for PARTIAL diagnostic controls without official publication', () => {
  const partial = diagnosticState({
    diagnostic_completion_percent: 45.5,
    diagnostic_remaining_percent: 54.5,
    controls_partial: 1,
    controls_not_verified: 53,
  });

  assert.deepEqual(validatePersistentExecutionState(partial, HEAD), []);
});

test('rejects broken provenance metadata', () => {
  const failures = validatePersistentExecutionState(state({
    timestamp: 'not-a-date',
    critical_controls_open: -1,
    evidence_freshness: {
      status: 'STALE',
      last_verified_sha: HEAD,
      scorecard_run_id: 0,
      source_scorecard_schema: 'wrong',
      source_scorecard_sha256: 'invalid',
    },
  }), HEAD);

  assert.ok(failures.includes('timestamp_invalid'));
  assert.ok(failures.includes('critical_controls_open_invalid'));
  assert.ok(failures.includes('evidence_verified_sha_mismatch'));
  assert.ok(failures.includes('scorecard_run_id_invalid'));
  assert.ok(failures.includes('source_scorecard_sha256_invalid'));
  assert.ok(failures.includes('source_scorecard_schema_invalid'));
});

test('rejects GO while any critical control remains open', () => {
  const ready = state({
    assessment_scope: 'main',
    is_current_main: true,
    observed_main_sha: HEAD,
    last_verified_score_sha: HEAD,
    official_completion_percent: 100,
    official_remaining_percent: 0,
    controls_pass: 100,
    controls_partial: 0,
    controls_fail: 0,
    controls_blocked: 0,
    controls_not_verified: 0,
    controls_not_applicable: 0,
    critical_controls_open: 1,
    current_decision: 'GO',
    scorecard_decision: 'GO',
    classification: 'ENTERPRISE_READY',
    publish_recommendation: 'PUBLISH_AS_ENTERPRISE',
    evidence_freshness: {
      status: 'FRESH_EXACT_SHA',
      last_verified_sha: HEAD,
      scorecard_run_id: 12345,
      source_scorecard_schema: 'risck-comply.enterprise-readiness-scorecard.v1',
      source_scorecard_sha256: 'c'.repeat(64),
    },
  });

  const failures = validatePersistentExecutionState(ready, HEAD);
  assert.ok(failures.includes('go_requires_zero_critical_controls_open'));
  assert.ok(failures.includes('scorecard_decision_must_match_weighted_counts'));
});
