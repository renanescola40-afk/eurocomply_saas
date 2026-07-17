#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CANONICAL_REPOSITORY = 'renanescola40-afk/eurocomply_saas';
const FULL_SHA = /^[a-f0-9]{40}$/;
const OUTPUT = 'docs/security/evidence/p1/step-up-sensitive-actions.json';
const DEFAULT_GITHUB_CHECKS = 'artifacts/enterprise-readiness/github-checks-evidence.json';
const REDACTION = 'All secrets, tokens, credentials, connection strings, and access-granting values are redacted.';

export const STEP_UP_ROUTE_POLICIES = [
  ['gdprExport', 'src/app/api/gdpr/export/route.ts', 'export_data'],
  ['gdprDelete', 'src/app/api/gdpr/delete-request/route.ts', 'gdpr_delete'],
  ['billingCheckout', 'src/app/api/billing/checkout/route.ts', 'manage_billing'],
  ['billingPortal', 'src/app/api/billing/portal/route.ts', 'manage_billing'],
  ['auditVerify', 'src/app/api/audit/chain/verify/route.ts', 'audit_chain_verify'],
  ['auditEvidencePack', 'src/app/api/audit/evidence-pack/route.ts', 'audit_chain_export'],
  ['questionnaireExport', 'src/app/api/security-questionnaire/export/route.ts', 'export_data'],
  ['vendorExport', 'src/app/api/vendor-assurance/export/route.ts', 'export_data'],
  ['enterpriseReadinessExport', 'src/app/api/enterprise-readiness/export/route.ts', 'export_data'],
  ['retentionExport', 'src/app/api/retention-center/export/route.ts', 'export_data'],
  ['continuityExport', 'src/app/api/continuity-center/export/route.ts', 'export_data'],
  ['teamInvites', 'src/app/api/team/invites/route.ts', 'manage_team'],
  ['teamMemberRemove', 'src/app/api/team/members/remove/route.ts', 'manage_team'],
  ['teamMemberRole', 'src/app/api/team/members/role/route.ts', 'manage_team'],
  ['teamInvitationCancel', 'src/app/api/team/invitations/cancel/route.ts', 'manage_team'],
  ['securitySettings', 'src/app/api/security/settings/route.ts', 'change_security_settings'],
];

function digest(value) {
  return createHash('sha256').update(value).digest('hex');
}

function containsEvery(source, values) {
  return values.every((value) => source.includes(value));
}

function checkStatus(document, name) {
  return document?.checks?.find((item) => item?.name === name)?.status === 'PASS';
}

function routePolicyPassed(source, action) {
  return containsEvery(source, [
    'await requireStepUpForRequest({',
    `action: '${action}'`,
    'userId:',
    'organizationId:',
  ]) && !source.includes('x-eurocomply-step-up-verified-at');
}

export function evaluateStepUpCoverage(sources) {
  const centralPolicy = containsEvery(sources.helper, [
    'STEP_UP_MAX_AGE_MS = 5 * 60 * 1000',
    'STEP_UP_CHALLENGE_MAX_AGE_MS = 2 * 60 * 1000',
    'HIGH_RISK_ACTIONS',
    "'export_data'",
    "'manage_billing'",
    "'manage_team'",
    "'gdpr_delete'",
    "'audit_chain_verify'",
    "'audit_chain_export'",
    "'change_security_settings'",
    'createHmac',
    'timingSafeEqual',
    'randomUUID',
    'persistStepUpTokenRecord',
    'consumeStepUpToken',
    "reason: 'step_up_token_replayed'",
    "reason: 'step_up_provider_not_configured'",
    'recordStepUpAuditEvent',
    'return noStoreJson(',
  ]);

  const providerVerification = containsEvery(sources.provider, [
    'createStepUpProviderChallenge',
    'verifyStepUpProviderChallenge',
    'supabase.auth.mfa',
    'getAuthenticatorAssuranceLevel',
    "currentLevel !== 'aal2'",
    'step_up_challenges',
    'consumeChallengeRecord',
    'step_up_provider_not_configured',
  ]);

  const challengeBoundary = containsEvery(sources.challenge, [
    'assertTrustedOrigin',
    'getCurrentUser',
    'getCurrentOrganizationForUser',
    'checkDistributedRateLimit',
    'createStepUpProviderChallenge',
    'recordStepUpAuditEvent',
    "event: 'step_up_challenge_created'",
  ]) && !sources.challenge.includes('createStepUpTokenEnvelope');

  const verificationBoundary = containsEvery(sources.verify, [
    'assertTrustedOrigin',
    'getCurrentUser',
    'getCurrentOrganizationForUser',
    'checkDistributedRateLimit',
    'verifyStepUpProviderChallenge',
    'createStepUpTokenEnvelope',
    'persistStepUpTokenRecord',
    'recordStepUpAuditEvent',
    "event: 'step_up_verified'",
  ]);

  const persistenceContract = containsEvery(sources.tokenMigration, [
    'create table if not exists public.step_up_tokens',
    'nonce text primary key',
    'token_hash text not null',
    "check (expires_at <= verified_at + interval '5 minutes')",
    'consumed_at',
    'revoked_at',
    'enable row level security',
    'grant all on public.step_up_tokens to service_role',
  ]) && containsEvery(sources.challengeMigration, [
    'create table if not exists public.step_up_challenges',
    'nonce_hash text not null unique',
    "check (expires_at <= issued_at + interval '2 minutes')",
    'consumed_at',
    'enable row level security',
    'grant all on public.step_up_challenges to service_role',
  ]);

  const testCoverage = containsEvery(sources.helperTest, [
    'creates and accepts a signed scoped step-up token with nonce and expiry',
    'rejects replayed single-use request helper tokens',
    'rejects missing request helper tokens with no-store response',
    'rejects a tampered signed step-up token',
    'rejects a signed token scoped to another organization',
    'rejects a signed token scoped to another action',
    'rejects an expired signed step-up token',
    'fails closed when enterprise MFA/IdP provider is not configured',
  ]) && containsEvery(sources.scanner, [
    'const protectedRoutes = [',
    'requireAwaitedStepUp',
    'Enterprise release blocked: execute the protected Step-Up Runtime Proof workflow',
  ]);

  const routeResults = STEP_UP_ROUTE_POLICIES.map(([key, path, action]) => ({
    key,
    path,
    action,
    passed: routePolicyPassed(sources.routes[key] ?? '', action),
  }));

  const checks = {
    centralPolicy,
    providerVerification,
    challengeBoundary,
    verificationBoundary,
    singleUsePersistence: persistenceContract,
    protectedRouteCoverage: routeResults.every((route) => route.passed),
    negativeAndReplayTests: testCoverage,
  };

  return {
    checks,
    routeResults,
    complete: Object.values(checks).every(Boolean),
  };
}

export function evaluateExactShaChecks(githubChecks, targetSha) {
  return {
    evidenceComplete: githubChecks?.status === 'Complete' && githubChecks?.outcome === 'passed',
    exactSha: githubChecks?.targetSha === targetSha,
    fullSecuritySuite: checkStatus(githubChecks, 'fullSecuritySuite'),
    requiredChecks: checkStatus(githubChecks, 'requiredChecks'),
  };
}

function actionReview(coverage, action, routeKeys, routeOrOperation) {
  const enforced = routeKeys.every((key) => coverage.routeResults.find((route) => route.key === key)?.passed === true);
  return {
    action,
    routeOrOperation,
    stepUpMethod: 'Provider-verified challenge followed by a signed, scoped, expiring, single-use token',
    status: enforced ? 'enforced' : 'open',
    evidenceLocation: routeKeys
      .map((key) => coverage.routeResults.find((route) => route.key === key)?.path)
      .filter(Boolean)
      .join(', '),
  };
}

export function buildStepUpEvidence({
  coverage,
  exactChecks,
  repository,
  branch,
  targetSha,
  observedSha,
  runId,
  githubActions,
  sourceDigests,
  generatedAt = new Date().toISOString(),
}) {
  const failures = [];
  if (!githubActions) failures.push('evidence must be generated by GitHub Actions');
  if (repository !== CANONICAL_REPOSITORY) failures.push('repository must be canonical');
  if (!String(branch ?? '').trim()) failures.push('branch must be present');
  if (!FULL_SHA.test(targetSha)) failures.push('targetSha must be a full Git SHA');
  if (observedSha !== targetSha) failures.push('checked-out SHA must equal targetSha');
  if (!/^\d+$/.test(String(runId))) failures.push('runId must be numeric');

  const provenance = failures.length === 0;
  const executionProven = exactChecks.evidenceComplete
    && exactChecks.exactSha
    && exactChecks.fullSecuritySuite
    && exactChecks.requiredChecks;
  const passed = coverage.complete && provenance && executionProven;

  if (!coverage.complete) failures.push('step-up source, route, migration, or test coverage is incomplete');
  if (!executionProven) failures.push('required exact-SHA execution evidence is incomplete');

  const nextReview = new Date(generatedAt);
  nextReview.setUTCDate(nextReview.getUTCDate() + 90);

  const sensitiveActionsReviewed = [
    actionReview(coverage, 'billing', ['billingCheckout', 'billingPortal'], 'Billing checkout and customer portal'),
    actionReview(
      coverage,
      'exports',
      ['gdprExport', 'auditEvidencePack', 'questionnaireExport', 'vendorExport', 'enterpriseReadinessExport', 'retentionExport', 'continuityExport'],
      'Sensitive governance, privacy, audit, vendor, continuity and retention exports',
    ),
    actionReview(
      coverage,
      'team-management',
      ['teamInvites', 'teamMemberRemove', 'teamMemberRole', 'teamInvitationCancel'],
      'Team invitations, role changes, removal and cancellation',
    ),
    actionReview(coverage, 'gdpr-delete', ['gdprDelete'], 'GDPR deletion request'),
  ];

  const controlsVerified = passed
    ? [
        'Sensitive actions require step-up authentication',
        'Step-up state expires and cannot be reused indefinitely',
        'Authorization is rechecked after step-up',
        'Audit event is emitted for sensitive actions',
        'Evidence contains no secrets',
      ]
    : [];

  return {
    schema: 'risck-comply.step-up-sensitive-actions.v2',
    evidenceItem: 'step-up-sensitive-actions',
    control: 'step-up-sensitive-actions',
    status: passed ? 'Complete' : 'Open',
    outcome: passed ? 'passed' : 'not_verified',
    redaction: REDACTION,
    generatedAt,
    reviewedAt: generatedAt,
    reviewer: 'RISCK COMPLY enterprise readiness automation',
    targetEnvironment: 'repository-exact-sha',
    nextReviewDue: nextReview.toISOString(),
    repository,
    branch,
    targetSha,
    observedSha,
    githubRunId: String(runId),
    summary: passed
      ? 'Sensitive actions use the centralized provider-verified, scoped, expiring and single-use step-up boundary on the exact assessed SHA.'
      : 'Step-up enforcement remains unverified because source coverage, route coverage, provenance or exact-SHA execution is incomplete.',
    sensitiveActionsReviewed,
    controlsVerified,
    checks: Object.entries(coverage.checks).map(([name, value]) => ({
      name,
      passed: value && (name !== 'negativeAndReplayTests' || executionProven),
    })),
    protectedRoutes: coverage.routeResults,
    executionEvidence: {
      exactShaChecksComplete: exactChecks.evidenceComplete,
      exactShaMatches: exactChecks.exactSha,
      fullSecuritySuitePassed: exactChecks.fullSecuritySuite,
      requiredChecksPassed: exactChecks.requiredChecks,
    },
    sourceDigests,
    failures,
    evidenceLocations: [
      'src/server/security/step-up.ts',
      'src/server/security/step-up-provider.ts',
      'src/app/api/security/step-up/challenge/route.ts',
      'src/app/api/security/step-up/verify/route.ts',
      'src/server/security/step-up.test.ts',
      'scripts/security/check-step-up.mjs',
      'supabase/migrations/20260619143000_step_up_token_store.sql',
      'supabase/migrations/20260623120000_step_up_challenge_store.sql',
      ...STEP_UP_ROUTE_POLICIES.map(([, path]) => path),
      DEFAULT_GITHUB_CHECKS,
    ],
    evidenceBoundary: 'This exact-SHA evidence validates the repository implementation, route coverage, expiry, scope, replay prevention, no-store denial response, audit hooks and tests for sensitive-action step-up. It does not prove that production Supabase MFA or an enterprise IdP is configured, that AAL2 was observed in production, or that administrator MFA and SSO controls are complete. Those remain dependent on the protected Step-Up Runtime Proof and provider configuration.',
    evidenceIntegrity: {
      containsSensitiveValues: false,
      rawTokensStored: false,
      credentialsStored: false,
      customerDataStored: false,
      manualBooleanProofAccepted: false,
      liveProviderProofClaimed: false,
      exactShaBound: provenance && exactChecks.exactSha,
    },
  };
}

function head(root) {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

function run() {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const paths = {
    helper: 'src/server/security/step-up.ts',
    provider: 'src/server/security/step-up-provider.ts',
    challenge: 'src/app/api/security/step-up/challenge/route.ts',
    verify: 'src/app/api/security/step-up/verify/route.ts',
    helperTest: 'src/server/security/step-up.test.ts',
    scanner: 'scripts/security/check-step-up.mjs',
    tokenMigration: 'supabase/migrations/20260619143000_step_up_token_store.sql',
    challengeMigration: 'supabase/migrations/20260623120000_step_up_challenge_store.sql',
  };
  const sources = Object.fromEntries(
    Object.entries(paths).map(([key, relativePath]) => [key, readFileSync(join(root, relativePath), 'utf8')]),
  );
  sources.routes = Object.fromEntries(
    STEP_UP_ROUTE_POLICIES.map(([key, relativePath]) => [key, readFileSync(join(root, relativePath), 'utf8')]),
  );

  const githubChecksPath = process.env.GITHUB_CHECKS_EVIDENCE_PATH || DEFAULT_GITHUB_CHECKS;
  const githubChecks = JSON.parse(readFileSync(join(root, githubChecksPath), 'utf8'));
  const targetSha = process.env.TARGET_SHA || process.env.GITHUB_SHA || '';
  const coverage = evaluateStepUpCoverage(sources);
  const exactChecks = evaluateExactShaChecks(githubChecks, targetSha);
  const evidence = buildStepUpEvidence({
    coverage,
    exactChecks,
    repository: process.env.GITHUB_REPOSITORY ?? '',
    branch: process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || '',
    targetSha,
    observedSha: head(root),
    runId: process.env.GITHUB_RUN_ID ?? '',
    githubActions: process.env.GITHUB_ACTIONS === 'true',
    sourceDigests: {
      ...Object.fromEntries(Object.entries(paths).map(([key]) => [key, digest(sources[key])])),
      routes: Object.fromEntries(
        STEP_UP_ROUTE_POLICIES.map(([key]) => [key, digest(sources.routes[key])]),
      ),
      githubChecks: digest(JSON.stringify(githubChecks)),
    },
  });

  const output = join(root, OUTPUT);
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify(evidence, null, 2)}\n`);
  if (evidence.status !== 'Complete') process.exit(1);
}

if (process.argv[1] && fileURLToPath(new URL(`file://${process.argv[1]}`)) === fileURLToPath(import.meta.url)) run();
