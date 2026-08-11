#!/usr/bin/env node

import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateUploadScannerRuntimeEvidence } from '../release/validate-upload-scanner-runtime-evidence.mjs';

const CANONICAL_REPOSITORY = 'renanescola40-afk/eurocomply_saas';
const WORKFLOW_FILE = 'upload-security-ci.yml';
const WORKFLOW_NAME = 'RISCK COMPLY Upload Security CI';
const EVIDENCE_PATH = 'docs/security/evidence/runtime/upload-malware-scan-validation.json';
const FULL_SHA = /^[a-f0-9]{40}$/;
const NUMERIC_ID = /^\d+$/;
const MAX_API_RESPONSE_BYTES = 1024 * 1024;
const MAX_ARTIFACT_BYTES = 5 * 1024 * 1024;
const MAX_ZIP_ENTRIES = 20;
const MAX_EVIDENCE_BYTES = 1024 * 1024;
const ALLOWED_EVENTS = new Set(['push', 'workflow_dispatch']);

function apiHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'risck-comply-upload-scanner-evidence-fetcher',
  };
}

async function readBoundedJson(response) {
  const declaredLength = Number(response.headers.get('content-length') || 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_API_RESPONSE_BYTES) {
    throw new Error('github_api_response_too_large');
  }
  if (!response.body) throw new Error('github_api_response_body_missing');

  const reader = response.body.getReader();
  const chunks = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_API_RESPONSE_BYTES) {
        await reader.cancel('github_api_response_too_large');
        throw new Error('github_api_response_too_large');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  return JSON.parse(text);
}

async function githubJson(url, token) {
  const response = await fetch(url, {
    headers: apiHeaders(token),
    cache: 'no-store',
    redirect: 'error',
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    const error = new Error(`github_api_${response.status}`);
    error.status = response.status;
    throw error;
  }
  return readBoundedJson(response);
}

export function selectExactShaUploadScannerRun(runs, targetSha, sourceRunId = '') {
  const requestedRunId = String(sourceRunId || '').trim();
  return (Array.isArray(runs) ? runs : [])
    .filter((run) => run?.name === WORKFLOW_NAME)
    .filter((run) => String(run?.head_sha || '').toLowerCase() === targetSha)
    .filter((run) => run?.head_branch === 'main')
    .filter((run) => ALLOWED_EVENTS.has(String(run?.event || '')))
    .filter((run) => run?.status === 'completed' && run?.conclusion === 'success')
    .filter((run) => !requestedRunId || String(run?.id) === requestedRunId)
    .sort(
      (left, right) =>
        Date.parse(right?.updated_at || right?.created_at || 0) -
        Date.parse(left?.updated_at || left?.created_at || 0),
    )[0] ?? null;
}

export function validateDownloadedUploadScannerEvidence(
  evidence,
  { targetSha, repository, runId, runAttempt = null } = {},
) {
  const failures = [];
  if (repository !== CANONICAL_REPOSITORY) failures.push('repository_not_canonical');
  if (!FULL_SHA.test(String(targetSha || ''))) failures.push('target_sha_invalid');
  if (!NUMERIC_ID.test(String(runId || ''))) failures.push('run_id_invalid');

  failures.push(
    ...validateUploadScannerRuntimeEvidence(evidence, {
      expectedRepository: CANONICAL_REPOSITORY,
      expectedBranch: 'main',
      expectedCommitSha: targetSha,
    }),
  );

  if (evidence?.sourceWorkflow?.name !== WORKFLOW_NAME) {
    failures.push('source_workflow_name_invalid');
  }
  if (evidence?.sourceWorkflow?.file !== `.github/workflows/${WORKFLOW_FILE}`) {
    failures.push('source_workflow_file_invalid');
  }
  if (String(evidence?.sourceWorkflow?.runId || '') !== String(runId || '')) {
    failures.push('source_workflow_run_mismatch');
  }
  if (
    runAttempt !== null &&
    String(evidence?.sourceWorkflow?.runAttempt || '') !== String(runAttempt)
  ) {
    failures.push('source_workflow_attempt_mismatch');
  }
  if (evidence?.sourceWorkflow?.exactShaBound !== true) {
    failures.push('source_workflow_not_exact_sha_bound');
  }
  if (evidence?.sourceWorkflow?.artifact !== `upload-security-runtime-proof-${targetSha}`) {
    failures.push('source_artifact_name_invalid');
  }
  if (evidence?.evidenceIntegrity?.containsSensitiveValues !== false) {
    failures.push('sensitive_value_boundary_invalid');
  }
  if (evidence?.evidenceIntegrity?.credentialsStored !== false) {
    failures.push('credentials_boundary_invalid');
  }
  if (evidence?.evidenceIntegrity?.rawProviderResponseStored !== false) {
    failures.push('provider_response_boundary_invalid');
  }
  if (evidence?.evidenceIntegrity?.exactShaBound !== true) {
    failures.push('evidence_not_exact_sha_bound');
  }
  if (evidence?.evidenceIntegrity?.sourceRunBound !== true) {
    failures.push('evidence_not_source_run_bound');
  }

  return { passed: failures.length === 0, failures: [...new Set(failures)] };
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
    'header = "User-Agent: risck-comply-upload-scanner-evidence-fetcher"',
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

function isSafeZipEntry(entry) {
  if (!entry || entry.length > 240) return false;
  if (entry.includes('\\') || entry.includes('\u0000')) return false;
  if (entry.startsWith('/') || /^[A-Za-z]:/.test(entry)) return false;
  const segments = entry.split('/');
  return segments.every((segment) => segment && segment !== '.' && segment !== '..');
}

export function selectUploadScannerEvidenceEntry(entries) {
  const normalizedEntries = (Array.isArray(entries) ? entries : [])
    .map((entry) => String(entry || '').trim())
    .filter(Boolean);

  if (normalizedEntries.length === 0) throw new Error('artifact_zip_empty');
  if (normalizedEntries.length > MAX_ZIP_ENTRIES) throw new Error('artifact_zip_entry_limit_exceeded');
  if (normalizedEntries.some((entry) => !isSafeZipEntry(entry))) {
    throw new Error('artifact_zip_unsafe_entry');
  }

  const matches = normalizedEntries.filter(
    (entry) =>
      entry === EVIDENCE_PATH ||
      entry.endsWith(`/${EVIDENCE_PATH}`) ||
      entry.endsWith('/upload-malware-scan-validation.json') ||
      entry === 'upload-malware-scan-validation.json',
  );
  if (matches.length !== 1) throw new Error('artifact_evidence_entry_not_unique');
  return matches[0];
}

function extractEvidence(zipPath) {
  const entries = execFileSync('unzip', ['-Z1', zipPath], {
    encoding: 'utf8',
    maxBuffer: 256 * 1024,
  })
    .split('\n')
    .map((entry) => entry.trim())
    .filter(Boolean);
  const evidenceEntry = selectUploadScannerEvidenceEntry(entries);
  const content = execFileSync('unzip', ['-p', zipPath, evidenceEntry], {
    encoding: 'utf8',
    maxBuffer: MAX_EVIDENCE_BYTES,
  });
  return JSON.parse(content);
}

function removeStaleEvidence(root) {
  rmSync(join(root, EVIDENCE_PATH), { force: true });
}

export async function fetchUploadScannerRuntimeEvidence({
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
    runs = [
      await githubJson(
        `https://api.github.com/repos/${repository}/actions/runs/${sourceRunId}`,
        token,
      ),
    ];
  } else {
    const response = await githubJson(
      `https://api.github.com/repos/${repository}/actions/workflows/${WORKFLOW_FILE}/runs?status=success&branch=main&head_sha=${encodeURIComponent(targetSha)}&per_page=20`,
      token,
    );
    runs = response.workflow_runs;
  }

  const run = selectExactShaUploadScannerRun(runs, targetSha, sourceRunId);
  if (!run) {
    if (required) throw new Error('exact_sha_upload_scanner_run_missing');
    console.log(`Upload scanner evidence remains open: no successful exact-SHA main run for ${targetSha}.`);
    return { found: false, targetSha };
  }

  const normalizedRunId = String(run.id || '').trim();
  if (!NUMERIC_ID.test(normalizedRunId)) throw new Error('runtime_workflow_run_id_invalid');
  const runAttempt = String(run.run_attempt || '1');
  if (!NUMERIC_ID.test(runAttempt)) throw new Error('runtime_workflow_attempt_invalid');

  const artifactsResponse = await githubJson(
    `https://api.github.com/repos/${repository}/actions/runs/${normalizedRunId}/artifacts?per_page=100`,
    token,
  );
  const expectedName = `upload-security-runtime-proof-${targetSha}`;
  const matches = (artifactsResponse.artifacts ?? []).filter(
    (candidate) => candidate?.name === expectedName && candidate?.expired !== true,
  );
  if (matches.length !== 1) throw new Error('exact_sha_upload_scanner_artifact_not_unique');

  const artifact = matches[0];
  const artifactSize = Number(artifact?.size_in_bytes || 0);
  if (!Number.isFinite(artifactSize) || artifactSize <= 0 || artifactSize > MAX_ARTIFACT_BYTES) {
    throw new Error('artifact_size_invalid');
  }
  const normalizedArtifactId = String(artifact.id || '').trim();
  if (!NUMERIC_ID.test(normalizedArtifactId)) throw new Error('artifact_id_invalid');

  const zipPath = join(
    root,
    'artifacts',
    'enterprise-readiness',
    `upload-scanner-runtime-${normalizedRunId}.zip`,
  );
  mkdirSync(dirname(zipPath), { recursive: true });

  try {
    downloadArtifact(repository, token, normalizedArtifactId, zipPath);
    const evidence = extractEvidence(zipPath);
    const validation = validateDownloadedUploadScannerEvidence(evidence, {
      targetSha,
      repository,
      runId: normalizedRunId,
      runAttempt,
    });
    if (!validation.passed) {
      throw new Error(`upload_scanner_runtime_evidence_invalid:${validation.failures.join(',')}`);
    }

    const output = join(root, EVIDENCE_PATH);
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
    console.log(`Retrieved exact-SHA upload scanner evidence from workflow run ${normalizedRunId}.`);
    return {
      found: true,
      targetSha,
      runId: normalizedRunId,
      artifactId: normalizedArtifactId,
    };
  } finally {
    rmSync(zipPath, { force: true });
  }
}

async function run() {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  await fetchUploadScannerRuntimeEvidence({
    root,
    repository: process.env.GITHUB_REPOSITORY || '',
    token: process.env.GITHUB_TOKEN || '',
    targetSha: String(process.env.TARGET_SHA || process.env.GITHUB_SHA || '')
      .trim()
      .toLowerCase(),
    sourceRunId: String(process.env.UPLOAD_SCANNER_RUNTIME_SOURCE_RUN_ID || '').trim(),
    required: process.env.UPLOAD_SCANNER_RUNTIME_EVIDENCE_REQUIRED === 'true',
  });
}

if (process.argv[1] && fileURLToPath(new URL(`file://${process.argv[1]}`)) === fileURLToPath(import.meta.url)) {
  run().catch((error) => {
    const reason = error instanceof Error ? error.message.split(':')[0] : 'unknown_error';
    console.error(`Upload scanner evidence retrieval failed: ${reason}`);
    process.exit(1);
  });
}
