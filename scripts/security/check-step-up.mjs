import { existsSync, readFileSync } from 'node:fs';

const helperPath = 'src/server/security/step-up.ts';
const testPath = 'src/server/security/step-up.test.ts';
const docPath = 'docs/security/STEP_UP_AUTH.md';
const rolloutMatrixPath = 'docs/security/STEP_UP_ROLLOUT_MATRIX.md';
const auditChainVerifierPath = 'src/app/api/audit/chain/verify/route.ts';
const auditChainExportPath = 'src/app/api/audit/evidence-pack/route.ts';
const teamInvitePath = 'src/app/api/team/invites/route.ts';
const teamRemovePath = 'src/app/api/team/members/remove/route.ts';
const teamRolePath = 'src/app/api/team/members/role/route.ts';
const teamCancelInvitePath = 'src/app/api/team/invitations/cancel/route.ts';
const teamPagePath = 'src/app/[locale]/dashboard/organizations/team/page.tsx';
const teamSettingsPath = 'src/components/team/team-settings-section.tsx';
const challengePath = 'src/app/api/security/step-up/challenge/route.ts';
const uiPath = 'src/components/security/step-up-mfa-dialog.tsx';
const migrationPath = 'supabase/migrations/20260619143000_step_up_token_store.sql';
const runtimePreflightPath = 'scripts/security/check-step-up-runtime-preflight.mjs';
const runtimeEvidencePath = 'docs/security/evidence/runtime/step-up-mfa-validation.json';

const helperRequiredTokens = [
  'STEP_UP_MAX_AGE_MS',
  '5 * 60 * 1000',
  'STEP_UP_SIGNING_SECRET_ENV',
  'STEP_UP_TOKEN_HEADER',
  'STEP_UP_PROVIDER_MODE_ENV',
  'HIGH_RISK_ACTIONS',
  'export_data',
  'manage_billing',
  'manage_team',
  'gdpr_delete',
  'audit_chain_verify',
  'audit_chain_export',
  'change_security_settings',
  'createStepUpTokenEnvelope',
  'persistStepUpTokenRecord',
  'consumeStepUpToken',
  'recordStepUpAuditEvent',
  'step_up_requested',
  'step_up_approved',
  'step_up_denied',
  'step_up_expired',
  'createHmac',
  'timingSafeEqual',
  'randomUUID',
  'nonce',
  'expiresAt',
  'STEP_UP_SIGNING_SECRET',
  'AUDIT_CHAIN_SIGNING_SECRET',
  'step_up_token_replayed',
  'step_up_token_store_unavailable',
];

const testRequiredTokens = [
  'uses a short enterprise step-up window',
  'creates and accepts a signed scoped step-up token with nonce and expiry',
  'accepts valid signed tokens through the reusable request helper',
  'rejects missing request helper tokens with no-store response',
  'rejects a tampered signed step-up token',
  'rejects a signed token scoped to another organization',
  'rejects a signed token scoped to another action',
  'rejects an expired signed step-up token',
  'rejects replayed single-use request helper tokens',
  'fails closed when enterprise MFA/IdP provider is not configured',
];

const docRequiredTokens = [
  'Step-Up Authentication Standard',
  'Supabase MFA',
  'Enterprise IdP',
  'single-use nonce',
  '5 minutes',
  'step_up_required',
  'STEP_UP_PROVIDER_MODE',
  'Release gate',
  'check-step-up-runtime-preflight.mjs',
];

const rolloutMatrixRequiredTokens = [
  'Step-Up Rollout Matrix',
  'GET /api/gdpr/export',
  'GET /api/audit/chain/verify',
  'GET /api/audit/evidence-pack',
  'GET /api/security-questionnaire/export',
  'GET /api/vendor-assurance/export',
  'GET /api/enterprise-readiness/export',
  'GET /api/retention-center/export',
  'GET /api/continuity-center/export',
  'POST /api/billing/checkout',
  'POST /api/billing/portal',
  'POST /api/gdpr/delete-request',
  'POST /api/team/invites',
  'POST /api/team/members/remove',
  'POST /api/team/members/role',
  'POST /api/team/invitations/cancel',
  'POST /api/security/step-up/challenge',
  'src/components/security/step-up-mfa-dialog.tsx',
  'scripts/security/check-step-up-runtime-preflight.mjs',
  'signed_hmac',
  'single-use',
  'Supabase MFA or enterprise IdP',
  'Team invite management',
  'Security settings changes',
];

const auditChainVerifierRequiredTokens = [
  'await requireStepUpForRequest',
  'audit_chain_verify',
  'stepUpVerifiedAt',
];

const auditChainExportRequiredTokens = [
  'await requireStepUpForRequest',
  'audit_chain_export',
  'publicStepUpSummary',
];

const teamMutationRequiredTokens = [
  'await requireStepUpForRequest',
  'manage_team',
];

const teamSettingsRequiredTokens = [
  'StepUpMfaDialog',
  'STEP_UP_TOKEN_HEADER',
  '/api/team/invites',
  '/api/team/members/remove',
  '/api/team/invitations/cancel',
  'action="manage_team"',
];

const challengeRequiredTokens = [
  'assertTrustedOrigin',
  'getCurrentUser',
  'getCurrentOrganizationForUser',
  'readBoundedJsonRequest',
  'normalizeHighRiskAction',
  'createStepUpTokenEnvelope',
  'persistStepUpTokenRecord',
  'recordStepUpAuditEvent',
  'supabase.auth.mfa.challenge',
  'supabase.auth.mfa.verify',
  'supabase.auth.mfa.challengeAndVerify',
  'getAuthenticatorAssuranceLevel',
  'getClaims',
  'STEP_UP_PROVIDER_MODE',
  'STEP_UP_IDP_ACR_VALUES',
  'STEP_UP_IDP_AMR_VALUES',
  'step_up_provider_not_configured',
  'mfa_or_identity_provider_reauthentication',
];

const uiRequiredTokens = [
  'StepUpMfaDialog',
  '/api/security/step-up/challenge',
  'factorId',
  'challengeId',
  'one-time-code',
  'STEP_UP_TOKEN_HEADER',
];

const migrationRequiredTokens = [
  'create table if not exists public.step_up_tokens',
  'nonce text primary key',
  'token_hash text not null',
  'verification_method',
  "check (expires_at <= verified_at + interval '5 minutes')",
  'consumed_at',
  'revoked_at',
  'enable row level security',
  'grant all on public.step_up_tokens to service_role',
];

const runtimePreflightRequiredTokens = [
  'allowedProviderModes',
  'supabase_mfa',
  'enterprise_idp',
  'supabase_mfa_or_enterprise_idp',
  'STEP_UP_PROVIDER_MODE',
  'stepSigningName',
  'auditSigningName',
  'supabaseUrlName',
  'supabaseKeyName',
  'idpAcrName',
  'idpAmrName',
  'redacted',
  'process.exitCode = 1',
];

const runtimeEvidenceRequiredTokens = [
  'step-up-mfa-validation',
  'supabase_mfa',
  'enterprise_idp',
  'failClosedWithoutProvider',
  'singleUseNonce',
  'enterpriseReleaseBlockedWithoutProvider',
  'runtimePreflightFailsWithoutProvider',
  'scripts/security/check-step-up-runtime-preflight.mjs',
  'POST /api/team/invites',
  'POST /api/team/members/role',
];

const failures = [];

function read(path) {
  if (!existsSync(path)) {
    failures.push(`${path} is missing`);
    return '';
  }

  return readFileSync(path, 'utf8');
}

function requireTokens(path, source, tokens) {
  for (const token of tokens) {
    if (!source.includes(token)) {
      failures.push(`${path} missing step-up token: ${token}`);
    }
  }
}

function requireAwaitedStepUp(path, source) {
  if (source.includes('requireStepUpForRequest({') && !source.includes('await requireStepUpForRequest({')) {
    failures.push(`${path} must await persistent step-up validation`);
  }
}

console.log('EuroComply enterprise step-up authentication check');
console.log('--------------------------------------------------');

const helper = read(helperPath);
const test = read(testPath);
const doc = read(docPath);
const rolloutMatrix = read(rolloutMatrixPath);
const auditChainVerifier = read(auditChainVerifierPath);
const auditChainExport = read(auditChainExportPath);
const teamInvite = read(teamInvitePath);
const teamRemove = read(teamRemovePath);
const teamRole = read(teamRolePath);
const teamCancelInvite = read(teamCancelInvitePath);
const teamPage = read(teamPagePath);
const teamSettings = read(teamSettingsPath);
const challenge = read(challengePath);
const ui = read(uiPath);
const migration = read(migrationPath);
const runtimePreflight = read(runtimePreflightPath);
const runtimeEvidence = read(runtimeEvidencePath);

if (helper) requireTokens(helperPath, helper, helperRequiredTokens);
if (test) requireTokens(testPath, test, testRequiredTokens);
if (doc) requireTokens(docPath, doc, docRequiredTokens);
if (rolloutMatrix) requireTokens(rolloutMatrixPath, rolloutMatrix, rolloutMatrixRequiredTokens);
if (auditChainVerifier) requireTokens(auditChainVerifierPath, auditChainVerifier, auditChainVerifierRequiredTokens);
if (auditChainExport) requireTokens(auditChainExportPath, auditChainExport, auditChainExportRequiredTokens);
if (teamInvite) requireTokens(teamInvitePath, teamInvite, teamMutationRequiredTokens);
if (teamRemove) requireTokens(teamRemovePath, teamRemove, teamMutationRequiredTokens);
if (teamRole) requireTokens(teamRolePath, teamRole, teamMutationRequiredTokens);
if (teamCancelInvite) requireTokens(teamCancelInvitePath, teamCancelInvite, teamMutationRequiredTokens);
if (teamSettings) requireTokens(teamSettingsPath, teamSettings, teamSettingsRequiredTokens);
if (challenge) requireTokens(challengePath, challenge, challengeRequiredTokens);
if (ui) requireTokens(uiPath, ui, uiRequiredTokens);
if (migration) requireTokens(migrationPath, migration, migrationRequiredTokens);
if (runtimePreflight) requireTokens(runtimePreflightPath, runtimePreflight, runtimePreflightRequiredTokens);
if (runtimeEvidence) requireTokens(runtimeEvidencePath, runtimeEvidence, runtimeEvidenceRequiredTokens);

for (const routePath of [
  'src/app/api/gdpr/export/route.ts',
  'src/app/api/gdpr/delete-request/route.ts',
  'src/app/api/billing/checkout/route.ts',
  'src/app/api/billing/portal/route.ts',
  'src/app/api/audit/chain/verify/route.ts',
  'src/app/api/audit/evidence-pack/route.ts',
  'src/app/api/security-questionnaire/export/route.ts',
  'src/app/api/vendor-assurance/export/route.ts',
  'src/app/api/enterprise-readiness/export/route.ts',
  'src/app/api/retention-center/export/route.ts',
  'src/app/api/continuity-center/export/route.ts',
  'src/app/api/team/invites/route.ts',
  'src/app/api/team/members/remove/route.ts',
  'src/app/api/team/members/role/route.ts',
  'src/app/api/team/invitations/cancel/route.ts',
]) {
  const source = read(routePath);
  if (source) requireAwaitedStepUp(routePath, source);
}

if (teamPage && /\b(inviteOrganizationMember|removeOrganizationMember|cancelOrganizationInvitation)\b/.test(teamPage)) {
  failures.push(`${teamPagePath} must not import or call direct team server actions; use step-up protected APIs from the client.`);
}

if (helper && helper.includes('NextResponse.json')) {
  failures.push(`${helperPath} must use noStoreJson instead of direct NextResponse.json`);
}

if (auditChainVerifier && auditChainVerifier.includes('x-eurocomply-step-up-verified-at')) {
  failures.push(`${auditChainVerifierPath} must not trust raw timestamp step-up headers`);
}

if (challenge && challenge.includes('{ status: 501 }')) {
  failures.push(`${challengePath} must no longer be a symbolic 501 placeholder after real MFA/IdP integration`);
}

if (challenge && challenge.includes('verifiedAt') && challenge.includes('body.verifiedAt')) {
  failures.push(`${challengePath} must not trust user-supplied verification timestamps`);
}

if (process.env.EUROCOMPLY_ENTERPRISE_RELEASE === 'true') {
  const providerMode = process.env.STEP_UP_PROVIDER_MODE;
  const hasSecret = Boolean(process.env.STEP_UP_SIGNING_SECRET || process.env.AUDIT_CHAIN_SIGNING_SECRET);
  const hasSupabase = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const hasIdpPolicy = Boolean(process.env.STEP_UP_IDP_ACR_VALUES || process.env.STEP_UP_IDP_AMR_VALUES);
  const providerConfigured = providerMode === 'supabase_mfa'
    ? hasSupabase
    : providerMode === 'enterprise_idp'
      ? hasIdpPolicy
      : providerMode === 'supabase_mfa_or_enterprise_idp'
        ? hasSupabase || hasIdpPolicy
        : false;

  if (!hasSecret || !providerConfigured) {
    failures.push('Enterprise release blocked: configure STEP_UP_SIGNING_SECRET plus Supabase MFA or enterprise IdP ACR/AMR policy before release.');
  }
}

if (failures.length > 0) {
  console.error('Step-up authentication failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Step-up authentication evidence present.');
}
