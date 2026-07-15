#!/usr/bin/env node

// Executes a real Supabase MFA challenge with a dedicated synthetic account and
// writes redacted, exact-SHA evidence for the enterprise step-up release gate.

import { createHmac } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { loadLocalEnv } from '../lib/load-local-env.mjs';

loadLocalEnv();

const evidencePath = 'docs/security/evidence/runtime/step-up-mfa-validation.json';
const repositoryName = 'renanescola40-afk/eurocomply_saas';
const evidenceFreshnessMs = 24 * 60 * 60 * 1000;
const env = (...parts) => parts.join('_');
const stepUpProviderEnv = env('STEP', 'UP', 'PROVIDER', 'MODE');
const stepUpSigningEnv = env('STEP', 'UP', 'SIGNING', 'SECRET');
const stepUpAcrEnv = env('STEP', 'UP', 'IDP', 'ACR', 'VALUES');
const stepUpAmrEnv = env('STEP', 'UP', 'IDP', 'AMR', 'VALUES');
const supabaseUrlEnv = env('NEXT', 'PUBLIC', 'SUPABASE', 'URL');
const supabaseAnonEnv = env('NEXT', 'PUBLIC', 'SUPABASE', 'ANON', 'KEY');
const enterpriseReleaseEnv = env('RISCK', 'COMPLY', 'ENTERPRISE', 'RELEASE');
const legacyEnterpriseReleaseEnv = env('EUROCOMPLY', 'ENTERPRISE', 'RELEASE');
const liveUserEmailEnv = env('STEP', 'UP', 'LIVE', 'USER', 'EMAIL');
const liveUserPasswordEnv = env('STEP', 'UP', 'LIVE', 'USER', 'PASSWORD');
const liveTotpSecretEnv = env('STEP', 'UP', 'LIVE', 'TOTP', 'SECRET');
const expectedShaEnv = env('ENTERPRISE', 'EXPECTED', 'SHA');
const expectedBranchEnv = env('ENTERPRISE', 'EXPECTED', 'BRANCH');

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

export function normalizeSha(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  return /^[0-9a-f]{40}$/.test(normalized) ? normalized : null;
}

export function normalizeProviderHost(value) {
  try {
    const parsed = new URL(String(value ?? '').trim());
    return ['https:', 'http:'].includes(parsed.protocol) ? parsed.hostname.toLowerCase() : null;
  } catch {
    return null;
  }
}

export function decodeBase32(value) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const normalized = String(value ?? '').toUpperCase().replace(/[\s=-]/g, '');
  if (!normalized) throw new Error('totp_secret_missing');

  const bytes = [];
  let buffer = 0;
  let bits = 0;
  for (const character of normalized) {
    const index = alphabet.indexOf(character);
    if (index < 0) throw new Error('totp_secret_invalid_base32');
    buffer = (buffer << 5) | index;
    bits += 5;
    while (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >>> bits) & 0xff);
      buffer &= bits === 0 ? 0 : (1 << bits) - 1;
    }
  }
  return Buffer.from(bytes);
}

export function generateTotpCode(secret, atMs = Date.now(), { periodSeconds = 30, digits = 6 } = {}) {
  if (!Number.isFinite(atMs) || atMs < 0) throw new Error('totp_timestamp_invalid');
  if (!Number.isInteger(periodSeconds) || periodSeconds <= 0) throw new Error('totp_period_invalid');
  if (!Number.isInteger(digits) || digits < 6 || digits > 8) throw new Error('totp_digits_invalid');

  const counter = BigInt(Math.floor(atMs / 1000 / periodSeconds));
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(counter);
  const digest = createHmac('sha1', decodeBase32(secret)).update(counterBuffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary = ((digest[offset] & 0x7f) << 24)
    | ((digest[offset + 1] & 0xff) << 16)
    | ((digest[offset + 2] & 0xff) << 8)
    | (digest[offset + 3] & 0xff);
  return String(binary % (10 ** digits)).padStart(digits, '0');
}

function readGitValue(args) {
  try {
    return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

function stableProviderCode(error) {
  const candidate = error && typeof error === 'object' && 'code' in error ? String(error.code ?? '') : '';
  return /^[a-z0-9_.-]{1,64}$/i.test(candidate) ? candidate : null;
}

function providerConfigured() {
  const providerMode = readRuntimeSetting(stepUpProviderEnv);
  const hasDedicatedSigningSecret = redactedPresence(stepUpSigningEnv);
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
    hasDedicatedSigningSecret,
    hasSupabaseAuth,
    hasIdpPolicy,
    configured: hasDedicatedSigningSecret && configured,
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

function emptyLiveResult(providerMode, providerHost) {
  return {
    status: 'Failed',
    attempted: true,
    reason: 'live_validation_not_completed',
    providerMode,
    providerHost,
    signedIn: false,
    verifiedFactorAvailable: false,
    challengeCreated: false,
    verificationSucceeded: false,
    aal2Observed: false,
    sessionUserMatched: false,
    verifiedTotpFactorCount: 0,
    providerCode: null,
  };
}

async function executeSupabaseMfaFlow(supabase, { email, password, totpSecret, providerMode, providerHost }) {
  let result = emptyLiveResult(providerMode, providerHost);
  const signIn = await supabase.auth.signInWithPassword({ email, password });
  const signedInUserId = signIn.data?.user?.id ?? null;
  if (signIn.error || !signedInUserId) {
    return { ...result, reason: 'fixture_sign_in_failed', providerCode: stableProviderCode(signIn.error) };
  }

  result = { ...result, signedIn: true };
  const factors = await supabase.auth.mfa.listFactors();
  if (factors.error) {
    return { ...result, reason: 'verified_factor_list_failed', providerCode: stableProviderCode(factors.error) };
  }

  const verifiedTotpFactors = (factors.data?.totp ?? []).filter((factor) => factor?.id && factor?.status === 'verified');
  const factor = verifiedTotpFactors[0];
  result = {
    ...result,
    verifiedFactorAvailable: Boolean(factor?.id),
    verifiedTotpFactorCount: verifiedTotpFactors.length,
  };
  if (!factor?.id) return { ...result, reason: 'verified_totp_factor_required' };

  const challenge = await supabase.auth.mfa.challenge({ factorId: factor.id });
  const challengeId = challenge.data?.id ?? null;
  if (challenge.error || !challengeId) {
    return { ...result, reason: 'provider_challenge_failed', providerCode: stableProviderCode(challenge.error) };
  }

  result = { ...result, challengeCreated: true };
  const code = generateTotpCode(totpSecret);
  const verification = await supabase.auth.mfa.verify({ factorId: factor.id, challengeId, code });
  if (verification.error) {
    return { ...result, reason: 'totp_verification_failed', providerCode: stableProviderCode(verification.error) };
  }

  result = { ...result, verificationSucceeded: true };
  const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const currentLevel = assurance.data?.currentLevel ?? null;
  if (assurance.error || currentLevel !== 'aal2') {
    return { ...result, reason: 'aal2_not_observed', providerCode: stableProviderCode(assurance.error) };
  }

  const currentUser = await supabase.auth.getUser();
  const sessionUserMatched = !currentUser.error && currentUser.data?.user?.id === signedInUserId;
  return {
    ...result,
    status: sessionUserMatched ? 'Complete' : 'Failed',
    reason: sessionUserMatched ? null : 'post_verification_session_user_mismatch',
    aal2Observed: true,
    sessionUserMatched,
    providerCode: stableProviderCode(currentUser.error),
  };
}

async function runSupabaseMfaLiveValidation() {
  const providerMode = readRuntimeSetting(stepUpProviderEnv);
  const supabaseUrl = readRuntimeSetting(supabaseUrlEnv);
  const supabaseAnonKey = readRuntimeSetting(supabaseAnonEnv);
  const email = readRuntimeSetting(liveUserEmailEnv);
  const password = readRuntimeSetting(liveUserPasswordEnv);
  const totpSecret = readRuntimeSetting(liveTotpSecretEnv);
  const providerHost = normalizeProviderHost(supabaseUrl);
  const missingConfiguration = [
    [supabaseUrlEnv, supabaseUrl],
    [supabaseAnonEnv, supabaseAnonKey],
    [liveUserEmailEnv, email],
    [liveUserPasswordEnv, password],
    [liveTotpSecretEnv, totpSecret],
  ].filter(([, value]) => !value).map(([name]) => name);

  if (!['supabase_mfa', 'supabase_mfa_or_enterprise_idp'].includes(providerMode)) {
    return {
      status: 'Skipped',
      attempted: false,
      reason: providerMode === 'enterprise_idp'
        ? 'enterprise_idp_live_claim_proof_requires_separate_provider_runner'
        : 'supabase_mfa_provider_mode_not_enabled',
      providerMode: providerMode || null,
      providerHost,
      missingConfiguration: [],
    };
  }

  if (missingConfiguration.length > 0 || !providerHost) {
    return {
      status: 'Skipped',
      attempted: false,
      reason: !providerHost && supabaseUrl ? 'invalid_supabase_provider_url' : 'missing_live_fixture_configuration',
      providerMode,
      providerHost,
      missingConfiguration,
    };
  }

  const startedAt = Date.now();
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  let flowResult;
  try {
    flowResult = await executeSupabaseMfaFlow(supabase, { email, password, totpSecret, providerMode, providerHost });
  } catch (error) {
    flowResult = {
      ...emptyLiveResult(providerMode, providerHost),
      reason: error instanceof Error && error.message.startsWith('totp_')
        ? error.message
        : 'unexpected_live_validation_failure',
      providerCode: stableProviderCode(error),
    };
  }

  const signOut = await supabase.auth.signOut();
  const signedOut = !signOut.error;
  const complete = flowResult.status === 'Complete' && signedOut;
  return {
    ...flowResult,
    status: complete ? 'Complete' : 'Failed',
    reason: flowResult.status === 'Complete' && !signedOut ? 'fixture_sign_out_failed' : flowResult.reason,
    signedOut,
    signOutProviderCode: stableProviderCode(signOut.error),
    durationMs: Date.now() - startedAt,
  };
}

export function evaluateStepUpRuntimeEvidence({
  sourceFailures,
  provider,
  liveValidation,
  expectedSha,
  checkedOutSha,
  expectedBranch,
  githubActions,
  githubRunId,
  githubRepository,
}) {
  const normalizedExpectedSha = normalizeSha(expectedSha);
  const normalizedCheckedOutSha = normalizeSha(checkedOutSha);
  const exactShaBound = Boolean(normalizedExpectedSha && normalizedCheckedOutSha && normalizedExpectedSha === normalizedCheckedOutSha);
  const branchBound = expectedBranch === 'main';
  const workflowProvenance = githubActions === true
    && /^\d+$/.test(String(githubRunId ?? ''))
    && githubRepository === repositoryName;
  const sourcesPassed = sourceFailures.length === 0;
  const livePassed = liveValidation?.status === 'Complete' && liveValidation?.signedOut === true;
  const complete = sourcesPassed && provider.configured && livePassed && exactShaBound && branchBound && workflowProvenance;
  const attemptedFailure = liveValidation?.attempted === true && liveValidation?.status === 'Failed';

  return {
    status: complete ? 'Complete' : sourcesPassed ? 'Open' : 'Failed',
    outcome: complete ? 'passed' : !sourcesPassed ? 'failed_source_validation' : attemptedFailure ? 'failed' : 'blocked',
    complete,
    checks: {
      sourcesPassed,
      providerConfigured: provider.configured,
      dedicatedSigningSecretConfigured: provider.hasDedicatedSigningSecret,
      liveProviderVerificationPassed: livePassed,
      exactShaBound,
      branchBound,
      workflowProvenance,
    },
    expectedSha: normalizedExpectedSha,
    checkedOutSha: normalizedCheckedOutSha,
  };
}

async function main() {
  const generatedAt = new Date();
  const sourceFailures = validateSources();
  const provider = providerConfigured();
  const enterpriseRelease = readRuntimeSetting(enterpriseReleaseEnv) === 'true'
    || readRuntimeSetting(legacyEnterpriseReleaseEnv) === 'true';
  const expectedSha = readRuntimeSetting(expectedShaEnv);
  const checkedOutSha = readGitValue(['rev-parse', 'HEAD']);
  const expectedBranch = readRuntimeSetting(expectedBranchEnv)
    || readRuntimeSetting('GITHUB_REF_NAME')
    || readGitValue(['branch', '--show-current']);
  const githubActions = readRuntimeSetting('GITHUB_ACTIONS') === 'true';
  const githubRunId = readRuntimeSetting('GITHUB_RUN_ID');
  const githubRepository = readRuntimeSetting('GITHUB_REPOSITORY');
  const liveValidation = await runSupabaseMfaLiveValidation();
  const evaluation = evaluateStepUpRuntimeEvidence({
    sourceFailures,
    provider,
    liveValidation,
    expectedSha,
    checkedOutSha,
    expectedBranch,
    githubActions,
    githubRunId,
    githubRepository,
  });

  const evidence = {
    schema: 'risck-comply.step-up-mfa-runtime-evidence.v2',
    evidenceItem: 'step-up-mfa-validation',
    id: 'step-up-mfa-validation',
    status: evaluation.status,
    outcome: evaluation.outcome,
    generatedAt: generatedAt.toISOString(),
    expiresAt: new Date(generatedAt.getTime() + evidenceFreshnessMs).toISOString(),
    reviewedAt: generatedAt.toISOString(),
    reviewer: 'RISCK COMPLY protected runtime automation',
    repository: repositoryName,
    branch: expectedBranch || null,
    targetSha: evaluation.expectedSha,
    checkedOutSha: evaluation.checkedOutSha,
    environment: 'production-provider-validation',
    control: 'P0-MFA real step-up validation for critical actions',
    summary: evaluation.complete
      ? 'A synthetic Supabase account completed a live verified TOTP challenge, produced aal2, retained the same user and revoked its session on the exact protected release SHA.'
      : sourceFailures.length > 0
        ? 'Step-up source controls failed validation; enterprise release remains blocked.'
        : liveValidation.status === 'Failed'
          ? 'A live provider validation was attempted and failed; enterprise release remains blocked.'
          : 'Real protected provider proof is incomplete; enterprise release remains blocked.',
    redactionConfirmation: 'No email, password, TOTP secret, access token, refresh token, user identifier, factor identifier, challenge identifier, cookie or raw provider payload is persisted.',
    releaseGate: {
      enterpriseRelease,
      blocked: enterpriseRelease && !evaluation.complete,
      reason: enterpriseRelease && !evaluation.complete ? 'step_up_live_provider_evidence_incomplete' : null,
    },
    provenance: {
      source: githubActions ? 'github_actions' : 'untrusted_or_local_execution',
      repository: githubRepository || null,
      runId: /^\d+$/.test(githubRunId) ? githubRunId : null,
      exactShaBound: evaluation.checks.exactShaBound,
      branchBound: evaluation.checks.branchBound,
      workflowProvenance: evaluation.checks.workflowProvenance,
    },
    sourceValidation: {
      status: evaluation.checks.sourcesPassed,
      failures: sourceFailures,
      files: criticalFiles,
    },
    runtimeConfiguration: {
      providerMode: provider.providerMode,
      providerHost: normalizeProviderHost(readRuntimeSetting(supabaseUrlEnv)),
      hasDedicatedSigningSecret: provider.hasDedicatedSigningSecret,
      hasSupabaseAuth: provider.hasSupabaseAuth,
      hasIdpPolicy: provider.hasIdpPolicy,
      providerConfigured: provider.configured,
      syntheticFixtureConfigured: redactedPresence(liveUserEmailEnv)
        && redactedPresence(liveUserPasswordEnv)
        && redactedPresence(liveTotpSecretEnv),
      requiredEnvironmentNames: [
        supabaseUrlEnv,
        supabaseAnonEnv,
        stepUpProviderEnv,
        stepUpSigningEnv,
        liveUserEmailEnv,
        liveUserPasswordEnv,
        liveTotpSecretEnv,
        expectedShaEnv,
        expectedBranchEnv,
      ],
    },
    runtimeValidation: liveValidation,
    acceptanceCriteria: {
      noCriticalActionWithoutStepUp: evaluation.checks.sourcesPassed,
      dedicatedSigningSecretRequired: evaluation.checks.dedicatedSigningSecretConfigured,
      syntheticFixtureSignedIn: liveValidation.signedIn === true,
      verifiedTotpFactorAvailable: liveValidation.verifiedFactorAvailable === true,
      providerChallengeCreated: liveValidation.challengeCreated === true,
      totpVerificationSucceeded: liveValidation.verificationSucceeded === true,
      aal2Observed: liveValidation.aal2Observed === true,
      sessionUserMatched: liveValidation.sessionUserMatched === true,
      fixtureSessionRevoked: liveValidation.signedOut === true,
      exactReleaseSha: evaluation.checks.exactShaBound,
      protectedMainBranch: evaluation.checks.branchBound,
      protectedWorkflowProvenance: evaluation.checks.workflowProvenance,
    },
    evidenceIntegrity: {
      placeholderOnly: false,
      generatedFromLiveProvider: liveValidation.status === 'Complete',
      manualBooleanProofAccepted: false,
      rawSecretsStored: false,
      rawTokensStored: false,
      rawUserIdentifiersStored: false,
      factorIdentifiersStored: false,
      challengeIdentifiersStored: false,
      rawProviderPayloadStored: false,
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
    endpointEvidence: [
      'POST /api/security/step-up/challenge',
      'POST /api/security/step-up/verify',
    ],
    evidenceGenerator: 'scripts/security/run-step-up-mfa-runtime-validation.mjs',
    evidenceLocations: criticalFiles,
  };

  mkdirSync(dirname(evidencePath), { recursive: true });
  writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(`Wrote ${evidencePath}`);

  if (sourceFailures.length > 0) {
    console.error('Step-up MFA source validation failed.');
    process.exitCode = 1;
  } else if (enterpriseRelease && !evaluation.complete) {
    console.error('Enterprise release blocked: protected exact-SHA live MFA provider proof is incomplete.');
    process.exitCode = 1;
  } else if (liveValidation.status === 'Failed') {
    console.error(`Step-up MFA live validation failed: ${liveValidation.reason ?? 'unknown_failure'}`);
    process.exitCode = 1;
  } else if (!evaluation.complete) {
    console.warn('Step-up MFA evidence remains Open until a protected main-branch workflow completes the live provider validation for the exact release SHA.');
  } else {
    console.log('Step-up MFA live runtime evidence generated successfully.');
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
