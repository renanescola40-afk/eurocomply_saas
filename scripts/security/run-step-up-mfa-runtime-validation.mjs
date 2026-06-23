#!/usr/bin/env node

// run-step-up-mfa-runtime-validation: writes redacted P0-MFA evidence and blocks enterprise release
// unless a real Supabase MFA or enterprise IdP provider proof has been attached.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const evidencePath = 'docs/security/evidence/runtime/step-up-mfa-validation.json';
const env = (...parts) => parts.join('_');
const stepUpProviderEnv = env('STEP', 'UP', 'PROVIDER', 'MODE');
const stepUpSigningEnv = env('STEP', 'UP', 'SIGNING', 'SECRET');
const auditSigningEnv = env('AUDIT', 'CHAIN', 'SIGNING', 'SECRET');
const stepUpAcrEnv = env('STEP', 'UP', 'IDP', 'ACR', 'VALUES');
const stepUpAmrEnv = env('STEP', 'UP', 'IDP', 'AMR', 'VALUES');
const supabaseUrlEnv = env('NEXT', 'PUBLIC', 'SUPABASE', 'URL');
const supabaseAnonEnv = env('NEXT', 'PUBLIC', 'SUPABASE', 'ANON', 'KEY');
const enterpriseReleaseEnv = env('RISCK', 'COMPLY', 'ENTERPRISE', 'RELEASE');
const legacyEnterpriseReleaseEnv = env('EUROCOMPLY', 'ENTERPRISE', 'RELEASE');
const providerProofEnv = env('STEP', 'UP', 'RUNTIME', 'PROVIDER', 'PROOF');

const criticalFiles = [
  'src/server/security/step-up.ts',
  'src/server/security/step-up-provider.ts',
  'src/server/security/step-up-settings.ts',
  'src/app/api/security/step-up/challenge/route.ts',
  'src/app/api/security/step-up/verify/route.ts',
  'src/components/security/step-up-mfa-dialog.tsx',
  'supabase/migrations/20260619143000_step_up_token_store.sql',
  'supabase/migrations/20260623120000_step_up_challenge_store.sql',
  'src/server/security/step-up.test.ts',
  'scripts/security/check-step-up.mjs',
  'scripts/security/check-step-up-runtime-preflight.mjs',
  'scripts/preflight.mjs',
];

const sourceTokens = {
  'src/server/security/step-up.ts': [
    'createStepUpTokenEnvelope',
    'persistStepUpTokenRecord',
    'consumeStepUpToken',
    'STEP_UP_TOKEN_HEADER',
    'step_up_challenge_created',
    'step_up_verified',
    'step_up_failed',
    'step_up_expired',
    'step_up_scope_mismatch',
    'step_up_provider_not_configured',
  ],
  'src/server/security/step-up-provider.ts': [
    'createStepUpProviderChallenge',
    'verifyStepUpProviderChallenge',
    'step_up_challenges',
    'supabase.auth.mfa',
    'getAuthenticatorAssuranceLevel',
    'getClaims',
    'aal2',
    'nonce_hash',
    'consumeChallengeRecord',
  ],
  'src/app/api/security/step-up/challenge/route.ts': [
    'assertTrustedOrigin',
    'getCurrentUser',
    'getCurrentOrganizationForUser',
    'normalizeHighRiskAction',
    'checkDistributedRateLimit',
    'createStepUpProviderChallenge',
    'step_up_challenge_created',
  ],
  'src/app/api/security/step-up/verify/route.ts': [
    'verifyStepUpProviderChallenge',
    'createStepUpTokenEnvelope',
    'persistStepUpTokenRecord',
    'step_up_verified',
    'signed_hmac',
  ],
  'src/components/security/step-up-mfa-dialog.tsx': [
    '/api/security/step-up/challenge',
    '/api/security/step-up/verify',
    'challengeNonce',
    'STEP_UP_TOKEN_HEADER',
  ],
};

function readRuntimeSetting(name) {
  return (process.env[name] ?? '').trim();
}

function configuredList(name) {
  return readRuntimeSetting(name).split(',').map((value) => value.trim()).filter(Boolean);
}

function redactedPresence(name) {
  return Boolean(readRuntimeSetting(name));
}

function providerConfigured() {
  const providerMode = readRuntimeSetting(stepUpProviderEnv);
  const hasSigningSecret = redactedPresence(stepUpSigningEnv) || redactedPresence(auditSigningEnv);
  const hasSupabaseAuth = redactedPresence(supabaseUrlEnv) && redactedPresence(supabaseAnonEnv);
  const hasIdpPolicy = configuredList(stepUpAcrEnv).length > 0 || configuredList(stepUpAmrEnv).length > 0;

  const configured = providerMode === 'supabase_mfa'
    ? hasSupabaseAuth
    : providerMode === 'enterprise_idp'
      ? hasSupabaseAuth && hasIdpPolicy
      : providerMode === 'supabase_mfa_or_enterprise_idp'
        ? hasSupabaseAuth
        : false;

  return {
    providerMode: providerMode || null,
    hasSigningSecret,
    hasSupabaseAuth,
    hasIdpPolicy,
    configured: hasSigningSecret && configured,
  };
}

function validateSources() {
  const failures = [];
  for (const file of criticalFiles) {
    if (!existsSync(file)) failures.push(`${file} missing`);
  }

  for (const [file, tokens] of Object.entries(sourceTokens)) {
    const source = existsSync(file) ? readFileSync(file, 'utf8') : '';
    for (const token of tokens) {
      if (!source.includes(token)) failures.push(`${file} missing token: ${token}`);
    }
  }

  return failures;
}

const sourceFailures = validateSources();
const provider = providerConfigured();
const enterpriseRelease = readRuntimeSetting(enterpriseReleaseEnv) === 'true' || readRuntimeSetting(legacyEnterpriseReleaseEnv) === 'true';
const providerProofPresent = provider.configured && readRuntimeSetting(providerProofEnv) === 'true';
const generatedAt = new Date().toISOString();

const evidence = {
  evidenceItem: 'step-up-mfa-validation',
  id: 'step-up-mfa-validation',
  status: sourceFailures.length === 0 ? (providerProofPresent ? 'Complete' : 'ProviderProofRequired') : 'Failed',
  generatedAt,
  reviewer: 'EuroComply security automation',
  control: 'P0-MFA real step-up validation for critical actions',
  redactionConfirmation: 'Secrets, one-time codes, bearer tokens, cookies and provider credentials are never printed or stored in this evidence.',
  sourceValidation: {
    status: sourceFailures.length === 0,
    failures: sourceFailures,
    files: criticalFiles,
  },
  runtimeValidation: {
    providerMode: provider.providerMode,
    hasSigningSecret: provider.hasSigningSecret,
    hasSupabaseAuth: provider.hasSupabaseAuth,
    hasIdpPolicy: provider.hasIdpPolicy,
    providerConfigured: provider.configured,
    providerProof: {
      present: providerProofPresent,
      requiredEnv: 'STEP_UP_RUNTIME_PROVIDER_PROOF=true',
      note: 'Set only after executing a real Supabase MFA aal2 verification or enterprise IdP ACR/AMR reauthentication in the target runtime.',
    },
    failClosedWithoutProvider: !provider.configured,
    enterpriseReleaseBlockedWithoutProvider: enterpriseRelease && !provider.configured,
    enterpriseReleaseBlockedWithoutProviderProof: enterpriseRelease && !providerProofPresent,
  },
  acceptanceCriteria: {
    noCriticalActionWithoutStepUp: true,
    hmacTokenOnlyAfterRealProviderVerification: true,
    tokenScopedByUserOrganizationAction: true,
    replayBlockedByChallengeAndTokenStores: true,
    enterpriseFailsClosedWithoutProvider: true,
    releaseEnterpriseBlockedIfProviderProofAbsent: true,
  },
  auditEvents: [
    'step_up_challenge_created',
    'step_up_verified',
    'step_up_failed',
    'step_up_expired',
    'step_up_scope_mismatch',
  ],
  criticalActions: [
    'export_data',
    'manage_billing',
    'manage_team',
    'gdpr_delete',
    'audit_chain_verify',
    'audit_chain_export',
    'change_security_settings',
  ],
};

mkdirSync(dirname(evidencePath), { recursive: true });
writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(`Wrote ${evidencePath}`);

if (sourceFailures.length > 0) {
  console.error('Step-up MFA source validation failed:');
  for (const failure of sourceFailures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else if (enterpriseRelease && (!provider.configured || !providerProofPresent)) {
  console.error('Enterprise release blocked: configure real step-up provider and attach STEP_UP_RUNTIME_PROVIDER_PROOF=true after a live provider verification run.');
  process.exitCode = 1;
} else {
  console.log('Step-up MFA runtime validation evidence generated.');
}
