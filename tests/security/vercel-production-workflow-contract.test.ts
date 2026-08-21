import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const workflow = readFileSync(
  join(process.cwd(), '.github/workflows/vercel-production.yml'),
  'utf8',
);

describe('Vercel production deployment authority', () => {
  it('requires manual dispatch with exact confirmation and never deploys on push', () => {
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain('release_sha:');
    expect(workflow).toContain('confirmation:');
    expect(workflow).toContain('DEPLOY_PRODUCTION');
    expect(workflow).not.toMatch(/^\s{2}push:/m);
  });

  it('accepts only the exact current main tip and reverifies it immediately before deploy', () => {
    expect(workflow).toContain('ref: main');
    expect(workflow).toContain('ref: ${{ inputs.release_sha }}');
    expect(workflow).toContain('test "$(git rev-parse origin/main)" = "${RELEASE_SHA,,}"');
    expect(workflow).toContain('test "$(git rev-parse HEAD)" = "${RELEASE_SHA,,}"');

    const build = workflow.indexOf('Build Vercel production artifact');
    const finalReverify = workflow.indexOf('Reverify current main immediately before production deployment');
    const deployment = workflow.indexOf('Deploy prebuilt artifact to Vercel production');
    expect(build).toBeGreaterThan(-1);
    expect(finalReverify).toBeGreaterThan(build);
    expect(deployment).toBeGreaterThan(finalReverify);

    const finalBoundary = workflow.slice(finalReverify, deployment);
    expect(finalBoundary).toContain('git fetch --no-tags origin main');
    expect(finalBoundary).toContain('test "$(git rev-parse HEAD)" = "${RELEASE_SHA,,}"');
    expect(finalBoundary).toContain('test "$(git rev-parse origin/main)" = "${RELEASE_SHA,,}"');
  });

  it('verifies Production environment governance before the secrets-bearing deployment job', () => {
    const governance = workflow.indexOf('Verify Production environment governance before protected secrets');
    const protectedJob = workflow.indexOf('  deploy-production:');

    expect(governance).toBeGreaterThan(-1);
    expect(protectedJob).toBeGreaterThan(governance);

    const preflight = workflow.slice(0, protectedJob);
    expect(preflight).toContain('GITHUB_TOKEN: ${{ github.token }}');
    expect(preflight).toContain('GITHUB_ENVIRONMENT_NAME: Production');
    expect(preflight).toContain('node scripts/security/check-github-environment-governance.mjs');
    expect(preflight).not.toMatch(/secrets\./);
  });

  it('wires every canonical self-serve Stripe price required by enterprise readiness', () => {
    for (const key of [
      'STRIPE_PRICE_ESSENTIAL_MONTHLY',
      'STRIPE_PRICE_ESSENTIAL_ANNUAL',
      'STRIPE_PRICE_PROFESSIONAL_MONTHLY',
      'STRIPE_PRICE_PROFESSIONAL_ANNUAL',
    ]) {
      expect(workflow).toContain(`${key}: \${{ vars.${key} }}`);
    }

    const enterpriseReadiness = workflow.indexOf('Run enterprise readiness gate');
    expect(enterpriseReadiness).toBeGreaterThan(-1);
    for (const key of [
      'STRIPE_PRICE_ESSENTIAL_MONTHLY',
      'STRIPE_PRICE_ESSENTIAL_ANNUAL',
      'STRIPE_PRICE_PROFESSIONAL_MONTHLY',
      'STRIPE_PRICE_PROFESSIONAL_ANNUAL',
    ]) {
      expect(workflow.indexOf(`${key}:`)).toBeLessThan(enterpriseReadiness);
    }
  });

  it('synchronizes dedicated Step-Up runtime configuration before the production build', () => {
    expect(workflow).toContain('STEP_UP_PROVIDER_MODE: supabase_mfa');
    expect(workflow).toContain(
      "STEP_UP_SIGNING_SECRET: ${{ secrets['STEP_UP_ASSERTION_SIGNING_SECRET'] || secrets['STEP_UP_SIGNING_SECRET'] }}",
    );
    expect(workflow).toContain('Validate dedicated Enterprise Step-Up deployment input');
    expect(workflow).toContain('[ -z "${STEP_UP_SIGNING_SECRET:-}" ]');
    expect(workflow).toContain('[ "$STEP_UP_SIGNING_SECRET" = "$AUDIT_CHAIN_SIGNING_SECRET" ]');

    const initialPull = workflow.indexOf('Link and pull current Vercel production environment');
    const mutationReverify = workflow.indexOf('Reverify current main immediately before production environment mutation');
    const synchronization = workflow.indexOf('Synchronize Enterprise Step-Up runtime configuration to Vercel production');
    const refresh = workflow.indexOf('Refresh Vercel production environment after Step-Up synchronization');
    const build = workflow.indexOf('Build Vercel production artifact');

    expect(initialPull).toBeGreaterThan(-1);
    expect(mutationReverify).toBeGreaterThan(initialPull);
    expect(synchronization).toBeGreaterThan(mutationReverify);
    expect(refresh).toBeGreaterThan(synchronization);
    expect(build).toBeGreaterThan(refresh);

    const mutationBoundary = workflow.slice(mutationReverify, synchronization);
    expect(mutationBoundary).toContain('git fetch --no-tags origin main');
    expect(mutationBoundary).toContain('test "$(git rev-parse HEAD)" = "${RELEASE_SHA,,}"');
    expect(mutationBoundary).toContain('test "$(git rev-parse origin/main)" = "${RELEASE_SHA,,}"');

    const syncBoundary = workflow.slice(synchronization, refresh);
    expect(syncBoundary).toContain('env add STEP_UP_SIGNING_SECRET production --force --sensitive');
    expect(syncBoundary).toContain('env add STEP_UP_PROVIDER_MODE production --force --no-sensitive');
    expect(syncBoundary).toContain('printf \'%s\' "$STEP_UP_SIGNING_SECRET"');
    expect(syncBoundary).toContain('printf \'%s\' "$STEP_UP_PROVIDER_MODE"');
    expect(syncBoundary).not.toContain('echo "$STEP_UP_SIGNING_SECRET"');
  });

  it('uses protected production approval and immutable tool references', () => {
    expect(workflow).toContain('environment: production');
    expect(workflow).toContain(
      'actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0',
    );
    expect(workflow).toContain(
      'actions/setup-node@249970729cb0ef3589644e2896645e5dc5ba9c38',
    );
    expect(workflow).toContain("VERCEL_CLI_VERSION: '56.3.2'");
    expect(workflow).toContain('"vercel@${VERCEL_CLI_VERSION}" deploy --prebuilt --prod');
    expect(workflow).not.toMatch(/actions\/(?:checkout|setup-node)@v\d+/);
    expect(workflow).not.toContain('npx vercel ');
  });

  it('keeps Supabase Auth as the only release identity authority', () => {
    expect(workflow).not.toMatch(/CLERK_/);
    expect(
      existsSync(join(process.cwd(), '.github/workflows/supabase-clerk-org-migration-validation.yml')),
    ).toBe(false);
  });
});
