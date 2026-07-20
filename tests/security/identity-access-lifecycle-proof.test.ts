import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/identity-access-lifecycle-proof.yml', 'utf8');
const runtime = readFileSync('scripts/identity/run-identity-access-lifecycle-proof.mjs', 'utf8');
const validator = readFileSync('scripts/identity/check-identity-access-lifecycle-evidence.mjs', 'utf8');

describe('identity access lifecycle megapack', () => {
  it('uses protected manual exact-main execution', () => {
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain('environment: production-identity-proof');
    expect(workflow).toContain('EXECUTE_IDENTITY_LIFECYCLE_PROOF');
    expect(workflow).toContain('persist-credentials: false');
    expect(workflow).not.toContain('pull_request_target');
    expect(workflow).not.toContain('contents: write');
  });

  it('validates the full disposable identity lifecycle', () => {
    for (const token of [
      '/auth/v1/signup','grant_type=password','grant_type=refresh_token','/auth/v1/recover','/auth/v1/logout',
      'sessionRevocationValidated','oauthCallbackFailsClosed','oidcDiscoveryValidated','adminMfaPolicyPresent',
      'sensitiveStepUpPolicyPresent','organizationOnboardingProofPresent','disposableUserCleanup',
    ]) expect(runtime).toContain(token);
  });

  it('keeps canonical evidence free of identity secrets', () => {
    for (const token of ['credentialsStored: false','emailStored: false','tokensStored: false','providerResponsesStored: false']) {
      expect(runtime).toContain(token);
    }
    expect(runtime).not.toContain('email,\n  password');
  });

  it('fails closed unless every identity control is proven', () => {
    for (const token of ['signupValidated','accountRecoveryAccepted','sessionRevocationValidated','adminMfaPolicyPresent','disposableAccountRemoved']) {
      expect(validator).toContain(token);
    }
  });
});
