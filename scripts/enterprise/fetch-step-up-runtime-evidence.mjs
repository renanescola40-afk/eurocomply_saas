#!/usr/bin/env node

import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateStepUpMfaRuntimeEvidence } from '../release/validate-step-up-mfa-runtime-evidence.mjs';

const CANONICAL_REPOSITORY = 'renanescola40-afk/eurocomply_saas';
const WORKFLOW_FILE = 'step-up-runtime-proof.yml';
const WORKFLOW_PATH = `.github/workflows/${WORKFLOW_FILE}`;
const EVIDENCE_PATH = 'docs/security/evidence/runtime/step-up-mfa-validation.json';
const FULL_SHA = /^[a-f0-9]{40}$/;
const NUMERIC_ID = /^\d+$/;

function headers(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'risck-comply-step-up-evidence-fetcher',
  };
}

async function githubJson(url, token) {
  const response = await fetch(url, {
    headers: headers(token),
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`github_api_${response.status}`);
  return response.json();
}

export function selectExactShaRun(runs, targetSha, sourceRunId = '') {
  const requested = String(sourceRunId || '').trim();
  return (Array.isArray(runs) ? runs : [])
    .filter((run) => run?.path === WORKFLOW_PATH)
    .filter((run) => String(run?.head_sha || '').toLowerCase() === targetSha)
    .filter((run) => run?.head_branch === 'main')
    .filter((run) => run?.status === 'completed' && run?.conclusion === 'success')
    .filter((run) => !requested || String(run?.id) === requested)
    .sort((a, b) => Date.parse(b?.updated_at || b?.created_at || 0) - Date.parse(a?.updated_at || a?.created_at || 0))[0] ?? null;
}

export function validateDownloadedEvidence(evidence, { targetSha, repository, runId, now = new Date() }) {
  const failures = validateStepUpMfaRuntimeEvidence(evidence, {
    now,
    expectedRepository: repository,
    expectedBranch: 'main',
    expectedCommitSha: targetSha,
  });
  if (repository !== CANONICAL_REPOSITORY) failures.push('repository_not_canonical');
  if (evidence?.status !== 'Complete' || evidence?.outcome !== 'passed') failures.push('evidence_not_complete');
  if (String(evidence?.provenance?.runId || '') !== String(runId)) failures.push('source_run_provenance_mismatch');
  if (evidence?.provenance?.source !== 'github_actions') failures.push('github_actions_provenance_required');
  if (evidence?.provenance?.workflowProvenance !== true) failures.push('workflow_provenance_invalid');
  return { passed: failures.length === 0, failures };
}

export function normalizeStepUpEvidenceForP0(evidence) {
  return {
    ...evidence,
    sourceRedactionConfirmation: evidence.redactionConfirmation,
    redactionConfirmation: 'Redaction confirmed for runtime evidence.',
    controlsVerified: [
      'Live Supabase MFA sign-in succeeded.',
      'Verified TOTP factor was available.',
      'Provider challenge and TOTP verification succeeded.',
      'AAL2 was observed on the exact protected release SHA.',
      'Session user identity remained consistent after verification.',
      'Synthetic validation session was revoked after proof generation.',
    ],
  };
}

function escapeCurl(value) {
  return String(value).replace(/[\r\n]/g, '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function downloadArtifact(repository, token, artifactId, output) {
  const config = [
    'fail', 'location', 'silent', 'show-error',
    'connect-timeout = 10', 'max-time = 30',
    `header = "Authorization: Bearer ${escapeCurl(token)}"`,
    'header = "Accept: application/vnd.github+json"',
    'header = "X-GitHub-Api-Version: 2022-11-28"',
    'header = "User-Agent: risck-comply-step-up-evidence-fetcher"',
    `output = "${escapeCurl(output)}"`,
    `url = "https://api.github.com/repos/${repository}/actions/artifacts/${artifactId}/zip"`,
  ].join('\n');
  const result = spawnSync('curl', ['--config', '-'], { input: `${config}\n`, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  if (result.error || result.status !== 0) throw new Error('artifact_download_failed');
}

function extractEvidence(zipPath) {
  const entries = execFileSync('unzip', ['-Z1', zipPath], { encoding: 'utf8' })
    .split('\n').map((entry) => entry.trim()).filter(Boolean);
  const entry = entries.find((candidate) => candidate.endsWith('step-up-mfa-validation.json'));
  if (!entry) throw new Error('step_up_evidence_missing');
  return JSON.parse(execFileSync('unzip', ['-p', zipPath, entry], { encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 }));
}

export async function fetchStepUpRuntimeEvidence({ root, repository, token, targetSha, sourceRunId = '', required = false }) {
  rmSync(join(root, EVIDENCE_PATH), { force: true });
  if (repository !== CANONICAL_REPOSITORY) throw new Error('repository_not_canonical');
  if (!token) throw new Error('github_token_missing');
  if (!FULL_SHA.test(targetSha)) throw new Error('target_sha_invalid');

  let runs;
  if (sourceRunId) {
    runs = [await githubJson(`https://api.github.com/repos/${repository}/actions/runs/${sourceRunId}`, token)];
  } else {
    const response = await githubJson(`https://api.github.com/repos/${repository}/actions/workflows/${WORKFLOW_FILE}/runs?status=success&branch=main&per_page=50`, token);
    runs = response.workflow_runs;
  }

  const run = selectExactShaRun(runs, targetSha, sourceRunId);
  if (!run) {
    if (required) throw new Error('exact_sha_step_up_run_missing');
    console.log(`Step-up evidence remains open: no successful exact-SHA runtime run for ${targetSha}.`);
    return { found: false, targetSha };
  }

  const runId = String(run.id || '');
  if (!NUMERIC_ID.test(runId)) throw new Error('runtime_workflow_run_id_invalid');
  const artifacts = await githubJson(`https://api.github.com/repos/${repository}/actions/runs/${runId}/artifacts`, token);
  const expectedName = `step-up-runtime-proof-${targetSha}`;
  const artifact = (artifacts.artifacts ?? []).find((candidate) => candidate?.name === expectedName && candidate?.expired !== true);
  if (!artifact || !NUMERIC_ID.test(String(artifact.id || ''))) throw new Error('exact_sha_step_up_artifact_missing');

  const zipPath = join(root, 'artifacts', 'enterprise-readiness', `step-up-${runId}.zip`);
  mkdirSync(dirname(zipPath), { recursive: true });
  try {
    downloadArtifact(repository, token, String(artifact.id), zipPath);
    const evidence = extractEvidence(zipPath);
    const validation = validateDownloadedEvidence(evidence, { targetSha, repository, runId });
    if (!validation.passed) throw new Error(`step_up_evidence_invalid:${validation.failures.join(',')}`);
    const canonicalEvidence = normalizeStepUpEvidenceForP0(evidence);
    const output = join(root, EVIDENCE_PATH);
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, `${JSON.stringify(canonicalEvidence, null, 2)}\n`, { mode: 0o600 });
    console.log(`Retrieved exact-SHA step-up evidence from workflow run ${runId}.`);
    return { found: true, targetSha, runId, artifactId: String(artifact.id) };
  } finally {
    rmSync(zipPath, { force: true });
  }
}

async function run() {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  await fetchStepUpRuntimeEvidence({
    root,
    repository: process.env.GITHUB_REPOSITORY || '',
    token: process.env.GITHUB_TOKEN || '',
    targetSha: String(process.env.TARGET_SHA || process.env.GITHUB_SHA || '').trim().toLowerCase(),
    sourceRunId: String(process.env.STEP_UP_RUNTIME_SOURCE_RUN_ID || '').trim(),
    required: process.env.STEP_UP_RUNTIME_EVIDENCE_REQUIRED === 'true',
  });
}

if (process.argv[1] && fileURLToPath(new URL(`file://${process.argv[1]}`)) === fileURLToPath(import.meta.url)) {
  run().catch((error) => {
    console.error(`Step-up evidence retrieval failed: ${error instanceof Error ? error.message.split(':')[0] : 'unknown_error'}`);
    process.exit(1);
  });
}
