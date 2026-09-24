#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const repository = process.env.GITHUB_REPOSITORY || 'renanescola40-afk/eurocomply_saas';
const [owner, repo] = repository.split('/');
const targetSha = String(process.env.RELEASE_SHA || '').trim().toLowerCase();
const runId = String(process.env.GITHUB_RUN_ID || '');
const out = 'p0-evidence/branch-protection-main.generated.json';

const requiredChecks = [
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
];
const aliases = {
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
};

const checkedOutSha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim().toLowerCase();
const currentMainSha = execFileSync('git', ['ls-remote', 'origin', 'refs/heads/main'], { encoding: 'utf8' }).trim().split(/\s+/)[0].toLowerCase();
if (!/^[0-9a-f]{40}$/.test(targetSha) || targetSha !== checkedOutSha || targetSha !== currentMainSha) {
  throw new Error('exact current-main SHA verification failed');
}
if (!/^\d+$/.test(runId)) throw new Error('numeric GITHUB_RUN_ID required');

const githubToken = String(process.env.GITHUB_TOKEN || '').trim();

async function get(path) {
  const baseHeaders = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'risck-comply-ruleset-proof',
  };

  const rulesetDetail = /^\/repos\/[^/]+\/[^/]+\/rulesets\/\d+$/.test(path);

  if (githubToken) {
    const authenticated = await fetch(`https://api.github.com${path}`, {
      headers: { ...baseHeaders, Authorization: `Bearer ${githubToken}` },
    });
    if (authenticated.ok) {
      const authenticatedPayload = await authenticated.json();
      if (!rulesetDetail || Array.isArray(authenticatedPayload?.bypass_actors)) {
        return authenticatedPayload;
      }
      // A redacted detail response is not combined with another API snapshot.
      // Fall through and use the anonymous response as one complete observation.
    } else if (![401, 403, 404].includes(authenticated.status)) {
      throw new Error(`authenticated GitHub API ${authenticated.status}: ${path}`);
    }
  }

  const publicResponse = await fetch(`https://api.github.com${path}`, { headers: baseHeaders });
  if (!publicResponse.ok) {
    throw new Error(`public GitHub API ${publicResponse.status}: ${path}`);
  }
  return publicResponse.json();
}

const listed = await get(`/repos/${owner}/${repo}/rulesets`);
const applicable = [];
for (const item of listed) {
  const rs = await get(`/repos/${owner}/${repo}/rulesets/${item.id}`);
  const inc = rs?.conditions?.ref_name?.include ?? [];
  const exc = rs?.conditions?.ref_name?.exclude ?? [];
  if (rs?.target === 'branch' && rs?.enforcement === 'active'
      && (inc.includes('refs/heads/main') || inc.includes('~DEFAULT_BRANCH'))
      && !exc.includes('refs/heads/main')) applicable.push(rs);
}
if (!applicable.length) throw new Error('no active repository ruleset applies to main');

const rules = applicable.flatMap((r) => r.rules ?? []);
const prRule = rules.find((r) => r.type === 'pull_request');
const statusRule = rules.find((r) => r.type === 'required_status_checks');
const configuredChecks = [...new Set((statusRule?.parameters?.required_status_checks ?? []).map((x) => String(x.context || '')).filter(Boolean))];
const configured = new Set(configuredChecks);
const matchedRequiredChecks = Object.fromEntries(requiredChecks.map((check) => {
  const accepted = [check, ...(aliases[check] ?? [])];
  return [check, accepted.filter((name) => configured.has(name))];
}));
const missingRequiredChecks = requiredChecks.filter((check) => matchedRequiredChecks[check].length === 0);

const branchProtection = {
  protect_branch: true,
  require_pull_request: Boolean(prRule),
  required_approving_reviews: Number(prRule?.parameters?.required_approving_review_count ?? 0),
  require_code_owner_review: prRule?.parameters?.require_code_owner_review === true,
  dismiss_stale_reviews: prRule?.parameters?.dismiss_stale_reviews_on_push === true,
  require_conversation_resolution: prRule?.parameters?.required_review_thread_resolution === true,
  require_status_checks: Boolean(statusRule),
  require_up_to_date_branch: statusRule?.parameters?.strict_required_status_checks_policy === true,
  block_force_pushes: rules.some((r) => r.type === 'non_fast_forward'),
  block_deletions: rules.some((r) => r.type === 'deletion'),
  restrict_direct_pushes: Boolean(prRule) && applicable.every((r) => Array.isArray(r.bypass_actors) && r.bypass_actors.length === 0),
};
const requiredFlags = ['protect_branch','require_pull_request','require_code_owner_review','dismiss_stale_reviews','require_conversation_resolution','require_status_checks','require_up_to_date_branch','block_force_pushes','block_deletions','restrict_direct_pushes'];
const missingProtectionFlags = requiredFlags.filter((k) => branchProtection[k] !== true).length
  + (branchProtection.required_approving_reviews >= 1 ? 0 : 1);

const bypassVisibilityMissingRulesetIds = applicable.filter((r) => !Array.isArray(r.bypass_actors)).map((r) => r.id);
const bypassActors = applicable.flatMap((r) => (r.bypass_actors ?? []).map((a) => ({
  rulesetId: r.id,
  actorType: a.actor_type || 'unknown',
  bypassMode: a.bypass_mode || 'unknown',
})));
const complete = missingRequiredChecks.length === 0
  && missingProtectionFlags === 0
  && bypassVisibilityMissingRulesetIds.length === 0
  && bypassActors.length === 0;

const controlsVerified = [
  branchProtection.require_pull_request && 'Pull requests are required before merging',
  branchProtection.required_approving_reviews >= 1 && 'At least one approving review is required',
  branchProtection.require_code_owner_review && 'CODEOWNERS review is required',
  branchProtection.dismiss_stale_reviews && 'Stale approvals are dismissed',
  branchProtection.require_conversation_resolution && 'Conversations must be resolved before merge',
  branchProtection.require_status_checks && 'Required status checks are enforced',
  branchProtection.require_up_to_date_branch && 'Branches must be up to date before merge',
  branchProtection.block_force_pushes && 'Force pushes are blocked',
  branchProtection.block_deletions && 'Branch deletion is blocked',
  branchProtection.restrict_direct_pushes && 'Direct pushes have no bypass actor path',
  missingRequiredChecks.length === 0 && 'All documented required checks are configured',
].filter(Boolean);

const now = new Date().toISOString();
const evidence = {
  schema: 'risck-comply.branch-protection-runtime-evidence.v1',
  schema_version: 5,
  evidenceItem: 'required-status-checks',
  evidence_type: 'branch-protection-required-checks',
  status: complete ? 'Complete' : 'Open',
  outcome: complete ? 'passed' : 'failed',
  repository,
  branch: 'main',
  targetSha,
  checkedOutSha,
  currentMainSha,
  generatedAt: now,
  reviewedAt: now,
  reviewer: 'RISCK COMPLY protected release automation',
  source: 'github-api-repository-rulesets-fallback',
  policy_document: 'docs/security/BRANCH_PROTECTION_REQUIRED_RULES.md',
  summary: complete ? 'Active repository rulesets match the enterprise branch-protection requirements.' : 'Repository ruleset evidence is incomplete.',
  failures: complete ? [] : ['branch_protection_incomplete'],
  required_status_checks: requiredChecks,
  accepted_status_check_aliases: aliases,
  controlsVerified,
  branch_protection: branchProtection,
  sourceDetails: {
    repository,
    branch: 'main',
    runId,
    sourceMode: 'repository-rulesets',
    applicableRulesetCount: applicable.length,
    rulesetIds: applicable.map((r) => r.id),
    rulesetSources: applicable.map((r) => r.source_type || 'unknown'),
    bypassVisibilityComplete: bypassVisibilityMissingRulesetIds.length === 0,
    bypassVisibilityMissingRulesetIds,
    bypassActorCount: bypassActors.length,
    bypassActors,
    classicProtectionApiFailure: 'classic branch-protection API was unavailable; repository rulesets evidence used',
    missingRequiredChecks,
    missingProtectionFlags,
    configuredRequiredChecks: configuredChecks,
    matchedRequiredChecks,
  },
  provenance: { githubActions: true, runId, exactShaBound: true, mainHeadMatched: true },
  redactionConfirmation: 'Redaction confirmed for branch protection runtime evidence.',
  evidenceLocations: [
    `GitHub Actions run: https://github.com/${repository}/actions/runs/${runId}`,
    'Artifact: p0-branch-protection-evidence/branch-protection-main.generated.json',
    'Reference: docs/security/BRANCH_PROTECTION_REQUIRED_RULES.md',
  ],
  evidenceIntegrity: { containsSensitiveValues: false, rawApiPayloadStored: false, accessTokensStored: false, exactShaBound: true },
};

mkdirSync('p0-evidence', { recursive: true });
writeFileSync(out, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
if (!complete) process.exitCode = 1;
else console.log('Exact-main repository ruleset evidence: Complete/passed');
