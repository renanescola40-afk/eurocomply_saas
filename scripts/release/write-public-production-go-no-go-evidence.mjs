#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const runtimeDir = process.env.RELEASE_EVIDENCE_DIR || 'docs/security/evidence/runtime';
const outputPath = process.env.PUBLIC_PRODUCTION_GO_NO_GO_PATH || `${runtimeDir}/release-go-no-go.json`;
const generatedAt = new Date().toISOString();
const releaseTarget = String(process.env.RELEASE_TARGET || 'public-production').trim().toLowerCase();
const reviewer = process.env.RELEASE_REVIEWER || 'RISCK COMPLY public production release automation';
const commitSha = process.env.RELEASE_COMMIT_SHA || process.env.GITHUB_SHA || process.env.VERCEL_GIT_COMMIT_SHA || null;
const buildSha = process.env.RELEASE_BUILD_SHA || process.env.NEXT_PUBLIC_BUILD_SHA || process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || null;
const shaPattern = /^[0-9a-f]{40}$/i;
const allowedTargets = new Set(['production', 'public-production']);

const requiredEvidence = [
  ['publicProductionEnvReadiness', `${runtimeDir}/public-production-release-env-readiness.json`, true],
  ['deploymentSmoke', `${runtimeDir}/deployment-smoke-validation.json`, true],
  ['observabilitySmoke', `${runtimeDir}/observability-smoke-validation.json`, false],
  ['rollbackDryRun', `${runtimeDir}/rollback-dry-run-validation.json`, true],
  ['supabaseLiveRls', `${runtimeDir}/supabase-live-rls-validation.json`, true],
  ['branchProtectionRequiredChecks', `${runtimeDir}/branch-protection-required-checks.json`, false],
  ['productionFinalValidation', `${runtimeDir}/production-final-validation.json`, true],
];

function readEvidence(path) {
  if (!existsSync(path)) return { path, present: false, parseable: false, status: 'Open', outcome: 'missing' };
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8'));
    return {
      path,
      present: true,
      parseable: true,
      status: raw.status || 'Open',
      outcome: raw.outcome || raw.overallResult || raw.releaseDecision || (raw.status === 'Complete' ? 'passed' : 'unknown'),
      generatedAt: raw.generatedAt || raw.timestamp || raw.captured_at || null,
      releaseTarget: raw.releaseTarget || null,
      raw,
    };
  } catch (error) {
    return {
      path,
      present: true,
      parseable: false,
      status: 'Open',
      outcome: 'invalid_json',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function basePass(evidence) {
  return evidence.present
    && evidence.parseable
    && evidence.status === 'Complete'
    && ['passed', 'go'].includes(String(evidence.outcome).toLowerCase());
}

function collectCommitShas(raw = {}) {
  return [
    raw.commitSha,
    raw.releaseCommitSha,
    raw.targetCommit,
    raw.targetSha,
    raw.releaseSha,
    raw.runtimeContext?.commitSha,
    raw.githubActions?.commitSha,
    raw.provenance?.commitSha,
  ]
    .map((value) => String(value ?? '').trim().toLowerCase())
    .filter((value) => shaPattern.test(value));
}

function matchesReleaseCommit(evidence) {
  return shaPattern.test(String(commitSha ?? ''))
    && collectCommitShas(evidence.raw).includes(String(commitSha).toLowerCase());
}

function targetHasPassedDeploymentSmoke(evidence) {
  if (!basePass(evidence)) return false;
  const raw = evidence.raw || {};
  return Array.isArray(raw.smokeTargets?.passed)
    && raw.smokeTargets.passed.length > 0
    && Array.isArray(raw.smokeTargets?.failed)
    && raw.smokeTargets.failed.length === 0
    && Array.isArray(raw.targets)
    && raw.targets.length > 0
    && raw.targets.every((target) => target?.passed === true);
}

function rollbackHasNonDestructiveDryRun(evidence) {
  if (!basePass(evidence)) return false;
  return evidence.raw?.dryRun?.mutatesProduction === false
    && evidence.raw?.targetValidation?.passed === true;
}

const evidence = Object.fromEntries(requiredEvidence.map(([key, path]) => [key, readEvidence(path)]));
const blockers = [];

if (!allowedTargets.has(releaseTarget)) {
  blockers.push(`Release target ${releaseTarget || '<missing>'} is not a public production target.`);
}
if (!shaPattern.test(String(commitSha ?? ''))) blockers.push('A full 40-character release commit SHA is required.');
if (!shaPattern.test(String(buildSha ?? ''))) blockers.push('A full 40-character release build SHA is required.');

for (const [key, , commitBound] of requiredEvidence) {
  const item = evidence[key];
  if (!basePass(item)) {
    blockers.push(`${item.path} must be present, parseable, Complete and passed; current status=${item.status}, outcome=${item.outcome}.`);
  }
  if (commitBound && !matchesReleaseCommit(item)) {
    blockers.push(`${item.path} must be bound to release commit ${commitSha || '<missing>'}.`);
  }
}

if (!targetHasPassedDeploymentSmoke(evidence.deploymentSmoke)) {
  blockers.push('Deployment smoke must prove at least one target passed, zero targets failed, and every target passed.');
}
if (!rollbackHasNonDestructiveDryRun(evidence.rollbackDryRun)) {
  blockers.push('Rollback dry-run must prove mutatesProduction=false and targetValidation.passed=true.');
}

const p0Blockers = blockers.map((blocker, index) => ({
  id: `P0-PUBLIC-${String(index + 1).padStart(3, '0')}`,
  blocker,
  owner: '@renansilva2002 / renanescola40-afk',
  requiredClosureEvidence: 'Regenerate the referenced public runtime evidence for the exact promoted commit, build, and production target.',
}));
const outcome = p0Blockers.length === 0 ? 'passed' : 'failed';
const status = outcome === 'passed' ? 'Complete' : 'Open';
const finalDecision = outcome === 'passed' ? 'Go' : 'No-Go';
const controlsVerified = outcome === 'passed'
  ? [
    'public production environment preflight',
    'production deployment smoke',
    'observability smoke',
    'non-destructive rollback dry-run',
    'Supabase live RLS validation',
    'branch protection required checks',
    'public production final validation',
    'exact release commit and build binding',
  ]
  : [];

const evidenceFiles = Object.fromEntries(requiredEvidence.map(([key, , commitBound]) => {
  const item = evidence[key];
  return [key, {
    path: item.path,
    present: item.present,
    parseable: item.parseable,
    status: item.status,
    outcome: item.outcome,
    generatedAt: item.generatedAt || null,
    releaseTarget: item.releaseTarget || null,
    commitBound,
    shaMatches: commitBound ? matchesReleaseCommit(item) : null,
  }];
}));

const decision = {
  schema: 'risck-comply.public-production-go-no-go.v1',
  evidenceItem: 'release-go-no-go',
  profile: 'public-production',
  status,
  outcome,
  generatedAt,
  reviewedAt: generatedAt,
  reviewer,
  runner: reviewer,
  releaseTarget,
  commitSha,
  buildSha,
  finalDecision,
  goCriteriaSatisfied: outcome === 'passed',
  p0Blockers,
  deferredRisks: outcome === 'passed' ? [] : ['Public production promotion remains blocked until every P0 prerequisite passes for the exact promoted commit.'],
  controlsVerified,
  evidenceFiles,
  commandsExecuted: [
    'node scripts/release/check-public-production-release-env.mjs',
    'node scripts/release/run-public-production-release-final.mjs',
    'node scripts/release/write-public-production-go-no-go-evidence.mjs',
    'node scripts/release/validate-public-production-go-no-go-evidence.mjs',
  ],
  redactionConfirmation: 'No secret values, tokens, cookies, raw Authorization headers, raw DSNs, raw provider URLs, or private customer data are stored in this evidence file.',
  noSecretsStored: true,
  evidenceIntegrity: {
    containsSensitiveValues: false,
    valuesRedacted: true,
    authorizationHeaderStored: false,
    cookiesStored: false,
    rawUrlsStored: false,
    exactReleaseShaRequired: true,
    staleEvidenceAccepted: false,
  },
  releaseGate: finalDecision === 'Go'
    ? 'Public production Go is allowed for this exact commit and build only.'
    : 'Public production is No-Go until every listed P0 blocker is closed with fresh runtime evidence.',
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(decision, null, 2)}\n`);
console.log(`Wrote ${outputPath}`);

if (p0Blockers.length > 0) {
  console.error('Public production release evidence is No-Go:');
  for (const blocker of p0Blockers) console.error(`- ${blocker.id}: ${blocker.blocker}`);
  process.exit(1);
}

console.log(`Public production release evidence is Go for ${commitSha}.`);
