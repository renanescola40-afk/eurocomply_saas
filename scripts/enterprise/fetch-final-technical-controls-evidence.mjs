#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPOSITORY = 'renanescola40-afk/eurocomply_saas';
const WORKFLOW_FILE = 'final-technical-controls-proof.yml';
const WORKFLOW_NAME = 'Final Technical Controls Proof';
const SOURCE_FILE = 'final-technical-controls-validation.json';
const SECURITY_EVENTS_OUTPUT = 'docs/security/evidence/runtime/security-events-validation.json';
const STORAGE_OUTPUT = 'docs/security/evidence/runtime/storage-tenant-isolation-validation.json';
const FULL_SHA = /^[a-f0-9]{40}$/;
const NUMERIC = /^\d+$/;
const MAX_API_BYTES = 1024 * 1024;
const MAX_ARTIFACT_BYTES = 5 * 1024 * 1024;
const MAX_EVIDENCE_BYTES = 1024 * 1024;
const MAX_ZIP_ENTRIES = 20;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const ARTIFACT_HOST_SUFFIXES = ['.blob.core.windows.net', '.githubusercontent.com'];
const REQUIRED_CHECKS = Object.freeze([
  'protectedMainExecution',
  'exactShaBound',
  'ownerUploadAllowed',
  'ownerReadAllowed',
  'outsiderReadDenied',
  'outsiderUploadDenied',
  'syntheticObjectsRemoved',
  'sessionsRevoked',
  'securityEventInserted',
  'timelineEventInserted',
  'transactionRolledBack',
]);

function apiHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'risck-comply-final-technical-evidence-fetcher',
  };
}

async function readBoundedBytes(response, maximumBytes, errorCode) {
  const declaredLength = Number(response.headers.get('content-length') || 0);
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) throw new Error(errorCode);
  if (!response.body) throw new Error('response_body_missing');

  const reader = response.body.getReader();
  const chunks = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      totalBytes += value.byteLength;
      if (totalBytes > maximumBytes) {
        await reader.cancel(errorCode);
        throw new Error(errorCode);
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
  return bytes;
}

async function githubJson(url, token) {
  const response = await fetch(url, {
    headers: apiHeaders(token),
    cache: 'no-store',
    redirect: 'error',
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`github_api_${response.status}`);
  const bytes = await readBoundedBytes(response, MAX_API_BYTES, 'github_api_response_too_large');
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
}

export function selectExactShaRun(runs, targetSha, sourceRunId = '') {
  const requested = String(sourceRunId || '').trim();
  return (Array.isArray(runs) ? runs : [])
    .filter((run) => run?.name === WORKFLOW_NAME)
    .filter((run) => String(run?.head_sha || '').toLowerCase() === targetSha)
    .filter((run) => run?.head_branch === 'main')
    .filter((run) => run?.event === 'workflow_dispatch')
    .filter((run) => run?.status === 'completed' && run?.conclusion === 'success')
    .filter((run) => !requested || String(run?.id) === requested)
    .sort((left, right) => Date.parse(right?.updated_at || right?.created_at || 0)
      - Date.parse(left?.updated_at || left?.created_at || 0))[0] ?? null;
}

export function validateFinalTechnicalEvidence(source, { targetSha, runId }) {
  const failures = [];
  if (source?.schema !== 'risck-comply.final-technical-controls-evidence.v1') failures.push('schema_invalid');
  if (source?.evidenceItem !== 'final-technical-controls-validation') failures.push('evidence_item_invalid');
  if (source?.status !== 'Complete' || source?.outcome !== 'passed') failures.push('source_not_complete');
  if (source?.repository !== REPOSITORY || source?.branch !== 'main') failures.push('repository_or_branch_mismatch');
  if (source?.targetSha !== targetSha || source?.observedSha !== targetSha) failures.push('exact_sha_mismatch');
  if (String(source?.workflowRunId || '') !== String(runId)) failures.push('workflow_run_mismatch');
  if (!source?.generatedAt || !Number.isFinite(Date.parse(source.generatedAt))) failures.push('generated_at_invalid');
  for (const check of REQUIRED_CHECKS) {
    if (source?.checks?.[check] !== true) failures.push(`check_failed:${check}`);
  }
  if (!Array.isArray(source?.failures) || source.failures.length !== 0) failures.push('source_failures_present');

  const integrity = source?.evidenceIntegrity || {};
  for (const field of [
    'containsSensitiveValues',
    'objectPathsStored',
    'organizationIdentifiersStored',
    'userIdentifiersStored',
    'credentialsStored',
    'objectBodiesStored',
    'databaseUrlStored',
    'securityEventContentStored',
  ]) {
    if (integrity[field] !== false) failures.push(`integrity_invalid:${field}`);
  }
  if (integrity.syntheticStorageRemoved !== true) failures.push('synthetic_storage_not_removed');
  if (integrity.syntheticDatabaseRowsRolledBack !== true) failures.push('synthetic_database_rows_not_rolled_back');
  if (integrity.exactShaBound !== true) failures.push('integrity_sha_not_bound');
  return [...new Set(failures)];
}

function commonEvidence(source, { targetSha, runId, artifactName }) {
  return {
    status: 'Complete',
    outcome: 'passed',
    generatedAt: source.generatedAt,
    repository: REPOSITORY,
    branch: 'main',
    targetSha,
    sourceWorkflow: {
      name: WORKFLOW_NAME,
      file: `.github/workflows/${WORKFLOW_FILE}`,
      runId: String(runId),
      artifact: artifactName,
      exactShaBound: true,
    },
    redactionConfirmation: 'No credentials, object paths, organization identifiers, user identifiers, object bodies, database URLs or security-event contents are stored.',
    evidenceIntegrity: {
      containsSensitiveValues: false,
      credentialsStored: false,
      exactShaBound: true,
      sourceRunBound: true,
      syntheticStorageRemoved: true,
      syntheticDatabaseRowsRolledBack: true,
    },
  };
}

export function buildCanonicalEvidence(source, { targetSha, runId }) {
  const failures = validateFinalTechnicalEvidence(source, { targetSha, runId });
  if (failures.length > 0) throw new Error(`final_technical_evidence_invalid:${failures.join(',')}`);
  const artifactName = `final-technical-controls-proof-${targetSha}`;
  const common = commonEvidence(source, { targetSha, runId, artifactName });

  return {
    securityEvents: {
      schema: 'risck-comply.security-events-scorecard-evidence.v1',
      evidenceItem: 'security-events-validation',
      ...common,
      checks: [{
        name: 'securityEvents',
        passed: true,
        details: {
          securityEventInserted: true,
          timelineEventInserted: true,
          transactionRolledBack: true,
        },
      }],
      evidenceBoundary: 'Protected exact-SHA proof that synthetic security incident and timeline rows can be inserted transactionally in the isolated recovery database and are absent after rollback. It does not prove customer production traffic, retention, SIEM ingestion or external review.',
    },
    storage: {
      schema: 'risck-comply.storage-tenant-isolation-scorecard-evidence.v1',
      evidenceItem: 'storage-tenant-isolation-validation',
      ...common,
      checks: [{
        name: 'storageTenantIsolation',
        passed: true,
        details: {
          ownerUploadAllowed: true,
          ownerReadAllowed: true,
          outsiderReadDenied: true,
          outsiderUploadDenied: true,
          syntheticObjectsRemoved: true,
          sessionsRevoked: true,
        },
      }],
      evidenceBoundary: 'Protected exact-SHA synthetic proof of owner access and outsider denial in the compliance-documents bucket. Synthetic objects are removed and sessions revoked. It does not prove every bucket, customer object or future policy change.',
    },
  };
}

function isAllowedArtifactRedirect(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:'
      && ARTIFACT_HOST_SUFFIXES.some((suffix) => parsed.hostname.endsWith(suffix));
  } catch {
    return false;
  }
}

async function downloadArtifact(token, artifactId, outputPath) {
  const normalizedId = String(artifactId || '').trim();
  if (!NUMERIC.test(normalizedId)) throw new Error('artifact_id_invalid');
  const initial = await fetch(`https://api.github.com/repos/${REPOSITORY}/actions/artifacts/${normalizedId}/zip`, {
    headers: apiHeaders(token),
    cache: 'no-store',
    redirect: 'manual',
    signal: AbortSignal.timeout(15_000),
  });
  let response = initial;
  if (REDIRECT_STATUSES.has(initial.status)) {
    const location = initial.headers.get('location') || '';
    if (!isAllowedArtifactRedirect(location)) throw new Error('artifact_redirect_not_allowed');
    response = await fetch(location, {
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(30_000),
    });
  }
  if (!response.ok) throw new Error(`artifact_download_${response.status}`);
  const bytes = await readBoundedBytes(response, MAX_ARTIFACT_BYTES, 'artifact_download_too_large');
  if (bytes.byteLength === 0) throw new Error('artifact_download_empty');
  writeFileSync(outputPath, bytes, { mode: 0o600 });
}

function isSafeZipEntry(entry) {
  if (!entry || entry.length > 240 || entry.includes('\\') || entry.includes('\u0000')) return false;
  if (entry.startsWith('/') || /^[A-Za-z]:/.test(entry)) return false;
  return entry.split('/').every((segment) => segment && segment !== '.' && segment !== '..');
}

export function selectFinalTechnicalEvidenceEntry(entries) {
  const normalized = (Array.isArray(entries) ? entries : [])
    .map((entry) => String(entry || '').trim())
    .filter(Boolean);
  if (normalized.length === 0) throw new Error('artifact_zip_empty');
  if (normalized.length > MAX_ZIP_ENTRIES) throw new Error('artifact_zip_entry_limit_exceeded');
  if (normalized.some((entry) => !isSafeZipEntry(entry.endsWith('/') ? entry.slice(0, -1) : entry))) {
    throw new Error('artifact_zip_unsafe_entry');
  }
  const matches = normalized.filter((entry) => !entry.endsWith('/')
    && (entry === SOURCE_FILE || entry.endsWith(`/${SOURCE_FILE}`)));
  if (matches.length !== 1) throw new Error('final_technical_source_not_unique');
  return matches[0];
}

function extractSource(zipPath) {
  const entries = execFileSync('unzip', ['-Z1', zipPath], {
    encoding: 'utf8',
    maxBuffer: 256 * 1024,
  }).split('\n').map((entry) => entry.trim()).filter(Boolean);
  const entry = selectFinalTechnicalEvidenceEntry(entries);
  const content = execFileSync('unzip', ['-p', zipPath, entry], {
    encoding: 'utf8',
    maxBuffer: MAX_EVIDENCE_BYTES,
  });
  if (Buffer.byteLength(content, 'utf8') > MAX_EVIDENCE_BYTES) throw new Error('final_technical_evidence_too_large');
  return JSON.parse(content);
}

export function removeStaleFinalTechnicalEvidence(root) {
  rmSync(join(root, SECURITY_EVENTS_OUTPUT), { force: true });
  rmSync(join(root, STORAGE_OUTPUT), { force: true });
}

export async function fetchFinalTechnicalControlsEvidence({
  root,
  repository,
  token,
  targetSha,
  sourceRunId = '',
  required = false,
}) {
  removeStaleFinalTechnicalEvidence(root);
  if (repository !== REPOSITORY) throw new Error('repository_not_canonical');
  if (!token) throw new Error('github_token_missing');
  if (!FULL_SHA.test(targetSha)) throw new Error('target_sha_invalid');

  const runs = sourceRunId
    ? [await githubJson(`https://api.github.com/repos/${repository}/actions/runs/${sourceRunId}`, token)]
    : (await githubJson(
      `https://api.github.com/repos/${repository}/actions/workflows/${WORKFLOW_FILE}/runs?head_sha=${encodeURIComponent(targetSha)}&status=success&branch=main&per_page=20`,
      token,
    )).workflow_runs;
  const run = selectExactShaRun(runs, targetSha, sourceRunId);
  if (!run) {
    if (required) throw new Error('exact_sha_final_technical_run_missing');
    console.log(`Final technical controls evidence remains NOT_VERIFIED for ${targetSha}.`);
    return { found: false, targetSha };
  }

  const runId = String(run.id || '').trim();
  if (!NUMERIC.test(runId)) throw new Error('run_id_invalid');
  const artifactName = `final-technical-controls-proof-${targetSha}`;
  const listing = await githubJson(
    `https://api.github.com/repos/${repository}/actions/runs/${runId}/artifacts?per_page=20`,
    token,
  );
  const matches = (listing.artifacts || []).filter((artifact) => artifact?.name === artifactName && artifact?.expired !== true);
  if (matches.length !== 1) throw new Error('exact_sha_final_technical_artifact_not_unique');
  const artifact = matches[0];
  const artifactSize = Number(artifact?.size_in_bytes || 0);
  if (!Number.isFinite(artifactSize) || artifactSize <= 0 || artifactSize > MAX_ARTIFACT_BYTES) {
    throw new Error('artifact_size_invalid');
  }

  const zipPath = join(root, 'artifacts', 'enterprise-readiness', `final-technical-${runId}.zip`);
  mkdirSync(dirname(zipPath), { recursive: true });
  try {
    await downloadArtifact(token, artifact.id, zipPath);
    const downloadedSize = statSync(zipPath).size;
    if (downloadedSize <= 0 || downloadedSize > MAX_ARTIFACT_BYTES) throw new Error('downloaded_artifact_size_invalid');
    const source = extractSource(zipPath);
    const evidence = buildCanonicalEvidence(source, { targetSha, runId });
    for (const [relativePath, document] of [
      [SECURITY_EVENTS_OUTPUT, evidence.securityEvents],
      [STORAGE_OUTPUT, evidence.storage],
    ]) {
      const output = join(root, relativePath);
      mkdirSync(dirname(output), { recursive: true });
      writeFileSync(output, `${JSON.stringify(document, null, 2)}\n`, { mode: 0o600 });
    }
    console.log(`Retrieved exact-SHA final technical controls evidence from workflow run ${runId}.`);
    return { found: true, targetSha, runId, artifactId: String(artifact.id) };
  } finally {
    rmSync(zipPath, { force: true });
  }
}

async function main() {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  await fetchFinalTechnicalControlsEvidence({
    root,
    repository: process.env.GITHUB_REPOSITORY || '',
    token: process.env.GITHUB_TOKEN || '',
    targetSha: String(process.env.TARGET_SHA || process.env.GITHUB_SHA || '').trim().toLowerCase(),
    sourceRunId: process.env.FINAL_TECHNICAL_RUNTIME_SOURCE_RUN_ID || '',
    required: process.env.FINAL_TECHNICAL_RUNTIME_EVIDENCE_REQUIRED === 'true',
  });
}

if (process.argv[1] && fileURLToPath(new URL(`file://${process.argv[1]}`)) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    const reason = error instanceof Error ? error.message.split(':')[0] : 'unknown_error';
    console.error(`Final technical controls evidence retrieval failed: ${reason}`);
    process.exit(1);
  });
}
