#!/usr/bin/env node

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const FULL_SHA = /^[a-f0-9]{40}$/;
const DEFAULT_REPOSITORY = 'renanescola40-afk/eurocomply_saas';
const REQUIRED_CHECKS = [
  'apiReadable',
  'requiredStatusChecks',
  'approvingReview',
  'forcePushBlocked',
  'deletionBlocked',
];

function normalizeRuleType(rule) {
  return String(rule?.type ?? '').trim().toLowerCase();
}

export function evaluateClassicProtection(body, responseOk) {
  return {
    apiReadable: responseOk === true,
    requiredStatusChecks:
      Array.isArray(body?.required_status_checks?.contexts) ||
      Array.isArray(body?.required_status_checks?.checks),
    approvingReview:
      Number(body?.required_pull_request_reviews?.required_approving_review_count ?? 0) >= 1,
    forcePushBlocked: body?.allow_force_pushes?.enabled !== true,
    deletionBlocked: body?.allow_deletions?.enabled !== true,
  };
}

export function evaluateEffectiveRules(body, responseOk) {
  const rules = Array.isArray(body) ? body : [];
  const pullRequestRules = rules.filter((rule) => normalizeRuleType(rule) === 'pull_request');
  const types = new Set(rules.map(normalizeRuleType));

  return {
    apiReadable: responseOk === true && Array.isArray(body),
    requiredStatusChecks:
      types.has('required_status_checks') || types.has('workflows'),
    approvingReview: pullRequestRules.some(
      (rule) => Number(rule?.parameters?.required_approving_review_count ?? 0) >= 1,
    ),
    forcePushBlocked: types.has('non_fast_forward'),
    deletionBlocked: types.has('deletion'),
  };
}

function failedChecks(checks) {
  return REQUIRED_CHECKS.filter((name) => checks?.[name] !== true);
}

function responseStatus(response) {
  return Number.isInteger(response?.status) ? response.status : 0;
}

async function readJsonResponse(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function collectPlatformProof({
  targetSha,
  repository = DEFAULT_REPOSITORY,
  token = '',
  fetchImpl = fetch,
}) {
  if (!FULL_SHA.test(targetSha)) throw new Error('TARGET_SHA must be a full lowercase SHA');
  if (repository !== DEFAULT_REPOSITORY) throw new Error('GITHUB_REPOSITORY must be canonical');

  const classicUrl = `https://api.github.com/repos/${repository}/branches/main/protection`;
  const effectiveRulesUrl = `https://api.github.com/repos/${repository}/rules/branches/main`;
  const headers = {
    accept: 'application/vnd.github+json',
    'x-github-api-version': '2022-11-28',
    'user-agent': 'risck-comply-platform-runtime-proof',
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  };

  const observations = [];
  let selected = null;

  try {
    const classicResponse = await fetchImpl(classicUrl, { headers });
    const classicBody = await readJsonResponse(classicResponse);
    const classicChecks = evaluateClassicProtection(classicBody, classicResponse.ok);
    observations.push({
      mode: 'classic_branch_protection',
      url: classicUrl,
      httpStatus: responseStatus(classicResponse),
      checks: classicChecks,
    });
    if (classicResponse.ok) selected = observations.at(-1);
  } catch (error) {
    observations.push({
      mode: 'classic_branch_protection',
      url: classicUrl,
      httpStatus: 0,
      checks: {},
      error: String(error?.message ?? error),
    });
  }

  if (!selected) {
    try {
      const rulesResponse = await fetchImpl(effectiveRulesUrl, { headers });
      const rulesBody = await readJsonResponse(rulesResponse);
      const rulesChecks = evaluateEffectiveRules(rulesBody, rulesResponse.ok);
      observations.push({
        mode: 'effective_branch_rules',
        url: effectiveRulesUrl,
        httpStatus: responseStatus(rulesResponse),
        checks: rulesChecks,
        observedRuleTypes: Array.isArray(rulesBody)
          ? [...new Set(rulesBody.map(normalizeRuleType).filter(Boolean))].sort()
          : [],
      });
      if (rulesResponse.ok) selected = observations.at(-1);
    } catch (error) {
      observations.push({
        mode: 'effective_branch_rules',
        url: effectiveRulesUrl,
        httpStatus: 0,
        checks: {},
        error: String(error?.message ?? error),
      });
    }
  }

  const checks = selected?.checks ?? {
    apiReadable: false,
    requiredStatusChecks: false,
    approvingReview: false,
    forcePushBlocked: false,
    deletionBlocked: false,
  };
  const missing = failedChecks(checks);
  const status = missing.length === 0 ? 'VERIFIED' : 'BLOCKED';
  const limitations = [];

  for (const observation of observations) {
    if (observation.httpStatus && observation.httpStatus >= 400) {
      limitations.push(`${observation.mode} returned HTTP ${observation.httpStatus}`);
    }
    if (observation.error) limitations.push(`${observation.mode}: ${observation.error}`);
  }
  if (missing.length) limitations.push(`Unverified controls: ${missing.join(', ')}`);

  return {
    schema: 'risck-comply.platform-controls-runtime-proof.v1',
    status,
    targetSha,
    repository,
    generatedAt: new Date().toISOString(),
    environment: 'github-actions-exact-sha-closeout',
    selectedMode: selected?.mode ?? 'none',
    source: selected?.url ?? effectiveRulesUrl,
    checks,
    failedChecks: missing,
    observations,
    limitations,
    truthBoundary: {
      provesObservedRepositoryPolicy: status === 'VERIFIED',
      provesFuturePolicyImmutability: false,
      provesAdministratorCannotBypass: false,
      provesCustomerLegalCompliance: false,
    },
  };
}

async function main() {
  const targetSha = String(process.env.TARGET_SHA ?? '').trim().toLowerCase();
  const repository = String(process.env.GITHUB_REPOSITORY ?? DEFAULT_REPOSITORY).trim();
  const token = String(process.env.GITHUB_TOKEN ?? '');
  const output = resolve(
    process.env.PLATFORM_PROOF_PATH ??
      'artifacts/eu-ai-act-final-runtime/platform-proof.json',
  );

  const proof = await collectPlatformProof({ targetSha, repository, token });
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify(proof, null, 2)}\n`, { mode: 0o600 });
  console.log(JSON.stringify({
    status: proof.status,
    selectedMode: proof.selectedMode,
    checks: proof.checks,
    failedChecks: proof.failedChecks,
    output,
  }, null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
