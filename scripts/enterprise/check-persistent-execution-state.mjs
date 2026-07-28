#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const DEFAULT_PATH = 'docs/enterprise/ENTERPRISE_PROGRESS.json';
const SHA_PATTERN = /^[0-9a-f]{40}$/;

export function validatePersistentExecutionState(state, checkedOutSha) {
  const failures = [];
  const observedSha = String(state?.observed_main_sha ?? '').toLowerCase();
  const verifiedSha = String(state?.last_verified_score_sha ?? '').toLowerCase();
  const freshness = state?.evidence_freshness?.status;

  if (!SHA_PATTERN.test(checkedOutSha)) failures.push('checked_out_sha_invalid');
  if (!SHA_PATTERN.test(observedSha)) failures.push('observed_main_sha_invalid');
  if (!SHA_PATTERN.test(verifiedSha)) failures.push('last_verified_score_sha_invalid');
  if (state?.controls_total !== 100) failures.push('controls_total_must_equal_100');
  if (!['FRESH_EXACT_SHA', 'STALE', 'UNKNOWN'].includes(freshness)) {
    failures.push('evidence_freshness_status_invalid');
  }
  if (freshness === 'FRESH_EXACT_SHA' && verifiedSha !== checkedOutSha) {
    failures.push('fresh_score_must_match_checked_out_sha');
  }
  if (verifiedSha !== checkedOutSha && freshness !== 'STALE') {
    failures.push('non_exact_score_must_be_stale');
  }
  if (observedSha !== checkedOutSha && freshness === 'FRESH_EXACT_SHA') {
    failures.push('fresh_state_must_observe_checked_out_sha');
  }
  if (state?.current_decision === 'GO' && freshness !== 'FRESH_EXACT_SHA') {
    failures.push('go_requires_fresh_exact_sha_score');
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
