import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  decodeBase32,
  evaluateStepUpRuntimeEvidence,
  generateTotpCode,
  normalizeProviderHost,
  normalizeSha,
} from '../../scripts/security/run-step-up-mfa-runtime-validation.mjs';

const SHA_A = 'a'.repeat(40);
const SHA_B = 'b'.repeat(40);
const provider = {
  providerMode: 'supabase_mfa',
  hasDedicatedSigningSecret: true,
  hasSupabaseAuth: true,
  hasIdpPolicy: false,
  configured: true,
};
const liveValidation = {
  status: 'Complete',
  attempted: true,
  signedIn: true,
  verifiedFactorAvailable: true,
  challengeCreated: true,
  verificationSucceeded: true,
  aal2Observed: true,
  sessionUserMatched: true,
  signedOut: true,
};

describe('step-up runtime proof integrity', () => {
  it('implements RFC 6238 TOTP generation without storing a generated code', () => {
    const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
    expect(decodeBase32(secret).toString('utf8')).toBe('12345678901234567890');
    expect(generateTotpCode(secret, 59_000, { digits: 8 })).toBe('94287082');
  });

  it('normalizes only full SHAs and safe provider hosts', () => {
    expect(normalizeSha(SHA_A.toUpperCase())).toBe(SHA_A);
    expect(normalizeSha('abc1234')).toBeNull();
    expect(normalizeProviderHost('https://example.supabase.co/auth/v1')).toBe('example.supabase.co');
    expect(normalizeProviderHost('javascript:alert(1)')).toBeNull();
  });

  it('marks evidence Complete only for protected exact-SHA main-branch workflow proof', () => {
    expect(evaluateStepUpRuntimeEvidence({
      sourceFailures: [],
      provider,
      liveValidation,
      expectedSha: SHA_A,
      checkedOutSha: SHA_A,
      expectedBranch: 'main',
      githubActions: true,
      githubRunId: '123456789',
      githubRepository: 'renanescola40-afk/eurocomply_saas',
    })).toMatchObject({
      status: 'Complete',
      outcome: 'passed',
      complete: true,
      checks: {
        exactShaBound: true,
        branchBound: true,
        workflowProvenance: true,
        liveProviderVerificationPassed: true,
      },
    });
  });

  it('fails closed for stale SHA, local execution, missing proof or failed fixture sign-out', () => {
    const stale = evaluateStepUpRuntimeEvidence({
      sourceFailures: [],
      provider,
      liveValidation,
      expectedSha: SHA_A,
      checkedOutSha: SHA_B,
      expectedBranch: 'main',
      githubActions: true,
      githubRunId: '123456789',
      githubRepository: 'renanescola40-afk/eurocomply_saas',
    });
    expect(stale.complete).toBe(false);
    expect(stale.status).toBe('Open');
    expect(stale.checks.exactShaBound).toBe(false);

    const local = evaluateStepUpRuntimeEvidence({
      sourceFailures: [],
      provider,
      liveValidation,
      expectedSha: SHA_A,
      checkedOutSha: SHA_A,
      expectedBranch: 'main',
      githubActions: false,
      githubRunId: '',
      githubRepository: '',
    });
    expect(local.complete).toBe(false);
    expect(local.checks.workflowProvenance).toBe(false);

    const notRun = evaluateStepUpRuntimeEvidence({
      sourceFailures: [],
      provider,
      liveValidation: { status: 'Skipped', attempted: false },
      expectedSha: SHA_A,
      checkedOutSha: SHA_A,
      expectedBranch: 'main',
      githubActions: true,
      githubRunId: '123456789',
      githubRepository: 'renanescola40-afk/eurocomply_saas',
    });
    expect(notRun.complete).toBe(false);
    expect(notRun.outcome).toBe('blocked');

    const sessionNotRevoked = evaluateStepUpRuntimeEvidence({
      sourceFailures: [],
      provider,
      liveValidation: { ...liveValidation, signedOut: false },
      expectedSha: SHA_A,
      checkedOutSha: SHA_A,
      expectedBranch: 'main',
      githubActions: true,
      githubRunId: '123456789',
      githubRepository: 'renanescola40-afk/eurocomply_saas',
    });
    expect(sessionNotRevoked.complete).toBe(false);
    expect(sessionNotRevoked.checks.liveProviderVerificationPassed).toBe(false);
  });

  it('removes manual proof and requires a private live Supabase MFA transaction', () => {
    const script = readFileSync('scripts/security/run-step-up-mfa-runtime-validation.mjs', 'utf8');
    const gate = readFileSync('scripts/security/check-step-up.mjs', 'utf8');
    const workflow = readFileSync('.github/workflows/step-up-runtime-proof.yml', 'utf8');
    const envExample = readFileSync('.env.example', 'utf8');

    expect(script).not.toContain('STEP_UP_RUNTIME_PROVIDER_PROOF');
    expect(gate).not.toContain('STEP_UP_RUNTIME_PROVIDER_PROOF');
    expect(envExample).not.toContain('STEP_UP_RUNTIME_PROVIDER_PROOF');
    expect(script).toContain('signInWithPassword');
    expect(script).toContain('supabase.auth.mfa.listFactors');
    expect(script).toContain('supabase.auth.mfa.challenge');
    expect(script).toContain('supabase.auth.mfa.verify');
    expect(script).toContain('getAuthenticatorAssuranceLevel');
    expect(script).toContain("currentLevel !== 'aal2'");
    expect(script).toContain('supabase.auth.signOut');
    expect(script).toContain('manualBooleanProofAccepted: false');
    expect(script).toContain('rawSecretsStored: false');
    expect(script).toContain('rawUserIdentifiersStored: false');
    expect(script).toContain('factorIdentifiersStored: false');
    expect(script).toContain('challengeIdentifiersStored: false');
    expect(script).not.toContain('createHash');
    expect(script).not.toContain('pseudonymize');
    expect(script).not.toContain('syntheticUserPseudonym');

    expect(gate).toContain("['Complete', 'Open', 'Exception', 'Failed']");
    expect(gate).toContain('isEnterpriseReleaseEnabled');
    expect(gate).toContain('execute the protected Step-Up Runtime Proof workflow');
    expect(gate).toContain('acceptance.fixtureSessionRevoked === true');
    expect(gate).toContain('acceptance.protectedWorkflowProvenance === true');

    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain('environment: production');
    expect(workflow).toContain('permissions:\n  contents: read');
    expect(workflow).toContain('ref: ${{ inputs.release_sha }}');
    expect(workflow).toContain('npm run security:step-up:runtime');
    expect(workflow).not.toContain('pull_request_target');
    expect(workflow).not.toContain('contents: write');
    expect(workflow).not.toContain('STEP_UP_RUNTIME_PROVIDER_PROOF');
  });
});
