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
const ASSESSMENT_SCOPES = new Set(['main', 'pull_request']);

function fail(message) {
  throw new Error(`Cannot derive persistent Enterprise state: ${message}`);
}

function roundOne(value) {
  return Number(value.toFixed(1));
}

function normalizeSha(value, label) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!SHA_PATTERN.test(normalized)) fail(`${label} must contain 40 lowercase hexadecimal characters`);
  return normalized;
}

export function derivePersistentExecutionState({
  scorecard,
  assessedSha,
  observedMainSha = assessedSha,
  assessmentScope = 'main',
  runId,
  runAttempt = 1,
  sourceScorecardSha256,
  generatedAt = new Date().toISOString(),
}) {
  const normalizedSha = normalizeSha(assessedSha, 'assessed SHA');
  const normalizedObservedMainSha = normalizeSha(observedMainSha, 'observed main SHA');
  if (!ASSESSMENT_SCOPES.has(assessmentScope)) fail('assessment scope must be main or pull_request');
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

  const scorecardDecision = completion === 100 && criticalOpen === 0 ? 'GO' : 'NO_GO';
  if (scorecard.releaseDecision !== scorecardDecision) fail('scorecard release decision is inconsistent');

  const numericRunId = Number(runId);
  if (!Number.isSafeInteger(numericRunId) || numericRunId <= 0) fail('run ID must be a positive integer');
  const numericRunAttempt = Number(runAttempt);
  if (!Number.isSafeInteger(numericRunAttempt) || numericRunAttempt <= 0) fail('run attempt must be a positive integer');
  if (!SHA256_PATTERN.test(String(sourceScorecardSha256 ?? ''))) fail('source scorecard SHA-256 is invalid');

  const isCurrentMain = assessmentScope === 'main';
  const decision = isCurrentMain ? scorecardDecision : 'NO_GO';
  const classification = isCurrentMain
    ? (decision === 'GO' ? 'ENTERPRISE_READY' : 'VERIFIED_CURRENT_MAIN_NO_GO')
    : 'VERIFIED_EXACT_SHA_DIAGNOSTIC';

  const state = {
    timestamp: generatedAt,
    assessment_scope: assessmentScope,
    is_current_main: isCurrentMain,
    observed_main_sha: normalizedObservedMainSha,
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
    scorecard_decision: scorecardDecision,
    current_decision: decision,
    classification,
    publish_recommendation: isCurrentMain && decision === 'GO'
      ? 'PUBLISH_AS_ENTERPRISE'
      : 'DO_NOT_PUBLISH_AS_ENTERPRISE',
    active_prs: [],
    blocked_prs: [],
    next_priority: isCurrentMain
      ? (
        decision === 'GO'
          ? 'Retain final owner approval and execute the protected release process for this exact SHA.'
          : 'Close NOT_VERIFIED, BLOCKED, FAIL and PARTIAL controls with accepted exact-SHA evidence.'
      )
      : 'Treat this result as exact-SHA pull-request diagnostics only; protected main must be evaluated separately before release credit.',
    evidence_freshness: {
      status: 'FRESH_EXACT_SHA',
      last_verified_sha: normalizedSha,
      scorecard_run_id: numericRunId,
      scorecard_run_attempt: numericRunAttempt,
      source_scorecard_schema: SCORECARD_SCHEMA,
      source_scorecard_sha256: sourceScorecardSha256,
      reason: isCurrentMain
        ? 'Derived automatically from the canonical 100-control scorecard generated for this exact protected-main SHA.'
        : 'Derived automatically from a canonical exact-SHA pull-request diagnostic. It is fresh for the assessed PR SHA but is not protected-main release authority.',
    },
    calculation_method: 'Automatically derived from the canonical exact-SHA 100-control scorecard artifact. PASS receives full credit, PARTIAL half credit, and NOT_APPLICABLE is excluded from the denominator.',
  };
  const failures = validatePersistentExecutionState(state, normalizedSha);
  if (failures.length > 0) fail(failures.join(', '));
  return state;
}

export function resolveAssessmentContext({
  eventName = process.env.GITHUB_EVENT_NAME,
  eventPath = process.env.GITHUB_EVENT_PATH,
  ref = process.env.GITHUB_REF,
  assessedSha,
} = {}) {
  const normalizedAssessedSha = normalizeSha(assessedSha, 'assessed SHA');

  if (!eventName) {
    return {
      assessmentScope: 'main',
      observedMainSha: normalizedAssessedSha,
    };
  }

  if (eventName === 'pull_request') {
    if (!eventPath) fail('GITHUB_EVENT_PATH is required for pull_request assessment scope');
    let event;
    try {
      event = JSON.parse(readFileSync(eventPath, 'utf8'));
    } catch {
      fail('pull_request event payload could not be read');
    }

    return {
      assessmentScope: 'pull_request',
      observedMainSha: normalizeSha(event?.pull_request?.base?.sha, 'pull request base SHA'),
    };
  }

  if (ref === 'refs/heads/main') {
    return {
      assessmentScope: 'main',
      observedMainSha: normalizedAssessedSha,
    };
  }

  fail(`workflow event ${eventName} on ${ref || 'unknown ref'} cannot claim protected-main Enterprise authority`);
}

function main() {
  const scorecardPath = process.env.ENTERPRISE_SCORECARD_JSON || 'artifacts/enterprise-readiness/enterprise-readiness-scorecard.json';
  const outputPath = process.env.ENTERPRISE_PERSISTENT_STATE_OUTPUT || 'artifacts/enterprise-readiness/persistent-execution-state.json';
  const scorecardBytes = readFileSync(scorecardPath);
  const scorecard = JSON.parse(scorecardBytes.toString('utf8'));
  const assessedSha = process.env.ENTERPRISE_EXPECTED_SHA;
  const assessmentContext = resolveAssessmentContext({ assessedSha });
  const state = derivePersistentExecutionState({
    scorecard,
    assessedSha,
    ...assessmentContext,
    runId: process.env.GITHUB_RUN_ID,
    runAttempt: process.env.GITHUB_RUN_ATTEMPT,
    sourceScorecardSha256: createHash('sha256').update(scorecardBytes).digest('hex'),
  });
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(state, null, 2)}\n`);
  console.log(`Persistent Enterprise state artifact: ${outputPath}`);
  console.log(`Exact-SHA readiness: ${state.official_completion_percent}% (${state.current_decision}/${state.assessment_scope})`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
