import { existsSync, readFileSync } from 'node:fs';

const env = (...parts) => parts.join('_');
const stepUpSigningEnv = env('STEP', 'UP', 'SIGNING', 'SECRET');
const auditSigningEnv = env('AUDIT', 'CHAIN', 'SIGNING', 'SECRET');
const stepUpProviderEnv = env('STEP', 'UP', 'PROVIDER', 'MODE');
const stepUpAcrEnv = env('STEP', 'UP', 'IDP', 'ACR', 'VALUES');
const stepUpAmrEnv = env('STEP', 'UP', 'IDP', 'AMR', 'VALUES');
const supabaseUrlEnv = env('NEXT', 'PUBLIC', 'SUPABASE', 'URL');
const supabaseAnonEnv = env('NEXT', 'PUBLIC', 'SUPABASE', 'ANON', 'KEY');
const enterpriseReleaseEnv = env('RISCK', 'COMPLY', 'ENTERPRISE', 'RELEASE');
const legacyEnterpriseReleaseEnv = env('EUROCOMPLY', 'ENTERPRISE', 'RELEASE');
const forbiddenSubprocessToken = ['spawn', 'Sync'].join('');

const paths = {
  helper: 'src/server/security/step-up.ts',
  provider: 'src/server/security/step-up-provider.ts',
  settingsHelper: 'src/server/security/step-up-settings.ts',
  test: 'src/server/security/step-up.test.ts',
  challenge: 'src/app/api/security/step-up/challenge/route.ts',
  verify: 'src/app/api/security/step-up/verify/route.ts',
  ui: 'src/components/security/step-up-mfa-dialog.tsx',
  tokenMigration: 'supabase/migrations/20260619143000_step_up_token_store.sql',
  challengeMigration: 'supabase/migrations/20260623120000_step_up_challenge_store.sql',
  securitySettingsMigration: 'supabase/migrations/20260619191500_organization_security_settings.sql',
  runtimePreflight: 'scripts/security/check-step-up-runtime-preflight.mjs',
  runtimeValidation: 'scripts/security/run-step-up-mfa-runtime-validation.mjs',
  productionPreflight: 'scripts/preflight.mjs',
  packageJson: 'package.json',
  runtimeEvidence: 'docs/security/evidence/runtime/step-up-mfa-validation.json',
  teamPage: 'src/app/[locale]/dashboard/organizations/team/page.tsx',
  auditChainVerifier: 'src/app/api/audit/chain/verify/route.ts',
};

const protectedRoutes = [
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
  'src/app/api/security/settings/route.ts',
];

const tokenChecks = {
  [paths.helper]: [
    'STEP_UP_MAX_AGE_MS', '5 * 60 * 1000', 'STEP_UP_CHALLENGE_MAX_AGE_MS', 'STEP_UP_SIGNING_SECRET_ENV',
    'STEP_UP_TOKEN_HEADER', 'STEP_UP_PROVIDER_MODE_ENV', 'HIGH_RISK_ACTIONS', 'export_data', 'manage_billing',
    'manage_team', 'gdpr_delete', 'audit_chain_verify', 'audit_chain_export', 'change_security_settings',
    'createStepUpTokenEnvelope', 'persistStepUpTokenRecord', 'consumeStepUpToken', 'recordStepUpAuditEvent',
    'step_up_challenge_created', 'step_up_verified', 'step_up_failed', 'step_up_expired', 'step_up_scope_mismatch',
    'step_up_provider_not_configured', 'createHmac', 'timingSafeEqual', 'randomUUID', 'nonce', 'expiresAt',
    stepUpSigningEnv, auditSigningEnv, 'step_up_token_replayed', 'step_up_token_store_unavailable',
  ],
  [paths.provider]: [
    'createStepUpProviderChallenge', 'verifyStepUpProviderChallenge', 'STEP_UP_ACTION_PERMISSIONS', 'step_up_challenges',
    'createChallengeRecord', 'loadChallengeRecord', 'consumeChallengeRecord', 'nonce_hash', 'supabase.auth.mfa',
    'listFactors', 'challenge', 'verify', 'getAuthenticatorAssuranceLevel', 'aal2', 'getClaims', 'auth_time',
    'allowedAcrValues', 'allowedAmrValues', 'step_up_provider_not_configured', 'step_up_challenge_replayed',
  ],
  [paths.settingsHelper]: [
    'getEffectiveStepUpProviderPolicy', 'isEffectiveStepUpProviderPolicyConfigured', 'STEP_UP_PROVIDER_MODE',
    'STEP_UP_IDP_ACR_VALUES', 'STEP_UP_IDP_AMR_VALUES', 'organization_security_settings',
    'allowed_idp_acr_values', 'allowed_idp_amr_values', 'supabase_mfa', 'enterprise_idp',
    'supabase_mfa_or_enterprise_idp', 'getStepUpSecret',
  ],
  [paths.test]: [
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
  ],
  [paths.challenge]: [
    'assertTrustedOrigin', 'getCurrentUser', 'getCurrentOrganizationForUser', 'readBoundedJsonRequest',
    'normalizeHighRiskAction', 'checkDistributedRateLimit', 'STEP_UP_ACTION_PERMISSIONS',
    'createStepUpProviderChallenge', 'recordStepUpAuditEvent', 'step_up_challenge_created',
    'mfa_or_identity_provider_reauthentication', '/api/security/step-up/challenge',
  ],
  [paths.verify]: [
    'assertTrustedOrigin', 'getCurrentUser', 'getCurrentOrganizationForUser', 'readBoundedJsonRequest',
    'normalizeHighRiskAction', 'checkDistributedRateLimit', 'STEP_UP_ACTION_PERMISSIONS',
    'verifyStepUpProviderChallenge', 'createStepUpTokenEnvelope', 'persistStepUpTokenRecord',
    'recordStepUpAuditEvent', 'step_up_verified', 'signed_hmac', '/api/security/step-up/verify',
  ],
  [paths.ui]: [
    'StepUpMfaDialog', '/api/security/step-up/challenge', '/api/security/step-up/verify',
    'challengeNonce', 'factorId', 'challengeId', 'one-time-code', 'STEP_UP_TOKEN_HEADER',
  ],
  [paths.tokenMigration]: [
    'create table if not exists public.step_up_tokens', 'nonce text primary key', 'token_hash text not null',
    'verification_method', "check (expires_at <= verified_at + interval '5 minutes')", 'consumed_at',
    'revoked_at', 'enable row level security', 'grant all on public.step_up_tokens to service_role',
  ],
  [paths.challengeMigration]: [
    'create table if not exists public.step_up_challenges', 'nonce text primary key', 'nonce_hash text not null unique',
    'provider_challenge_id', 'provider_factor_id', "check (expires_at <= issued_at + interval '2 minutes')",
    'consumed_at', 'enable row level security', 'grant all on public.step_up_challenges to service_role',
  ],
  [paths.runtimeValidation]: [
    'signInWithPassword', 'supabase.auth.mfa.listFactors', 'supabase.auth.mfa.challenge',
    'supabase.auth.mfa.verify', 'getAuthenticatorAssuranceLevel', "currentLevel !== 'aal2'",
    'supabase.auth.signOut', 'manualBooleanProofAccepted: false', 'protectedWorkflowProvenance',
    'step_up_challenge_created', 'step_up_verified',
  ],
  [paths.runtimePreflight]: [
    'await import', './check-step-up.mjs', enterpriseReleaseEnv, legacyEnterpriseReleaseEnv, 'runtime provider preflight',
    'Values are never printed', 'process.env.RISCK_COMPLY_ENTERPRISE_RELEASE', 'process.env.EUROCOMPLY_ENTERPRISE_RELEASE',
  ],
  [paths.productionPreflight]: [
    'readRuntimeSetting', 'hasConfiguredList', 'isEnterpriseReleaseEnabled',
    'Enterprise step-up runtime provider preflight: running', 'Enterprise step-up runtime provider preflight: skipped',
    'stepUpProviderEnv', 'stepUpSigningEnv', 'auditSigningEnv', 'supabaseUrlEnv', 'supabaseAnonEnv',
    'stepUpAcrEnv', 'stepUpAmrEnv', 'providerConfigured',
  ],
  [paths.packageJson]: [
    'security:step-up', 'security:step-up:runtime', 'RISCK_COMPLY_ENTERPRISE_RELEASE=true npm run security:step-up',
  ],
  [paths.runtimeEvidence]: [
    'risck-comply.step-up-mfa-runtime-evidence.v2', 'step-up-mfa-validation', 'Open', 'blocked',
    'manualBooleanProofAccepted', 'generatedFromLiveProvider', 'protectedWorkflowProvenance',
    'scripts/security/run-step-up-mfa-runtime-validation.mjs', 'POST /api/security/step-up/challenge',
    'POST /api/security/step-up/verify', 'step_up_challenge_created', 'step_up_verified', 'step_up_failed',
    'step_up_expired', 'step_up_scope_mismatch',
  ],
};

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
    if (!source.includes(token)) failures.push(`${path} missing step-up token: ${token}`);
  }
}

function requireAwaitedStepUp(path, source) {
  if (source.includes('requireStepUpForRequest({') && !source.includes('await requireStepUpForRequest({')) {
    failures.push(`${path} must await persistent step-up validation`);
  }
}

function readRuntimeSetting(name) {
  return (process.env[name] ?? '').trim();
}

function hasConfiguredList(name) {
  return readRuntimeSetting(name).split(',').map((value) => value.trim()).filter(Boolean).length > 0;
}

function isEnterpriseReleaseEnabled() {
  return process.env[enterpriseReleaseEnv] === 'true' || process.env[legacyEnterpriseReleaseEnv] === 'true';
}

function readStepUpEvidence() {
  if (!existsSync(paths.runtimeEvidence)) return { ok: false, reason: 'step_up_runtime_evidence_missing' };
  try {
    const evidence = JSON.parse(readFileSync(paths.runtimeEvidence, 'utf8'));
    const acceptance = evidence.acceptanceCriteria ?? {};
    const integrity = evidence.evidenceIntegrity ?? {};
    const provenance = evidence.provenance ?? {};
    const events = new Set(evidence.auditEvents ?? []);
    const missingEvents = ['step_up_challenge_created', 'step_up_verified', 'step_up_failed', 'step_up_expired', 'step_up_scope_mismatch']
      .filter((event) => !events.has(event));
    if (!['Complete', 'Open', 'Exception', 'Failed'].includes(evidence.status)) return { ok: false, reason: 'step_up_runtime_evidence_invalid_status' };
    if (!['passed', 'blocked', 'failed', 'failed_source_validation'].includes(evidence.outcome)) return { ok: false, reason: 'step_up_runtime_evidence_invalid_outcome' };
    if (missingEvents.length > 0) return { ok: false, reason: `step_up_audit_events_missing:${missingEvents.join(',')}` };
    if (integrity.manualBooleanProofAccepted !== false) return { ok: false, reason: 'step_up_manual_boolean_proof_not_rejected' };
    if (integrity.rawSecretsStored !== false || integrity.rawTokensStored !== false) return { ok: false, reason: 'step_up_evidence_secret_hygiene_missing' };

    const providerProofPresent = evidence.status === 'Complete'
      && evidence.outcome === 'passed'
      && integrity.generatedFromLiveProvider === true
      && acceptance.aal2Observed === true
      && acceptance.sessionUserMatched === true
      && acceptance.fixtureSessionRevoked === true
      && acceptance.exactReleaseSha === true
      && acceptance.protectedMainBranch === true
      && acceptance.protectedWorkflowProvenance === true
      && provenance.exactShaBound === true
      && provenance.branchBound === true
      && provenance.workflowProvenance === true;

    return { ok: true, providerProofPresent, evidence };
  } catch {
    return { ok: false, reason: 'step_up_runtime_evidence_invalid_json' };
  }
}

console.log('RISCK COMPLY enterprise step-up authentication check');
console.log('----------------------------------------------------');

const sources = Object.fromEntries(Object.values(paths).map((path) => [path, read(path)]));
for (const [path, tokens] of Object.entries(tokenChecks)) {
  if (sources[path]) requireTokens(path, sources[path], tokens);
}

for (const routePath of protectedRoutes) {
  const source = read(routePath);
  if (source) requireAwaitedStepUp(routePath, source);
}

const teamPage = sources[paths.teamPage];
if (teamPage && /\b(inviteOrganizationMember|removeOrganizationMember|cancelOrganizationInvitation)\b/.test(teamPage)) {
  failures.push(`${paths.teamPage} must not import or call direct team server actions; use step-up protected APIs from the client.`);
}

const helper = sources[paths.helper];
if (helper && helper.includes('NextResponse.json')) failures.push(`${paths.helper} must use noStoreJson instead of direct NextResponse.json`);

const auditChainVerifier = sources[paths.auditChainVerifier];
if (auditChainVerifier && auditChainVerifier.includes('x-eurocomply-step-up-verified-at')) failures.push(`${paths.auditChainVerifier} must not trust raw timestamp step-up headers`);

const challenge = sources[paths.challenge];
if (challenge && challenge.includes('createStepUpTokenEnvelope')) failures.push(`${paths.challenge} must not mint HMAC tokens; use /api/security/step-up/verify after real provider verification`);
if (challenge && challenge.includes('{ status: 501 }')) failures.push(`${paths.challenge} must not be a symbolic 501 placeholder after real MFA/IdP integration`);
if (challenge && challenge.includes('body.verifiedAt')) failures.push(`${paths.challenge} must not trust user-supplied verification timestamps`);

const verify = sources[paths.verify];
if (verify && !verify.includes('verifyStepUpProviderChallenge') && verify.includes('createStepUpTokenEnvelope')) {
  failures.push(`${paths.verify} must call verifyStepUpProviderChallenge before creating HMAC tokens`);
}

for (const path of [paths.runtimePreflight, paths.productionPreflight, paths.runtimeValidation]) {
  if (sources[path] && sources[path].includes(forbiddenSubprocessToken)) failures.push(`${path} must not use subprocess execution for step-up preflight validation`);
}

const evidence = readStepUpEvidence();
if (!evidence.ok) failures.push(`Step-up runtime evidence invalid: ${evidence.reason}`);

if (isEnterpriseReleaseEnabled()) {
  const providerMode = readRuntimeSetting(stepUpProviderEnv);
  const hasDedicatedSecret = Boolean(readRuntimeSetting(stepUpSigningEnv));
  const hasSupabaseAuth = Boolean(readRuntimeSetting(supabaseUrlEnv) && readRuntimeSetting(supabaseAnonEnv));
  const hasIdpPolicy = hasConfiguredList(stepUpAcrEnv) || hasConfiguredList(stepUpAmrEnv);
  const providerConfigured = providerMode === 'supabase_mfa'
    ? hasSupabaseAuth
    : providerMode === 'enterprise_idp'
      ? hasSupabaseAuth && hasIdpPolicy
      : providerMode === 'supabase_mfa_or_enterprise_idp'
        ? hasSupabaseAuth
        : false;
  const providerProofPresent = evidence.ok && evidence.providerProofPresent;

  if (!hasDedicatedSecret || !providerConfigured) {
    failures.push('Enterprise release blocked: configure a dedicated STEP_UP_SIGNING_SECRET plus Supabase auth and a real Supabase MFA or enterprise IdP policy before release.');
  }
  if (!providerProofPresent) {
    failures.push('Enterprise release blocked: execute the protected Step-Up Runtime Proof workflow for the exact deployed main SHA and attach the resulting Complete/passed evidence.');
  }
}

if (failures.length > 0) {
  console.error('Step-up authentication failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Step-up authentication evidence present.');
}
