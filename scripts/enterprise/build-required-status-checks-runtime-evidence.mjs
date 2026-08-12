#!/usr/bin/env node

import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  REQUIRED_CHECK_ALIASES,
  REQUIRED_CHECKS,
} from './build-branch-protection-runtime-evidence.mjs';
import { rulesetTargetsMain } from './build-platform-controls-runtime-evidence.mjs';

const REPOSITORY = 'renanescola40-afk/eurocomply_saas';
const BRANCH = 'main';
const OUTPUT_PATH = 'docs/security/evidence/runtime/required-status-checks.json';
const FULL_SHA = /^[a-f0-9]{40}$/;
const NUMERIC = /^\d+$/;
const REDACTION = 'All secrets, tokens, credentials, connection strings, and access-granting values are redacted.';

function uniqueStrings(values) {
  return [...new Set(
    values
      .filter((value) => typeof value === 'string' && value.trim())
      .map((value) => value.trim()),
  )];
}

function branchRequiredChecks(branch) {
  const protection = branch?.protection?.required_status_checks;
  const contexts = Array.isArray(protection?.contexts) ? protection.contexts : [];
  const checks = Array.isArray(protection?.checks)
    ? protection.checks.map((check) => check?.context)
    : [];
  return uniqueStrings([...contexts, ...checks]);
}

function rulesetRequiredChecks(rulesets) {
  const checks = [];
  for (const ruleset of Array.isArray(rulesets) ? rulesets : []) {
    if (!rulesetTargetsMain(ruleset)) continue;
    for (const rule of Array.isArray(ruleset?.rules) ? ruleset.rules : []) {
      if (rule?.type !== 'required_status_checks') continue;
      for (const check of Array.isArray(rule?.parameters?.required_status_checks)
        ? rule.parameters.required_status_checks
        : []) {
        if (typeof check?.context === 'string') checks.push(check.context);
      }
    }
  }
  return uniqueStrings(checks);
}

function hasStrictMainStatusChecks(rulesets) {
  return (Array.isArray(rulesets) ? rulesets : []).some((ruleset) =>
    rulesetTargetsMain(ruleset)
    && (Array.isArray(ruleset?.rules) ? ruleset.rules : []).some((rule) =>
      rule?.type === 'required_status_checks'
      && rule?.parameters?.strict_required_status_checks_policy === true));
}

export function matchRequiredChecks(configuredChecks) {
  const configured = new Set(uniqueStrings(configuredChecks));
  const matchedRequiredChecks = Object.fromEntries(
    REQUIRED_CHECKS.map((requiredCheck) => {
      const accepted = [requiredCheck, ...(REQUIRED_CHECK_ALIASES[requiredCheck] || [])];
      return [requiredCheck, accepted.filter((name) => configured.has(name))];
    }),
  );
  const missingRequiredChecks = REQUIRED_CHECKS.filter(
    (requiredCheck) => matchedRequiredChecks[requiredCheck].length === 0,
  );
  return { matchedRequiredChecks, missingRequiredChecks };
}

export function buildRequiredStatusChecksEvidence({
  branch,
  rulesets,
  targetSha,
  checkedOutSha,
  runId,
  generatedAt = new Date().toISOString(),
}) {
  const normalizedTargetSha = String(targetSha || '').trim().toLowerCase();
  const normalizedCheckedOutSha = String(checkedOutSha || '').trim().toLowerCase();
  const observedMainSha = String(branch?.commit?.sha || '').trim().toLowerCase();
  const normalizedRunId = String(runId || '').trim();
  const observedConfiguredChecks = uniqueStrings([
    ...branchRequiredChecks(branch),
    ...rulesetRequiredChecks(rulesets),
  ]);
  const { missingRequiredChecks } = matchRequiredChecks(observedConfiguredChecks);
  const enforcedForEveryone =
    branch?.protected === true
    && branch?.protection?.enabled === true
    && branch?.protection?.required_status_checks?.enforcement_level === 'everyone';
  const strict = hasStrictMainStatusChecks(rulesets);
  const exactShaBound =
    FULL_SHA.test(normalizedTargetSha)
    && normalizedTargetSha === normalizedCheckedOutSha
    && normalizedTargetSha === observedMainSha;
  const runBound = NUMERIC.test(normalizedRunId);
  const failures = [];

  if (!exactShaBound) failures.push('exact_main_sha_mismatch');
  if (!runBound) failures.push('run_id_invalid');
  if (!enforcedForEveryone) failures.push('required_status_checks_not_enforced_for_everyone');
  if (!strict) failures.push('strict_required_status_checks_policy_missing');
  if (missingRequiredChecks.length > 0) {
    failures.push(`required_status_checks_missing:${missingRequiredChecks.join(',')}`);
  }

  if (failures.length > 0) {
    return {
      passed: false,
      failures,
      diagnostics: {
        targetSha: normalizedTargetSha,
        currentMainSha: observedMainSha,
        enforcedForEveryone,
        strict,
        configuredRequiredCheckCount: observedConfiguredChecks.length,
        missingRequiredChecks,
      },
      evidence: null,
    };
  }

  // Network responses are used only to prove the predicates above. Persist a bounded,
  // canonical projection made exclusively from reviewed constants and exact workflow
  // inputs instead of storing raw or free-form GitHub API values.
  const canonicalMatchedRequiredChecks = Object.fromEntries(
    REQUIRED_CHECKS.map((requiredCheck) => [requiredCheck, [requiredCheck]]),
  );
  const evidence = {
    schema: 'risck-comply.required-status-checks-runtime-evidence.v1',
    evidenceItem: 'required-status-checks',
    evidence_type: 'required-status-checks-configuration',
    status: 'Complete',
    outcome: 'passed',
    repository: REPOSITORY,
    branch: BRANCH,
    targetSha: normalizedTargetSha,
    checkedOutSha: normalizedCheckedOutSha,
    currentMainSha: normalizedTargetSha,
    captured_at: generatedAt,
    generatedAt,
    reviewedAt: generatedAt,
    reviewer: 'RISCK COMPLY exact-SHA repository-control automation',
    summary: 'GitHub enforces the complete canonical required status-check set for the exact current main SHA and requires the branch to be up to date before merge.',
    failures: [],
    required_status_checks: [...REQUIRED_CHECKS],
    configuredRequiredChecks: [...REQUIRED_CHECKS],
    matchedRequiredChecks: canonicalMatchedRequiredChecks,
    branch_protection: {
      require_status_checks: true,
      require_up_to_date_branch: true,
    },
    controlsVerified: [
      'Required status checks are enforced for everyone',
      'Branches must be up to date before merge',
      'All documented required checks are configured',
    ],
    sourceWorkflow: {
      name: 'P0 Runtime Evidence',
      file: '.github/workflows/p0-runtime-evidence.yml',
      runId: normalizedRunId,
      exactShaBound: true,
    },
    verification_provenance: {
      method: 'github_api',
      reference: `github-actions-run:${normalizedRunId}`,
      verifiedAt: generatedAt,
    },
    provenance: {
      githubActions: true,
      runId: normalizedRunId,
      exactShaBound: true,
      mainHeadMatched: true,
    },
    broaderBranchProtectionSatisfied: false,
    evidenceBoundary: 'This evidence proves only required status-check configuration and strict up-to-date enforcement. It does not prove approving-review count, stale-review dismissal, CODEOWNERS policy, bypass-actor absence, deployment security, provider configuration or external review.',
    evidenceLocations: [
      '.github/workflows/p0-runtime-evidence.yml',
      'GitHub branches/main protection summary',
      'GitHub active repository rulesets bounded projection',
      'scripts/enterprise/build-required-status-checks-runtime-evidence.mjs',
      `GitHub Actions run ID: ${normalizedRunId}`,
    ],
    redactionConfirmation: REDACTION,
    evidenceIntegrity: {
      containsSensitiveValues: false,
      rawApiPayloadStored: false,
      accessTokensStored: false,
      exactShaBound: true,
      sourceRunBound: true,
    },
  };

  return {
    passed: true,
    failures: [],
    diagnostics: {
      targetSha: normalizedTargetSha,
      currentMainSha: normalizedTargetSha,
      enforcedForEveryone: true,
      strict: true,
      configuredRequiredCheckCount: REQUIRED_CHECKS.length,
      missingRequiredChecks: [],
    },
    evidence,
  };
}

async function githubJson(path, token) {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'risck-comply-required-status-checks-proof',
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`github_api_${response.status}`);
  return response.json();
}

async function collectRulesets(repository, token) {
  const summaries = await githubJson(
    `/repos/${repository}/rulesets?includes_parents=true&per_page=100`,
    token,
  );
  if (!Array.isArray(summaries)) throw new Error('github_rulesets_listing_invalid');
  const rulesets = [];
  for (const summary of summaries) {
    if (summary?.target !== 'branch' || summary?.enforcement !== 'active') continue;
    if (!Number.isSafeInteger(Number(summary?.id)) || Number(summary.id) <= 0) continue;
    rulesets.push(await githubJson(
      `/repos/${repository}/rulesets/${Number(summary.id)}?includes_parents=true`,
      token,
    ));
  }
  return rulesets;
}

async function main() {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const output = join(root, OUTPUT_PATH);
  rmSync(output, { force: true });

  const repository = process.env.GITHUB_REPOSITORY || '';
  const token = process.env.GITHUB_TOKEN || '';
  const targetSha = String(process.env.TARGET_SHA || process.env.GITHUB_SHA || '')
    .trim()
    .toLowerCase();
  const checkedOutSha = String(process.env.CHECKED_OUT_SHA || targetSha).trim().toLowerCase();
  const runId = process.env.GITHUB_RUN_ID || '';

  if (repository !== REPOSITORY) throw new Error('repository_not_canonical');
  if (!token) throw new Error('github_token_missing');
  if (!FULL_SHA.test(targetSha)) throw new Error('target_sha_invalid');

  const branch = await githubJson(`/repos/${repository}/branches/${BRANCH}`, token);
  if (String(branch?.commit?.sha || '').toLowerCase() !== targetSha) {
    console.log(`Required status checks evidence remains Open because main advanced beyond ${targetSha}.`);
    return;
  }
  const rulesets = await collectRulesets(repository, token);
  const result = buildRequiredStatusChecksEvidence({
    branch,
    rulesets,
    targetSha,
    checkedOutSha,
    runId,
  });

  if (!result.passed || !result.evidence) {
    console.log(`Required status checks evidence remains Open: ${result.failures.join(',')}`);
    return;
  }

  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify(result.evidence, null, 2)}\n`, { mode: 0o600 });
  console.log(`Wrote ${OUTPUT_PATH}`);
}

if (process.argv[1] && fileURLToPath(new URL(`file://${process.argv[1]}`)) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message.split(':')[0] : 'unknown_error');
    process.exitCode = 1;
  });
}
