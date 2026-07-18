#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { validatePassingEvidence } from './supabase-live-rls-evidence.mjs';

export const CANONICAL_REPOSITORY = 'renanescola40-afk/eurocomply_saas';
export const WORKFLOW_NAME = 'Supabase Live RLS Validation';
export const DEFAULT_EVIDENCE_PATH = 'docs/security/evidence/runtime/supabase-live-rls-validation.json';
const FULL_SHA = /^[a-f0-9]{40}$/;
const NUMERIC_ID = /^\d+$/;

function normalizeSha(value) {
  return String(value || '').trim().toLowerCase();
}

export function validateSupabaseRlsRuntimeEvidence(
  evidence,
  {
    expectedSha,
    repository = CANONICAL_REPOSITORY,
    runId = '',
  } = {},
) {
  const failures = [];
  const normalizedSha = normalizeSha(expectedSha);
  const normalizedRunId = String(runId || '').trim();
  const sourceValidation = validatePassingEvidence(evidence);

  if (repository !== CANONICAL_REPOSITORY) failures.push('repository_not_canonical');
  if (!FULL_SHA.test(normalizedSha)) failures.push('expected_sha_invalid');
  if (!sourceValidation.valid) {
    failures.push(...sourceValidation.errors.map((error) => `source:${error}`));
  }
  if (normalizeSha(evidence?.commitSha) !== normalizedSha) failures.push('evidence_sha_mismatch');
  if (evidence?.supabaseProjectReferenceRedacted !== true) failures.push('project_reference_not_redacted');
  if (!String(evidence?.supabaseProjectReference || '').startsWith('redacted:')) failures.push('project_reference_invalid');
  if (!Array.isArray(evidence?.failures) || evidence.failures.length !== 0) failures.push('evidence_failures_present');

  const provenance = evidence?.githubActions;
  if (!provenance || typeof provenance !== 'object' || Array.isArray(provenance)) {
    failures.push('github_provenance_missing');
  } else {
    if (provenance.generatedInGitHubActions !== true) failures.push('github_actions_not_observed');
    if (provenance.workflow !== WORKFLOW_NAME) failures.push('workflow_name_invalid');
    if (provenance.repository !== repository) failures.push('provenance_repository_invalid');
    if (provenance.refName !== 'main') failures.push('provenance_branch_invalid');
    if (normalizeSha(provenance.commitSha) !== normalizedSha) failures.push('provenance_sha_mismatch');
    if (!NUMERIC_ID.test(String(provenance.runId || ''))) failures.push('provenance_run_id_invalid');
    if (normalizedRunId && String(provenance.runId) !== normalizedRunId) failures.push('source_workflow_run_mismatch');
    if (!['push', 'workflow_dispatch'].includes(String(provenance.eventName || ''))) failures.push('provenance_event_invalid');
  }

  return { passed: failures.length === 0, failures };
}

export function checkSupabaseRlsRuntimeEvidence({
  evidencePath = process.env.SUPABASE_RLS_SOURCE_EVIDENCE_PATH || DEFAULT_EVIDENCE_PATH,
  expectedSha = process.env.ENTERPRISE_EXPECTED_SHA || process.env.TARGET_SHA || process.env.GITHUB_SHA || '',
  repository = process.env.GITHUB_REPOSITORY || CANONICAL_REPOSITORY,
  runId = process.env.SUPABASE_RLS_RUNTIME_SOURCE_RUN_ID || process.env.GITHUB_RUN_ID || '',
} = {}) {
  const evidence = JSON.parse(readFileSync(evidencePath, 'utf8'));
  const validation = validateSupabaseRlsRuntimeEvidence(evidence, {
    expectedSha,
    repository,
    runId,
  });

  if (!validation.passed) {
    throw new Error(`Supabase RLS runtime evidence invalid: ${validation.failures.join(', ')}`);
  }

  console.log(`Supabase RLS runtime evidence is valid for ${normalizeSha(expectedSha)}.`);
  return evidence;
}

if (process.argv[1] && fileURLToPath(new URL(`file://${process.argv[1]}`)) === fileURLToPath(import.meta.url)) {
  try {
    checkSupabaseRlsRuntimeEvidence();
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Supabase RLS runtime evidence validation failed.');
    process.exit(1);
  }
}
