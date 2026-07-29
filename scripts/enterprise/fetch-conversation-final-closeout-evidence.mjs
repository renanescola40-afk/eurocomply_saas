#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const CANONICAL_REPOSITORY = 'renanescola40-afk/eurocomply_saas';
const FULL_SHA = /^[0-9a-f]{40}$/;
const NUMERIC_ID = /^\d+$/;
const bundles = [
  {
    workflow: 'enterprise-production-gate.yml',
    artifact: (sha) => `enterprise-production-final-evidence-${sha}`,
    paths: [
      'docs/security/evidence/runtime/stripe-billing-validation.json',
      'docs/security/evidence/runtime/enterprise-runtime-evidence.json',
      'docs/security/evidence/runtime/production-final-validation.json',
      'docs/security/evidence/runtime/release-go-no-go.json',
    ],
  },
  {
    workflow: 'enterprise-readiness-scorecard.yml',
    artifact: (sha) => `enterprise-readiness-scorecard-${sha}`,
    paths: [
      'artifacts/enterprise-readiness/enterprise-readiness-scorecard.json',
      'artifacts/enterprise-readiness/persistent-execution-state.json',
    ],
  },
];

function headers(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'risck-comply-conversation-closeout-fetcher',
  };
}

async function githubResponse(url, token, accept = 'application/vnd.github+json') {
  const response = await fetch(url, {
    headers: { ...headers(token), Accept: accept },
    cache: 'no-store',
    redirect: 'follow',
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`github_api_${response.status}`);
  return response;
}

async function githubJson(url, token) {
  return (await githubResponse(url, token)).json();
}

export function selectExactShaRun(runs, targetSha) {
  return (Array.isArray(runs) ? runs : [])
    .filter((run) => String(run?.head_sha || '').toLowerCase() === targetSha)
    .filter((run) => run?.head_branch === 'main')
    .filter((run) => run?.status === 'completed' && run?.conclusion === 'success')
    .sort((left, right) => Date.parse(right?.updated_at || 0) - Date.parse(left?.updated_at || 0))[0] ?? null;
}

export function selectExactArtifact(artifacts, expectedName) {
  return (Array.isArray(artifacts) ? artifacts : [])
    .filter((artifact) => artifact?.name === expectedName && artifact?.expired !== true)
    .sort((left, right) => Date.parse(right?.updated_at || 0) - Date.parse(left?.updated_at || 0))[0] ?? null;
}

function extractJson(zipPath, expectedPath) {
  const entries = execFileSync('unzip', ['-Z1', zipPath], { encoding: 'utf8' })
    .split('\n')
    .map((entry) => entry.trim())
    .filter(Boolean);
  const matches = entries.filter((entry) => entry === expectedPath || entry.endsWith(`/${expectedPath}`));
  if (matches.length !== 1) throw new Error(`bundle_path_invalid:${expectedPath}`);
  const raw = execFileSync('unzip', ['-p', zipPath, matches[0]], {
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
  });
  JSON.parse(raw);
  return raw;
}

async function fetchBundle({ root, repository, token, targetSha, definition }) {
  const runsResponse = await githubJson(
    `https://api.github.com/repos/${repository}/actions/workflows/${definition.workflow}/runs?branch=main&status=success&per_page=100`,
    token,
  );
  const run = selectExactShaRun(runsResponse.workflow_runs, targetSha);
  if (!run || !NUMERIC_ID.test(String(run.id || ''))) {
    throw new Error(`exact_sha_workflow_run_missing:${definition.workflow}`);
  }

  const artifactsResponse = await githubJson(
    `https://api.github.com/repos/${repository}/actions/runs/${run.id}/artifacts?per_page=100`,
    token,
  );
  const expectedName = definition.artifact(targetSha);
  const artifact = selectExactArtifact(artifactsResponse.artifacts, expectedName);
  if (!artifact || !NUMERIC_ID.test(String(artifact.id || ''))) {
    throw new Error(`exact_sha_artifact_missing:${expectedName}`);
  }

  const zipPath = join(root, 'artifacts', 'enterprise-conversation-closeout', `${artifact.id}.zip`);
  mkdirSync(dirname(zipPath), { recursive: true });
  try {
    const response = await githubResponse(
      `https://api.github.com/repos/${repository}/actions/artifacts/${artifact.id}/zip`,
      token,
      'application/vnd.github+json',
    );
    writeFileSync(zipPath, Buffer.from(await response.arrayBuffer()), { mode: 0o600 });
    for (const path of definition.paths) {
      const raw = extractJson(zipPath, path);
      const output = join(root, path);
      mkdirSync(dirname(output), { recursive: true });
      writeFileSync(output, raw.endsWith('\n') ? raw : `${raw}\n`, { mode: 0o600 });
    }
  } finally {
    rmSync(zipPath, { force: true });
  }

  return { workflow: definition.workflow, runId: String(run.id), artifactId: String(artifact.id), artifactName: expectedName };
}

export async function fetchConversationFinalCloseoutEvidence({
  root,
  repository,
  token,
  targetSha,
} = {}) {
  const normalizedSha = String(targetSha || '').trim().toLowerCase();
  if (repository !== CANONICAL_REPOSITORY) throw new Error('repository_not_canonical');
  if (!token) throw new Error('github_token_missing');
  if (!FULL_SHA.test(normalizedSha)) throw new Error('target_sha_invalid');

  for (const definition of bundles) {
    for (const path of definition.paths) rmSync(join(root, path), { force: true });
  }

  const sources = [];
  for (const definition of bundles) {
    sources.push(await fetchBundle({ root, repository, token, targetSha: normalizedSha, definition }));
  }
  return { targetSha: normalizedSha, sources };
}

async function runCli() {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const result = await fetchConversationFinalCloseoutEvidence({
    root,
    repository: process.env.GITHUB_REPOSITORY || '',
    token: process.env.GITHUB_TOKEN || '',
    targetSha: process.env.RELEASE_SHA || '',
  });
  console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli().catch((error) => {
    console.error(error instanceof Error ? error.message.split(':')[0] : 'unknown_error');
    process.exit(1);
  });
}
