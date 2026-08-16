import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const publicFinal = readFileSync('.github/workflows/public-production-final.yml', 'utf8');
const releaseFinal = readFileSync('.github/workflows/release-final-validation.yml', 'utf8');

const GOVERNANCE_CHECK = 'node scripts/security/check-github-environment-governance.mjs';
const PINNED_CHECKOUT = 'actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0';
const PINNED_SETUP_NODE = 'actions/setup-node@249970729cb0ef3589644e2896645e5dc5ba9c38';

function expectProductionPreflight(workflow: string, protectedJobName: string) {
  expect(workflow).toContain('production-environment-governance:');
  expect(workflow).toContain('GITHUB_ENVIRONMENT_NAME: Production');
  expect(workflow).toContain("REQUIRE_PROTECTED_BRANCHES: 'true'");
  expect(workflow).toContain(GOVERNANCE_CHECK);
  expect(workflow).toContain('test "$GITHUB_REF_NAME" = "main"');
  expect(workflow).toContain('/commits/main');
  expect(workflow).toContain(`${protectedJobName}:`);
  expect(workflow).toContain('needs: production-environment-governance');
  expect(workflow).toContain(PINNED_CHECKOUT);
  expect(workflow).toContain(PINNED_SETUP_NODE);
}

describe('final production workflow governance boundary', () => {
  it('keeps public production secrets behind exact-main environment governance', () => {
    expectProductionPreflight(publicFinal, 'production-final');

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

    expect(publicFinal).toContain('Revalidate exact current main after environment approval');
    expect(publicFinal).toContain('test "$main_sha" = "$GITHUB_SHA"');
  });

  it('rejects historical assessed commits before final validation secrets are available', () => {
    expectProductionPreflight(releaseFinal, 'final-validation');

    expect(releaseFinal).toContain('historical commits are rejected');
    expect(releaseFinal).toContain('test "$ASSESSED_COMMIT_INPUT" = "$TARGET_SHA"');
    expect(releaseFinal).toContain('ref: ${{ github.sha }}');
    expect(releaseFinal).toContain('test "$MAIN_COMMIT" = "$GITHUB_SHA"');
    expect(releaseFinal).not.toContain('git checkout --detach "$RESOLVED_COMMIT"');
    expect(releaseFinal).not.toContain('git fetch --no-tags --prune origin "$ASSESSED_COMMIT" || true');
  });
});
