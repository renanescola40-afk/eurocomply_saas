#!/usr/bin/env node

import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CANONICAL_REPOSITORY = 'renanescola40-afk/eurocomply_saas';
const WORKFLOW_FILE = 'auth-rbac-runtime-proof.yml';
const WORKFLOW_NAME = 'Auth RBAC Tenant Proof';
const SOURCE_EVIDENCE_PATH = 'docs/security/evidence/runtime/auth-rbac-final-validation.json';
const SCORECARD_EVIDENCE_PATH = 'docs/security/evidence/runtime/auth-rbac-validation.json';
const FULL_SHA = /^[a-f0-9]{40}$/;
const NUMERIC_ID = /^\d+$/;

function apiHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'risck-comply-auth-rbac-evidence-fetcher',
  };
}

async function githubJson(url, token) {
  const response = await fetch(url, {
    headers: apiHeaders(token),
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`github_api_${response.status}`);
  return response.json();
}

export function selectExactShaRun(runs, targetSha, sourceRunId = '') {
  const normalizedRunId = String(sourceRunId || '').trim();
  return (Array.isArray(runs) ? runs : [])
    .filter((run) => String(run?.head_sha || '').toLowerCase() === targetSha)
    .filter((run) => run?.head_branch === 'main')
    .filter((run) => run?.status === 'completed' && run?.conclusion === 'success')
    .filter((run) => !normalizedRunId || String(run?.id) === normalizedRunId)
    .sort((left, right) => Date.parse(right?.updated_at || right?.created_at || 0) - Date.parse(left?.updated_at || left?.created_at || 0))[0] ?? null;
}

export function validateDownloadedEvidence(evidence, { targetSha, repository, runId }) {
  const failures = [];
  if (repository !== CANONICAL_REPOSITORY) failures.push('repository_not_canonical');
  if (!FULL_SHA.test(targetSha)) failures.push('target_sha_invalid');
  if (evidence?.schema !== 'risck-comply.auth-rbac-runtime-evidence.v1') failures.push('schema_invalid');
  if (evidence?.evidenceItem !== 'auth-rbac-final-validation') failures.push('evidence_item_invalid');
  if (evidence?.status !== 'Complete' || evidence?.outcome !== 'passed') failures.push('evidence_not_complete');
  if (evidence?.repository !== repository || evidence?.branch !== 'main') failures.push('evidence_provenance_invalid');
  if (evidence?.targetSha !== targetSha || evidence?.checkedOutSha !== targetSha) failures.push('evidence_sha_mismatch');
  if (evidence?.environment !== 'production-auth-rbac-validation') failures.push('environment_invalid');
  if (evidence?.productionGate !== 'eligible for downstream enterprise gates') failures.push('production_gate_invalid');
  if (evidence?.provenance?.githubActions !== true || evidence?.provenance?.exactShaBound !== true) failures.push('github_provenance_invalid');
  if (String(evidence?.provenance?.runId || '') !== String(runId)) failures.push('source_workflow_run_mismatch');
  if (!Array.isArray(evidence?.failures) || evidence.failures.length !== 0) failures.push('evidence_failures_present');
  if (!evidence?.checks || typeof evidence.checks !== 'object' || Array.isArray(evidence.checks)) failures.push('checks_invalid');
  if (evidence?.checks && Object.values(evidence.checks).some((value) => value !== true)) failures.push('checks_incomplete');
  if (evidence?.evidenceIntegrity?.placeholderOnly !== false) failures.push('placeholder_integrity_invalid');
  if (evidence?.evidenceIntegrity?.runtimeProofInvented !== false) failures.push('runtime_integrity_invalid');
  if (evidence?.evidenceIntegrity?.rawCredentialsStored !== false) failures.push('credentials_integrity_invalid');
  if (evidence?.evidenceIntegrity?.accessTokensStored !== false) failures.push('tokens_integrity_invalid');
  if (evidence?.evidenceIntegrity?.userIdentifiersStored !== false) failures.push('user_identifier_integrity_invalid');
  if (evidence?.evidenceIntegrity?.organizationIdentifiersStored !== false) failures.push('organization_identifier_integrity_invalid');
  if (evidence?.evidenceIntegrity?.rawProviderResponsesStored !== false) failures.push('provider_response_integrity_invalid');
  return { passed: failures.length === 0, failures };
}

function escapeCurlConfigValue(value) {
  return String(value)
    .replace(/[\r\n]/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"');
}

function downloadArtifact(repository, token, artifactId, targetPath) {
  const normalizedArtifactId = String(artifactId || '').trim();
  if (repository !== CANONICAL_REPOSITORY) throw new Error('repository_not_canonical');
  if (!NUMERIC_ID.test(normalizedArtifactId)) throw new Error('artifact_id_invalid');

  const url = `https://api.github.com/repos/${repository}/actions/artifacts/${normalizedArtifactId}/zip`;
  const curlConfig = [
    'fail',
    'location',
    'silent',
    'show-error',
    'connect-timeout = 10',
    'max-time = 30',
    `header = "Authorization: Bearer ${escapeCurlConfigValue(token)}"`,
    'header = "Accept: application/vnd.github+json"',
    'header = "X-GitHub-Api-Version: 2022-11-28"',
    'header = "User-Agent: risck-comply-auth-rbac-evidence-fetcher"',
    `output = "${escapeCurlConfigValue(targetPath)}"`,
    `url = "${escapeCurlConfigValue(url)}"`,
  ].join('\n');

  const result = spawnSync('curl', ['--config', '-'], {
    input: `${curlConfig}\n`,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  if (result.error || result.status !== 0) throw new Error('artifact_download_failed');
}

function extractSourceEvidence(zipPath) {
  const entries = execFileSync('unzip', ['-Z1', zipPath], { encoding: 'utf8' })
    .split('\n')
    .map((entry) => entry.trim())
    .filter(Boolean);
  const entry = entries.find((candidate) => candidate.endsWith(SOURCE_EVIDENCE_PATH))
    ?? entries.find((candidate) => candidate.endsWith('auth-rbac-final-validation.json'));
  if (!entry) throw new Error('source_evidence_missing_from_artifact');
  return JSON.parse(execFileSync('unzip', ['-p', zipPath, entry], {
    encoding: 'utf8',
    maxBuffer: 2 * 1024 * 1024,
  }));
}

function removeStaleEvidence(root) {
  rmSync(join(root, SOURCE_EVIDENCE_PATH), { force: true });
  rmSync(join(root, SCORECARD_EVIDENCE_PATH), { force: true });
}

export async function fetchAuthRbacEvidence({
  root,
  repository,
  token,
  targetSha,
  sourceRunId = '',
  required = false,
}) {
  removeStaleEvidence(root);
  if (repository !== CANONICAL_REPOSITORY) throw new Error('repository_not_canonical');
  if (!token) throw new Error('github_token_missing');
  if (!FULL_SHA.test(targetSha)) throw new Error('target_sha_invalid');

  let runs;
  if (sourceRunId) {
    runs = [await githubJson(`https://api.github.com/repos/${repository}/actions/runs/${sourceRunId}`, token)];
  } else {
    const response = await githubJson(
      `https://api.github.com/repos/${repository}/actions/workflows/${WORKFLOW_FILE}/runs?status=success&branch=main&per_page=100`,
      token,
    );
    runs = response.workflow_runs;
  }

  const run = selectExactShaRun(runs, targetSha, sourceRunId);
  if (!run) {
    if (required) throw new Error('exact_sha_runtime_run_missing');
    console.log(`Auth/RBAC evidence remains open: no successful exact-SHA runtime run for ${targetSha}.`);
    return { found: false, targetSha };
  }
  if (run.name !== WORKFLOW_NAME) throw new Error('runtime_workflow_name_invalid');

  const normalizedRunId = String(run.id || '').trim();
  if (!NUMERIC_ID.test(normalizedRunId)) throw new Error('runtime_workflow_run_id_invalid');
  const artifactsResponse = await githubJson(
    `https://api.github.com/repos/${repository}/actions/runs/${normalizedRunId}/artifacts`,
    token,
  );
  const expectedName = `auth-rbac-runtime-proof-${targetSha}`;
  const artifact = (artifactsResponse.artifacts ?? [])
    .filter((candidate) => candidate?.name === expectedName && candidate?.expired !== true)
    .sort((left, right) => Date.parse(right?.updated_at || 0) - Date.parse(left?.updated_at || 0))[0];
  if (!artifact) throw new Error('exact_sha_runtime_artifact_missing');

  const normalizedArtifactId = String(artifact.id || '').trim();
  if (!NUMERIC_ID.test(normalizedArtifactId)) throw new Error('artifact_id_invalid');
  const zipPath = join(root, 'artifacts', 'enterprise-readiness', `auth-rbac-runtime-${normalizedRunId}.zip`);
  mkdirSync(dirname(zipPath), { recursive: true });

  try {
    downloadArtifact(repository, token, normalizedArtifactId, zipPath);
    const evidence = extractSourceEvidence(zipPath);
    const validation = validateDownloadedEvidence(evidence, {
      targetSha,
      repository,
      runId: normalizedRunId,
    });
    if (!validation.passed) throw new Error(`runtime_evidence_invalid:${validation.failures.join(',')}`);

    const output = join(root, SOURCE_EVIDENCE_PATH);
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
    console.log(`Retrieved exact-SHA Auth/RBAC evidence from workflow run ${normalizedRunId}.`);
    return { found: true, targetSha, runId: normalizedRunId, artifactId: normalizedArtifactId };
  } finally {
    rmSync(zipPath, { force: true });
  }
}

async function run() {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  await fetchAuthRbacEvidence({
    root,
    repository: process.env.GITHUB_REPOSITORY || '',
    token: process.env.GITHUB_TOKEN || '',
    targetSha: String(process.env.TARGET_SHA || process.env.GITHUB_SHA || '').trim().toLowerCase(),
    sourceRunId: String(process.env.AUTH_RBAC_RUNTIME_SOURCE_RUN_ID || '').trim(),
    required: process.env.AUTH_RBAC_RUNTIME_EVIDENCE_REQUIRED === 'true',
  });
}

if (process.argv[1] && fileURLToPath(new URL(`file://${process.argv[1]}`)) === fileURLToPath(import.meta.url)) {
  run().catch((error) => {
    const reason = error instanceof Error ? error.message.split(':')[0] : 'unknown_error';
    console.error(`Auth/RBAC evidence retrieval failed: ${reason}`);
    process.exit(1);
  });
}
