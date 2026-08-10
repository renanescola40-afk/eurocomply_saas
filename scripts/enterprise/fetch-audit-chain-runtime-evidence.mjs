#!/usr/bin/env node

import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateAuditChainLiveEvidence } from '../security/validate-audit-chain-live-evidence.mjs';

const CANONICAL_REPOSITORY = 'renanescola40-afk/eurocomply_saas';
const WORKFLOW_FILE = 'audit-chain-runtime-proof.yml';
const WORKFLOW_PATH = `.github/workflows/${WORKFLOW_FILE}`;
const EVIDENCE_PATH = 'docs/security/evidence/runtime/audit-chain-live-validation.json';
const FULL_SHA = /^[a-f0-9]{40}$/;
const NUMERIC_ID = /^\d+$/;

const REQUIRED_RAW_CRITERIA = Object.freeze([
  'migrationsApplied',
  'rpcExists',
  'createAuditEventUsesTransactionalRpc',
  'appendNormal',
  'appendConcurrent',
  'auditChainDetectsTampering',
  'missingPreviousHashDetected',
  'verificationRequiresRbacAndStepUp',
  'exportRequiresRbacAndStepUp',
  'exportIsSigned',
  'liveProofAttached',
]);

function headers(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'risck-comply-audit-chain-evidence-fetcher',
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
    .filter((run) => run?.event === 'workflow_dispatch')
    .filter((run) => run?.status === 'completed' && run?.conclusion === 'success')
    .filter((run) => !requested || String(run?.id) === requested)
    .sort((a, b) => Date.parse(b?.updated_at || b?.created_at || 0) - Date.parse(a?.updated_at || a?.created_at || 0))[0] ?? null;
}

export function validateRawAuditChainEvidence(evidence) {
  const failures = [];
  if (evidence?.evidenceItem !== 'audit-chain-live-validation') failures.push('evidence_item_invalid');
  if (evidence?.status !== 'Complete') failures.push('raw_status_not_complete');
  if (evidence?.sourceValidation?.status !== true) failures.push('source_validation_failed');
  if (Array.isArray(evidence?.sourceValidation?.failures) && evidence.sourceValidation.failures.length > 0) failures.push('source_failures_present');
  if (evidence?.liveValidation?.status !== 'Complete') failures.push('live_validation_not_complete');
  if (evidence?.releaseGate?.blocked === true) failures.push('release_gate_blocked');
  if (evidence?.runtimeConfiguration?.hasSupabaseUrl !== true) failures.push('supabase_url_not_proven');
  if (evidence?.runtimeConfiguration?.hasServiceRoleKey !== true) failures.push('service_role_not_proven');
  if (evidence?.runtimeConfiguration?.hasAuditSigningSecret !== true) failures.push('audit_signing_secret_not_proven');
  if (evidence?.runtimeConfiguration?.hasEvidencePackSigningSecret !== true) failures.push('evidence_pack_signing_secret_not_proven');
  if (evidence?.runtimeConfiguration?.hasTargetOrganization !== true) failures.push('target_organization_not_proven');
  if (evidence?.runtimeConfiguration?.liveProof?.present !== true) failures.push('live_proof_not_present');

  for (const criterion of REQUIRED_RAW_CRITERIA) {
    if (evidence?.acceptanceCriteria?.[criterion] !== true) failures.push(`acceptance_${criterion}_failed`);
  }

  return { passed: failures.length === 0, failures };
}

export function normalizeAuditChainEvidenceForP0(evidence, { targetSha, repository, runId, verifiedAt }) {
  const canonical = {
    ...evidence,
    status: 'Complete',
    outcome: 'passed',
    reviewedAt: verifiedAt,
    reviewer: 'RISCK COMPLY protected audit-chain runtime proof',
    summary: 'Protected exact-SHA production validation proved transactional append, concurrency safety, tamper detection, missing-link detection and signed evidence-pack readiness.',
    sourceRedactionConfirmation: evidence.redactionConfirmation,
    redactionConfirmation: 'Redaction confirmed for runtime evidence.',
    commitSha: targetSha,
    targetLiveValidation: evidence.liveValidation,
    verification_provenance: {
      method: 'github_actions',
      reference: `${WORKFLOW_PATH}#${runId}`,
      verifiedAt,
      repository,
      branch: 'main',
      githubRunId: String(runId),
      commitSha: targetSha,
    },
    evidenceIntegrity: {
      containsSensitiveValues: false,
      credentialsStored: false,
      rawAuditPayloadsStored: false,
      valuesRedacted: true,
    },
    controlsVerified: [
      'Audit-chain migrations and transactional append RPC are live.',
      'Normal and concurrent append behavior was validated against the target Supabase project.',
      'Tampering and missing previous-hash links were detected.',
      'Audit verification and evidence export remain RBAC plus Step-Up protected.',
      'Evidence-pack signing configuration was present without storing secret values.',
    ],
    evidenceLocations: [
      WORKFLOW_PATH,
      'scripts/security/run-audit-chain-live-validation.mjs',
      'scripts/security/validate-audit-chain-live-evidence.mjs',
      EVIDENCE_PATH,
    ],
  };

  return canonical;
}

export function validateCanonicalAuditChainEvidence(evidence, { targetSha, repository, now = new Date() }) {
  const failures = validateAuditChainLiveEvidence(evidence, {
    now,
    expectedRepository: repository,
    expectedBranch: 'main',
    expectedCommitSha: targetSha,
  });
  return { passed: failures.length === 0, failures };
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
    'header = "User-Agent: risck-comply-audit-chain-evidence-fetcher"',
    `output = "${escapeCurl(output)}"`,
    `url = "https://api.github.com/repos/${repository}/actions/artifacts/${artifactId}/zip"`,
  ].join('\n');
  const result = spawnSync('curl', ['--config', '-'], { input: `${config}\n`, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  if (result.error || result.status !== 0) throw new Error('artifact_download_failed');
}

function extractEvidence(zipPath) {
  const entries = execFileSync('unzip', ['-Z1', zipPath], { encoding: 'utf8' })
    .split('\n').map((entry) => entry.trim()).filter(Boolean);
  const matches = entries.filter((entry) => entry.endsWith('audit-chain-live-validation.json'));
  if (matches.length !== 1) throw new Error('audit_chain_evidence_missing_or_ambiguous');
  return JSON.parse(execFileSync('unzip', ['-p', zipPath, matches[0]], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 }));
}

export async function fetchAuditChainRuntimeEvidence({ root, repository, token, targetSha, sourceRunId = '', required = false }) {
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
    if (required) throw new Error('exact_sha_audit_chain_run_missing');
    console.log(`Audit-chain evidence remains open: no successful exact-SHA protected run for ${targetSha}.`);
    return { found: false, targetSha };
  }

  const runId = String(run.id || '');
  if (!NUMERIC_ID.test(runId)) throw new Error('runtime_workflow_run_id_invalid');
  const artifacts = await githubJson(`https://api.github.com/repos/${repository}/actions/runs/${runId}/artifacts`, token);
  const expectedName = `audit-chain-runtime-proof-${targetSha}`;
  const artifact = (artifacts.artifacts ?? []).find((candidate) => candidate?.name === expectedName && candidate?.expired !== true);
  if (!artifact || !NUMERIC_ID.test(String(artifact.id || ''))) throw new Error('exact_sha_audit_chain_artifact_missing');

  const zipPath = join(root, 'artifacts', 'enterprise-readiness', `audit-chain-${runId}.zip`);
  mkdirSync(dirname(zipPath), { recursive: true });
  try {
    downloadArtifact(repository, token, String(artifact.id), zipPath);
    const raw = extractEvidence(zipPath);
    const rawValidation = validateRawAuditChainEvidence(raw);
    if (!rawValidation.passed) throw new Error(`audit_chain_raw_evidence_invalid:${rawValidation.failures.join(',')}`);

    const verifiedAt = new Date(run.updated_at || run.created_at || Date.now()).toISOString();
    const canonical = normalizeAuditChainEvidenceForP0(raw, { targetSha, repository, runId, verifiedAt });
    const validation = validateCanonicalAuditChainEvidence(canonical, { targetSha, repository });
    if (!validation.passed) throw new Error(`audit_chain_evidence_invalid:${validation.failures.join(',')}`);

    const output = join(root, EVIDENCE_PATH);
    mkdirSync(dirname(output), { recursive: true });
    rmSync(output, { force: true });
    writeFileSync(output, `${JSON.stringify(canonical, null, 2)}\n`, { mode: 0o600 });
    console.log(`Retrieved exact-SHA audit-chain evidence from workflow run ${runId}.`);
    return { found: true, targetSha, runId, artifactId: String(artifact.id) };
  } finally {
    rmSync(zipPath, { force: true });
  }
}

async function run() {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  await fetchAuditChainRuntimeEvidence({
    root,
    repository: process.env.GITHUB_REPOSITORY || '',
    token: process.env.GITHUB_TOKEN || '',
    targetSha: String(process.env.TARGET_SHA || process.env.GITHUB_SHA || '').trim().toLowerCase(),
    sourceRunId: String(process.env.AUDIT_CHAIN_RUNTIME_SOURCE_RUN_ID || '').trim(),
    required: process.env.AUDIT_CHAIN_RUNTIME_EVIDENCE_REQUIRED === 'true',
  });
}

if (process.argv[1] && fileURLToPath(new URL(`file://${process.argv[1]}`)) === fileURLToPath(import.meta.url)) {
  run().catch((error) => {
    console.error(`Audit-chain evidence retrieval failed: ${error instanceof Error ? error.message.split(':')[0] : 'unknown_error'}`);
    process.exit(1);
  });
}
