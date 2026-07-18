#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const CANONICAL_REPOSITORY = 'renanescola40-afk/eurocomply_saas';
export const CANONICAL_BRANCH = 'main';
export const DEFAULT_OUTPUT_PATH = 'p0-evidence/branch-protection-main.generated.json';
export const FULL_SHA = /^[0-9a-f]{40}$/;

export const REQUIRED_CHECKS = Object.freeze([
  'Full Security Suite / Core CI, build and npm audit',
  'Full Security Suite / Actionlint',
  'Full Security Suite / Secret scanning (Gitleaks)',
  'Full Security Suite / Semgrep SAST',
  'Full Security Suite / CodeQL',
  'Full Security Suite / Dependency Review',
  'Full Security Suite / OSSF Scorecard',
  'Full Security Suite / Enterprise merge/deploy gate',
  'CI / quality',
  'RISCK COMPLY Security CI / Run security gates, typecheck and tests',
  'Gitleaks / Scan repository for accidental secret exposure',
  'Secret Scanning / Production secret readiness gate',
]);

export const REQUIRED_CHECK_ALIASES = Object.freeze({
  'Full Security Suite / Core CI, build and npm audit': ['Core CI, build and npm audit'],
  'Full Security Suite / Actionlint': ['Actionlint'],
  'Full Security Suite / Secret scanning (Gitleaks)': ['Secret scanning (Gitleaks)'],
  'Full Security Suite / Semgrep SAST': ['Semgrep SAST'],
  'Full Security Suite / CodeQL': ['CodeQL'],
  'Full Security Suite / Dependency Review': ['Dependency Review'],
  'Full Security Suite / OSSF Scorecard': ['OSSF Scorecard'],
  'Full Security Suite / Enterprise merge/deploy gate': ['Enterprise merge/deploy gate'],
  'CI / quality': ['quality'],
  'RISCK COMPLY Security CI / Run security gates, typecheck and tests': ['Run security gates, typecheck and tests'],
  'Gitleaks / Scan repository for accidental secret exposure': ['Scan repository for accidental secret exposure', 'Gitleaks'],
  'Secret Scanning / Production secret readiness gate': ['Production secret readiness gate'],
});

const REQUIRED_PROTECTION_FLAGS = Object.freeze([
  'protect_branch',
  'require_pull_request',
  'require_code_owner_review',
  'dismiss_stale_reviews',
  'require_conversation_resolution',
  'require_status_checks',
  'require_up_to_date_branch',
  'block_force_pushes',
  'block_deletions',
  'restrict_direct_pushes',
]);

function enabled(value) {
  if (typeof value === 'boolean') return value;
  return value?.enabled === true;
}

function normalizeSha(value) {
  return String(value || '').trim().toLowerCase();
}

function uniqueStrings(values) {
  return [...new Set(values.filter((value) => typeof value === 'string' && value.trim()).map((value) => value.trim()))];
}

function safeRunId(value) {
  const runId = String(value || '').trim();
  return /^\d+$/.test(runId) ? runId : null;
}

function baseEvidence({ targetSha, checkedOutSha, runId, generatedAt, currentMainSha = null, status = 'Open', outcome = 'blocked', summary, failures = [] }) {
  return {
    schema: 'risck-comply.branch-protection-runtime-evidence.v1',
    schema_version: 5,
    evidenceItem: 'required-status-checks',
    evidence_type: 'branch-protection-required-checks',
    status,
    outcome,
    repository: CANONICAL_REPOSITORY,
    branch: CANONICAL_BRANCH,
    targetSha,
    checkedOutSha,
    currentMainSha,
    generatedAt,
    reviewedAt: generatedAt,
    reviewer: 'RISCK COMPLY protected repository-control automation',
    source: 'github-api-branch-protection-workflow',
    policy_document: 'docs/security/BRANCH_PROTECTION_REQUIRED_RULES.md',
    summary,
    failures,
    required_status_checks: [...REQUIRED_CHECKS],
    accepted_status_check_aliases: REQUIRED_CHECK_ALIASES,
    controlsVerified: [],
    branch_protection: {},
    sourceDetails: {
      repository: CANONICAL_REPOSITORY,
      branch: CANONICAL_BRANCH,
      runId,
      missingRequiredChecks: [...REQUIRED_CHECKS],
      missingProtectionFlags: REQUIRED_PROTECTION_FLAGS.length + 1,
      configuredRequiredChecks: [],
      matchedRequiredChecks: {},
    },
    provenance: {
      githubActions: true,
      runId,
      exactShaBound: targetSha === checkedOutSha,
      mainHeadMatched: Boolean(currentMainSha) && targetSha === currentMainSha,
    },
    redactionConfirmation: 'Redaction confirmed for branch protection runtime evidence.',
    evidenceLocations: [
      `GitHub Actions run ID: ${runId || 'unavailable'}`,
      'Artifact: branch-protection-main.generated.json',
      'Reference: docs/security/BRANCH_PROTECTION_REQUIRED_RULES.md',
    ],
    evidenceIntegrity: {
      containsSensitiveValues: false,
      rawApiPayloadStored: false,
      accessTokensStored: false,
      exactShaBound: targetSha === checkedOutSha && Boolean(currentMainSha) && targetSha === currentMainSha,
    },
  };
}

export function evaluateBranchProtection({ protection, targetSha, checkedOutSha, currentMainSha, runId, generatedAt = new Date().toISOString() }) {
  const normalizedTargetSha = normalizeSha(targetSha);
  const normalizedCheckedOutSha = normalizeSha(checkedOutSha);
  const normalizedMainSha = normalizeSha(currentMainSha);
  const normalizedRunId = safeRunId(runId);

  if (!FULL_SHA.test(normalizedTargetSha) || !FULL_SHA.test(normalizedCheckedOutSha) || !FULL_SHA.test(normalizedMainSha)) {
    return baseEvidence({
      targetSha: normalizedTargetSha,
      checkedOutSha: normalizedCheckedOutSha,
      currentMainSha: normalizedMainSha || null,
      runId: normalizedRunId,
      generatedAt,
      summary: 'The requested, checked-out, or current main SHA is malformed.',
      failures: ['sha_invalid'],
    });
  }

  if (!normalizedRunId) {
    return baseEvidence({
      targetSha: normalizedTargetSha,
      checkedOutSha: normalizedCheckedOutSha,
      currentMainSha: normalizedMainSha,
      runId: null,
      generatedAt,
      summary: 'The workflow run provenance is missing.',
      failures: ['run_id_invalid'],
    });
  }

  if (normalizedTargetSha !== normalizedCheckedOutSha || normalizedTargetSha !== normalizedMainSha) {
    return baseEvidence({
      targetSha: normalizedTargetSha,
      checkedOutSha: normalizedCheckedOutSha,
      currentMainSha: normalizedMainSha,
      runId: normalizedRunId,
      generatedAt,
      summary: 'The assessed SHA is not the exact current main head.',
      failures: ['exact_main_sha_mismatch'],
    });
  }

  const contexts = Array.isArray(protection?.required_status_checks?.contexts)
    ? protection.required_status_checks.contexts
    : [];
  const checks = Array.isArray(protection?.required_status_checks?.checks)
    ? protection.required_status_checks.checks.map((check) => check?.context)
    : [];
  const configuredRequiredChecks = uniqueStrings([...contexts, ...checks]);
  const configured = new Set(configuredRequiredChecks);
  const matchedRequiredChecks = Object.fromEntries(REQUIRED_CHECKS.map((requiredCheck) => {
    const accepted = [requiredCheck, ...(REQUIRED_CHECK_ALIASES[requiredCheck] || [])];
    return [requiredCheck, accepted.filter((name) => configured.has(name))];
  }));
  const missingRequiredChecks = REQUIRED_CHECKS.filter(
    (requiredCheck) => matchedRequiredChecks[requiredCheck].length === 0,
  );

  const pullRequestReviews = protection?.required_pull_request_reviews;
  const requirePullRequest = Boolean(pullRequestReviews);
  const branchProtection = {
    protect_branch: true,
    require_pull_request: requirePullRequest,
    required_approving_reviews: pullRequestReviews?.required_approving_review_count ?? 0,
    require_code_owner_review: pullRequestReviews?.require_code_owner_reviews === true,
    dismiss_stale_reviews: pullRequestReviews?.dismiss_stale_reviews === true,
    require_conversation_resolution: enabled(protection?.required_conversation_resolution),
    require_status_checks: Boolean(protection?.required_status_checks),
    require_up_to_date_branch: protection?.required_status_checks?.strict === true,
    block_force_pushes: !enabled(protection?.allow_force_pushes),
    block_deletions: !enabled(protection?.allow_deletions),
    restrict_direct_pushes: Boolean(protection?.restrictions) || requirePullRequest,
  };

  const missingProtectionFlags = REQUIRED_PROTECTION_FLAGS.filter(
    (flag) => branchProtection[flag] !== true,
  ).length + (branchProtection.required_approving_reviews >= 1 ? 0 : 1);

  const controlsVerified = [
    branchProtection.require_pull_request ? 'Pull requests are required before merging' : null,
    branchProtection.required_approving_reviews >= 1 ? 'At least one approving review is required' : null,
    branchProtection.require_code_owner_review ? 'CODEOWNERS review is required' : null,
    branchProtection.dismiss_stale_reviews ? 'Stale approvals are dismissed' : null,
    branchProtection.require_conversation_resolution ? 'Conversations must be resolved before merge' : null,
    branchProtection.require_status_checks ? 'Required status checks are enforced' : null,
    branchProtection.require_up_to_date_branch ? 'Branches must be up to date before merge' : null,
    branchProtection.block_force_pushes ? 'Force pushes are blocked' : null,
    branchProtection.block_deletions ? 'Branch deletion is blocked' : null,
    branchProtection.restrict_direct_pushes ? 'Direct pushes are restricted' : null,
    missingRequiredChecks.length === 0 ? 'All documented required checks are configured' : null,
  ].filter(Boolean);

  const complete = missingRequiredChecks.length === 0 && missingProtectionFlags === 0;
  const evidence = baseEvidence({
    targetSha: normalizedTargetSha,
    checkedOutSha: normalizedCheckedOutSha,
    currentMainSha: normalizedMainSha,
    runId: normalizedRunId,
    generatedAt,
    status: complete ? 'Complete' : 'Open',
    outcome: complete ? 'passed' : 'failed',
    summary: complete
      ? 'GitHub branch protection for the exact current main SHA matches the enterprise requirements.'
      : `GitHub branch protection is incomplete: ${missingRequiredChecks.length} required check(s) and ${missingProtectionFlags} protection requirement(s) are missing.`,
    failures: complete ? [] : ['branch_protection_incomplete'],
  });

  evidence.controlsVerified = controlsVerified;
  evidence.branch_protection = branchProtection;
  evidence.sourceDetails = {
    repository: CANONICAL_REPOSITORY,
    branch: CANONICAL_BRANCH,
    runId: normalizedRunId,
    missingRequiredChecks,
    missingProtectionFlags,
    configuredRequiredChecks,
    matchedRequiredChecks,
  };
  evidence.provenance.mainHeadMatched = true;
  evidence.evidenceIntegrity.exactShaBound = true;
  return evidence;
}

async function githubJson(url, token) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'risck-comply-branch-protection-proof',
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`github_api_${response.status}`);
  return response.json();
}

function writeEvidence(root, outputPath, evidence) {
  const absolutePath = join(root, outputPath);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
}

async function main() {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const repository = process.env.GITHUB_REPOSITORY || '';
  const token = process.env.BRANCH_PROTECTION_READ_TOKEN || process.env.GITHUB_TOKEN || '';
  const targetSha = normalizeSha(process.env.TARGET_SHA || process.env.GITHUB_SHA);
  const checkedOutSha = normalizeSha(execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }));
  const runId = process.env.GITHUB_RUN_ID || '';
  const generatedAt = new Date().toISOString();
  const outputPath = process.env.BRANCH_PROTECTION_EVIDENCE_PATH || DEFAULT_OUTPUT_PATH;

  if (repository !== CANONICAL_REPOSITORY) throw new Error('repository_not_canonical');
  if (!token) throw new Error('branch_protection_read_token_missing');

  let currentMainSha = '';
  let protection = null;
  let apiFailure = null;
  try {
    const branch = await githubJson(`https://api.github.com/repos/${repository}/branches/${CANONICAL_BRANCH}`, token);
    currentMainSha = normalizeSha(branch?.commit?.sha);
    protection = await githubJson(`https://api.github.com/repos/${repository}/branches/${CANONICAL_BRANCH}/protection`, token);
  } catch (error) {
    apiFailure = error instanceof Error ? error.message : 'github_api_unknown';
  }

  const evidence = apiFailure
    ? baseEvidence({
      targetSha,
      checkedOutSha,
      currentMainSha: currentMainSha || null,
      runId: safeRunId(runId),
      generatedAt,
      summary: 'GitHub branch protection could not be read through the protected repository-control workflow.',
      failures: [apiFailure],
    })
    : evaluateBranchProtection({ protection, targetSha, checkedOutSha, currentMainSha, runId, generatedAt });

  writeEvidence(root, outputPath, evidence);
  console.log(`Wrote ${outputPath}`);
  if (evidence.outcome !== 'passed') {
    console.error(evidence.summary);
    process.exit(1);
  }
  console.log('Exact-SHA branch protection proof passed.');
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message.split(':')[0] : 'unknown_error');
    process.exit(1);
  });
}
