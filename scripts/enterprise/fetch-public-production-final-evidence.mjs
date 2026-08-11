#!/usr/bin/env node

import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateDeploymentRuntimeEvidence } from '../release/validate-deployment-runtime-evidence.mjs';
import { validateFinalValidationRuntimeEvidence } from '../release/validate-final-validation-runtime-evidence.mjs';
import { validateObservabilityRuntimeEvidence } from '../release/validate-observability-runtime-evidence.mjs';
import { validateRollbackRuntimeEvidence } from '../release/validate-rollback-runtime-evidence.mjs';

const CANONICAL_REPOSITORY = 'renanescola40-afk/eurocomply_saas';
const WORKFLOW_FILE = 'public-production-final.yml';
const WORKFLOW_PATH = `.github/workflows/${WORKFLOW_FILE}`;
const FULL_SHA = /^[a-f0-9]{40}$/;
const NUMERIC_ID = /^\d+$/;

const EVIDENCE = Object.freeze([
  {
    path: 'docs/security/evidence/runtime/deployment-smoke-validation.json',
    suffix: 'deployment-smoke-validation.json',
    validator: validateDeploymentRuntimeEvidence,
  },
  {
    path: 'docs/security/evidence/runtime/final-validation-runner.json',
    suffix: 'final-validation-runner.json',
    validator: validateFinalValidationRuntimeEvidence,
  },
  {
    path: 'docs/security/evidence/runtime/observability-smoke-validation.json',
    suffix: 'observability-smoke-validation.json',
    validator: validateObservabilityRuntimeEvidence,
  },
  {
    path: 'docs/security/evidence/runtime/rollback-dry-run-validation.json',
    suffix: 'rollback-dry-run-validation.json',
    validator: validateRollbackRuntimeEvidence,
  },
]);

function headers(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'risck-comply-public-final-evidence-fetcher',
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
    .filter((run) => run?.event === 'workflow_dispatch')
    .filter((run) => !requested || String(run?.id) === requested)
    .sort((a, b) => Date.parse(b?.updated_at || b?.created_at || 0) - Date.parse(a?.updated_at || a?.created_at || 0))[0] ?? null;
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
    'header = "User-Agent: risck-comply-public-final-evidence-fetcher"',
    `output = "${escapeCurl(output)}"`,
    `url = "https://api.github.com/repos/${repository}/actions/artifacts/${artifactId}/zip"`,
  ].join('\n');
  const result = spawnSync('curl', ['--config', '-'], {
    input: `${config}\n`,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  if (result.error || result.status !== 0) throw new Error('artifact_download_failed');
}

function extractBundle(zipPath) {
  const entries = execFileSync('unzip', ['-Z1', zipPath], { encoding: 'utf8' })
    .split('\n').map((entry) => entry.trim()).filter(Boolean);
  const bundle = new Map();

  for (const descriptor of EVIDENCE) {
    const matches = entries.filter((entry) => entry.endsWith(descriptor.suffix));
    if (matches.length !== 1) throw new Error(`public_final_${descriptor.suffix}_missing_or_ambiguous`);
    bundle.set(descriptor.path, JSON.parse(execFileSync('unzip', ['-p', zipPath, matches[0]], {
      encoding: 'utf8',
      maxBuffer: 4 * 1024 * 1024,
    })));
  }

  return bundle;
}

export function validatePublicFinalBundle(bundle, { targetSha, repository, now = new Date() }) {
  const failures = [];
  if (repository !== CANONICAL_REPOSITORY) failures.push('repository_not_canonical');

  for (const descriptor of EVIDENCE) {
    const evidence = bundle.get(descriptor.path);
    if (!evidence) {
      failures.push(`${descriptor.path}:missing`);
      continue;
    }
    const result = descriptor.validator(evidence, {
      now,
      expectedRepository: repository,
      expectedBranch: 'main',
      expectedCommitSha: targetSha,
    });
    for (const failure of result) failures.push(`${descriptor.path}:${failure}`);
  }

  return { passed: failures.length === 0, failures };
}

export async function fetchPublicProductionFinalEvidence({ root, repository, token, targetSha, sourceRunId = '', required = false }) {
  if (repository !== CANONICAL_REPOSITORY) throw new Error('repository_not_canonical');
  if (!token) throw new Error('github_token_missing');
  if (!FULL_SHA.test(targetSha)) throw new Error('target_sha_invalid');

  let runs;
  if (sourceRunId) {
    runs = [await githubJson(`https://api.github.com/repos/${repository}/actions/runs/${sourceRunId}`, token)];
  } else {
    const response = await githubJson(`https://api.github.com/repos/${repository}/actions/workflows/${WORKFLOW_FILE}/runs?status=success&branch=main&head_sha=${encodeURIComponent(targetSha)}&per_page=20`, token);
    runs = response.workflow_runs;
  }

  const run = selectExactShaRun(runs, targetSha, sourceRunId);
  if (!run) {
    if (required) throw new Error('exact_sha_public_final_run_missing');
    console.log(`Public final evidence remains open: no successful exact-SHA protected run for ${targetSha}.`);
    return { found: false, targetSha };
  }

  const runId = String(run.id || '');
  if (!NUMERIC_ID.test(runId)) throw new Error('runtime_workflow_run_id_invalid');
  const artifacts = await githubJson(`https://api.github.com/repos/${repository}/actions/runs/${runId}/artifacts`, token);
  const expectedName = `public-production-final-validation-${targetSha}`;
  const artifact = (artifacts.artifacts ?? []).find((candidate) => candidate?.name === expectedName && candidate?.expired !== true);
  if (!artifact || !NUMERIC_ID.test(String(artifact.id || ''))) throw new Error('exact_sha_public_final_artifact_missing');

  const zipPath = join(root, 'artifacts', 'enterprise-readiness', `public-final-${runId}.zip`);
  mkdirSync(dirname(zipPath), { recursive: true });
  try {
    downloadArtifact(repository, token, String(artifact.id), zipPath);
    const bundle = extractBundle(zipPath);
    const validation = validatePublicFinalBundle(bundle, { targetSha, repository });
    if (!validation.passed) throw new Error(`public_final_evidence_invalid:${validation.failures.join('|')}`);

    for (const descriptor of EVIDENCE) {
      const output = join(root, descriptor.path);
      mkdirSync(dirname(output), { recursive: true });
      rmSync(output, { force: true });
      writeFileSync(output, `${JSON.stringify(bundle.get(descriptor.path), null, 2)}\n`, { mode: 0o600 });
    }

    console.log(`Retrieved exact-SHA public production final evidence from workflow run ${runId}.`);
    return { found: true, targetSha, runId, artifactId: String(artifact.id), evidenceCount: EVIDENCE.length };
  } finally {
    rmSync(zipPath, { force: true });
  }
}

async function run() {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  await fetchPublicProductionFinalEvidence({
    root,
    repository: process.env.GITHUB_REPOSITORY || '',
    token: process.env.GITHUB_TOKEN || '',
    targetSha: String(process.env.TARGET_SHA || process.env.GITHUB_SHA || '').trim().toLowerCase(),
    sourceRunId: String(process.env.PUBLIC_FINAL_RUNTIME_SOURCE_RUN_ID || '').trim(),
    required: process.env.PUBLIC_FINAL_RUNTIME_EVIDENCE_REQUIRED === 'true',
  });
}

if (process.argv[1] && fileURLToPath(new URL(`file://${process.argv[1]}`)) === fileURLToPath(import.meta.url)) {
  run().catch((error) => {
    console.error(`Public final evidence retrieval failed: ${error instanceof Error ? error.message.split(':')[0] : 'unknown_error'}`);
    process.exit(1);
  });
}
