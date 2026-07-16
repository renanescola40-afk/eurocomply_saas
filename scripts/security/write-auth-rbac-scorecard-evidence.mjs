#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_SOURCE = 'docs/security/evidence/runtime/auth-rbac-final-validation.json';
const DEFAULT_OUTPUT = 'docs/security/evidence/runtime/auth-rbac-validation.json';
const REPOSITORY = 'renanescola40-afk/eurocomply_saas';
const FULL_SHA = /^[0-9a-f]{40}$/;

const SCORECARD_CHECKS = [
  'signup',
  'login',
  'logout',
  'sessionRefresh',
  'oauthCallback',
  'rbac',
  'organizationOnboarding',
];

function sourceIsTrusted(source) {
  return source?.schema === 'risck-comply.auth-rbac-runtime-evidence.v1'
    && source?.evidenceItem === 'auth-rbac-final-validation'
    && source?.status === 'Complete'
    && source?.outcome === 'passed'
    && source?.repository === REPOSITORY
    && source?.branch === 'main'
    && FULL_SHA.test(String(source?.targetSha ?? ''))
    && source?.targetSha === source?.checkedOutSha
    && source?.provenance?.githubActions === true
    && /^\d+$/.test(String(source?.provenance?.runId ?? ''))
    && source?.provenance?.exactShaBound === true
    && source?.checks
    && typeof source.checks === 'object'
    && !Array.isArray(source.checks)
    && Object.values(source.checks).length > 0
    && Object.values(source.checks).every((value) => value === true)
    && Array.isArray(source?.failures)
    && source.failures.length === 0
    && source?.evidenceIntegrity?.placeholderOnly === false
    && source?.evidenceIntegrity?.runtimeProofInvented === false
    && source?.evidenceIntegrity?.rawCredentialsStored === false
    && source?.evidenceIntegrity?.accessTokensStored === false
    && source?.evidenceIntegrity?.userIdentifiersStored === false
    && source?.evidenceIntegrity?.organizationIdentifiersStored === false
    && source?.evidenceIntegrity?.rawProviderResponsesStored === false;
}

function pass(name, passed, reason) {
  return passed
    ? { name, passed: true }
    : { name, status: 'NOT_VERIFIED', reason };
}

export function buildAuthRbacScorecardEvidence(
  source,
  {
    generatedAt = new Date().toISOString(),
    sourcePath = DEFAULT_SOURCE,
  } = {},
) {
  const trusted = sourceIsTrusted(source);
  const checks = source?.checks && typeof source.checks === 'object' ? source.checks : {};

  const login = trusted
    && checks.fixtureConfigurationPresent === true
    && checks.ownerRoleObserved === true
    && checks.memberRoleObserved === true
    && checks.outsiderCanReadOwnTenant === true;
  const logout = trusted && checks.sessionsRevoked === true;
  const sessionRefresh = trusted && checks.sessionRefresh === true;
  const rbac = trusted
    && checks.ownerRoleObserved === true
    && checks.memberRoleObserved === true
    && checks.ownerCanReadOwnTenant === true
    && checks.memberCanReadOwnTenant === true
    && checks.outsiderCannotReadTenantA === true
    && checks.ownerCannotReadTenantB === true
    && checks.outsiderCanReadOwnTenant === true
    && checks.crossTenantMembershipHidden === true;

  const canonicalChecks = [
    pass('signup', false, 'Dedicated disposable-user signup proof has not been executed.'),
    pass('login', login, 'Trusted synthetic-user login and role observation proof is unavailable.'),
    pass('logout', logout, 'Trusted synthetic sessions were not proven revoked.'),
    pass('sessionRefresh', sessionRefresh, 'Trusted authenticated session refresh proof is unavailable.'),
    pass('oauthCallback', false, 'A successful OAuth provider callback round trip has not been executed.'),
    pass('rbac', rbac, 'Trusted role and tenant-bound authorization proof is unavailable.'),
    pass('organizationOnboarding', false, 'A disposable no-organization user has not completed and rolled back onboarding.'),
  ];

  const verified = canonicalChecks
    .filter((check) => check.passed === true)
    .map((check) => check.name);
  const allPassed = verified.length === SCORECARD_CHECKS.length;
  const anyPassed = verified.length > 0;

  return {
    schema: 'risck-comply.auth-rbac-scorecard-evidence.v1',
    evidenceItem: 'auth-rbac-validation',
    status: allPassed ? 'Complete' : 'Open',
    outcome: allPassed ? 'passed' : anyPassed ? 'partial' : 'not_verified',
    generatedAt,
    reviewedAt: generatedAt,
    reviewer: 'RISCK COMPLY protected runtime automation',
    repository: trusted ? source.repository : REPOSITORY,
    branch: trusted ? source.branch : null,
    targetSha: trusted ? source.targetSha : null,
    checkedOutSha: trusted ? source.checkedOutSha : null,
    sourceEvidence: {
      path: sourcePath,
      trusted,
      schema: source?.schema ?? null,
      evidenceItem: source?.evidenceItem ?? null,
      generatedAt: source?.generatedAt ?? null,
      githubRunId: trusted ? String(source.provenance.runId) : null,
    },
    checks: canonicalChecks,
    controlsVerified: verified,
    remainingControls: SCORECARD_CHECKS.filter((name) => !verified.includes(name)),
    summary: allPassed
      ? 'Signup, login, logout, session refresh, OAuth callback, RBAC and organization onboarding were validated for the exact protected main SHA.'
      : anyPassed
        ? `Trusted runtime proof validates ${verified.join(', ')}. Remaining identity controls stay NOT_VERIFIED and enterprise production remains blocked.`
        : 'No trusted canonical Auth/RBAC scorecard checks are available. Enterprise production remains blocked.',
    productionGate: allPassed ? 'eligible for downstream enterprise gates' : 'blocked',
    evidenceLocations: [
      sourcePath,
      'scripts/security/run-auth-rbac-live-validation.mjs',
      'scripts/security/write-auth-rbac-scorecard-evidence.mjs',
      '.github/workflows/auth-rbac-runtime-proof.yml',
    ],
    evidenceBoundary: 'This derived artifact promotes only checks explicitly proven by trusted synthetic runtime evidence. Signup, OAuth and onboarding remain NOT_VERIFIED until dedicated disposable-flow proofs run; static code inspection cannot promote them.',
    evidenceIntegrity: {
      containsSensitiveValues: false,
      runtimeProofInvented: false,
      rawCredentialsStored: false,
      accessTokensStored: false,
      cookiesStored: false,
      userIdentifiersStored: false,
      organizationIdentifiersStored: false,
      rawProviderResponsesStored: false,
      exactShaBound: trusted,
    },
  };
}

export function writeAuthRbacScorecardEvidence({
  sourcePath = process.env.AUTH_RBAC_SOURCE_EVIDENCE_PATH || DEFAULT_SOURCE,
  outputPath = process.env.AUTH_RBAC_SCORECARD_EVIDENCE_PATH || DEFAULT_OUTPUT,
  generatedAt = new Date().toISOString(),
} = {}) {
  const source = JSON.parse(readFileSync(sourcePath, 'utf8'));
  const evidence = buildAuthRbacScorecardEvidence(source, { generatedAt, sourcePath });
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
  console.log(`Auth/RBAC scorecard evidence: ${evidence.status}/${evidence.outcome}`);
  return evidence;
}

if (process.argv[1] && fileURLToPath(new URL(`file://${process.argv[1]}`)) === fileURLToPath(import.meta.url)) {
  writeAuthRbacScorecardEvidence();
}
