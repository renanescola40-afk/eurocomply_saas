import { existsSync, readFileSync } from 'node:fs';

const env = (...parts) => parts.join('_');
const stepUpSigningEnv = env('STEP', 'UP', 'SIGNING', 'SECRET');
const auditSigningEnv = env('AUDIT', 'CHAIN', 'SIGNING', 'SECRET');
const stepUpProviderEnv = env('STEP', 'UP', 'PROVIDER', 'MODE');
const stepUpAcrEnv = env('STEP', 'UP', 'IDP', 'ACR', 'VALUES');
const stepUpAmrEnv = env('STEP', 'UP', 'IDP', 'AMR', 'VALUES');
const supabaseUrlEnv = env('NEXT', 'PUBLIC', 'SUPABASE', 'URL');
const supabaseAnonEnv = env('NEXT', 'PUBLIC', 'SUPABASE', 'ANON', 'KEY');
const enterpriseReleaseEnv = env('EUROCOMPLY', 'ENTERPRISE', 'RELEASE');
const forbiddenSubprocessToken = ['spawn', 'Sync'].join('');

const paths = {
  helper: 'src/server/security/step-up.ts',
  test: 'src/server/security/step-up.test.ts',
  doc: 'docs/security/STEP_UP_AUTH.md',
  rolloutMatrix: 'docs/security/STEP_UP_ROLLOUT_MATRIX.md',
  auditChainVerifier: 'src/app/api/audit/chain/verify/route.ts',
  auditChainExport: 'src/app/api/audit/evidence-pack/route.ts',
  teamInvite: 'src/app/api/team/invites/route.ts',
  teamRemove: 'src/app/api/team/members/remove/route.ts',
  teamRole: 'src/app/api/team/members/role/route.ts',
  teamCancelInvite: 'src/app/api/team/invitations/cancel/route.ts',
  teamPage: 'src/app/[locale]/dashboard/organizations/team/page.tsx',
  teamSettings: 'src/components/team/team-settings-section.tsx',
  securitySettings: 'src/app/api/security/settings/route.ts',
  challenge: 'src/app/api/security/step-up/challenge/route.ts',
  ui: 'src/components/security/step-up-mfa-dialog.tsx',
  migration: 'supabase/migrations/20260619143000_step_up_token_store.sql',
  securitySettingsMigration: 'supabase/migrations/20260619191500_organization_security_settings.sql',
  runtimePreflight: 'scripts/security/check-step-up-runtime-preflight.mjs',
  productionPreflight: 'scripts/preflight.mjs',
  runtimeEvidence: 'docs/security/evidence/runtime/step-up-mfa-validation.json',
};

const tokenChecks = {
  [paths.helper]: [
    'STEP_UP_MAX_AGE_MS', '5 * 60 * 1000', 'STEP_UP_SIGNING_SECRET_ENV', 'STEP_UP_TOKEN_HEADER',
    'STEP_UP_PROVIDER_MODE_ENV', 'HIGH_RISK_ACTIONS', 'export_data', 'manage_billing', 'manage_team',
    'gdpr_delete', 'audit_chain_verify', 'audit_chain_export', 'change_security_settings',
    'createStepUpTokenEnvelope', 'persistStepUpTokenRecord', 'consumeStepUpToken', 'recordStepUpAuditEvent',
    'step_up_requested', 'step_up_approved', 'step_up_denied', 'step_up_expired', 'createHmac',
    'timingSafeEqual', 'randomUUID', 'nonce', 'expiresAt', stepUpSigningEnv, auditSigningEnv,
    'step_up_token_replayed', 'step_up_token_store_unavailable',
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
  [paths.doc]: [
    'Step-Up Authentication Standard', 'Supabase MFA', 'Enterprise IdP', 'single-use nonce', '5 minutes',
    'step_up_required', stepUpProviderEnv, 'Release gate', 'check-step-up-runtime-preflight.mjs',
    `${enterpriseReleaseEnv}=true node scripts/preflight.mjs`,
  ],
  [paths.rolloutMatrix]: [
    'Step-Up Rollout Matrix', 'GET /api/gdpr/export', 'GET /api/audit/chain/verify',
    'GET /api/audit/evidence-pack', 'GET /api/security-questionnaire/export',
    'GET /api/vendor-assurance/export', 'GET /api/enterprise-readiness/export',
    'GET /api/retention-center/export', 'GET /api/continuity-center/export',
    'POST /api/billing/checkout', 'POST /api/billing/portal', 'POST /api/gdpr/delete-request',
    'POST /api/team/invites', 'POST /api/team/members/remove', 'POST /api/team/members/role',
    'POST /api/team/invitations/cancel', 'POST /api/security/settings', 'POST /api/security/step-up/challenge',
    'src/components/security/step-up-mfa-dialog.tsx', 'scripts/security/check-step-up-runtime-preflight.mjs',
    'signed_hmac', 'single-use', 'Supabase MFA or enterprise IdP', 'Team invite management',
    'Security settings changes',
  ],
  [paths.auditChainVerifier]: ['await requireStepUpForRequest', 'audit_chain_verify', 'stepUpVerifiedAt'],
  [paths.auditChainExport]: ['await requireStepUpForRequest', 'audit_chain_export', 'publicStepUpSummary'],
  [paths.teamInvite]: ['await requireStepUpForRequest', 'manage_team'],
  [paths.teamRemove]: ['await requireStepUpForRequest', 'manage_team'],
  [paths.teamRole]: ['await requireStepUpForRequest', 'manage_team'],
  [paths.teamCancelInvite]: ['await requireStepUpForRequest', 'manage_team'],
  [paths.securitySettings]: ['await requireStepUpForRequest', 'change_security_settings', 'manage_settings', 'security_settings_changed'],
  [paths.teamSettings]: [
    'StepUpMfaDialog', 'STEP_UP_TOKEN_HEADER', '/api/team/invites', '/api/team/members/remove',
    '/api/team/invitations/cancel', 'action="manage_team"',
  ],
  [paths.challenge]: [
    'assertTrustedOrigin', 'getCurrentUser', 'getCurrentOrganizationForUser', 'readBoundedJsonRequest',
    'normalizeHighRiskAction', 'createStepUpTokenEnvelope', 'persistStepUpTokenRecord',
    'recordStepUpAuditEvent', 'supabase.auth.mfa.challenge', 'supabase.auth.mfa.verify',
    'supabase.auth.mfa.challengeAndVerify', 'getAuthenticatorAssuranceLevel', 'getClaims',
    stepUpProviderEnv, stepUpAcrEnv, stepUpAmrEnv, 'step_up_provider_not_configured',
    'mfa_or_identity_provider_reauthentication',
  ],
  [paths.ui]: ['StepUpMfaDialog', '/api/security/step-up/challenge', 'factorId', 'challengeId', 'one-time-code', 'STEP_UP_TOKEN_HEADER'],
  [paths.migration]: [
    'create table if not exists public.step_up_tokens', 'nonce text primary key', 'token_hash text not null',
    'verification_method', "check (expires_at <= verified_at + interval '5 minutes')", 'consumed_at',
    'revoked_at', 'enable row level security', 'grant all on public.step_up_tokens to service_role',
  ],
  [paths.securitySettingsMigration]: [
    'create table if not exists public.organization_security_settings', 'organization_id uuid primary key',
    'require_step_up_for_critical_actions', 'step_up_provider_mode', 'allowed_idp_acr_values',
    'allowed_idp_amr_values', 'enable row level security', 'grant all on public.organization_security_settings to service_role',
  ],
  [paths.runtimePreflight]: [
    'await import', './check-step-up.mjs', enterpriseReleaseEnv, 'runtime provider preflight',
    'Values are never printed', 'process.env.EUROCOMPLY_ENTERPRISE_RELEASE',
  ],
  [paths.productionPreflight]: [
    'readRuntimeSetting', 'hasConfiguredList', 'enterpriseReleaseEnv',
    'Enterprise step-up runtime provider preflight: running',
    'Enterprise step-up runtime provider preflight: skipped', 'stepUpProviderEnv', 'stepUpSigningEnv',
    'auditSigningEnv', 'supabaseUrlEnv', 'supabaseAnonEnv', 'stepUpAcrEnv', 'stepUpAmrEnv', 'providerConfigured',
  ],
  [paths.runtimeEvidence]: [
    'step-up-mfa-validation', 'supabase_mfa', 'enterprise_idp', 'failClosedWithoutProvider',
    'singleUseNonce', 'enterpriseReleaseBlockedWithoutProvider', 'runtimePreflightFailsWithoutProvider',
    'productionPreflightRunsRuntimeProviderPreflight', 'scripts/security/check-step-up-runtime-preflight.mjs',
    'scripts/preflight.mjs', 'POST /api/team/invites', 'POST /api/team/members/role',
    'POST /api/security/settings', 'security_settings_changed',
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

console.log('EuroComply enterprise step-up authentication check');
console.log('--------------------------------------------------');

const sources = Object.fromEntries(Object.values(paths).map((path) => [path, read(path)]));

for (const [path, tokens] of Object.entries(tokenChecks)) {
  if (sources[path]) requireTokens(path, sources[path], tokens);
}

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
  'src/app/api/security/settings/route.ts',
]) {
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
if (challenge && challenge.includes('{ status: 501 }')) failures.push(`${paths.challenge} must no longer be a symbolic 501 placeholder after real MFA/IdP integration`);
if (challenge && challenge.includes('verifiedAt') && challenge.includes('body.verifiedAt')) failures.push(`${paths.challenge} must not trust user-supplied verification timestamps`);

for (const path of [paths.runtimePreflight, paths.productionPreflight]) {
  if (sources[path] && sources[path].includes(forbiddenSubprocessToken)) failures.push(`${path} must not use subprocess execution for step-up preflight validation`);
}

if (process.env[enterpriseReleaseEnv] === 'true') {
  const providerMode = readRuntimeSetting(stepUpProviderEnv);
  const hasSecret = Boolean(readRuntimeSetting(stepUpSigningEnv) || readRuntimeSetting(auditSigningEnv));
  const hasSupabaseAuth = Boolean(readRuntimeSetting(supabaseUrlEnv) && readRuntimeSetting(supabaseAnonEnv));
  const hasIdpPolicy = hasConfiguredList(stepUpAcrEnv) || hasConfiguredList(stepUpAmrEnv);
  const providerConfigured = providerMode === 'supabase_mfa'
    ? hasSupabaseAuth
    : providerMode === 'enterprise_idp'
      ? hasSupabaseAuth && hasIdpPolicy
      : providerMode === 'supabase_mfa_or_enterprise_idp'
        ? hasSupabaseAuth
        : false;

  if (!hasSecret || !providerConfigured) {
    failures.push('Enterprise release blocked: configure step-up signing material plus Supabase auth configuration and a real Supabase MFA or enterprise IdP ACR/AMR policy before release.');
  }
}

if (failures.length > 0) {
  console.error('Step-up authentication failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Step-up authentication evidence present.');
}
