#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { validatePersistentExecutionState } from './check-persistent-execution-state.mjs';

const SHA_PATTERN = /^[0-9a-f]{40}$/;
const SCORECARD_SCHEMA = 'risck-comply.enterprise-readiness-scorecard.v1';
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const STATUSES = ['PASS', 'PARTIAL', 'FAIL', 'BLOCKED', 'NOT_VERIFIED', 'NOT_APPLICABLE'];

function fail(message) {
  throw new Error(`Cannot derive persistent Enterprise state: ${message}`);
}

function roundOne(value) {
  return Number(value.toFixed(1));
}

export function derivePersistentExecutionState({
  scorecard,
  assessedSha,
  runId,
  runAttempt = 1,
  sourceScorecardSha256,
  generatedAt = new Date().toISOString(),
}) {
  const normalizedSha = String(assessedSha ?? '').trim().toLowerCase();
  if (!SHA_PATTERN.test(normalizedSha)) fail('assessed SHA must contain 40 lowercase hexadecimal characters');
  if (scorecard?.schema !== SCORECARD_SCHEMA) fail('scorecard schema is not canonical');
  if (!Array.isArray(scorecard?.controls) || scorecard.controls.length !== 100) fail('scorecard must contain exactly 100 controls');

  const ids = new Set();
  const counts = Object.fromEntries(STATUSES.map((status) => [status, 0]));
  let criticalOpen = 0;
  for (const control of scorecard.controls) {
    if (!control?.id || ids.has(control.id)) fail('control IDs must be present and unique');
    if (!STATUSES.includes(control.status)) fail(`control ${control.id} has an invalid status`);
    ids.add(control.id);
    counts[control.status] += 1;
    if (control.critical === true && control.status !== 'PASS') criticalOpen += 1;
  }

  const applicable = 100 - counts.NOT_APPLICABLE;
  const completion = applicable > 0 ? roundOne(((counts.PASS + counts.PARTIAL * 0.5) / applicable) * 100) : 0;
  const remaining = roundOne(100 - completion);
  if (scorecard.scorePercent !== completion || scorecard.completedPercent !== completion) fail('scorecard percentage does not match control statuses');
  if (scorecard.remainingPercent !== remaining) fail('scorecard remaining percentage is inconsistent');
  if (scorecard.criticalOpen !== criticalOpen) fail('scorecard critical-open count is inconsistent');
  const decision = completion === 100 && criticalOpen === 0 ? 'GO' : 'NO_GO';
  if (scorecard.releaseDecision !== decision) fail('scorecard release decision is inconsistent');
  const numericRunId = Number(runId);
  if (!Number.isSafeInteger(numericRunId) || numericRunId <= 0) fail('run ID must be a positive integer');
  const numericRunAttempt = Number(runAttempt);
  if (!Number.isSafeInteger(numericRunAttempt) || numericRunAttempt <= 0) fail('run attempt must be a positive integer');
  if (!SHA256_PATTERN.test(String(sourceScorecardSha256 ?? ''))) fail('source scorecard SHA-256 is invalid');

  const state = {
    timestamp: generatedAt,
    observed_main_sha: normalizedSha,
    last_verified_score_sha: normalizedSha,
    official_completion_percent: completion,
    official_remaining_percent: remaining,
    technical_repository_percent: null,
    runtime_evidence_percent: null,
    owner_action_percent: null,
    controls_pass: counts.PASS,
    controls_partial: counts.PARTIAL,
    controls_fail: counts.FAIL,
    controls_total: 100,
    controls_blocked: counts.BLOCKED,
    controls_not_verified: counts.NOT_VERIFIED,
    controls_not_applicable: counts.NOT_APPLICABLE,
    critical_controls_open: criticalOpen,
    current_decision: decision,
    classification: decision === 'GO' ? 'ENTERPRISE_READY' : 'VERIFIED_CURRENT_MAIN_NO_GO',
    publish_recommendation: decision === 'GO' ? 'PUBLISH_AS_ENTERPRISE' : 'DO_NOT_PUBLISH_AS_ENTERPRISE',
    active_prs: [],
    blocked_prs: [],
    next_priority: decision === 'GO'
      ? 'Retain final owner approval and execute the protected release process for this exact SHA.'
      : 'Close NOT_VERIFIED, BLOCKED, FAIL and PARTIAL controls with accepted exact-SHA evidence.',
    evidence_freshness: {
      status: 'FRESH_EXACT_SHA',
      last_verified_sha: normalizedSha,
      scorecard_run_id: numericRunId,
      scorecard_run_attempt: numericRunAttempt,
      source_scorecard_schema: SCORECARD_SCHEMA,
      source_scorecard_sha256: sourceScorecardSha256,
      reason: 'Derived automatically from the canonical 100-control scorecard generated for this exact SHA.',
    },
    calculation_method: 'Automatically derived from the canonical exact-SHA 100-control scorecard artifact. PASS receives full credit, PARTIAL half credit, and NOT_APPLICABLE is excluded from the denominator.',
  };
  const failures = validatePersistentExecutionState(state, normalizedSha);
  if (failures.length > 0) fail(failures.join(', '));
  return state;
}

function main() {
  const scorecardPath = process.env.ENTERPRISE_SCORECARD_JSON || 'artifacts/enterprise-readiness/enterprise-readiness-scorecard.json';
  const outputPath = process.env.ENTERPRISE_PERSISTENT_STATE_OUTPUT || 'artifacts/enterprise-readiness/persistent-execution-state.json';
  const scorecardBytes = readFileSync(scorecardPath);
  const scorecard = JSON.parse(scorecardBytes.toString('utf8'));
  const state = derivePersistentExecutionState({
    scorecard,
    assessedSha: process.env.ENTERPRISE_EXPECTED_SHA,
    runId: process.env.GITHUB_RUN_ID,
    runAttempt: process.env.GITHUB_RUN_ATTEMPT,
    sourceScorecardSha256: createHash('sha256').update(scorecardBytes).digest('hex'),
  });
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(state, null, 2)}\n`);
  console.log(`Persistent Enterprise state artifact: ${outputPath}`);
  console.log(`Exact-SHA readiness: ${state.official_completion_percent}% (${state.current_decision})`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
