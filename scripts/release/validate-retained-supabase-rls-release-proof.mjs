#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  CANONICAL_REPOSITORY,
  validateSupabaseRlsRuntimeEvidence as validateProducerEvidence,
} from '../security/check-supabase-rls-runtime-evidence.mjs';
import { validateSupabaseRlsRuntimeEvidence as validateReleaseEvidence } from './validate-supabase-rls-runtime-evidence.mjs';

const EVIDENCE_PATH = 'docs/security/evidence/runtime/supabase-live-rls-validation.json';
const EXPECTED_PRODUCER = Object.freeze({
  workflow: 'Supabase Live RLS Validation',
  workflowPath: '.github/workflows/supabase-live-rls-validation.yml',
  branch: 'main',
});
const FULL_SHA = /^[a-f0-9]{40}$/;
const NUMERIC = /^\d+$/;

function expectedSha() {
  return String(
    process.env.RELEASE_COMMIT_SHA
      || process.env.TARGET_SHA
      || process.env.GITHUB_SHA
      || '',
  ).trim().toLowerCase();
}

export function validateRetainedSupabaseRlsReleaseProof(
  evidence,
  {
    targetSha,
    repository = CANONICAL_REPOSITORY,
    now = new Date(),
  } = {},
) {
  const failures = [];
  const sha = String(targetSha || '').trim().toLowerCase();
  if (!FULL_SHA.test(sha)) return ['target_sha_invalid'];
  if (repository !== CANONICAL_REPOSITORY) return ['repository_not_canonical'];

  const sourceRunId = String(evidence?.githubActions?.runId || '').trim();
  const sourceWorkflow = String(evidence?.githubActions?.workflow || '').trim();
  const sourceBranch = String(evidence?.githubActions?.refName || '').trim();
  if (!NUMERIC.test(sourceRunId)) failures.push('source_run_id_invalid');
  if (sourceWorkflow !== EXPECTED_PRODUCER.workflow) failures.push('source_workflow_invalid');
  if (sourceBranch !== EXPECTED_PRODUCER.branch) failures.push('source_branch_invalid');

  const producer = validateProducerEvidence(evidence, {
    expectedSha: sha,
    repository,
    runId: sourceRunId,
  });
  if (!producer.passed) failures.push(...producer.failures.map((failure) => `producer:${failure}`));

  failures.push(...validateReleaseEvidence(evidence, {
    now,
    maxAgeDays: 7,
    expectedRepository: repository,
    expectedBranch: EXPECTED_PRODUCER.branch,
  }).map((failure) => `release:${failure}`));

  if (evidence?.runtimeContext?.commitSha !== sha) failures.push('runtime_context_sha_mismatch');
  if (String(evidence?.runtimeContext?.githubRunId || '') !== sourceRunId) failures.push('runtime_context_run_mismatch');
  if (evidence?.runtimeContext?.branch !== EXPECTED_PRODUCER.branch) failures.push('runtime_context_branch_mismatch');
  if (evidence?.evidenceIntegrity?.exactShaBound !== true) failures.push('exact_sha_integrity_missing');
  if (evidence?.evidenceIntegrity?.sourceRunBound !== true) failures.push('source_run_integrity_missing');

  return [...new Set(failures)];
}

export function runRetainedSupabaseRlsReleaseProofValidation() {
  let evidence;
  try {
    evidence = JSON.parse(readFileSync(EVIDENCE_PATH, 'utf8'));
  } catch {
    throw new Error('retained_supabase_rls_evidence_missing_or_invalid');
  }

  const sha = expectedSha();
  const failures = validateRetainedSupabaseRlsReleaseProof(evidence, {
    targetSha: sha,
    repository: process.env.GITHUB_REPOSITORY || CANONICAL_REPOSITORY,
  });
  if (failures.length > 0) {
    throw new Error(`retained_supabase_rls_evidence_invalid:${failures.join(',')}`);
  }

  console.log(JSON.stringify({
    status: 'passed',
    targetSha: sha,
    sourceWorkflow: EXPECTED_PRODUCER.workflow,
    sourceWorkflowPath: EXPECTED_PRODUCER.workflowPath,
    sourceRunId: evidence.githubActions?.runId || null,
    liveProofReexecutedByReleaseRunner: false,
  }, null, 2));
  return evidence;
}

const isMain = process.argv[1]
  && fileURLToPath(new URL(`file://${process.argv[1]}`)) === fileURLToPath(import.meta.url);

if (isMain) {
  try {
    runRetainedSupabaseRlsReleaseProofValidation();
  } catch (error) {
    console.error(`Retained Supabase RLS release proof validation failed: ${error instanceof Error ? error.message : 'unknown_error'}`);
    process.exit(1);
  }
}
