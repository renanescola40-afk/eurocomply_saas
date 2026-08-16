import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const publicFinal = readFileSync('.github/workflows/public-production-final.yml', 'utf8');
const releaseFinal = readFileSync('.github/workflows/release-final-validation.yml', 'utf8');
const platformProviders = readFileSync('.github/workflows/platform-providers-runtime-proof.yml', 'utf8');
const platformDrift = readFileSync('.github/workflows/platform-evidence-drift.yml', 'utf8');
const scimProof = readFileSync('.github/workflows/scim-runtime-proof.yml', 'utf8');
const samlProof = readFileSync('.github/workflows/saml-sso-runtime-proof.yml', 'utf8');
const googleProof = readFileSync('.github/workflows/google-oauth-provider-proof.yml', 'utf8');
const stripeProof = readFileSync('.github/workflows/stripe-provider-proof.yml', 'utf8');

const GOVERNANCE_CHECK = 'node scripts/security/check-github-environment-governance.mjs';
const PINNED_CHECKOUT = 'actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0';

function expectGovernanceBoundary(
  workflow: string,
  governanceJobName: string,
  environmentName: string,
  protectedJobName: string,
) {
  expect(workflow).toContain(`${governanceJobName}:`);
  expect(workflow).toContain(`GITHUB_ENVIRONMENT_NAME: ${environmentName}`);
  expect(workflow).toContain("REQUIRE_PROTECTED_BRANCHES: 'true'");
  expect(workflow).toContain(GOVERNANCE_CHECK);
  expect(workflow).toContain('test "$GITHUB_REF_NAME" = "main"');
  expect(workflow).toContain('/commits/main');
  expect(workflow).toContain(`${protectedJobName}:`);
  expect(workflow).toContain(PINNED_CHECKOUT);
  expect(workflow).toContain('Revalidate exact current main after environment approval');
}

function expectExactInputSha(workflow: string) {
  expect(workflow).toContain('test "$GITHUB_SHA" = "$TARGET_SHA"');
  expect(workflow).not.toContain('git merge-base --is-ancestor');
}

describe('final production workflow governance boundary', () => {
  it('keeps public production secrets behind exact-main environment governance', () => {
    expectGovernanceBoundary(publicFinal, 'production-environment-governance', 'Production', 'production-final');
    expect(publicFinal).toContain('needs: production-environment-governance');

    const [unprotectedBoundary, protectedBoundary] = publicFinal.split('\n  production-final:\n');
    expect(unprotectedBoundary).toBeDefined();
    expect(protectedBoundary).toBeDefined();

    for (const secretName of [
      'HEALTHCHECK_TOKEN',
      'SUPABASE_SERVICE_ROLE_KEY',
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET',
      'UPSTASH_REDIS_REST_TOKEN',
      'NEXT_PUBLIC_SENTRY_DSN',
    ]) {
      expect(unprotectedBoundary).not.toContain(`secrets.${secretName}`);
      expect(protectedBoundary).toContain(`secrets.${secretName}`);
    }

    expect(publicFinal).toContain('test "$main_sha" = "$GITHUB_SHA"');
  });

  it('rejects historical assessed commits before final validation secrets are available', () => {
    expectGovernanceBoundary(releaseFinal, 'production-environment-governance', 'Production', 'final-validation');
    expect(releaseFinal).toContain('needs: production-environment-governance');
    expect(releaseFinal).toContain('historical commits are rejected');
    expect(releaseFinal).toContain('test "$ASSESSED_COMMIT_INPUT" = "$TARGET_SHA"');
    expect(releaseFinal).toContain('ref: ${{ github.sha }}');
    expect(releaseFinal).toContain('test "$MAIN_COMMIT" = "$GITHUB_SHA"');
    expect(releaseFinal).not.toContain('git checkout --detach "$RESOLVED_COMMIT"');
    expect(releaseFinal).not.toContain('git fetch --no-tags --prune origin "$ASSESSED_COMMIT" || true');
  });

  it('keeps platform provider credentials behind exact-main environment governance', () => {
    expectGovernanceBoundary(
      platformProviders,
      'platform-proof-environment-governance',
      'production-platform-proof',
      'validate',
    );
    expect(platformProviders).toContain('needs: platform-proof-environment-governance');
    expectExactInputSha(platformProviders);
  });

  it('guards scheduled platform drift evidence before the protected source is materialized', () => {
    expectGovernanceBoundary(
      platformDrift,
      'platform-closeout-environment-governance',
      'production-platform-closeout',
      'protected-drift-check',
    );
    expect(platformDrift).toContain('needs: [contract, platform-closeout-environment-governance]');

    const [preflightBoundary, protectedBoundary] = platformDrift.split('\n  protected-drift-check:\n');
    expect(preflightBoundary).not.toContain('secrets.PLATFORM_FINAL_RELEASE_EVIDENCE_JSON');
    expect(protectedBoundary).toContain('secrets.PLATFORM_FINAL_RELEASE_EVIDENCE_JSON');
  });

  it('keeps SCIM proof credentials behind protected identity governance', () => {
    expectGovernanceBoundary(scimProof, 'identity-environment-governance', 'production-identity-proof', 'scim-runtime-proof');
    expect(scimProof).toContain('needs: identity-environment-governance');
    expectExactInputSha(scimProof);
    const [preflightBoundary, protectedBoundary] = scimProof.split('\n  scim-runtime-proof:\n');
    expect(preflightBoundary).not.toContain('secrets.SCIM_PROOF_BEARER_TOKEN');
    expect(protectedBoundary).toContain('secrets.SCIM_PROOF_BEARER_TOKEN');
  });

  it('keeps SAML proof credentials behind protected identity governance', () => {
    expectGovernanceBoundary(samlProof, 'identity-environment-governance', 'production-identity-proof', 'saml-sso-runtime-proof');
    expect(samlProof).toContain('needs: identity-environment-governance');
    expectExactInputSha(samlProof);
    const [preflightBoundary, protectedBoundary] = samlProof.split('\n  saml-sso-runtime-proof:\n');
    expect(preflightBoundary).not.toContain('secrets.SUPABASE_SERVICE_ROLE_KEY');
    expect(protectedBoundary).toContain('secrets.SUPABASE_SERVICE_ROLE_KEY');
  });

  it('requires exact current main before Google OAuth provider secrets', () => {
    expectGovernanceBoundary(googleProof, 'production-environment-governance', 'Production', 'validate-provider');
    expect(googleProof).toContain('needs: production-environment-governance');
    expectExactInputSha(googleProof);
    expect(googleProof).toContain('npm ci --ignore-scripts');
    expect(googleProof).not.toContain('ref: main');
  });

  it('requires exact current main before Stripe provider secrets', () => {
    expectGovernanceBoundary(stripeProof, 'production-environment-governance', 'Production', 'validate-stripe-provider');
    expect(stripeProof).toContain('needs: production-environment-governance');
    expectExactInputSha(stripeProof);
    expect(stripeProof).not.toContain('git checkout --detach');
  });
});
