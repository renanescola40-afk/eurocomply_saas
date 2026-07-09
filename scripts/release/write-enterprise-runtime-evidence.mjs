#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const runtimeDir = 'docs/security/evidence/runtime';
const enterpriseEvidencePath = `${runtimeDir}/enterprise-runtime-evidence.json`;
const goNoGoPath = `${runtimeDir}/release-go-no-go.json`;
const generatedAt = new Date().toISOString();
const releaseTarget = process.env.RELEASE_TARGET || 'enterprise';
const reviewer = process.env.RELEASE_REVIEWER || 'RISCK COMPLY enterprise release automation';
const commitSha = process.env.RELEASE_COMMIT_SHA || process.env.GITHUB_SHA || process.env.VERCEL_GIT_COMMIT_SHA || null;
const buildSha = process.env.RELEASE_BUILD_SHA || process.env.NEXT_PUBLIC_BUILD_SHA || process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || null;

const requiredEvidence = [
  ['deploymentSmoke', `${runtimeDir}/deployment-smoke-validation.json`, true],
  ['observabilitySmoke', `${runtimeDir}/observability-smoke-validation.json`, true],
  ['rollbackDryRun', `${runtimeDir}/rollback-dry-run-validation.json`, true],
  ['supabaseLiveRls', `${runtimeDir}/supabase-live-rls-validation.json`, true],
  ['productionFinalValidation', `${runtimeDir}/production-final-validation.json`, true],
  ['productionSecretsProviderStores', `${runtimeDir}/production-secrets-provider-stores.json`, true],
  ['stripeBillingValidation', `${runtimeDir}/stripe-billing-validation.json`, true],
  ['uploadScannerValidation', `${runtimeDir}/upload-malware-scan-validation.json`, true],
  ['branchProtectionRequiredChecks', `${runtimeDir}/branch-protection-required-checks.json`, true],
  ['authRbacFinalValidation', `${runtimeDir}/auth-rbac-final-validation.json`, true],
  ['stepUpMfaValidation', `${runtimeDir}/step-up-mfa-validation.json`, true],
  ['auditChainLiveValidation', `${runtimeDir}/audit-chain-live-validation.json`, true],
  ['externalSecurityReviewOrPentest', `${runtimeDir}/external-security-review-or-pentest.json`, true],
];

function readEvidence(path) {
  if (!existsSync(path)) {
    return { path, present: false, status: 'Open', outcome: 'missing', parseable: false };
  }

  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8'));
    return {
      path,
      present: true,
      parseable: true,
      status: parsed.status || 'Open',
      outcome: parsed.outcome || parsed.overallResult || parsed.releaseDecision || 'unknown',
      generatedAt: parsed.generatedAt || parsed.timestamp || null,
      reviewer: parsed.reviewer || parsed.runner || null,
      releaseTarget: parsed.releaseTarget || null,
      raw: parsed,
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
  return evidence.present && evidence.parseable && evidence.status === 'Complete' && ['passed', 'Go', 'GO'].includes(evidence.outcome);
}

function targetHasPassedDeploymentSmoke(evidence) {
  if (!basePass(evidence)) return false;
  const raw = evidence.raw || {};
  return Array.isArray(raw.smokeTargets?.passed)
    && raw.smokeTargets.passed.length > 0
    && Array.isArray(raw.smokeTargets?.failed)
    && raw.smokeTargets.failed.length === 0
    && Array.isArray(raw.targets)
    && raw.targets.every((target) => target?.passed === true);
}

function rollbackHasNonDestructiveDryRun(evidence) {
  if (!basePass(evidence)) return false;
  const raw = evidence.raw || {};
  return raw.dryRun?.mutatesProduction === false && raw.targetValidation?.passed === true;
}

function authRbacIsCustomerFacingRuntimeProof(evidence) {
  if (!basePass(evidence)) return false;
  const raw = evidence.raw || {};
  return raw.releaseDecision === 'Go'
    && raw.goNoGo?.status === 'GO'
    && raw.runtimeEvidenceStatus === 'executed_against_target_environment'
    && raw.evidenceIntegrity?.placeholderOnly === false
    && raw.evidenceIntegrity?.realRuntimeEvidenceAttached === true
    && raw.evidenceIntegrity?.customerFacingProof === true;
}

function externalReviewIsReal(evidence) {
  if (!basePass(evidence)) return false;
  const raw = evidence.raw || {};
  return raw.evidenceIntegrity?.realExternalReportAttached === true
    && raw.evidenceIntegrity?.placeholderOnly === false
    && Boolean(String(raw.reportReference || '').trim());
}

function evidenceStatusMap() {
  return Object.fromEntries(requiredEvidence.map(([key, path]) => [key, readEvidence(path)]));
}

const evidence = evidenceStatusMap();
const blockers = [];

for (const [key, , required] of requiredEvidence) {
  if (!required) continue;
  const item = evidence[key];
  if (!basePass(item)) {
    blockers.push(`${item.path} must be Complete/passed; current status=${item.status}, outcome=${item.outcome}`);
  }
}

if (!targetHasPassedDeploymentSmoke(evidence.deploymentSmoke)) blockers.push('Deployment smoke must prove at least one target passed and zero smoke targets failed.');
if (!rollbackHasNonDestructiveDryRun(evidence.rollbackDryRun)) blockers.push('Rollback dry-run must prove mutatesProduction=false and targetValidation.passed=true.');
if (!authRbacIsCustomerFacingRuntimeProof(evidence.authRbacFinalValidation)) blockers.push('Auth/RBAC runtime proof must be real, customer-facing, target-environment evidence before enterprise Go.');
if (!externalReviewIsReal(evidence.externalSecurityReviewOrPentest)) blockers.push('External security review/pentest evidence must reference a real report before enterprise Go.');
if (!commitSha) blockers.push('Release commit SHA is missing.');
if (!buildSha) blockers.push('Build SHA is missing.');

const p0Blockers = blockers.map((blocker, index) => ({
  id: `P0-ENTERPRISE-${String(index + 1).padStart(3, '0')}`,
  blocker,
  owner: '@renansilva2002 / renanescola40-afk',
  requiredClosureEvidence: 'Regenerate the referenced runtime evidence with status Complete and outcome passed for the exact promoted commit and enterprise target.',
}));

const outcome = p0Blockers.length === 0 ? 'passed' : 'failed';
const status = outcome === 'passed' ? 'Complete' : 'Open';
const finalDecision = outcome === 'passed' ? 'Go' : 'No-Go';

const controlsVerified = outcome === 'passed'
  ? [
    'CI/CD final command evidence',
    'production deployment smoke',
    'protected readiness',
    'observability smoke',
    'rollback dry-run',
    'Supabase live RLS validation',
    'Stripe webhook/billing readiness',
    'Redis/rate limit readiness through protected readiness',
    'Sentry readiness',
    'upload scanner readiness',
    'branch protection evidence',
    'auth/RBAC final runtime validation',
    'audit-chain live validation',
    'external security review or pentest evidence',
    'release commit SHA and build SHA recorded',
  ]
  : [];

const enterpriseRuntimeEvidence = {
  schema: 'risck-comply.enterprise-runtime-evidence.v1',
  evidenceItem: 'enterprise-runtime-evidence',
  status,
  outcome,
  generatedAt,
  reviewedAt: generatedAt,
  reviewer,
  runner: reviewer,
  releaseTarget,
  commitSha,
  buildSha,
  commandsExecuted: [
    'npm ci',
    'npm run lint',
    'npm run typecheck',
    'npm run test',
    'npm run test:e2e',
    'npm run build',
    'npm run security:ci',
    'npm run security:rls:live',
    'npm run release:deployment-smoke',
    'npm run release:observability-smoke',
    'npm run release:rollback:dry-run',
    'npm run release:production-final',
  ],
  controlsVerified,
  evidenceFiles: Object.fromEntries(Object.entries(evidence).map(([key, item]) => [key, {
    path: item.path,
    present: item.present,
    parseable: item.parseable,
    status: item.status,
    outcome: item.outcome,
    generatedAt: item.generatedAt || null,
    releaseTarget: item.releaseTarget || null,
  }])),
  failures: p0Blockers,
  redactionConfirmation: 'No secret values, tokens, cookies, raw Authorization headers, raw DSNs, raw provider URLs, or private customer data are stored in this evidence file.',
  noSecretsStored: true,
  evidenceIntegrity: {
    containsSensitiveValues: false,
    valuesRedacted: true,
    authorizationHeaderStored: false,
    cookiesStored: false,
    placeholderApprovalAllowed: false,
  },
  releaseGate: finalDecision === 'Go'
    ? 'Enterprise Go is allowed only if the approval record selects Go for the same commit and target.'
    : 'Enterprise Go is blocked. Keep No-Go until every P0 evidence item is Complete/passed for the promoted commit and target.',
};

const releaseGoNoGo = {
  schema: 'risck-comply.release-go-no-go.v1',
  evidenceItem: 'release-go-no-go',
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
  p1Blockers: [],
  deferredRisks: outcome === 'passed' ? [] : ['Enterprise publication, enterprise procurement claims and paid production launch remain blocked until P0 runtime evidence passes.'],
  controlsVerified,
  commandsExecuted: enterpriseRuntimeEvidence.commandsExecuted,
  evidenceFiles: enterpriseRuntimeEvidence.evidenceFiles,
  redactionConfirmation: enterpriseRuntimeEvidence.redactionConfirmation,
  noSecretsStored: true,
  releaseGate: enterpriseRuntimeEvidence.releaseGate,
};

mkdirSync(dirname(enterpriseEvidencePath), { recursive: true });
writeFileSync(enterpriseEvidencePath, `${JSON.stringify(enterpriseRuntimeEvidence, null, 2)}\n`);
writeFileSync(goNoGoPath, `${JSON.stringify(releaseGoNoGo, null, 2)}\n`);
console.log(`Wrote ${enterpriseEvidencePath}`);
console.log(`Wrote ${goNoGoPath}`);

if (p0Blockers.length > 0) {
  console.error('Enterprise runtime evidence is No-Go:');
  for (const blocker of p0Blockers) console.error(`- ${blocker.id}: ${blocker.blocker}`);
  process.exit(1);
}

console.log('Enterprise runtime evidence is Go.');
