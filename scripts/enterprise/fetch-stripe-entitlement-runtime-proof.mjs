#!/usr/bin/env node

import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CANONICAL_REPOSITORY = 'renanescola40-afk/eurocomply_saas';
const WORKFLOW_PATH = '.github/workflows/stripe-entitlement-runtime-proof.yml';
const FULL_SHA = /^[a-f0-9]{40}$/;
const NUMERIC_ID = /^\d+$/;
const REQUIRED_EVIDENCE_CHECKS = [
  'eventProcessed',
  'snapshotObserved',
  'policyObserved',
  'limitsMatch',
  'reconciliationObserved',
  'rawEvidenceDeleted',
];

function headers(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'risck-comply-stripe-runtime-promotion',
  };
}

async function githubJson(url, token) {
  const response = await fetch(url, {
    headers: headers(token),
    cache: 'no-store',
    redirect: 'error',
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`github_api_${response.status}`);
  return response.json();
}

export function validateSourceRun(run, { targetSha, sourceRunId }) {
  const failures = [];
  if (run?.path !== WORKFLOW_PATH) failures.push('source_workflow_path_invalid');
  if (String(run?.id ?? '') !== String(sourceRunId ?? '')) failures.push('source_run_id_mismatch');
  if (String(run?.head_sha ?? '').toLowerCase() !== targetSha) failures.push('source_sha_mismatch');
  if (run?.head_branch !== 'main') failures.push('source_branch_not_main');
  if (run?.event !== 'workflow_dispatch') failures.push('source_event_not_manual_runtime_proof');
  if (run?.status !== 'completed') failures.push('source_run_not_completed');
  if (run?.conclusion !== 'success') failures.push('source_run_not_successful');
  return { passed: failures.length === 0, failures };
}

export function selectExactArtifact(artifacts, targetSha) {
  const expectedName = `stripe-entitlement-runtime-proof-${targetSha}`;
  const matches = (Array.isArray(artifacts) ? artifacts : [])
    .filter((artifact) => artifact?.name === expectedName)
    .filter((artifact) => artifact?.expired !== true)
    .filter((artifact) => NUMERIC_ID.test(String(artifact?.id ?? '')));
  if (matches.length !== 1) return null;
  return matches[0];
}

export function validateSanitizedProof(evidence, replay, targetSha) {
  const failures = [];
  if (evidence?.releaseSha !== targetSha) failures.push('evidence_release_sha_mismatch');
  if (evidence?.stripeTestModeConfirmed !== true) failures.push('stripe_test_mode_not_confirmed');
  if (evidence?.containsSensitiveValues === true) failures.push('sensitive_values_present');
  if (!/^[a-f0-9]{64}$/i.test(String(evidence?.catalogSha256 ?? ''))) failures.push('catalog_digest_invalid');
  for (const check of REQUIRED_EVIDENCE_CHECKS) {
    if (evidence?.checks?.[check] !== true) failures.push(`evidence_check_${check}_failed`);
  }
  if (replay?.sameEventId !== true) failures.push('replay_event_id_mismatch');
  if (replay?.firstDelivery?.processed !== true) failures.push('replay_first_delivery_not_processed');
  if (replay?.secondDelivery?.duplicate !== true) failures.push('replay_second_delivery_not_duplicate');
  if (replay?.before?.snapshotCount !== replay?.after?.snapshotCount) failures.push('replay_snapshot_count_changed');
  if (replay?.before?.policyVersion !== replay?.after?.policyVersion) failures.push('replay_policy_version_changed');
  if (JSON.stringify(replay?.before?.seatLimits) !== JSON.stringify(replay?.after?.seatLimits)) failures.push('replay_seat_limits_changed');
  if (replay?.after?.reconciliationCount !== replay?.before?.reconciliationCount) failures.push('replay_reconciliation_count_changed');
  return { passed: failures.length === 0, failures };
}

function escapeCurl(value) {
  return String(value).replace(/[\r\n]/g, '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function downloadArtifact(repository, token, artifactId, output) {
  const config = [
    'fail', 'location', 'silent', 'show-error',
    'connect-timeout = 10', 'max-time = 45',
    `header = "Authorization: Bearer ${escapeCurl(token)}"`,
    'header = "Accept: application/vnd.github+json"',
    'header = "X-GitHub-Api-Version: 2022-11-28"',
    'header = "User-Agent: risck-comply-stripe-runtime-promotion"',
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

function uniqueArchiveEntry(entries, basename) {
  const matches = entries.filter((entry) => entry === basename || entry.endsWith(`/${basename}`));
  if (matches.length !== 1) throw new Error(`${basename.replace(/\W+/g, '_')}_missing_or_ambiguous`);
  if (matches[0].includes('..') || matches[0].startsWith('/')) throw new Error('unsafe_archive_entry');
  return matches[0];
}

function extractJson(zipPath, entry) {
  const raw = execFileSync('unzip', ['-p', zipPath, entry], {
    encoding: 'utf8',
    maxBuffer: 2 * 1024 * 1024,
  });
  return JSON.parse(raw);
}

export async function fetchStripeEntitlementRuntimeProof({ root, repository, token, targetSha, sourceRunId }) {
  if (repository !== CANONICAL_REPOSITORY) throw new Error('repository_not_canonical');
  if (!token) throw new Error('github_token_missing');
  if (!FULL_SHA.test(targetSha)) throw new Error('target_sha_invalid');
  if (!NUMERIC_ID.test(String(sourceRunId ?? ''))) throw new Error('source_run_id_invalid');

  const run = await githubJson(`https://api.github.com/repos/${repository}/actions/runs/${sourceRunId}`, token);
  const sourceValidation = validateSourceRun(run, { targetSha, sourceRunId });
  if (!sourceValidation.passed) throw new Error(`source_run_invalid:${sourceValidation.failures.join(',')}`);

  const artifactResponse = await githubJson(`https://api.github.com/repos/${repository}/actions/runs/${sourceRunId}/artifacts`, token);
  const artifact = selectExactArtifact(artifactResponse?.artifacts, targetSha);
  if (!artifact) throw new Error('source_artifact_missing_or_ambiguous');

  const zipPath = join(root, 'artifacts', 'stripe-runtime-promotion-source.zip');
  const outputDir = join(root, 'artifacts', 'stripe-entitlement-runtime-proof');
  mkdirSync(dirname(zipPath), { recursive: true });
  mkdirSync(outputDir, { recursive: true });

  try {
    downloadArtifact(repository, token, String(artifact.id), zipPath);
    const entries = execFileSync('unzip', ['-Z1', zipPath], { encoding: 'utf8' })
      .split('\n').map((entry) => entry.trim()).filter(Boolean);
    const evidenceEntry = uniqueArchiveEntry(entries, 'evidence.json');
    const replayEntry = uniqueArchiveEntry(entries, 'replay.json');
    const evidence = extractJson(zipPath, evidenceEntry);
    const replay = extractJson(zipPath, replayEntry);
    const validation = validateSanitizedProof(evidence, replay, targetSha);
    if (!validation.passed) throw new Error(`sanitized_proof_invalid:${validation.failures.join(',')}`);

    writeFileSync(join(outputDir, 'evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
    writeFileSync(join(outputDir, 'replay.json'), `${JSON.stringify(replay, null, 2)}\n`, { mode: 0o600 });
    return { runId: String(sourceRunId), artifactId: String(artifact.id), targetSha };
  } finally {
    rmSync(zipPath, { force: true });
  }
}

async function main() {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const result = await fetchStripeEntitlementRuntimeProof({
    root,
    repository: process.env.GITHUB_REPOSITORY ?? '',
    token: process.env.GITHUB_TOKEN ?? '',
    targetSha: String(process.env.RELEASE_SHA ?? '').trim().toLowerCase(),
    sourceRunId: String(process.env.RUNTIME_PROOF_RUN_ID ?? '').trim(),
  });
  console.log(JSON.stringify({ status: 'source_proof_verified', ...result }, null, 2));
}

if (process.argv[1] && fileURLToPath(new URL(`file://${process.argv[1]}`)) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`Stripe runtime proof retrieval failed: ${error instanceof Error ? error.message.split(':')[0] : 'unknown_error'}`);
    process.exit(1);
  });
}
