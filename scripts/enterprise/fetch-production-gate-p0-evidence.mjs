#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateDeploymentRuntimeEvidence } from '../release/validate-deployment-runtime-evidence.mjs';
import { validateFinalValidationRuntimeEvidence } from '../release/validate-final-validation-runtime-evidence.mjs';
import { validateObservabilityRuntimeEvidence } from '../release/validate-observability-runtime-evidence.mjs';
import { validateRollbackRuntimeEvidence } from '../release/validate-rollback-runtime-evidence.mjs';

const REPOSITORY = 'renanescola40-afk/eurocomply_saas';
const WORKFLOW_FILE = 'enterprise-production-gate.yml';
const WORKFLOW_PATH = `.github/workflows/${WORKFLOW_FILE}`;
const FULL_SHA = /^[a-f0-9]{40}$/;
const NUMERIC_ID = /^\d+$/;
const MAX_API_BYTES = 1024 * 1024;
const MAX_ARTIFACT_BYTES = 32 * 1024 * 1024;
const MAX_EVIDENCE_BYTES = 1024 * 1024;
const MAX_ZIP_ENTRIES = 400;
const RECENT_RUN_WINDOW = 20;
const MANIFEST_PATH = 'release-validation/p0-production-gate-evidence-hydration.json';
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const ARTIFACT_HOST_SUFFIXES = ['.blob.core.windows.net', '.githubusercontent.com'];

export const P0_PRODUCTION_GATE_EVIDENCE = Object.freeze([
  Object.freeze({
    path: 'docs/security/evidence/runtime/deployment-smoke-validation.json',
    validator: validateDeploymentRuntimeEvidence,
  }),
  Object.freeze({
    path: 'docs/security/evidence/runtime/final-validation-runner.json',
    validator: validateFinalValidationRuntimeEvidence,
  }),
  Object.freeze({
    path: 'docs/security/evidence/runtime/observability-smoke-validation.json',
    validator: validateObservabilityRuntimeEvidence,
  }),
  Object.freeze({
    path: 'docs/security/evidence/runtime/rollback-dry-run-validation.json',
    validator: validateRollbackRuntimeEvidence,
  }),
]);

function apiHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'risck-comply-p0-production-gate-evidence-fetcher',
  };
}

async function readBoundedBytes(response, maximumBytes, errorCode) {
  const declared = Number(response.headers.get('content-length') || 0);
  if (Number.isFinite(declared) && declared > maximumBytes) throw new Error(errorCode);
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

function isAllowedArtifactRedirect(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:'
      && ARTIFACT_HOST_SUFFIXES.some((suffix) => parsed.hostname.endsWith(suffix));
  } catch {
    return false;
  }
}

async function downloadArtifact(token, artifactId, targetPath) {
  const normalizedId = String(artifactId || '').trim();
  if (!NUMERIC_ID.test(normalizedId)) throw new Error('artifact_id_invalid');

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
  if (!bytes.byteLength) throw new Error('artifact_download_empty');
  writeFileSync(targetPath, bytes, { mode: 0o600 });
}

export function selectProductionGateRuns(runs, targetSha) {
  return (Array.isArray(runs) ? runs : [])
    .filter((run) => run?.path === WORKFLOW_PATH)
    .filter((run) => String(run?.head_sha || '').toLowerCase() === targetSha)
    .filter((run) => run?.head_branch === 'main')
    .filter((run) => run?.status === 'completed')
    .filter((run) => Number.isInteger(run?.id))
    .sort((left, right) => Date.parse(right?.updated_at || right?.created_at || 0)
      - Date.parse(left?.updated_at || left?.created_at || 0));
}

export function selectLatestProductionGateArtifact(matches) {
  const candidates = Array.isArray(matches) ? matches : [];
  if (candidates.length === 0) return { artifact: null, supersededArtifactCount: 0 };
  if (candidates.length === 1) return { artifact: candidates[0], supersededArtifactCount: 0 };

  const timestamped = candidates.map((artifact) => {
    const createdAt = Date.parse(String(artifact?.created_at || ''));
    if (!Number.isFinite(createdAt)) throw new Error('production_gate_artifact_created_at_invalid');
    return { artifact, createdAt };
  }).sort((left, right) => right.createdAt - left.createdAt);

  if (timestamped[0].createdAt === timestamped[1].createdAt) {
    throw new Error('exact_sha_production_gate_latest_artifact_ambiguous');
  }

  return {
    artifact: timestamped[0].artifact,
    supersededArtifactCount: timestamped.length - 1,
  };
}

function isSafeZipEntry(entry) {
  if (!entry || entry.length > 320 || entry.includes('\\') || entry.includes('\u0000')) return false;
  if (entry.startsWith('/') || /^[A-Za-z]:/.test(entry)) return false;
  return entry.split('/').every((segment) => segment && segment !== '.' && segment !== '..');
}

export function selectEvidenceZipEntry(entries, expectedPath) {
  const normalized = (Array.isArray(entries) ? entries : [])
    .map((entry) => String(entry || '').trim())
    .filter(Boolean);
  if (normalized.length > MAX_ZIP_ENTRIES) throw new Error('artifact_zip_entry_limit_exceeded');
  if (normalized.some((entry) => !isSafeZipEntry(entry.endsWith('/') ? entry.slice(0, -1) : entry))) {
    throw new Error('artifact_zip_unsafe_entry');
  }
  const matches = normalized.filter((entry) => !entry.endsWith('/')
    && (entry === expectedPath || entry.endsWith(`/${expectedPath}`)));
  if (matches.length > 1) throw new Error('evidence_entry_ambiguous');
  return matches[0] || null;
}

export function evidenceCommitSha(evidence) {
  const candidates = [
    evidence?.runtimeContext?.commitSha,
    evidence?.commitSha,
    evidence?.targetSha,
    evidence?.observedSha,
    evidence?.releaseSha,
    evidence?.buildSha,
  ];
  return String(candidates.find((value) => typeof value === 'string' && value.trim()) || '').trim().toLowerCase();
}

export function validateProductionGateP0Evidence(evidence, spec, { targetSha, now = new Date() }) {
  const failures = [];
  if (evidenceCommitSha(evidence) !== targetSha) failures.push('evidence_exact_sha_mismatch');
  if (evidence?.evidenceIntegrity?.containsSensitiveValues === true) failures.push('evidence_contains_sensitive_values');
  try {
    const validatorFailures = spec.validator(evidence, {
      now,
      expectedRepository: REPOSITORY,
      expectedBranch: 'main',
      expectedCommitSha: targetSha,
    });
    if (!Array.isArray(validatorFailures)) failures.push('validator_returned_non_array');
    else failures.push(...validatorFailures);
  } catch {
    failures.push('validator_threw');
  }
  return [...new Set(failures)];
}

function readEvidenceFromZip(zipPath, entry) {
  const content = execFileSync('unzip', ['-p', zipPath, entry], {
    encoding: 'utf8',
    maxBuffer: MAX_EVIDENCE_BYTES,
  });
  if (Buffer.byteLength(content, 'utf8') > MAX_EVIDENCE_BYTES) throw new Error('p0_evidence_too_large');
  return JSON.parse(content);
}

function clearCanonicalEvidence(root) {
  for (const spec of P0_PRODUCTION_GATE_EVIDENCE) rmSync(join(root, spec.path), { force: true });
}

async function selectArtifactBearingRun({ token, targetSha }) {
  const response = await githubJson(
    `https://api.github.com/repos/${REPOSITORY}/actions/workflows/${WORKFLOW_FILE}/runs?status=completed&branch=main&head_sha=${encodeURIComponent(targetSha)}&per_page=${RECENT_RUN_WINDOW}`,
    token,
  );
  const totalCount = Number(response?.total_count || 0);
  const runs = selectProductionGateRuns(response?.workflow_runs, targetSha);

  for (const run of runs) {
    const inventory = await githubJson(
      `https://api.github.com/repos/${REPOSITORY}/actions/runs/${run.id}/artifacts?per_page=100`,
      token,
    );
    if (Number(inventory?.total_count || 0) > 100) throw new Error('run_artifact_inventory_truncated');
    const expectedName = `enterprise-production-final-evidence-${targetSha}`;
    const matches = (inventory?.artifacts || []).filter((artifact) =>
      artifact?.name === expectedName && artifact?.expired !== true && Number.isInteger(artifact?.id));
    const selected = selectLatestProductionGateArtifact(matches);
    if (selected.artifact) {
      return {
        run,
        artifact: selected.artifact,
        supersededArtifactCount: selected.supersededArtifactCount,
        totalCount,
        inspectedRuns: runs.indexOf(run) + 1,
      };
    }
  }

  if (totalCount > runs.length) throw new Error('recent_run_window_exhausted');
  return {
    run: null,
    artifact: null,
    supersededArtifactCount: 0,
    totalCount,
    inspectedRuns: runs.length,
  };
}

export async function fetchProductionGateP0Evidence({ root, token, targetSha, now = new Date() }) {
  const normalizedSha = String(targetSha || '').trim().toLowerCase();
  if (!FULL_SHA.test(normalizedSha)) throw new Error('target_sha_invalid');
  if (!token) throw new Error('github_token_missing');

  clearCanonicalEvidence(root);
  const selection = await selectArtifactBearingRun({ token, targetSha: normalizedSha });
  const results = [];

  if (!selection.run || !selection.artifact) {
    for (const spec of P0_PRODUCTION_GATE_EVIDENCE) {
      results.push({ path: spec.path, hydrated: false, reason: 'exact_sha_production_gate_artifact_missing' });
    }
  } else {
    const artifactId = String(selection.artifact.id || '').trim();
    if (!NUMERIC_ID.test(artifactId)) throw new Error('artifact_id_invalid');
    const size = Number(selection.artifact?.size_in_bytes || 0);
    if (!Number.isFinite(size) || size <= 0 || size > MAX_ARTIFACT_BYTES) throw new Error('artifact_size_invalid');

    const zipPath = join(root, 'artifacts', 'p0-runtime-evidence', `enterprise-production-gate-${selection.run.id}.zip`);
    mkdirSync(dirname(zipPath), { recursive: true });
    try {
      await downloadArtifact(token, artifactId, zipPath);
      const entries = execFileSync('unzip', ['-Z1', zipPath], { encoding: 'utf8', maxBuffer: 512 * 1024 })
        .split('\n').map((entry) => entry.trim()).filter(Boolean);

      for (const spec of P0_PRODUCTION_GATE_EVIDENCE) {
        const entry = selectEvidenceZipEntry(entries, spec.path);
        if (!entry) {
          results.push({ path: spec.path, hydrated: false, reason: 'evidence_missing_from_artifact' });
          continue;
        }

        let evidence;
        try {
          evidence = readEvidenceFromZip(zipPath, entry);
        } catch {
          results.push({ path: spec.path, hydrated: false, reason: 'evidence_invalid_json' });
          continue;
        }

        const failures = validateProductionGateP0Evidence(evidence, spec, { targetSha: normalizedSha, now });
        if (failures.length > 0) {
          results.push({ path: spec.path, hydrated: false, reason: 'evidence_validation_failed', failures });
          continue;
        }

        const destination = join(root, spec.path);
        mkdirSync(dirname(destination), { recursive: true });
        writeFileSync(destination, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
        results.push({ path: spec.path, hydrated: true, reason: null });
      }
    } finally {
      rmSync(zipPath, { force: true });
    }
  }

  const manifest = {
    schema: 'risck-comply.p0-production-gate-evidence-hydration.v1',
    status: 'Complete',
    generatedAt: new Date().toISOString(),
    repository: REPOSITORY,
    targetSha: normalizedSha,
    workflowPath: WORKFLOW_PATH,
    sourceRunId: selection.run ? String(selection.run.id) : null,
    sourceRunConclusion: selection.run?.conclusion || null,
    sourceArtifactId: selection.artifact ? String(selection.artifact.id) : null,
    sourceArtifactName: selection.artifact?.name || null,
    sourceArtifactCreatedAt: selection.artifact?.created_at || null,
    supersededSameRunArtifacts: selection.supersededArtifactCount,
    exactShaCompletedRuns: selection.totalCount,
    inspectedRuns: selection.inspectedRuns,
    expectedEvidence: P0_PRODUCTION_GATE_EVIDENCE.length,
    hydratedEvidence: results.filter((result) => result.hydrated).length,
    missingOrInvalidEvidence: results.filter((result) => !result.hydrated).length,
    results,
    evidenceIntegrity: {
      containsSensitiveValues: false,
      repositorySnapshotsClearedBeforeHydration: true,
      exactShaRequiredBeforeWrite: true,
      canonicalValidatorsRequiredBeforeWrite: true,
      workflowPathBound: true,
      artifactNameBoundToTargetSha: true,
      latestSameRunRerunArtifactSelectedByCreatedAt: true,
      ambiguousLatestArtifactFailsClosed: true,
      sourceRunConclusionDoesNotGrantCredit: true,
    },
    truthBoundary: 'This diagnostic fetcher can consume the newest artifact from a completed exact-main-SHA Enterprise Production Gate run even when the run was re-executed or the overall gate failed. Older same-run artifacts are superseded only by a strictly newer created_at timestamp. Every requested P0 evidence document is still independently exact-SHA checked and validated before being written. A failed gate or newer artifact never grants credit by itself; missing, stale, ambiguous, sensitive or validator-failing evidence remains absent.',
  };

  const manifestPath = join(root, MANIFEST_PATH);
  mkdirSync(dirname(manifestPath), { recursive: true });
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });
  return manifest;
}

async function main() {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const manifest = await fetchProductionGateP0Evidence({
    root,
    token: process.env.GITHUB_TOKEN || '',
    targetSha: process.env.TARGET_SHA || process.env.GITHUB_SHA || '',
  });
  console.log(JSON.stringify({
    targetSha: manifest.targetSha,
    sourceRunId: manifest.sourceRunId,
    sourceRunConclusion: manifest.sourceRunConclusion,
    hydratedEvidence: manifest.hydratedEvidence,
    expectedEvidence: manifest.expectedEvidence,
  }, null, 2));
}

if (process.argv[1] && fileURLToPath(new URL(`file://${process.argv[1]}`)) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`P0 production-gate evidence hydration failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}
