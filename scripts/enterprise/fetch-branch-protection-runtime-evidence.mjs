#!/usr/bin/env node

import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateGeneratedBranchProtectionEvidence } from '../security/check-generated-branch-protection-evidence.mjs';

const REPOSITORY = 'renanescola40-afk/eurocomply_saas';
const WORKFLOW_FILE = 'branch-protection-runtime-proof.yml';
const WORKFLOW_NAME = 'Branch Protection Runtime Proof';
const SOURCE_PATH = 'p0-evidence/branch-protection-main.generated.json';
const OUTPUT_PATH = 'docs/security/evidence/runtime/branch-protection-validation.json';
const FULL_SHA = /^[a-f0-9]{40}$/;
const NUMERIC = /^\d+$/;

function headers(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'risck-comply-branch-protection-fetcher',
  };
}

async function githubJson(url, token) {
  const response = await fetch(url, {
    headers: headers(token),
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    const error = new Error(`github_api_${response.status}`);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

export function isOptionalWorkflowUnavailable(error, { required = false, sourceRunId = '' } = {}) {
  return required !== true
    && String(sourceRunId || '').trim() === ''
    && (Number(error?.status) === 404 || String(error?.message || '') === 'github_api_404');
}

export function selectExactShaRun(runs, targetSha, sourceRunId = '') {
  const requested = String(sourceRunId || '').trim();
  return (Array.isArray(runs) ? runs : [])
    .filter((run) => run?.name === WORKFLOW_NAME)
    .filter((run) => String(run?.head_sha || '').toLowerCase() === targetSha)
    .filter((run) => run?.head_branch === 'main')
    .filter((run) => run?.status === 'completed' && run?.conclusion === 'success')
    .filter((run) => !requested || String(run?.id) === requested)
    .sort((a, b) => Date.parse(b?.updated_at || 0) - Date.parse(a?.updated_at || 0))[0] ?? null;
}

export function validateDownloadedEvidence(evidence, { targetSha, runId }) {
  const failures = validateGeneratedBranchProtectionEvidence(evidence, {
    expectedSha: targetSha,
    expectedRepository: REPOSITORY,
  });
  if (String(evidence?.provenance?.runId || '') !== String(runId)) failures.push('workflow run provenance mismatch');
  if (String(evidence?.sourceDetails?.runId || '') !== String(runId)) failures.push('source run provenance mismatch');
  if (evidence?.currentMainSha !== targetSha) failures.push('current main SHA mismatch');
  return { passed: failures.length === 0, failures };
}

export function buildCanonicalEvidence(source, { targetSha, runId }) {
  const validation = validateDownloadedEvidence(source, { targetSha, runId });
  const passed = validation.passed;
  const flags = source?.branch_protection || {};
  return {
    schema: 'risck-comply.branch-protection-scorecard-evidence.v1',
    evidenceItem: 'branch-protection-validation',
    status: passed ? 'Complete' : 'Open',
    outcome: passed ? 'passed' : 'not_verified',
    generatedAt: source?.generatedAt || null,
    reviewedAt: source?.reviewedAt || source?.generatedAt || null,
    reviewer: 'RISCK COMPLY protected repository-control automation',
    repository: REPOSITORY,
    branch: 'main',
    targetSha,
    sourceWorkflow: {
      name: WORKFLOW_NAME,
      runId: String(runId),
      artifact: `branch-protection-runtime-proof-${targetSha}`,
    },
    summary: passed
      ? 'The exact current main SHA is protected by the required pull-request, review, conversation, status-check, update, force-push and deletion controls.'
      : 'Branch protection evidence is missing, incomplete, stale, SHA-mismatched or has invalid provenance.',
    checks: [
      {
        name: 'branchProtection',
        critical: true,
        passed,
        details: {
          requiredApprovingReviews: flags.required_approving_reviews ?? 0,
          requiredStatusCheckCount: Array.isArray(source?.required_status_checks)
            ? source.required_status_checks.length
            : 0,
          missingRequiredCheckCount: Array.isArray(source?.sourceDetails?.missingRequiredChecks)
            ? source.sourceDetails.missingRequiredChecks.length
            : null,
          missingProtectionFlags: source?.sourceDetails?.missingProtectionFlags ?? null,
          exactShaBound: source?.provenance?.exactShaBound === true,
          mainHeadMatched: source?.provenance?.mainHeadMatched === true,
        },
      },
    ],
    failures: validation.failures,
    redactionConfirmation: 'No token, raw GitHub API payload, repository secret, user data or customer data is stored in this canonical evidence.',
    evidenceLocations: [
      '.github/workflows/branch-protection-runtime-proof.yml',
      'scripts/enterprise/build-branch-protection-runtime-evidence.mjs',
      'scripts/enterprise/fetch-branch-protection-runtime-evidence.mjs',
      `github-actions-run:${runId}`,
    ],
    evidenceBoundary: 'This proves the configured GitHub main-branch protection controls at the exact assessed SHA. It does not prove deployment approval, release approval, provider security, runtime isolation, backup recovery or external review.',
    evidenceIntegrity: {
      containsSensitiveValues: false,
      rawApiPayloadStored: false,
      accessTokensStored: false,
      exactShaBound: passed,
      sourceRunBound: passed,
    },
  };
}

function download(repository, token, artifactId, path) {
  const result = spawnSync('curl', [
    '-fL',
    '-H', `Authorization: Bearer ${token}`,
    '-H', 'Accept: application/vnd.github+json',
    '-o', path,
    `https://api.github.com/repos/${repository}/actions/artifacts/${artifactId}/zip`,
  ], { encoding: 'utf8' });
  if (result.error || result.status !== 0) throw new Error('artifact_download_failed');
}

function extractSource(zipPath) {
  const entries = execFileSync('unzip', ['-Z1', zipPath], { encoding: 'utf8' })
    .split('\n')
    .map((value) => value.trim())
    .filter(Boolean);
  const entry = entries.find((candidate) => candidate.endsWith(SOURCE_PATH));
  if (!entry) throw new Error('branch_protection_source_missing');
  return JSON.parse(execFileSync('unzip', ['-p', zipPath, entry], {
    encoding: 'utf8',
    maxBuffer: 2 * 1024 * 1024,
  }));
}

function removeStale(root) {
  rmSync(join(root, OUTPUT_PATH), { force: true });
}

export async function fetchBranchProtectionRuntimeEvidence({
  root,
  repository,
  token,
  targetSha,
  sourceRunId = '',
  required = false,
}) {
  removeStale(root);
  if (repository !== REPOSITORY) throw new Error('repository_not_canonical');
  if (!token) throw new Error('github_token_missing');
  if (!FULL_SHA.test(targetSha)) throw new Error('target_sha_invalid');

  let runs;
  try {
    runs = sourceRunId
      ? [await githubJson(`https://api.github.com/repos/${repository}/actions/runs/${sourceRunId}`, token)]
      : (await githubJson(`https://api.github.com/repos/${repository}/actions/workflows/${WORKFLOW_FILE}/runs?status=success&branch=main&per_page=100`, token)).workflow_runs;
  } catch (error) {
    if (isOptionalWorkflowUnavailable(error, { required, sourceRunId })) {
      console.log(`Branch protection runtime workflow is not registered on main yet; REL-08 remains NOT_VERIFIED for ${targetSha}.`);
      return { found: false, targetSha, reason: 'workflow_not_registered' };
    }
    throw error;
  }

  const run = selectExactShaRun(runs, targetSha, sourceRunId);
  if (!run) {
    if (required) throw new Error('exact_sha_branch_protection_run_missing');
    console.log(`Branch protection runtime evidence remains NOT_VERIFIED for ${targetSha}.`);
    return { found: false, targetSha };
  }

  const runId = String(run.id || '');
  if (!NUMERIC.test(runId)) throw new Error('run_id_invalid');
  const artifactListing = await githubJson(
    `https://api.github.com/repos/${repository}/actions/runs/${runId}/artifacts`,
    token,
  );
  const expectedName = `branch-protection-runtime-proof-${targetSha}`;
  const artifact = (artifactListing.artifacts || []).find(
    (item) => item?.name === expectedName && item?.expired !== true,
  );
  if (!artifact || !NUMERIC.test(String(artifact.id || ''))) throw new Error('artifact_missing');

  const zipPath = join(root, 'artifacts', 'enterprise-readiness', `branch-protection-${runId}.zip`);
  mkdirSync(dirname(zipPath), { recursive: true });
  try {
    download(repository, token, String(artifact.id), zipPath);
    const source = extractSource(zipPath);
    const validation = validateDownloadedEvidence(source, { targetSha, runId });
    if (!validation.passed) {
      throw new Error(`branch_protection_evidence_invalid:${validation.failures.join(',')}`);
    }
    const canonical = buildCanonicalEvidence(source, { targetSha, runId });
    const output = join(root, OUTPUT_PATH);
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, `${JSON.stringify(canonical, null, 2)}\n`, { mode: 0o600 });
    console.log(`Retrieved exact-SHA branch protection evidence from workflow run ${runId}.`);
    return { found: true, runId, targetSha };
  } finally {
    rmSync(zipPath, { force: true });
  }
}

async function main() {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  await fetchBranchProtectionRuntimeEvidence({
    root,
    repository: process.env.GITHUB_REPOSITORY || '',
    token: process.env.GITHUB_TOKEN || '',
    targetSha: String(process.env.TARGET_SHA || process.env.GITHUB_SHA || '').trim().toLowerCase(),
    sourceRunId: process.env.BRANCH_PROTECTION_RUNTIME_SOURCE_RUN_ID || '',
    required: process.env.BRANCH_PROTECTION_RUNTIME_EVIDENCE_REQUIRED === 'true',
  });
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message.split(':')[0] : 'unknown_error');
    process.exit(1);
  });
}
