#!/usr/bin/env node

import { rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  fetchUploadScannerRuntimeEvidence,
  selectExactShaUploadScannerRun,
} from './fetch-upload-scanner-runtime-evidence.mjs';

const REPOSITORY = 'renanescola40-afk/eurocomply_saas';
const WORKFLOW_FILE = 'upload-security-ci.yml';
const EVIDENCE_PATH = 'docs/security/evidence/runtime/upload-malware-scan-validation.json';
const FULL_SHA = /^[a-f0-9]{40}$/;
const MAX_API_RESPONSE_BYTES = 1024 * 1024;

function headers(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'risck-comply-p0-upload-scanner-aggregator',
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
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
}

async function githubJson(url, token) {
  const response = await fetch(url, {
    headers: headers(token),
    cache: 'no-store',
    redirect: 'error',
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`github_api_${response.status}`);
  return readBoundedJson(response);
}

export async function resolveExactShaScannerRunId({ repository, token, targetSha }) {
  if (repository !== REPOSITORY) throw new Error('repository_not_canonical');
  if (!token) throw new Error('github_token_missing');
  if (!FULL_SHA.test(targetSha)) throw new Error('target_sha_invalid');

  const response = await githubJson(
    `https://api.github.com/repos/${repository}/actions/workflows/${WORKFLOW_FILE}/runs?head_sha=${encodeURIComponent(targetSha)}&status=success&branch=main&per_page=20`,
    token,
  );
  const run = selectExactShaUploadScannerRun(response.workflow_runs, targetSha);
  return run ? String(run.id) : '';
}

export async function aggregateUploadScannerRuntimeEvidence({
  root,
  repository,
  token,
  targetSha,
  sourceRunId = '',
  required = false,
}) {
  const normalizedSourceRunId = String(sourceRunId || '').trim();
  let resolvedRunId = normalizedSourceRunId;

  if (!resolvedRunId) {
    resolvedRunId = await resolveExactShaScannerRunId({ repository, token, targetSha });
  }

  if (!resolvedRunId) {
    rmSync(join(root, EVIDENCE_PATH), { force: true });
    if (required) throw new Error('exact_sha_upload_scanner_run_missing');
    console.log(`Upload scanner evidence remains Open for ${targetSha}.`);
    return { found: false, targetSha };
  }

  return fetchUploadScannerRuntimeEvidence({
    root,
    repository,
    token,
    targetSha,
    sourceRunId: resolvedRunId,
    required,
  });
}

async function main() {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  await aggregateUploadScannerRuntimeEvidence({
    root,
    repository: process.env.GITHUB_REPOSITORY || '',
    token: process.env.GITHUB_TOKEN || '',
    targetSha: String(process.env.TARGET_SHA || process.env.GITHUB_SHA || '').trim().toLowerCase(),
    sourceRunId: process.env.UPLOAD_SCANNER_RUNTIME_SOURCE_RUN_ID || '',
    required: process.env.UPLOAD_SCANNER_RUNTIME_EVIDENCE_REQUIRED === 'true',
  });
}

if (process.argv[1] && fileURLToPath(new URL(`file://${process.argv[1]}`)) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    const reason = error instanceof Error ? error.message.split(':')[0] : 'unknown_error';
    console.error(`Upload scanner evidence aggregation failed: ${reason}`);
    process.exit(1);
  });
}
