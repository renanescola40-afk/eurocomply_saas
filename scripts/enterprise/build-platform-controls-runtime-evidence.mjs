#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CANONICAL_BRANCH,
  CANONICAL_REPOSITORY,
  DEFAULT_OUTPUT_PATH,
  evaluateBranchProtection,
} from './build-branch-protection-runtime-evidence.mjs';

const FULL_SHA = /^[0-9a-f]{40}$/;
const MAIN_REF = `refs/heads/${CANONICAL_BRANCH}`;
const SOURCE_CLASSIC = 'github-api-classic-branch-protection';
const SOURCE_RULESETS = 'github-api-repository-rulesets-fallback';
const SOURCE_COMBINED = 'github-api-classic-plus-repository-rulesets';

function normalizeSha(value) {
  return String(value || '').trim().toLowerCase();
}

function safeRunId(value) {
  const runId = String(value || '').trim();
  return /^\d+$/.test(runId) ? runId : null;
}

function enabled(value) {
  if (typeof value === 'boolean') return value;
  return value?.enabled === true;
}

function uniqueStrings(values) {
  return [...new Set(values.filter((value) => typeof value === 'string' && value.trim()).map((value) => value.trim()))];
}

function errorCode(error) {
  return error instanceof Error ? error.message.split(':')[0] : 'github_api_unknown';
}

function globToRegExp(pattern) {
  const escaped = String(pattern)
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '__DOUBLE_STAR__')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '[^/]')
    .replace(/__DOUBLE_STAR__/g, '.*');
  return new RegExp(`^${escaped}$`);
}

function requiredCheckContexts(protection) {
  const contexts = Array.isArray(protection?.required_status_checks?.contexts)
    ? protection.required_status_checks.contexts
    : [];
  const checks = Array.isArray(protection?.required_status_checks?.checks)
    ? protection.required_status_checks.checks.map((check) => check?.context)
    : [];
  return uniqueStrings([...contexts, ...checks]);
}

export function rulesetPatternMatchesMain(pattern) {
  const normalized = String(pattern || '').trim();
  if (!normalized) return false;
  if (normalized === '~ALL' || normalized === '~DEFAULT_BRANCH') return true;
  if (normalized === CANONICAL_BRANCH || normalized === MAIN_REF) return true;
  try {
    const matcher = globToRegExp(normalized);
    return matcher.test(MAIN_REF) || matcher.test(CANONICAL_BRANCH);
  } catch {
    return false;
  }
}

export function rulesetTargetsMain(ruleset) {
  if (ruleset?.target !== 'branch' || ruleset?.enforcement !== 'active') return false;
  const refName = ruleset?.conditions?.ref_name;
  const includes = Array.isArray(refName?.include) ? refName.include : [];
  const excludes = Array.isArray(refName?.exclude) ? refName.exclude : [];
  const included = includes.length === 0 || includes.some(rulesetPatternMatchesMain);
  const excluded = excludes.some(rulesetPatternMatchesMain);
  return included && !excluded;
}

export function synthesizeClassicProtectionFromRulesets(rulesets) {
  const applicable = (Array.isArray(rulesets) ? rulesets : []).filter(rulesetTargetsMain);
  const requiredChecks = [];
  const bypassActors = [];
  let approvingReviews = 0;
  let requireCodeOwnerReview = false;
  let dismissStaleReviews = false;
  let requireReviewThreadResolution = false;
  let strictStatusChecks = false;
  let hasPullRequestRule = false;
  let blocksForcePushes = false;
  let blocksDeletion = false;

  for (const ruleset of applicable) {
    for (const actor of Array.isArray(ruleset?.bypass_actors) ? ruleset.bypass_actors : []) {
      bypassActors.push({
        rulesetId: Number(ruleset?.id) || null,
        rulesetName: String(ruleset?.name || 'unnamed'),
        actorType: String(actor?.actor_type || 'unknown'),
        bypassMode: String(actor?.bypass_mode || 'unknown'),
      });
    }

    for (const rule of Array.isArray(ruleset?.rules) ? ruleset.rules : []) {
      const parameters = rule?.parameters || {};
      if (rule?.type === 'pull_request') {
        hasPullRequestRule = true;
        approvingReviews = Math.max(approvingReviews, Number(parameters.required_approving_review_count) || 0);
        requireCodeOwnerReview ||= parameters.require_code_owner_review === true;
        dismissStaleReviews ||= parameters.dismiss_stale_reviews_on_push === true;
        requireReviewThreadResolution ||= parameters.required_review_thread_resolution === true;
      }
      if (rule?.type === 'required_status_checks') {
        strictStatusChecks ||= parameters.strict_required_status_checks_policy === true;
        for (const check of Array.isArray(parameters.required_status_checks) ? parameters.required_status_checks : []) {
          if (typeof check?.context === 'string') requiredChecks.push(check.context);
        }
      }
      if (rule?.type === 'non_fast_forward') blocksForcePushes = true;
      if (rule?.type === 'deletion') blocksDeletion = true;
    }
  }

  const configuredChecks = uniqueStrings(requiredChecks);
  return {
    protection: {
      required_status_checks: configuredChecks.length > 0
        ? { strict: strictStatusChecks, contexts: configuredChecks, checks: [] }
        : null,
      required_pull_request_reviews: hasPullRequestRule
        ? {
            required_approving_review_count: approvingReviews,
            require_code_owner_reviews: requireCodeOwnerReview,
            dismiss_stale_reviews: dismissStaleReviews,
          }
        : null,
      required_conversation_resolution: { enabled: requireReviewThreadResolution },
      allow_force_pushes: { enabled: !blocksForcePushes },
      allow_deletions: { enabled: !blocksDeletion },
      restrictions: null,
    },
    metadata: {
      applicableRulesetCount: applicable.length,
      rulesetIds: applicable.map((ruleset) => Number(ruleset?.id)).filter(Number.isFinite),
      rulesetNames: uniqueStrings(applicable.map((ruleset) => String(ruleset?.name || ''))),
      rulesetSources: uniqueStrings(applicable.map((ruleset) => String(ruleset?.source_type || ''))),
      bypassActors,
      configuredRequiredChecks: configuredChecks,
    },
  };
}

export function mergeClassicAndRulesetProtection(classicProtection, rulesetProtection) {
  const classicReviews = classicProtection?.required_pull_request_reviews;
  const rulesetReviews = rulesetProtection?.required_pull_request_reviews;
  const hasReviews = Boolean(classicReviews || rulesetReviews);
  const checks = uniqueStrings([
    ...requiredCheckContexts(classicProtection),
    ...requiredCheckContexts(rulesetProtection),
  ]);

  return {
    required_status_checks: checks.length > 0
      ? {
          strict: classicProtection?.required_status_checks?.strict === true
            || rulesetProtection?.required_status_checks?.strict === true,
          contexts: checks,
          checks: [],
        }
      : null,
    required_pull_request_reviews: hasReviews
      ? {
          required_approving_review_count: Math.max(
            Number(classicReviews?.required_approving_review_count) || 0,
            Number(rulesetReviews?.required_approving_review_count) || 0,
          ),
          require_code_owner_reviews: classicReviews?.require_code_owner_reviews === true
            || rulesetReviews?.require_code_owner_reviews === true,
          dismiss_stale_reviews: classicReviews?.dismiss_stale_reviews === true
            || rulesetReviews?.dismiss_stale_reviews === true,
        }
      : null,
    required_conversation_resolution: {
      enabled: enabled(classicProtection?.required_conversation_resolution)
        || enabled(rulesetProtection?.required_conversation_resolution),
    },
    allow_force_pushes: {
      enabled: enabled(classicProtection?.allow_force_pushes)
        && enabled(rulesetProtection?.allow_force_pushes),
    },
    allow_deletions: {
      enabled: enabled(classicProtection?.allow_deletions)
        && enabled(rulesetProtection?.allow_deletions),
    },
    restrictions: classicProtection?.restrictions || rulesetProtection?.restrictions || null,
  };
}

export function applyRulesetsEvidenceBoundary(evidence, metadata, classicBoundary, sourceMode = 'repository-rulesets') {
  evidence.source = sourceMode === 'classic-plus-rulesets' ? SOURCE_COMBINED : SOURCE_RULESETS;
  evidence.sourceDetails = {
    ...evidence.sourceDetails,
    sourceMode,
    classicProtectionApiFailure: String(classicBoundary || 'unavailable'),
    applicableRulesetCount: metadata.applicableRulesetCount,
    rulesetIds: metadata.rulesetIds,
    rulesetNames: metadata.rulesetNames,
    rulesetSources: metadata.rulesetSources,
    bypassActorCount: metadata.bypassActors.length,
    bypassActors: metadata.bypassActors,
  };
  evidence.evidenceLocations = uniqueStrings([
    ...(Array.isArray(evidence.evidenceLocations) ? evidence.evidenceLocations : []),
    'GitHub Repository Rulesets API sanitized projection',
    'scripts/enterprise/build-platform-controls-runtime-evidence.mjs',
  ]);
  evidence.evidenceBoundary = `${evidence.evidenceBoundary || ''} Classic branch protection and active rulesets may be evaluated cumulatively. Ruleset controls are accepted only when they target main and contain no bypass actor.`.trim();

  const additionalFailures = [];
  if (metadata.applicableRulesetCount === 0) additionalFailures.push('active_main_ruleset_missing');
  if (metadata.bypassActors.length > 0) additionalFailures.push('ruleset_bypass_actor_present');

  if (additionalFailures.length > 0) {
    evidence.status = 'Open';
    evidence.outcome = 'failed';
    evidence.failures = uniqueStrings([...(Array.isArray(evidence.failures) ? evidence.failures : []), ...additionalFailures]);
    evidence.summary = metadata.applicableRulesetCount === 0
      ? 'No active repository ruleset was proven to target the current main branch.'
      : 'Repository rulesets contain one or more bypass actors, so their contributed controls cannot be treated as complete.';
    evidence.sourceDetails.missingProtectionFlags = Number(evidence.sourceDetails.missingProtectionFlags || 0) + additionalFailures.length;
  }
  return evidence;
}

async function githubJson(url, token) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'risck-comply-platform-controls-proof',
    },
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

async function fetchMainSha(repository, token) {
  try {
    const branch = await githubJson(`https://api.github.com/repos/${repository}/branches/${CANONICAL_BRANCH}`, token);
    return normalizeSha(branch?.commit?.sha);
  } catch {
    const ref = await githubJson(`https://api.github.com/repos/${repository}/git/ref/heads/${CANONICAL_BRANCH}`, token);
    return normalizeSha(ref?.object?.sha);
  }
}

async function fetchRepositoryRulesets(repository, token) {
  const summaries = await githubJson(
    `https://api.github.com/repos/${repository}/rulesets?includes_parents=true&per_page=100`,
    token,
  );
  if (!Array.isArray(summaries)) throw new Error('github_rulesets_listing_invalid');
  const details = [];
  for (const summary of summaries) {
    if (summary?.target !== 'branch' || summary?.enforcement !== 'active') continue;
    const id = Number(summary?.id);
    if (!Number.isFinite(id)) continue;
    const selfUrl = String(summary?._links?.self?.href || '');
    const url = selfUrl.startsWith('https://api.github.com/')
      ? selfUrl
      : `https://api.github.com/repos/${repository}/rulesets/${id}?includes_parents=true`;
    details.push(await githubJson(url, token));
  }
  return details;
}

function writeEvidence(root, evidence) {
  const absolutePath = join(root, DEFAULT_OUTPUT_PATH);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
}

function buildApiFailureEvidence({ targetSha, checkedOutSha, currentMainSha, runId, generatedAt, failures }) {
  const evidence = evaluateBranchProtection({
    protection: {},
    targetSha,
    checkedOutSha,
    currentMainSha,
    runId,
    generatedAt,
  });
  evidence.source = 'github-api-platform-controls-unavailable';
  evidence.status = 'Open';
  evidence.outcome = 'blocked';
  evidence.summary = 'Neither classic branch protection nor repository rulesets could provide complete sanitized platform-control evidence.';
  evidence.failures = uniqueStrings(failures);
  evidence.sourceDetails = {
    ...evidence.sourceDetails,
    sourceMode: 'unavailable',
  };
  return evidence;
}

async function main() {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const repository = process.env.GITHUB_REPOSITORY || '';
  const token = process.env.BRANCH_PROTECTION_READ_TOKEN || process.env.GITHUB_TOKEN || '';
  const targetSha = normalizeSha(process.env.TARGET_SHA || process.env.GITHUB_SHA);
  const checkedOutSha = normalizeSha(execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }));
  const runId = process.env.GITHUB_RUN_ID || '';
  const generatedAt = new Date().toISOString();
  const configuredOutputPath = process.env.BRANCH_PROTECTION_EVIDENCE_PATH || DEFAULT_OUTPUT_PATH;

  if (repository !== CANONICAL_REPOSITORY) throw new Error('repository_not_canonical');
  if (!token) throw new Error('platform_controls_read_token_missing');
  if (configuredOutputPath !== DEFAULT_OUTPUT_PATH) throw new Error('branch_protection_evidence_path_not_canonical');
  if (!FULL_SHA.test(targetSha) || !FULL_SHA.test(checkedOutSha)) throw new Error('target_or_checkout_sha_invalid');

  let currentMainSha = '';
  try {
    currentMainSha = await fetchMainSha(repository, token);
  } catch (error) {
    const evidence = buildApiFailureEvidence({
      targetSha,
      checkedOutSha,
      currentMainSha: '',
      runId: safeRunId(runId),
      generatedAt,
      failures: [errorCode(error)],
    });
    writeEvidence(root, evidence);
    throw error;
  }

  let classicProtection = null;
  let classicEvidence = null;
  let classicBoundary = null;

  try {
    classicProtection = await githubJson(
      `https://api.github.com/repos/${repository}/branches/${CANONICAL_BRANCH}/protection`,
      token,
    );
    classicEvidence = evaluateBranchProtection({
      protection: classicProtection,
      targetSha,
      checkedOutSha,
      currentMainSha,
      runId,
      generatedAt,
    });
    classicEvidence.source = SOURCE_CLASSIC;
    classicEvidence.sourceDetails = { ...classicEvidence.sourceDetails, sourceMode: 'classic-branch-protection' };
    if (classicEvidence.outcome !== 'passed') classicBoundary = 'classic_policy_incomplete';
  } catch (classicError) {
    classicBoundary = errorCode(classicError);
  }

  let evidence = classicEvidence?.outcome === 'passed' ? classicEvidence : null;

  if (!evidence) {
    try {
      const rulesets = await fetchRepositoryRulesets(repository, token);
      const { protection: rulesetProtection, metadata } = synthesizeClassicProtectionFromRulesets(rulesets);
      const protection = classicProtection
        ? mergeClassicAndRulesetProtection(classicProtection, rulesetProtection)
        : rulesetProtection;
      evidence = evaluateBranchProtection({ protection, targetSha, checkedOutSha, currentMainSha, runId, generatedAt });
      evidence = applyRulesetsEvidenceBoundary(
        evidence,
        metadata,
        classicBoundary,
        classicProtection ? 'classic-plus-rulesets' : 'repository-rulesets',
      );
    } catch (rulesetsError) {
      if (classicEvidence) {
        evidence = classicEvidence;
        evidence.failures = uniqueStrings([
          ...(Array.isArray(evidence.failures) ? evidence.failures : []),
          `rulesets_fallback_${errorCode(rulesetsError)}`,
        ]);
        evidence.summary = `${evidence.summary} Repository rulesets fallback was unavailable.`;
      } else {
        evidence = buildApiFailureEvidence({
          targetSha,
          checkedOutSha,
          currentMainSha,
          runId: safeRunId(runId),
          generatedAt,
          failures: [classicBoundary, errorCode(rulesetsError)],
        });
      }
    }
  }

  writeEvidence(root, evidence);
  console.log(`Wrote ${DEFAULT_OUTPUT_PATH} from ${evidence.source}.`);
  if (evidence.outcome !== 'passed') {
    console.error(evidence.summary);
    process.exit(1);
  }
  console.log('Exact-SHA platform controls proof passed.');
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().catch((error) => {
    console.error(errorCode(error));
    process.exit(1);
  });
}
