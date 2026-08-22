#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const DEFAULT_PATH = 'docs/enterprise/ENTERPRISE_PROGRESS.json';
const SHA_PATTERN = /^[0-9a-f]{40}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const SCORECARD_SCHEMA = 'risck-comply.enterprise-readiness-scorecard.v1';
const VALID_DECISIONS = new Set(['GO', 'NO_GO']);
const VALID_CLASSIFICATIONS = new Set([
  'UNVERIFIED_CURRENT_MAIN',
  'VERIFIED_CURRENT_MAIN_NO_GO',
  'VERIFIED_EXACT_SHA_DIAGNOSTIC',
  'ENTERPRISE_READY',
]);
const VALID_ASSESSMENT_SCOPES = new Set(['main', 'pull_request']);

function isNumberInRange(value, minimum, maximum) {
  return Number.isFinite(value) && value >= minimum && value <= maximum;
}

function roundOne(value) {
  return Number(value.toFixed(1));
}

function assessmentScopeFor(state) {
  return state?.assessment_scope ?? 'main';
}

function isCurrentMainFor(state, assessmentScope) {
  if (typeof state?.is_current_main === 'boolean') return state.is_current_main;
  return assessmentScope === 'main';
}

export function validatePersistentExecutionState(state, checkedOutSha) {
  const failures = [];
  const observedSha = String(state?.observed_main_sha ?? '').toLowerCase();
  const verifiedSha = String(state?.last_verified_score_sha ?? '').toLowerCase();
  const evidenceVerifiedSha = String(state?.evidence_freshness?.last_verified_sha ?? '').toLowerCase();
  const freshness = state?.evidence_freshness?.status;
  const assessmentScope = assessmentScopeFor(state);
  const isCurrentMain = isCurrentMainFor(state, assessmentScope);

  if (!Number.isFinite(Date.parse(state?.timestamp))) failures.push('timestamp_invalid');
  if (!SHA_PATTERN.test(checkedOutSha)) failures.push('checked_out_sha_invalid');
  if (!SHA_PATTERN.test(observedSha)) failures.push('observed_main_sha_invalid');
  if (!SHA_PATTERN.test(verifiedSha)) failures.push('last_verified_score_sha_invalid');
  if (evidenceVerifiedSha !== verifiedSha) failures.push('evidence_verified_sha_mismatch');
  if (!VALID_ASSESSMENT_SCOPES.has(assessmentScope)) failures.push('assessment_scope_invalid');
  if (assessmentScope === 'main' && isCurrentMain !== true) failures.push('main_scope_requires_current_main');
  if (assessmentScope === 'pull_request' && isCurrentMain !== false) failures.push('pull_request_scope_cannot_be_current_main');
  if (!Number.isSafeInteger(state?.evidence_freshness?.scorecard_run_id) || state.evidence_freshness.scorecard_run_id <= 0) {
    failures.push('scorecard_run_id_invalid');
  }
  if (!SHA256_PATTERN.test(String(state?.evidence_freshness?.source_scorecard_sha256 ?? ''))) {
    failures.push('source_scorecard_sha256_invalid');
  }
  if (state?.evidence_freshness?.source_scorecard_schema !== SCORECARD_SCHEMA) {
    failures.push('source_scorecard_schema_invalid');
  }
  if (
    state?.evidence_freshness?.scorecard_run_attempt !== undefined
    && (!Number.isSafeInteger(state.evidence_freshness.scorecard_run_attempt)
      || state.evidence_freshness.scorecard_run_attempt <= 0)
  ) {
    failures.push('scorecard_run_attempt_invalid');
  }
  if (!Number.isInteger(state?.critical_controls_open) || state.critical_controls_open < 0 || state.critical_controls_open > 100) {
    failures.push('critical_controls_open_invalid');
  }
  if (!VALID_DECISIONS.has(state?.current_decision)) failures.push('current_decision_invalid');
  if (
    state?.scorecard_decision !== undefined
    && !VALID_DECISIONS.has(state.scorecard_decision)
  ) {
    failures.push('scorecard_decision_invalid');
  }
  if (!VALID_CLASSIFICATIONS.has(state?.classification)) failures.push('classification_invalid');
  if (assessmentScope === 'pull_request' && state?.classification !== 'VERIFIED_EXACT_SHA_DIAGNOSTIC') {
    failures.push('pull_request_requires_diagnostic_classification');
  }
  if (assessmentScope === 'main' && state?.classification === 'VERIFIED_EXACT_SHA_DIAGNOSTIC') {
    failures.push('main_scope_cannot_be_diagnostic');
  }
  if (assessmentScope === 'pull_request' && state?.current_decision === 'GO') {
    failures.push('go_requires_current_main_scope');
  }
  if (assessmentScope === 'pull_request' && state?.publish_recommendation === 'PUBLISH_AS_ENTERPRISE') {
    failures.push('pull_request_cannot_publish_as_enterprise');
  }
  if (state?.controls_total !== 100) failures.push('controls_total_must_equal_100');
  for (const field of [
    'controls_pass',
    'controls_partial',
    'controls_fail',
    'controls_blocked',
    'controls_not_verified',
    'controls_not_applicable',
  ]) {
    if (!Number.isInteger(state?.[field]) || state[field] < 0 || state[field] > 100) {
      failures.push(`${field}_invalid`);
    }
  }
  if (!isNumberInRange(state?.official_completion_percent, 0, 100)) failures.push('official_completion_percent_invalid');
  if (!isNumberInRange(state?.official_remaining_percent, 0, 100)) failures.push('official_remaining_percent_invalid');
  const counts = [
    state?.controls_pass,
    state?.controls_partial,
    state?.controls_fail,
    state?.controls_blocked,
    state?.controls_not_verified,
    state?.controls_not_applicable,
  ];
  if (
    counts.every((value) => Number.isInteger(value) && value >= 0)
    && counts.reduce((sum, value) => sum + value, 0) !== state.controls_total
  ) {
    failures.push('control_counts_must_equal_total');
  }
  const applicableControls = state?.controls_total - state?.controls_not_applicable;
  const expectedCompletion = applicableControls > 0
    ? roundOne(((state?.controls_pass + (state?.controls_partial * 0.5)) / applicableControls) * 100)
    : 0;
  if (
    isNumberInRange(state?.official_completion_percent, 0, 100)
    && Number.isInteger(state?.controls_pass)
    && Number.isInteger(state?.controls_partial)
    && Number.isInteger(state?.controls_not_applicable)
    && state.official_completion_percent !== expectedCompletion
  ) {
    failures.push('completion_percent_must_match_weighted_counts');
  }
  if (
    isNumberInRange(state?.official_completion_percent, 0, 100)
    && isNumberInRange(state?.official_remaining_percent, 0, 100)
    && roundOne(state.official_completion_percent + state.official_remaining_percent) !== 100
  ) {
    failures.push('completion_and_remaining_must_equal_100');
  }
  if (!['FRESH_EXACT_SHA', 'STALE', 'UNKNOWN'].includes(freshness)) {
    failures.push('evidence_freshness_status_invalid');
  }
  if (freshness === 'FRESH_EXACT_SHA' && verifiedSha !== checkedOutSha) {
    failures.push('fresh_score_must_match_checked_out_sha');
  }
  if (verifiedSha !== checkedOutSha && freshness !== 'STALE') {
    failures.push('non_exact_score_must_be_stale');
  }
  if (
    assessmentScope === 'main'
    && observedSha !== checkedOutSha
    && freshness === 'FRESH_EXACT_SHA'
  ) {
    failures.push('fresh_state_must_observe_checked_out_sha');
  }
  if (state?.current_decision === 'GO' && freshness !== 'FRESH_EXACT_SHA') {
    failures.push('go_requires_fresh_exact_sha_score');
  }
  if (state?.current_decision === 'GO' && !isCurrentMain) {
    failures.push('go_requires_current_main_scope');
  }
  if (state?.current_decision === 'GO' && state?.critical_controls_open !== 0) {
    failures.push('go_requires_zero_critical_controls_open');
  }
  if (
    state?.current_decision === 'GO'
    && (state?.official_completion_percent !== 100
      || state?.controls_pass !== state?.controls_total
      || state?.controls_partial !== 0
      || state?.controls_fail !== 0
      || state?.controls_blocked !== 0
      || state?.controls_not_verified !== 0
      || state?.controls_not_applicable !== 0)
  ) {
    failures.push('go_requires_all_controls_pass');
  }
  if (state?.current_decision === 'GO' && state?.classification !== 'ENTERPRISE_READY') {
    failures.push('go_requires_enterprise_ready_classification');
  }
  if (state?.current_decision !== 'GO' && state?.publish_recommendation === 'PUBLISH_AS_ENTERPRISE') {
    failures.push('enterprise_publication_requires_go');
  }
  if (freshness !== 'FRESH_EXACT_SHA' && state?.classification === 'ENTERPRISE_READY') {
    failures.push('enterprise_ready_requires_fresh_exact_sha_score');
  }
  if (!isCurrentMain && state?.classification === 'ENTERPRISE_READY') {
    failures.push('enterprise_ready_requires_current_main_scope');
  }

  return failures;
}

export function checkPersistentExecutionState({
  path = process.env.ENTERPRISE_PROGRESS_PATH || DEFAULT_PATH,
  checkedOutSha = process.env.ENTERPRISE_EXPECTED_SHA
    || execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
} = {}) {
  const state = JSON.parse(readFileSync(path, 'utf8'));
  const failures = validatePersistentExecutionState(state, checkedOutSha.toLowerCase());
  if (failures.length) throw new Error(`Persistent enterprise state invalid: ${failures.join(', ')}`);
  return state;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const state = checkPersistentExecutionState();
    console.log(`Persistent enterprise state valid: ${state.evidence_freshness.status}/${state.current_decision}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
