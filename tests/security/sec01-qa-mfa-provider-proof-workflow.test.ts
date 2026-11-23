import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { classifyQaMfaProviderProof } from '../../scripts/enterprise-gates/a01-sec01-qa-mfa-provider-proof.mjs';

const SHA = 'a'.repeat(40);
const QA_URL = 'https://zrxrrfbllsxtleyxjpsz.supabase.co';
const goodEnv = {
  GITHUB_ACTIONS: 'true',
  GITHUB_REF_NAME: 'main',
  GITHUB_REPOSITORY: 'renanescola40-afk/eurocomply_saas',
  SEC01_EXPECTED_MAIN_SHA: SHA,
  STEP_UP_QA_EXECUTE: 'QA_ONLY_MFA_RUNTIME_PROOF',
  STEP_UP_QA_PROJECT_REF: 'zrxrrfbllsxtleyxjpsz',
  NEXT_PUBLIC_SUPABASE_URL: QA_URL,
  STEP_UP_PROVIDER_MODE: 'supabase_mfa',
  E2E_QA_MAIL_SINK_CONFIRMED: 'true',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'qa_public_key_for_test_only',
  SUPABASE_SERVICE_ROLE_KEY: 'qa_private_key_for_test_only',
};
const passed = {
  status: 'Complete',
  ephemeralFixtureCreated: true,
  signedIn: true,
  initialAal1Observed: true,
  factorEnrolled: true,
  verifiedFactorAvailable: true,
  verifiedTotpFactorCount: 1,
  challengeCreated: true,
  verificationSucceeded: true,
  aal2Observed: true,
  sessionUserMatched: true,
  signedOut: true,
  fixtureCleanupVerified: true,
};

function result(runtime: typeof passed | null = passed, env: Record<string, string> = goodEnv, actualSha: string = SHA) {
  return classifyQaMfaProviderProof({ runtime, env, actualSha });
}

describe('SEC-01 manual QA-only signed MFA provider workflow', () => {
  it('counts a real complete provider lifecycle and still refuses Enterprise acceptance', () => {
    expect(result()).toMatchObject({
      pass: true,
      outcome: 'QA_PROVIDER_AAL2_PASS',
      verifiedCount: 11,
      requiredCount: 11,
      qaRef: 'zrxrrfbllsxtleyxjpsz',
      gate: 'NOT_ACCEPTED',
      control: 'NOT_VERIFIED',
      evidenceClass: 'PROVIDER_ONLY_NOT_APP_RLS_STORAGE_HTTP',
      secretsRetained: false,
      tokensRetained: false,
      identitiesRetained: false,
      cleanupVerified: true,
    });
  });

  it('rejects AAL1, failed enrollment, failed OTP, wrong user, signout and cleanup failure', () => {
    for (const patch of [
      { status: 'Failed' },
      { ephemeralFixtureCreated: false },
      { signedIn: false },
      { initialAal1Observed: false },
      { factorEnrolled: false },
      { verifiedFactorAvailable: false },
      { verifiedTotpFactorCount: 0 },
      { challengeCreated: false },
      { verificationSucceeded: false },
      { aal2Observed: false },
      { sessionUserMatched: false },
      { signedOut: false },
      { fixtureCleanupVerified: false },
    ]) {
      expect(result({ ...passed, ...patch }).pass).toBe(false);
      expect(result({ ...passed, ...patch }).outcome).toBe('NOT_VERIFIED');
    }
    expect(result(null).pass).toBe(false);
  });

  it('rejects Production, wrong project, inherited credentials, unreviewed SHA, and missing mail sink', () => {
    for (const patch of [
      { NEXT_PUBLIC_SUPABASE_URL: 'https://tganhbbhfxcpblmgqprg.supabase.co' },
      { NEXT_PUBLIC_SUPABASE_URL: 'http://zrxrrfbllsxtleyxjpsz.supabase.co' },
      { NEXT_PUBLIC_SUPABASE_URL: QA_URL + '.evil.test' },
      { STEP_UP_QA_PROJECT_REF: 'tganhbbhfxcpblmgqprg' },
      { STEP_UP_QA_EXECUTE: 'PRODUCTION_AUTH_PROOF' },
      { STEP_UP_PROVIDER_MODE: 'enterprise_idp' },
      { E2E_QA_MAIL_SINK_CONFIRMED: 'false' },
      { GITHUB_REF_NAME: 'release' },
      { GITHUB_ACTIONS: 'false' },
      { GITHUB_REPOSITORY: 'other/other' },
      { SEC01_EXPECTED_MAIN_SHA: 'b'.repeat(40) },
      { NEXT_PUBLIC_SUPABASE_ANON_KEY: '' },
      { SUPABASE_SERVICE_ROLE_KEY: '' },
      { SUPABASE_SERVICE_ROLE_KEY: goodEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY },
      { RESEND_API_KEY: 'should_never_be_present' },
      { SMTP_HOST: 'should_never_be_present' },
      { VERCEL_ENV: 'production' },
      { STRIPE_SECRET_KEY: 'sk_live_rejected' },
    ]) {
      const evidence = result(passed, { ...goodEnv, ...patch });
      expect(evidence.pass).toBe(false);
      expect(evidence.outcome).toBe('NOT_VERIFIED');
    }
    expect(result(passed, goodEnv, 'b'.repeat(40)).pass).toBe(false);
  });

  it('only manual dispatch on exact main with QA-only secrets; no Production environments or writes', () => {
    const workflow = readFileSync('.github/workflows/sec01-isolated-qa-mfa-provider.yml', 'utf8');
    const runner = readFileSync('scripts/enterprise-gates/a01-sec01-qa-mfa-provider-proof.mjs', 'utf8');
    const existing = readFileSync('scripts/security/run-step-up-mfa-runtime-validation.mjs', 'utf8');
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).not.toMatch(/^\s+(?:push|pull_request|workflow_run|schedule):/m);
    expect(workflow).not.toContain('environment: Production');
    expect(workflow).not.toContain('secrets.SUPABASE_SERVICE_ROLE_KEY');
    expect(workflow).toContain('secrets.E2E_QA_SUPABASE_SERVICE_ROLE_KEY');
    expect(workflow).toContain('secrets.E2E_QA_SUPABASE_URL');
    expect(workflow).toContain('vars.E2E_QA_MAIL_SINK_CONFIRMED');
    expect(workflow).toContain('git ls-remote');
    expect(workflow).toContain('refs/heads/main');
    expect(workflow).toContain('inputs.release_sha');
    expect(workflow).toContain('persist-credentials: false');
    expect(workflow).toContain('npm ci --ignore-scripts --no-audit --no-fund');
    expect(workflow).toContain('node scripts/enterprise-gates/a01-sec01-qa-mfa-provider-proof.mjs');
    expect(runner).toContain('runSupabaseMfaLiveValidation()');
    expect(existing).toContain('export async function runSupabaseMfaLiveValidation()');
    expect(existing).toContain('initial_aal1_not_observed');
    expect(existing).toContain('initialAal1Observed: true');
    expect(existing).toContain("projectRef: readRuntimeSetting('STEP_UP_QA_PROJECT_REF')");
    expect(existing).toContain("executionIntent: readRuntimeSetting('STEP_UP_QA_EXECUTE')");
    expect(runner).not.toMatch(/auth\.admin\.createUser/);
    expect(runner).not.toMatch(/auth\.admin\.deleteUser/);
    expect(runner).toContain("gate: 'NOT_ACCEPTED'");
    expect(runner).toContain("control: 'NOT_VERIFIED'");
    expect(runner).toContain('qa-mfa-provider-evidence.json');
  });
});
