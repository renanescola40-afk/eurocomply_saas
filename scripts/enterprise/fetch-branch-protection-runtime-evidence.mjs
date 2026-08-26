#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateGeneratedBranchProtectionEvidence } from '../security/check-generated-branch-protection-evidence.mjs';

const REPOSITORY = 'renanescola40-afk/eurocomply_saas';
const WORKFLOW_FILE = 'branch-protection-runtime-proof.yml';
const WORKFLOW_NAME = 'Branch Protection Runtime Proof';
const SOURCE_PATH = 'p0-evidence/branch-protection-main.generated.json';
const SCORECARD_OUTPUT_PATH = 'docs/security/evidence/runtime/branch-protection-validation.json';
const P0_OUTPUT_PATH = 'docs/security/evidence/runtime/branch-protection-required-checks.json';
const FULL_SHA = /^[a-f0-9]{40}$/;
const NUMERIC = /^\d+$/;
const MAX_API_RESPONSE_BYTES = 1024 * 1024;
const MAX_ARTIFACT_BYTES = 5 * 1024 * 1024;
const MAX_ZIP_ENTRIES = 20;
const MAX_EVIDENCE_BYTES = 1024 * 1024;
const ALLOWED_EVENTS = new Set(['push', 'workflow_dispatch']);
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const ARTIFACT_HOST_SUFFIXES = ['.blob.core.windows.net', '.githubusercontent.com'];

const RELEASE_BLOCKERS = Object.freeze({
  full_security_suite_required: true,
  lint_failure_blocks: true,
  typecheck_failure_blocks: true,
  test_failure_blocks: true,
  build_failure_blocks: true,
  security_ci_failure_blocks: true,
  secret_scanning_failure_blocks: true,
  untriaged_high_or_critical_npm_audit_blocks: true,
  branch_protection_evidence_blocks: true,
  strict_public_secret_scan_required: true,
  hardcoded_secret_blocks: true,
  package_lock_mismatch_blocks: true,
  direct_push_main_is_release_risk_documented: true,
  workflow_secret_log_exposure_blocks: true,
});

function apiHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'risck-comply-branch-protection-fetcher',
  };
}

async function readBoundedBytes(response, maximumBytes, tooLargeCode) {
  const declaredLength = Number(response.headers.get('content-length') || 0);
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) {
    throw new Error(tooLargeCode);
  }
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
        await reader.cancel(tooLargeCode);
        throw new Error(tooLargeCode);
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

async function readBoundedJson(response) {
  const bytes = await readBoundedBytes(
    response,
    MAX_API_RESPONSE_BYTES,
    'github_api_response_too_large',
  );
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
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
    .filter((run) => ALLOWED_EVENTS.has(String(run?.event || '')))
    .filter((run) => run?.status === 'completed' && run?.conclusion === 'success')
    .filter((run) => !requested || String(run?.id) === requested)
    .sort((left, right) =>
      Date.parse(right?.updated_at || right?.created_at || 0)
      - Date.parse(left?.updated_at || left?.created_at || 0))[0] ?? null;
}

export function validateDownloadedEvidence(evidence, { targetSha, runId }) {
  const failures = validateGeneratedBranchProtectionEvidence(evidence, {
    expectedSha: targetSha,
    expectedRepository: REPOSITORY,
  });
  if (String(evidence?.provenance?.runId || '') !== String(runId)) {
    failures.push('workflow run provenance mismatch');
  }
  if (String(evidence?.sourceDetails?.runId || '') !== String(runId)) {
    failures.push('source run provenance mismatch');
  }
  if (evidence?.currentMainSha !== targetSha) failures.push('current main SHA mismatch');
  return { passed: failures.length === 0, failures: [...new Set(failures)] };
}

export function buildCanonicalEvidence(source, { targetSha, runId }) {
  const validation = validateDownloadedEvidence(source, { targetSha, runId });
  const passed = validation.passed;
  const flags = source?.branch_protection || {};
  return {
    schema: 'risck-comply.branch-protection-scorecard-evidence.v1',
    evidenceItem: 'branch-protection-main',
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
      file: `.github/workflows/${WORKFLOW_FILE}`,
      runId: String(runId),
      artifact: `branch-protection-runtime-proof-${targetSha}`,
      exactShaBound: passed,
    },
    summary: passed
      ? 'The exact current main SHA is protected by the required pull-request, review, conversation, status-check, update, force-push and deletion controls.'
      : 'Branch protection evidence is missing, incomplete, stale, SHA-mismatched or has invalid provenance.',
    checks: [{
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
    }],
    failures: validation.failures,
    controlsVerified: passed && Array.isArray(source?.controlsVerified)
      ? [...source.controlsVerified]
      : [],
    redactionConfirmation: 'All secrets, tokens, credentials, connection strings, and access-granting values are redacted.',
    evidenceLocations: [
      '.github/workflows/branch-protection-runtime-proof.yml',
      'scripts/enterprise/build-platform-controls-runtime-evidence.mjs',
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

export function buildP0CanonicalEvidence(source, { targetSha, runId }) {
  const validation = validateDownloadedEvidence(source, { targetSha, runId });
  const passed = validation.passed;
  const generatedAt = source?.generatedAt || null;
  return {
    schema: 'risck-comply.branch-protection-p0-evidence.v1',
    schema_version: 6,
    evidenceItem: 'required-status-checks',
    evidence_type: 'branch-protection-required-checks',
    status: passed ? 'Complete' : 'Open',
    outcome: passed ? 'passed' : 'not_verified',
    repository: REPOSITORY,
    branch: 'main',
    targetSha,
    checkedOutSha: source?.checkedOutSha || null,
    currentMainSha: source?.currentMainSha || null,
    captured_at: generatedAt,
    generatedAt,
    reviewedAt: source?.reviewedAt || generatedAt,
    reviewer: 'RISCK COMPLY protected repository-control automation',
    source: 'github-api-branch-protection-workflow-artifact',
    policy_document: 'docs/security/BRANCH_PROTECTION_REQUIRED_RULES.md',
    summary: passed
      ? 'GitHub branch protection and every canonical required status check were verified for the exact current main SHA.'
      : 'Branch protection proof could not be promoted because source validation, exact-SHA binding or workflow provenance failed.',
    failures: validation.failures,
    verification_provenance: {
      method: 'github_api',
      reference: `github-actions-run:${runId}`,
      verifiedAt: generatedAt,
    },
    required_status_checks: passed && Array.isArray(source?.required_status_checks)
      ? [...source.required_status_checks]
      : [],
    accepted_status_check_aliases: source?.accepted_status_check_aliases || {},
    controlsVerified: passed && Array.isArray(source?.controlsVerified)
      ? [...source.controlsVerified]
      : [],
    branch_protection: source?.branch_protection || {},
    sourceDetails: source?.sourceDetails || {},
    sourceWorkflow: {
      name: WORKFLOW_NAME,
      file: `.github/workflows/${WORKFLOW_FILE}`,
      runId: String(runId),
      artifact: `branch-protection-runtime-proof-${targetSha}`,
      exactShaBound: passed,
    },
    provenance: source?.provenance || {},
    release_blockers: { ...RELEASE_BLOCKERS },
    workflow_secret_log_policy: {
      secrets_in_logs_prohibited: true,
      ci_build_uses_placeholder_public_values: true,
      checkout_persist_credentials_disabled: true,
      strict_public_secret_scan_required: true,
    },
    sbom: {
      generated_by_ci: true,
      artifact_name: 'risck-comply-sbom',
      runtime_path: 'docs/security/evidence/runtime/sbom.cyclonedx.json',
      format: 'CycloneDX',
    },
    redactionConfirmation: 'All secrets, tokens, credentials, connection strings, and access-granting values are redacted.',
    evidenceLocations: [
      '.github/workflows/branch-protection-runtime-proof.yml',
      'scripts/enterprise/build-platform-controls-runtime-evidence.mjs',
      'scripts/enterprise/fetch-branch-protection-runtime-evidence.mjs',
      `GitHub Actions run ID: ${runId}`,
      `Artifact: branch-protection-runtime-proof-${targetSha}`,
    ],
    evidenceBoundary: 'This proves GitHub main-branch protection and required checks for the exact assessed SHA. It does not prove application runtime security, deployment correctness, recovery, provider configuration or external review.',
    evidenceIntegrity: {
      containsSensitiveValues: false,
      rawApiPayloadStored: false,
      accessTokensStored: false,
      exactShaBound: passed,
      sourceRunBound: passed,
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

async function downloadArtifact(repository, token, artifactId, path) {
  const normalizedArtifactId = String(artifactId || '').trim();
  if (repository !== REPOSITORY) throw new Error('repository_not_canonical');
  if (!NUMERIC.test(normalizedArtifactId)) throw new Error('artifact_id_invalid');

  const apiUrl = `https://api.github.com/repos/${repository}/actions/artifacts/${normalizedArtifactId}/zip`;
  const initial = await fetch(apiUrl, {
    headers: apiHeaders(token),
    cache: 'no-store',
    redirect: 'manual',
    signal: AbortSignal.timeout(15_000),
  });

  let artifactResponse = initial;
  if (REDIRECT_STATUSES.has(initial.status)) {
    const location = initial.headers.get('location') || '';
    if (!isAllowedArtifactRedirect(location)) throw new Error('artifact_redirect_not_allowed');
    artifactResponse = await fetch(location, {
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(30_000),
    });
  }

  if (!artifactResponse.ok) throw new Error(`artifact_download_${artifactResponse.status}`);
  const bytes = await readBoundedBytes(
    artifactResponse,
    MAX_ARTIFACT_BYTES,
    'artifact_download_too_large',
  );
  if (bytes.byteLength === 0) throw new Error('artifact_download_empty');
  writeFileSync(path, bytes, { mode: 0o600 });
}

function isSafeZipEntry(entry) {
  if (!entry || entry.length > 240) return false;
  if (entry.includes('\\') || entry.includes('\u0000')) return false;
  if (entry.startsWith('/') || /^[A-Za-z]:/.test(entry)) return false;
  return entry.split('/').every((segment) => segment && segment !== '.' && segment !== '..');
}

export function selectBranchProtectionEvidenceEntry(entries) {
  const allEntries = (Array.isArray(entries) ? entries : [])
    .map((entry) => String(entry || '').trim())
    .filter(Boolean);
  if (allEntries.length === 0) throw new Error('artifact_zip_empty');
  if (allEntries.length > MAX_ZIP_ENTRIES) throw new Error('artifact_zip_entry_limit_exceeded');
  if (allEntries.some((entry) => {
    const candidate = entry.endsWith('/') ? entry.slice(0, -1) : entry;
    return !isSafeZipEntry(candidate);
  })) {
    throw new Error('artifact_zip_unsafe_entry');
  }

  const files = allEntries.filter((entry) => !entry.endsWith('/'));
  const matches = files.filter((entry) =>
    entry === SOURCE_PATH
    || entry.endsWith(`/${SOURCE_PATH}`)
    || entry === 'branch-protection-main.generated.json'
    || entry.endsWith('/branch-protection-main.generated.json'));
  if (matches.length !== 1) throw new Error('branch_protection_source_not_unique');
  return matches[0];
}

function extractSource(zipPath) {
  const entries = execFileSync('unzip', ['-Z1', zipPath], {
    encoding: 'utf8',
    maxBuffer: 256 * 1024,
  }).split('\n').map((value) => value.trim()).filter(Boolean);
  const entry = selectBranchProtectionEvidenceEntry(entries);
  const content = execFileSync('unzip', ['-p', zipPath, entry], {
    encoding: 'utf8',
    maxBuffer: MAX_EVIDENCE_BYTES,
  });
  if (Buffer.byteLength(content, 'utf8') > MAX_EVIDENCE_BYTES) {
    throw new Error('branch_protection_evidence_too_large');
  }
  return JSON.parse(content);
}

function removeStale(root) {
  rmSync(join(root, SCORECARD_OUTPUT_PATH), { force: true });
  rmSync(join(root, P0_OUTPUT_PATH), { force: true });
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
    if (sourceRunId) {
      runs = [await githubJson(
        `https://api.github.com/repos/${repository}/actions/runs/${sourceRunId}`,
        token,
      )];
    } else {
      const response = await githubJson(
        `https://api.github.com/repos/${repository}/actions/workflows/${WORKFLOW_FILE}/runs?head_sha=${encodeURIComponent(targetSha)}&status=success&branch=main&per_page=20`,
        token,
      );
      runs = response.workflow_runs;
    }
  } catch (error) {
    if (isOptionalWorkflowUnavailable(error, { required, sourceRunId })) {
      console.log(`Branch protection runtime workflow is not registered on main yet; P0 remains Open for ${targetSha}.`);
      return { found: false, targetSha, reason: 'workflow_not_registered' };
    }
    throw error;
  }

  const run = selectExactShaRun(runs, targetSha, sourceRunId);
  if (!run) {
    if (required) throw new Error('exact_sha_branch_protection_run_missing');
    console.log(`Branch protection runtime evidence remains Open for ${targetSha}.`);
    return { found: false, targetSha };
  }

  const runId = String(run.id || '').trim();
  if (!NUMERIC.test(runId)) throw new Error('run_id_invalid');
  const artifactListing = await githubJson(
    `https://api.github.com/repos/${repository}/actions/runs/${runId}/artifacts?per_page=20`,
    token,
  );
  const expectedName = `branch-protection-runtime-proof-${targetSha}`;
  const matches = (artifactListing.artifacts || []).filter(
    (item) => item?.name === expectedName && item?.expired !== true,
  );
  if (matches.length !== 1) throw new Error('exact_sha_branch_protection_artifact_not_unique');

  const artifact = matches[0];
  const artifactSize = Number(artifact?.size_in_bytes || 0);
  if (!Number.isFinite(artifactSize) || artifactSize <= 0 || artifactSize > MAX_ARTIFACT_BYTES) {
    throw new Error('artifact_size_invalid');
  }
  const artifactId = String(artifact.id || '').trim();
  if (!NUMERIC.test(artifactId)) throw new Error('artifact_id_invalid');

  const zipPath = join(root, 'artifacts', 'enterprise-readiness', `branch-protection-${runId}.zip`);
  mkdirSync(dirname(zipPath), { recursive: true });
  try {
    await downloadArtifact(repository, token, artifactId, zipPath);
    const downloadedSize = statSync(zipPath).size;
    if (downloadedSize <= 0 || downloadedSize > MAX_ARTIFACT_BYTES) {
      throw new Error('downloaded_artifact_size_invalid');
    }
    const source = extractSource(zipPath);
    const validation = validateDownloadedEvidence(source, { targetSha, runId });
    if (!validation.passed) {
      throw new Error(`branch_protection_evidence_invalid:${validation.failures.join(',')}`);
    }

    const scorecard = buildCanonicalEvidence(source, { targetSha, runId });
    const p0 = buildP0CanonicalEvidence(source, { targetSha, runId });
    for (const [relativePath, evidence] of [
      [SCORECARD_OUTPUT_PATH, scorecard],
      [P0_OUTPUT_PATH, p0],
    ]) {
      const output = join(root, relativePath);
      mkdirSync(dirname(output), { recursive: true });
      writeFileSync(output, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
    }
    console.log(`Retrieved exact-SHA branch protection evidence from workflow run ${runId}.`);
    return { found: true, runId, targetSha, artifactId };
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

if (process.argv[1] && fileURLToPath(new URL(`file://${process.argv[1]}`)) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    const reason = error instanceof Error ? error.message.split(':')[0] : 'unknown_error';
    console.error(`Branch protection evidence retrieval failed: ${reason}`);
    process.exit(1);
  });
}
