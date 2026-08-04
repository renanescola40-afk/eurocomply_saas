#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const CANONICAL_REPOSITORY = 'renanescola40-afk/eurocomply_saas';
const FULL_SHA = /^[0-9a-f]{40}$/;
const NUMERIC_ID = /^\d+$/;
const SAFE_FAILURE_CODE = /^[a-z0-9_]+$/;
const MAX_ARCHIVE_BYTES = 16 * 1024 * 1024;
const RETRIEVAL_MANIFEST_PATH = 'artifacts/enterprise-conversation-closeout/retrieval-manifest.json';
const ALLOWED_RUN_EVENTS = new Set(['push', 'workflow_dispatch']);
const ZIP_CONTENT_TYPES = new Set([
  'application/zip',
  'application/octet-stream',
  'application/x-zip-compressed',
]);
const bundles = [
  {
    key: 'enterpriseProductionFinal',
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
    key: 'enterpriseReadinessScorecard',
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

function safeTimestamp(value) {
  const timestamp = Date.parse(String(value || ''));
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

export function boundedFailureCode(error) {
  const candidate = error instanceof Error
    ? String(error.message || '').split(':', 1)[0].trim().toLowerCase()
    : 'unknown_error';
  return SAFE_FAILURE_CODE.test(candidate) ? candidate : 'unknown_error';
}

export function selectExactShaRun(runs, targetSha) {
  return (Array.isArray(runs) ? runs : [])
    .filter((run) => String(run?.head_sha || '').toLowerCase() === targetSha)
    .filter((run) => run?.head_branch === 'main')
    .filter((run) => ALLOWED_RUN_EVENTS.has(String(run?.event || '')))
    .filter((run) => run?.status === 'completed' && run?.conclusion === 'success')
    .sort((left, right) => Date.parse(right?.updated_at || 0) - Date.parse(left?.updated_at || 0))[0] ?? null;
}

export function selectExactArtifact(artifacts, expectedName) {
  return (Array.isArray(artifacts) ? artifacts : [])
    .filter((artifact) => artifact?.name === expectedName && artifact?.expired !== true)
    .sort((left, right) => Date.parse(right?.updated_at || 0) - Date.parse(left?.updated_at || 0))[0] ?? null;
}

function validateArchiveResponse(response, archive) {
  const contentType = String(response.headers.get('content-type') || '').split(';', 1)[0].trim().toLowerCase();
  if (!ZIP_CONTENT_TYPES.has(contentType)) throw new Error('artifact_content_type_invalid');

  const declaredLength = Number(response.headers.get('content-length') || 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_ARCHIVE_BYTES) {
    throw new Error('artifact_too_large');
  }
  if (archive.length === 0 || archive.length > MAX_ARCHIVE_BYTES) throw new Error('artifact_size_invalid');
  if (archive[0] !== 0x50 || archive[1] !== 0x4b) throw new Error('artifact_zip_signature_invalid');
}

function extractJson(archive, expectedPath) {
  const python = String.raw`
import io
import json
import stat
import sys
import zipfile

expected = sys.argv[1]
data = sys.stdin.buffer.read()
with zipfile.ZipFile(io.BytesIO(data), 'r') as bundle:
    infos = bundle.infolist()
    if len(infos) > 200:
        raise SystemExit(2)
    if sum(info.file_size for info in infos) > 16 * 1024 * 1024:
        raise SystemExit(3)
    matches = [info for info in infos if info.filename == expected or info.filename.endswith('/' + expected)]
    if len(matches) != 1:
        raise SystemExit(4)
    info = matches[0]
    mode = (info.external_attr >> 16) & 0o170000
    if info.is_dir() or mode == stat.S_IFLNK or (info.flag_bits & 0x1):
        raise SystemExit(5)
    if info.file_size <= 0 or info.file_size > 8 * 1024 * 1024:
        raise SystemExit(6)
    if info.compress_size > 0 and info.file_size / info.compress_size > 200:
        raise SystemExit(7)
    raw = bundle.read(info)
    json.loads(raw.decode('utf-8'))
    sys.stdout.buffer.write(raw)
`;

  let raw;
  try {
    raw = execFileSync('python3', ['-c', python, expectedPath], {
      input: archive,
      encoding: 'utf8',
      maxBuffer: 8 * 1024 * 1024,
    });
  } catch {
    throw new Error('artifact_json_extraction_failed');
  }
  JSON.parse(raw);
  return raw;
}

function sourceBase(definition, targetSha) {
  return {
    key: definition.key,
    workflow: definition.workflow,
    artifactName: definition.artifact(targetSha),
    expectedPaths: [...definition.paths],
    extractedPaths: [],
    status: 'Open',
    runId: null,
    artifactId: null,
    runEvent: null,
    runUpdatedAt: null,
    artifactUpdatedAt: null,
    failure: null,
  };
}

async function fetchBundle({ root, repository, token, targetSha, definition }) {
  const source = sourceBase(definition, targetSha);

  try {
    const runsResponse = await githubJson(
      `https://api.github.com/repos/${repository}/actions/workflows/${definition.workflow}/runs?branch=main&status=success&per_page=100`,
      token,
    );
    const run = selectExactShaRun(runsResponse.workflow_runs, targetSha);
    if (!run || !NUMERIC_ID.test(String(run.id || ''))) {
      throw new Error('exact_sha_workflow_run_missing');
    }

    const artifactsResponse = await githubJson(
      `https://api.github.com/repos/${repository}/actions/runs/${run.id}/artifacts?per_page=100`,
      token,
    );
    const artifact = selectExactArtifact(artifactsResponse.artifacts, source.artifactName);
    if (!artifact || !NUMERIC_ID.test(String(artifact.id || ''))) {
      throw new Error('exact_sha_artifact_missing');
    }

    const response = await githubResponse(
      `https://api.github.com/repos/${repository}/actions/artifacts/${artifact.id}/zip`,
      token,
      'application/vnd.github+json',
    );
    const archive = Buffer.from(await response.arrayBuffer());
    validateArchiveResponse(response, archive);

    for (const path of definition.paths) {
      const raw = extractJson(archive, path);
      const output = join(root, path);
      mkdirSync(dirname(output), { recursive: true });
      writeFileSync(output, raw.endsWith('\n') ? raw : `${raw}\n`, { mode: 0o600 });
      source.extractedPaths.push(path);
    }

    return {
      ...source,
      status: 'Complete',
      runId: String(run.id),
      artifactId: String(artifact.id),
      runEvent: String(run.event),
      runUpdatedAt: safeTimestamp(run.updated_at),
      artifactUpdatedAt: safeTimestamp(artifact.updated_at),
    };
  } catch (error) {
    for (const path of definition.paths) rmSync(join(root, path), { force: true });
    return {
      ...source,
      extractedPaths: [],
      failure: boundedFailureCode(error),
    };
  }
}

export function buildRetrievalManifest({ targetSha, sources, generatedAt = new Date().toISOString() }) {
  const normalizedSources = Array.isArray(sources) ? sources : [];
  const blockers = normalizedSources
    .filter((source) => source?.status !== 'Complete')
    .map((source) => ({
      key: source?.key || 'unknown',
      workflow: source?.workflow || 'unknown',
      failure: SAFE_FAILURE_CODE.test(String(source?.failure || '')) ? source.failure : 'unknown_error',
    }));

  return {
    schema: 'risck-comply.enterprise-conversation-closeout-retrieval.v1',
    repository: CANONICAL_REPOSITORY,
    targetSha,
    generatedAt,
    status: blockers.length === 0 ? 'Complete' : 'Open',
    outcome: blockers.length === 0 ? 'passed' : 'blocked',
    sources: normalizedSources,
    blockers,
    noSecretsStored: true,
    truthBoundary: blockers.length === 0
      ? 'All mandatory exact-main-SHA workflow artifacts were retrieved and extracted from canonical paths.'
      : 'Missing or invalid workflow artifacts remain release blockers; retrieval failure is not evidence of a passing control.',
  };
}

export async function fetchConversationFinalCloseoutEvidence({
  root,
  repository,
  token,
  targetSha,
  generatedAt = new Date().toISOString(),
} = {}) {
  const normalizedSha = String(targetSha || '').trim().toLowerCase();
  if (repository !== CANONICAL_REPOSITORY) throw new Error('repository_not_canonical');
  if (!token) throw new Error('github_token_missing');
  if (!FULL_SHA.test(normalizedSha)) throw new Error('target_sha_invalid');

  for (const definition of bundles) {
    for (const path of definition.paths) rmSync(join(root, path), { force: true });
  }
  rmSync(join(root, RETRIEVAL_MANIFEST_PATH), { force: true });

  const sources = [];
  for (const definition of bundles) {
    sources.push(await fetchBundle({ root, repository, token, targetSha: normalizedSha, definition }));
  }

  const manifest = buildRetrievalManifest({ targetSha: normalizedSha, sources, generatedAt });
  const manifestPath = join(root, RETRIEVAL_MANIFEST_PATH);
  mkdirSync(dirname(manifestPath), { recursive: true });
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });
  return manifest;
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
    console.error(boundedFailureCode(error));
    process.exit(1);
  });
}
