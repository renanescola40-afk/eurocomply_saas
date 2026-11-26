#!/usr/bin/env node
/**
 * SEC-01 / QAT-02: isolated QA-only live Supabase Auth TOTP proof.
 *
 * Reuses the existing reviewed runSupabaseMfaLiveValidation() implementation.
 * This is a *provider* test, not signed application HTTP/RLS/Storage evidence
 * or Enterprise gate acceptance. No Production, billing, emails, deployments.
 * Logs and persisted artifacts contain no user, password, JWT, TOTP, or keys.
 *
 * Execute only through the dedicated, manual, exact-main-SHA QA workflow.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { runSupabaseMfaLiveValidation } from '../security/run-step-up-mfa-runtime-validation.mjs';

const REPOSITORY = 'renanescola40-afk/eurocomply_saas';
const QA_REF = 'zrxrrfbllsxtleyxjpsz';
const QA_URL = 'https://' + QA_REF + '.supabase.co';
const ARTIFACT_PATH = 'artifacts/enterprise-sec01/qa-mfa-provider-evidence.json';

function sha40(v) {
  return typeof v === 'string' && /^[0-9a-f]{40}$/.test(v);
}

/**
 * Pure fail-closed evidence reducer. The provider result is held in memory;
 * never log or persist raw session, identity, password, token or TOTP values.
 * @param {{runtime?: Record<string, any> | null, actualSha?: string, env?: Record<string, string | undefined>}} [options]
 */
export function classifyQaMfaProviderProof({ runtime, actualSha, env = {} } = {}) {
  const validContext = sha40(actualSha)
    && env.GITHUB_ACTIONS === 'true'
    && env.GITHUB_REF_NAME === 'main'
    && env.GITHUB_REPOSITORY === REPOSITORY
    && env.SEC01_EXPECTED_MAIN_SHA === actualSha
    && env.STEP_UP_QA_EXECUTE === 'QA_ONLY_MFA_RUNTIME_PROOF'
    && env.STEP_UP_QA_PROJECT_REF === QA_REF
    && env.NEXT_PUBLIC_SUPABASE_URL === QA_URL
    && env.STEP_UP_PROVIDER_MODE === 'supabase_mfa'
    && env.E2E_QA_MAIL_SINK_CONFIRMED === 'true'
    && Boolean(env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    && Boolean(env.SUPABASE_SERVICE_ROLE_KEY)
    && env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== env.SUPABASE_SERVICE_ROLE_KEY
    && !env.RESEND_API_KEY && !env.SMTP_HOST
    && env.VERCEL_ENV !== 'production'
    && !String(env.STRIPE_SECRET_KEY || '').startsWith('sk_live_');

  const checks = {
    fixtureCreated: runtime?.ephemeralFixtureCreated === true,
    signedIn: runtime?.signedIn === true,
    initialAal1Observed: runtime?.initialAal1Observed === true,
    totpEnrolled: runtime?.factorEnrolled === true,
    totpFactorVerified: runtime?.verifiedFactorAvailable === true
      && Number.isInteger(runtime?.verifiedTotpFactorCount)
      && runtime.verifiedTotpFactorCount >= 1,
    challengeIssued: runtime?.challengeCreated === true,
    otpAccepted: runtime?.verificationSucceeded === true,
    aal2Observed: runtime?.aal2Observed === true,
    sameUserAfterVerification: runtime?.sessionUserMatched === true,
    signedOut: runtime?.signedOut === true,
    fixtureDeleted: runtime?.fixtureCleanupVerified === true,
  };
  const signedSessionIdProof = {
    aal1: validContext && runtime?.signedAal1SessionIdVerified === true,
    aal2: validContext && runtime?.signedAal2SessionIdVerified === true,
  };
  const pass = validContext
    && runtime?.status === 'Complete'
    && Object.values(checks).every(Boolean);
  return {
    schema: 'risck-sec01-qa-mfa-provider-proof-v1',
    sourceSha: sha40(actualSha) ? actualSha : null,
    qaRef: QA_REF,
    origin: 'qa-only',
    execution: validContext ? 'QA_SIGNED_MFA_PROVIDER' : 'BLOCKED_QA_PREFLIGHT',
    outcome: pass ? 'QA_PROVIDER_AAL2_PASS' : 'NOT_VERIFIED',
    verifiedCount: Object.values(checks).filter(Boolean).length,
    requiredCount: Object.keys(checks).length,
    checks,
    signedSessionIdProof,
    signedSessionIdVerified: pass && Object.values(signedSessionIdProof).every(Boolean),
    cleanupVerified: checks.fixtureDeleted,
    noProductionMutation: true,
    emailSent: false,
    gate: 'NOT_ACCEPTED',
    control: 'NOT_VERIFIED',
    evidenceClass: 'PROVIDER_ONLY_NOT_APP_RLS_STORAGE_HTTP',
    secretsRetained: false,
    identitiesRetained: false,
    tokensRetained: false,
    pass,
  };
}

function currentSha() {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 10000,
    }).trim().toLowerCase();
  } catch {
    return '';
  }
}

function qaPreflight(env, sha) {
  return sha40(sha)
    && env.GITHUB_ACTIONS === 'true'
    && env.GITHUB_REF_NAME === 'main'
    && env.GITHUB_REPOSITORY === REPOSITORY
    && env.SEC01_EXPECTED_MAIN_SHA === sha
    && env.STEP_UP_QA_EXECUTE === 'QA_ONLY_MFA_RUNTIME_PROOF'
    && env.STEP_UP_QA_PROJECT_REF === QA_REF
    && env.NEXT_PUBLIC_SUPABASE_URL === QA_URL
    && env.STEP_UP_PROVIDER_MODE === 'supabase_mfa'
    && env.E2E_QA_MAIL_SINK_CONFIRMED === 'true'
    && Boolean(env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    && Boolean(env.SUPABASE_SERVICE_ROLE_KEY)
    && env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== env.SUPABASE_SERVICE_ROLE_KEY
    && !env.RESEND_API_KEY && !env.SMTP_HOST
    && env.VERCEL_ENV !== 'production'
    && !String(env.STRIPE_SECRET_KEY || '').startsWith('sk_live_');
}

async function main() {
  const sha = currentSha();
  const preflightPassed = qaPreflight(process.env, sha);
  let runtime = null;
  if (preflightPassed) {
    try {
      runtime = await runSupabaseMfaLiveValidation();
    } catch {
      runtime = null;
    }
  }
  const proof = classifyQaMfaProviderProof({ runtime, actualSha: sha, env: process.env });
  mkdirSync(dirname(ARTIFACT_PATH), { recursive: true });
  const { pass, ...redacted } = proof;
  writeFileSync(ARTIFACT_PATH, JSON.stringify(redacted, null, 2) + '\n', { mode: 0o600 });
  console.log(JSON.stringify({
    qaRef: QA_REF,
    sha: proof.sourceSha,
    execution: proof.execution,
    outcome: proof.outcome,
    verifiedCount: proof.verifiedCount,
    requiredCount: proof.requiredCount,
    cleanupVerified: proof.cleanupVerified,
    signedSessionIdVerified: proof.signedSessionIdVerified,
    signedSessionIdProof: proof.signedSessionIdProof,
    gate: proof.gate,
    control: proof.control,
    evidenceClass: proof.evidenceClass,
  }));
  if (!pass || !proof.signedSessionIdVerified) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
