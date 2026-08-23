#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPOSITORY = 'renanescola40-afk/eurocomply_saas';
const WORKFLOW_FILE = 'recovery-resilience-proof.yml';
const WORKFLOW_PATH = `.github/workflows/${WORKFLOW_FILE}`;
const WORKFLOW_NAME = 'Recovery Resilience Proof';
const DRILL_WORKFLOW_FILE = 'enterprise-recovery-drill.yml';
const DRILL_WORKFLOW_PATH = `.github/workflows/${DRILL_WORKFLOW_FILE}`;
const DRILL_WORKFLOW_NAME = 'Enterprise Recovery Drill';
const ROLLBACK_SOURCE = 'rollback-validation.json';
const RESTORE_SOURCE = 'backup-restore-tested.json';
const ROLLBACK_OUTPUT = 'docs/security/evidence/runtime/rollback-validation.json';
const RESTORE_OUTPUT = 'docs/security/evidence/p1/backup-restore-tested.json';
const FULL_SHA = /^[a-f0-9]{40}$/;
const NUMERIC = /^\d+$/;
const MAX_API_BYTES = 1024 * 1024;
const MAX_ARTIFACT_BYTES = 5 * 1024 * 1024;
const MAX_EVIDENCE_BYTES = 1024 * 1024;
const MAX_ZIP_ENTRIES = 20;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const ARTIFACT_HOST_SUFFIXES = ['.blob.core.windows.net', '.githubusercontent.com'];
const ROLLBACK_CONTROLS = ['REC-01', 'REC-02', 'REC-03', 'REC-04'];
const RESTORE_CONTROLS = ['REC-05', 'REC-06', 'REC-07', 'REC-08', 'REC-09', 'REC-10'];

function apiHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'risck-comply-recovery-evidence-fetcher',
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

export function selectExactShaRecoveryRun(runs, targetSha, sourceRunId = '') {
  const requested = String(sourceRunId || '').trim();
  return (Array.isArray(runs) ? runs : [])
    .filter((run) => run?.path === WORKFLOW_PATH)
    .filter((run) => String(run?.head_sha || '').toLowerCase() === targetSha)
    .filter((run) => run?.head_branch === 'main')
    .filter((run) => run?.event === 'workflow_dispatch')
    .filter((run) => run?.status === 'completed' && run?.conclusion === 'success')
    .filter((run) => !requested || String(run?.id) === requested)
    .sort((left, right) => Date.parse(right?.updated_at || right?.created_at || 0)
      - Date.parse(left?.updated_at || left?.created_at || 0))[0] ?? null;
}

export function selectExactShaRecoveryDrillRun(runs, targetSha, sourceRunId = '') {
  const requested = String(sourceRunId || '').trim();
  return (Array.isArray(runs) ? runs : [])
    .filter((run) => run?.path === DRILL_WORKFLOW_PATH)
    .filter((run) => String(run?.head_sha || '').toLowerCase() === targetSha)
    .filter((run) => run?.head_branch === 'main')
    .filter((run) => run?.event === 'push' || run?.event === 'workflow_dispatch')
    .filter((run) => run?.status === 'completed' && run?.conclusion === 'success')
    .filter((run) => !requested || String(run?.id) === requested)
    .sort((left, right) => Date.parse(right?.updated_at || right?.created_at || 0)
      - Date.parse(left?.updated_at || left?.created_at || 0))[0] ?? null;
}

function sameArray(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function validateBackupRestoreSource(restore, { targetSha, runId }) {
  const failures = [];
  if (restore?.schema !== 'risck-comply.backup-restore-evidence.v2') failures.push('restore_schema_invalid');
  if (restore?.evidenceItem !== 'backup-restore-tested') failures.push('restore_evidence_item_invalid');
  if (restore?.status !== 'Complete' || restore?.outcome !== 'passed') failures.push('restore_not_complete');
  if (restore?.repository !== REPOSITORY || restore?.branch !== 'main') failures.push('restore_provenance_invalid');
  if (restore?.targetSha !== targetSha || restore?.observedSha !== targetSha) failures.push('restore_sha_mismatch');
  if (String(restore?.runId || '') !== String(runId)) failures.push('restore_run_mismatch');
  if (!restore?.generatedAt || !Number.isFinite(Date.parse(restore.generatedAt))) failures.push('restore_generated_at_invalid');
  if (!Array.isArray(restore?.failures) || restore.failures.length !== 0) failures.push('restore_failures_present');
  if (!sameArray(restore?.controlsVerified, RESTORE_CONTROLS)) failures.push('restore_controls_invalid');
  for (const check of [
    'backupExists', 'restoreExecuted', 'dataIntegrity', 'rlsAfterRestore', 'rlsPoliciesPresent',
    'rpoMeasured', 'rtoMeasured', 'distinctDatabases', 'protectedMainExecution', 'exactShaBound',
  ]) if (restore?.checks?.[check] !== true) failures.push(`restore_check_failed:${check}`);
  if (!Number.isFinite(restore?.metrics?.rpoSeconds)) failures.push('rpo_metric_invalid');
  if (!Number.isFinite(restore?.metrics?.rtoSeconds)) failures.push('rto_metric_invalid');
  if (restore?.evidenceIntegrity?.containsSensitiveValues !== false) failures.push('restore_sensitive_integrity_invalid');
  if (restore?.evidenceIntegrity?.credentialsStored !== false) failures.push('restore_credentials_integrity_invalid');
  if (restore?.evidenceIntegrity?.exactShaBound !== true) failures.push('restore_sha_integrity_invalid');
  if (restore?.evidenceIntegrity?.databaseUrlsStored !== false) failures.push('restore_urls_integrity_invalid');
  if (restore?.evidenceIntegrity?.dumpStored !== false) failures.push('restore_dump_integrity_invalid');
  if (restore?.evidenceIntegrity?.rowDataStored !== false) failures.push('restore_rows_integrity_invalid');
  return [...new Set(failures)];
}

export function validateRecoverySources(rollback, restore, { targetSha, runId }) {
  const failures = [];
  if (rollback?.schema !== 'risck-comply.rollback-validation.v4') failures.push('rollback_schema_invalid');
  if (rollback?.evidenceItem !== 'rollback-validation') failures.push('rollback_evidence_item_invalid');
  for (const [name, source] of [['rollback', rollback]]) {
    if (source?.status !== 'Complete' || source?.outcome !== 'passed') failures.push(`${name}_not_complete`);
    if (source?.repository !== REPOSITORY || source?.branch !== 'main') failures.push(`${name}_provenance_invalid`);
    if (source?.targetSha !== targetSha || source?.observedSha !== targetSha) failures.push(`${name}_sha_mismatch`);
    if (String(source?.runId || '') !== String(runId)) failures.push(`${name}_run_mismatch`);
    if (!source?.generatedAt || !Number.isFinite(Date.parse(source.generatedAt))) failures.push(`${name}_generated_at_invalid`);
    if (!Array.isArray(source?.failures) || source.failures.length !== 0) failures.push(`${name}_failures_present`);
    if (source?.evidenceIntegrity?.containsSensitiveValues !== false) failures.push(`${name}_sensitive_integrity_invalid`);
    if (source?.evidenceIntegrity?.credentialsStored !== false) failures.push(`${name}_credentials_integrity_invalid`);
    if (source?.evidenceIntegrity?.exactShaBound !== true) failures.push(`${name}_sha_integrity_invalid`);
  }
  failures.push(...validateBackupRestoreSource(restore, { targetSha, runId }));
  if (!sameArray(rollback?.controlsVerified, ROLLBACK_CONTROLS)) failures.push('rollback_controls_invalid');
  for (const check of [
    'explicitConfirmation', 'rollbackTargetConfigured', 'rollbackTargetDistinct', 'rollbackShaDistinct',
    'rollbackExecuted', 'rollbackStatusChecked', 'postRollbackHealth', 'postRollbackNoStore',
    'protectedEnvironment', 'exactShaBound',
  ]) if (rollback?.checks?.[check] !== true) failures.push(`rollback_check_failed:${check}`);
  if (rollback?.evidenceIntegrity?.deploymentUrlsStored !== false) failures.push('rollback_urls_integrity_invalid');
  return [...new Set(failures)];
}

function canonicalCheck(name, passed = true) {
  return { name, passed };
}

function canonicalCommon({ targetSha, runId, workflowName, workflowPath, artifactName }) {
  return {
    repository: REPOSITORY,
    branch: 'main',
    targetSha,
    observedSha: targetSha,
    runId: String(runId),
    sourceWorkflow: {
      name: workflowName,
      file: workflowPath,
      runId: String(runId),
      artifact: artifactName,
      exactShaBound: true,
    },
    evidenceIntegrity: {
      containsSensitiveValues: false,
      credentialsStored: false,
      exactShaBound: true,
      sourceRunBound: true,
    },
  };
}

function buildCanonicalRestore(restore, common) {
  return {
    schema: 'risck-comply.backup-restore-scorecard-evidence.v1',
    evidenceItem: 'backup-restore-tested',
    status: 'Complete',
    outcome: 'passed',
    ...common,
    generatedAt: restore.generatedAt,
    controlsVerified: RESTORE_CONTROLS,
    checks: [
      canonicalCheck('backupExists'),
      canonicalCheck('restoreExecuted'),
      canonicalCheck('dataIntegrity'),
      canonicalCheck('rlsAfterRestore'),
      canonicalCheck('rpoMeasured'),
      canonicalCheck('rtoMeasured'),
    ],
    metrics: {
      rpoSeconds: restore.metrics.rpoSeconds,
      rtoSeconds: restore.metrics.rtoSeconds,
      totalExerciseSeconds: restore.metrics?.totalExerciseSeconds ?? null,
    },
    evidenceBoundary: 'Protected exact-main-SHA logical backup and isolated restore proof with integrity, RLS, RPO and RTO checks. Database URLs, dumps and row data are not stored.',
  };
}

export function buildCanonicalRecoveryEvidence(rollback, restore, { targetSha, runId }) {
  const failures = validateRecoverySources(rollback, restore, { targetSha, runId });
  if (failures.length) throw new Error(`recovery_evidence_invalid:${failures.join(',')}`);
  const common = canonicalCommon({
    targetSha,
    runId,
    workflowName: WORKFLOW_NAME,
    workflowPath: WORKFLOW_PATH,
    artifactName: `recovery-resilience-proof-${targetSha}`,
  });
  return {
    rollback: {
      schema: 'risck-comply.rollback-scorecard-evidence.v1',
      evidenceItem: 'rollback-validation',
      status: 'Complete',
      outcome: 'passed',
      ...common,
      generatedAt: rollback.generatedAt,
      controlsVerified: ROLLBACK_CONTROLS,
      checks: [
        canonicalCheck('rollbackTargetConfigured'),
        canonicalCheck('distinctDeployment', rollback.checks.rollbackTargetDistinct && rollback.checks.rollbackShaDistinct),
        canonicalCheck('rollbackExecuted'),
        canonicalCheck('postRollbackHealth'),
      ],
      metrics: { recoveryTimeSeconds: rollback.metrics?.recoveryTimeSeconds ?? null },
      evidenceBoundary: 'Protected exact-main-SHA proof of an explicitly confirmed Vercel rollback and post-rollback health validation. Deployment URLs, credentials and response bodies are not stored.',
    },
    restore: buildCanonicalRestore(restore, common),
  };
}

export function buildCanonicalRecoveryDrillEvidence(restore, { targetSha, runId }) {
  const failures = validateBackupRestoreSource(restore, { targetSha, runId });
  if (failures.length) throw new Error(`recovery_drill_evidence_invalid:${failures.join(',')}`);
  const common = canonicalCommon({
    targetSha,
    runId,
    workflowName: DRILL_WORKFLOW_NAME,
    workflowPath: DRILL_WORKFLOW_PATH,
    artifactName: `enterprise-recovery-${targetSha}`,
  });
  return {
    rollback: {
      schema: 'risck-comply.rollback-scorecard-evidence.v1',
      evidenceItem: 'rollback-validation',
      status: 'Open',
      outcome: 'not_executed',
      ...common,
      generatedAt: restore.generatedAt,
      controlsVerified: ROLLBACK_CONTROLS,
      checks: [
        canonicalCheck('rollbackTargetConfigured', false),
        canonicalCheck('distinctDeployment', false),
        canonicalCheck('rollbackExecuted', false),
        canonicalCheck('postRollbackHealth', false),
      ],
      metrics: { recoveryTimeSeconds: null },
      evidenceBoundary: 'No Production rollback executed. This exact-SHA artifact exists only to preserve truthful non-credit for REC-01 through REC-04 while independently promoting the isolated backup/restore controls REC-05 through REC-10.',
    },
    restore: buildCanonicalRestore(restore, common),
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
    headers: apiHeaders(token), cache: 'no-store', redirect: 'manual', signal: AbortSignal.timeout(15_000),
  });
  let response = initial;
  if (REDIRECT_STATUSES.has(initial.status)) {
    const location = initial.headers.get('location') || '';
    if (!isAllowedArtifactRedirect(location)) throw new Error('artifact_redirect_not_allowed');
    response = await fetch(location, { cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(30_000) });
  }
  if (!response.ok) throw new Error(`artifact_download_${response.status}`);
  const bytes = await readBoundedBytes(response, MAX_ARTIFACT_BYTES, 'artifact_download_too_large');
  if (!bytes.byteLength) throw new Error('artifact_download_empty');
  writeFileSync(outputPath, bytes, { mode: 0o600 });
}

function isSafeZipEntry(entry) {
  if (!entry || entry.length > 240 || entry.includes('\\') || entry.includes('\u0000')) return false;
  if (entry.startsWith('/') || /^[A-Za-z]:/.test(entry)) return false;
  return entry.split('/').every((segment) => segment && segment !== '.' && segment !== '..');
}

function normalizedZipEntries(entries) {
  const normalized = (Array.isArray(entries) ? entries : []).map((entry) => String(entry || '').trim()).filter(Boolean);
  if (!normalized.length) throw new Error('artifact_zip_empty');
  if (normalized.length > MAX_ZIP_ENTRIES) throw new Error('artifact_zip_entry_limit_exceeded');
  if (normalized.some((entry) => !isSafeZipEntry(entry.endsWith('/') ? entry.slice(0, -1) : entry))) throw new Error('artifact_zip_unsafe_entry');
  return normalized;
}

function selectUniqueEntry(normalized, filename) {
  const matches = normalized.filter((entry) => !entry.endsWith('/') && (entry === filename || entry.endsWith(`/${filename}`)));
  if (matches.length !== 1) throw new Error(`${filename.replace(/\.json$/, '').replaceAll('-', '_')}_source_not_unique`);
  return matches[0];
}

export function selectRecoveryEvidenceEntries(entries) {
  const normalized = normalizedZipEntries(entries);
  return {
    rollback: selectUniqueEntry(normalized, ROLLBACK_SOURCE),
    restore: selectUniqueEntry(normalized, RESTORE_SOURCE),
  };
}

export function selectRecoveryDrillEvidenceEntry(entries) {
  return selectUniqueEntry(normalizedZipEntries(entries), RESTORE_SOURCE);
}

function readZipJson(zipPath, entry) {
  const content = execFileSync('unzip', ['-p', zipPath, entry], { encoding: 'utf8', maxBuffer: MAX_EVIDENCE_BYTES });
  if (Buffer.byteLength(content, 'utf8') > MAX_EVIDENCE_BYTES) throw new Error('recovery_evidence_too_large');
  return JSON.parse(content);
}

function extractSources(zipPath) {
  const entries = execFileSync('unzip', ['-Z1', zipPath], { encoding: 'utf8', maxBuffer: 256 * 1024 })
    .split('\n').map((entry) => entry.trim()).filter(Boolean);
  const selected = selectRecoveryEvidenceEntries(entries);
  return { rollback: readZipJson(zipPath, selected.rollback), restore: readZipJson(zipPath, selected.restore) };
}

function extractDrillRestore(zipPath) {
  const entries = execFileSync('unzip', ['-Z1', zipPath], { encoding: 'utf8', maxBuffer: 256 * 1024 })
    .split('\n').map((entry) => entry.trim()).filter(Boolean);
  return readZipJson(zipPath, selectRecoveryDrillEvidenceEntry(entries));
}

export function removeStaleRecoveryEvidence(root) {
  rmSync(join(root, ROLLBACK_OUTPUT), { force: true });
  rmSync(join(root, RESTORE_OUTPUT), { force: true });
}

function writeCanonicalEvidence(root, evidence) {
  for (const [relativePath, document] of [[ROLLBACK_OUTPUT, evidence.rollback], [RESTORE_OUTPUT, evidence.restore]]) {
    const output = join(root, relativePath);
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, `${JSON.stringify(document, null, 2)}\n`, { mode: 0o600 });
  }
}

async function exactArtifactForRun({ repository, token, runId, artifactName }) {
  const listing = await githubJson(`https://api.github.com/repos/${repository}/actions/runs/${runId}/artifacts?per_page=20`, token);
  const matches = (listing.artifacts || []).filter((artifact) => artifact?.name === artifactName && artifact?.expired !== true);
  if (matches.length !== 1) throw new Error('exact_sha_recovery_artifact_not_unique');
  const artifact = matches[0];
  const size = Number(artifact?.size_in_bytes || 0);
  if (!Number.isFinite(size) || size <= 0 || size > MAX_ARTIFACT_BYTES) throw new Error('artifact_size_invalid');
  return artifact;
}

async function downloadAndBuild({ root, token, runId, artifact, mode, targetSha }) {
  const zipPath = join(root, 'artifacts', 'enterprise-readiness', `recovery-${runId}.zip`);
  mkdirSync(dirname(zipPath), { recursive: true });
  try {
    await downloadArtifact(token, artifact.id, zipPath);
    const downloadedSize = statSync(zipPath).size;
    if (downloadedSize <= 0 || downloadedSize > MAX_ARTIFACT_BYTES) throw new Error('downloaded_artifact_size_invalid');
    const evidence = mode === 'full'
      ? (() => {
          const source = extractSources(zipPath);
          return buildCanonicalRecoveryEvidence(source.rollback, source.restore, { targetSha, runId });
        })()
      : buildCanonicalRecoveryDrillEvidence(extractDrillRestore(zipPath), { targetSha, runId });
    writeCanonicalEvidence(root, evidence);
    return evidence;
  } finally {
    rmSync(zipPath, { force: true });
  }
}

export async function fetchRecoveryResilienceEvidence({ root, repository, token, targetSha, sourceRunId = '', required = false }) {
  removeStaleRecoveryEvidence(root);
  if (repository !== REPOSITORY) throw new Error('repository_not_canonical');
  if (!token) throw new Error('github_token_missing');
  if (!FULL_SHA.test(targetSha)) throw new Error('target_sha_invalid');

  const directRun = sourceRunId
    ? await githubJson(`https://api.github.com/repos/${repository}/actions/runs/${sourceRunId}`, token)
    : null;
  const fullRuns = directRun
    ? [directRun]
    : (await githubJson(`https://api.github.com/repos/${repository}/actions/workflows/${WORKFLOW_FILE}/runs?head_sha=${encodeURIComponent(targetSha)}&status=success&branch=main&per_page=20`, token)).workflow_runs;
  const fullRun = selectExactShaRecoveryRun(fullRuns, targetSha, sourceRunId);

  if (fullRun) {
    const runId = String(fullRun.id || '').trim();
    if (!NUMERIC.test(runId)) throw new Error('run_id_invalid');
    const artifactName = `recovery-resilience-proof-${targetSha}`;
    const artifact = await exactArtifactForRun({ repository, token, runId, artifactName });
    await downloadAndBuild({ root, token, runId, artifact, mode: 'full', targetSha });
    console.log(`Retrieved exact-SHA full recovery evidence from workflow run ${runId}.`);
    return { found: true, mode: 'full', targetSha, runId, artifactId: String(artifact.id) };
  }

  const drillRuns = directRun
    ? [directRun]
    : (await githubJson(`https://api.github.com/repos/${repository}/actions/workflows/${DRILL_WORKFLOW_FILE}/runs?head_sha=${encodeURIComponent(targetSha)}&status=success&branch=main&per_page=20`, token)).workflow_runs;
  const drillRun = selectExactShaRecoveryDrillRun(drillRuns, targetSha, sourceRunId);

  if (!drillRun) {
    if (required) throw new Error('exact_sha_recovery_run_missing');
    console.log(`Recovery evidence remains NOT_VERIFIED for ${targetSha}.`);
    return { found: false, targetSha };
  }

  const runId = String(drillRun.id || '').trim();
  if (!NUMERIC.test(runId)) throw new Error('run_id_invalid');
  const artifactName = `enterprise-recovery-${targetSha}`;
  const artifact = await exactArtifactForRun({ repository, token, runId, artifactName });
  await downloadAndBuild({ root, token, runId, artifact, mode: 'restore-only', targetSha });
  console.log(`Retrieved exact-SHA restore-only recovery evidence from Enterprise Recovery Drill run ${runId}.`);
  return { found: true, mode: 'restore-only', targetSha, runId, artifactId: String(artifact.id) };
}

async function main() {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  await fetchRecoveryResilienceEvidence({
    root,
    repository: process.env.GITHUB_REPOSITORY || '',
    token: process.env.GITHUB_TOKEN || '',
    targetSha: String(process.env.TARGET_SHA || process.env.GITHUB_SHA || '').trim().toLowerCase(),
    sourceRunId: process.env.RECOVERY_RUNTIME_SOURCE_RUN_ID || '',
    required: process.env.RECOVERY_RUNTIME_EVIDENCE_REQUIRED === 'true',
  });
}

if (process.argv[1] && fileURLToPath(new URL(`file://${process.argv[1]}`)) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    const reason = error instanceof Error ? error.message.split(':')[0] : 'unknown_error';
    console.error(`Recovery evidence retrieval failed: ${reason}`);
    process.exit(1);
  });
}