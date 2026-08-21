import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

const canonicalSelfServeStripePrices = [
  'STRIPE_PRICE_ESSENTIAL_MONTHLY',
  'STRIPE_PRICE_ESSENTIAL_ANNUAL',
  'STRIPE_PRICE_PROFESSIONAL_MONTHLY',
  'STRIPE_PRICE_PROFESSIONAL_ANNUAL',
];

const legacyReadinessStripeAliases = [
  'STRIPE_PRICE_STARTER_MONTHLY',
  'STRIPE_PRICE_GROWTH_MONTHLY',
  'STRIPE_PRICE_ENTERPRISE_MONTHLY',
];

describe('production release profiles', () => {
  it('dispatches public and enterprise releases to different preflights and runners', () => {
    const dispatcher = read('scripts/release/run-public-production-release.mjs');

    expect(dispatcher).toContain("releaseTarget === 'enterprise'");
    expect(dispatcher).toContain("import('./check-enterprise-release-env.mjs')");
    expect(dispatcher).toContain("import('./run-public-production-release-v2.mjs')");
    expect(dispatcher).toContain("releaseTarget === 'public-production'");
    expect(dispatcher).toContain("import('./check-public-production-release-env.mjs')");
    expect(dispatcher).toContain("import('./run-public-production-release-final.mjs')");
    expect(dispatcher).toContain("runNodeScript('scripts/release/write-public-production-go-no-go-evidence.mjs')");
    expect(dispatcher).toContain("runNodeScript('scripts/release/validate-public-production-go-no-go-evidence.mjs')");
  });

  it('keeps P0 runtime evidence in the public profile without enterprise-only gates', () => {
    const publicRunner = read('scripts/release/run-public-production-release-final.mjs');

    expect(publicRunner).toContain('npm run security:rls:live');
    expect(publicRunner).toContain('npm run release:deployment-smoke');
    expect(publicRunner).toContain('npm run release:observability-smoke');
    expect(publicRunner).toContain('npm run release:rollback:dry-run');
    expect(publicRunner).toContain('npm run security:p0-runtime-gap:strict');
    expect(publicRunner).not.toContain('write-enterprise-runtime-evidence');
    expect(publicRunner).not.toContain('release:enterprise-runtime-evidence');
    expect(publicRunner).not.toContain("'docs/security/evidence/runtime/release-go-no-go.json',");
    expect(publicRunner).toContain('requiresEnterpriseRuntimeEvidence: false');
    expect(publicRunner).toContain('requiresExternalReviewEvidence: false');
  });

  it('requires the canonical four self-serve Stripe price bindings in the public preflight', () => {
    const publicPreflight = read('scripts/release/check-public-production-release-env.mjs');

    for (const name of canonicalSelfServeStripePrices) {
      expect(publicPreflight).toContain(name);
    }
    for (const name of legacyReadinessStripeAliases) {
      expect(publicPreflight).not.toContain(name);
    }
    expect(publicPreflight).toContain('legacyAliasesAcceptedForReadiness: false');
  });

  it('does not require enterprise-only provider credentials in the public preflight', () => {
    const publicPreflight = read('scripts/release/check-public-production-release-env.mjs');

    expect(publicPreflight).toContain('NEXT_PUBLIC_SENTRY_DSN');
    expect(publicPreflight).not.toContain("hasAll(['SENTRY_ORG', 'SENTRY_PROJECT', 'SENTRY_AUTH_TOKEN'])");
    expect(publicPreflight).not.toContain('MALWARE_SCANNER_PROVIDER');
    expect(publicPreflight).toContain('enterpriseOnlyControlsExcluded');
  });

  it('keeps the public workflow scoped to public artifacts and canonical Stripe credentials', () => {
    const workflow = read('.github/workflows/public-production-final.yml');

    expect(workflow).toContain('RELEASE_TARGET: public-production');
    expect(workflow).toContain("RELEASE_RUN_OBSERVABILITY_SMOKE: 'true'");
    expect(workflow).toContain(
      'grep -Fq "RELEASE_RUN_OBSERVABILITY_SMOKE: \'true\'" .github/workflows/public-production-final.yml',
    );
    expect(workflow).toContain('public-production-release-env-readiness.json');
    expect(workflow).toContain('observability-smoke-validation.json');
    expect(workflow).toContain('write-public-production-go-no-go-evidence.mjs');
    expect(workflow).toContain('validate-public-production-go-no-go-evidence.mjs');
    expect(workflow).not.toContain('enterprise-runtime-evidence.json');
    expect(workflow).not.toContain('SENTRY_AUTH_TOKEN:');
    expect(workflow).not.toContain('RISCK_COMPLY_ENTERPRISE_RELEASE:');

    for (const name of canonicalSelfServeStripePrices) {
      expect(workflow).toMatch(new RegExp(`^\\s+${name}:`, 'm'));
    }
    for (const name of legacyReadinessStripeAliases) {
      expect(workflow).not.toMatch(new RegExp(`^\\s+${name}:`, 'm'));
    }
  });

  it('preserves the enterprise runner as an explicit enterprise profile', () => {
    const dispatcher = read('scripts/release/run-public-production-release.mjs');
    const enterpriseRunner = read('scripts/release/run-public-production-release-v2.mjs');
    const retainedRlsValidator = read('scripts/release/validate-retained-supabase-rls-release-proof.mjs');

    expect(enterpriseRunner).toContain("const releaseTarget = process.env.RELEASE_TARGET || 'enterprise'");
    expect(enterpriseRunner).toContain('enterprise-runtime-evidence.json');
    expect(enterpriseRunner).toContain("RISCK_COMPLY_ENTERPRISE_RELEASE: 'true'");
    expect(enterpriseRunner).toContain('node scripts/release/validate-release-go-no-go-evidence.mjs');
    expect(enterpriseRunner).toContain('node scripts/release/validate-retained-supabase-rls-release-proof.mjs');
    expect(enterpriseRunner).toContain('retainedSupabaseLiveProofRequired: true');
    expect(enterpriseRunner).toContain('releaseRunnerReexecutesSupabaseLiveProof: false');
    expect(enterpriseRunner).not.toContain("['08-security-rls-live', 'npm run security:rls:live'");
    expect(enterpriseRunner).not.toContain('npm run release:go-no-go-evidence');
    expect(retainedRlsValidator).toContain("workflow: 'Supabase Live RLS Validation'");
    expect(retainedRlsValidator).toContain('validateProducerEvidence');
    expect(retainedRlsValidator).toContain('validateReleaseEvidence');
    expect(retainedRlsValidator).toContain('sourceRunBound');
    expect(dispatcher).toContain("runNodeScript('scripts/release/write-enterprise-runtime-evidence.mjs'");
    expect(dispatcher).toContain("FINAL_VALIDATION_IN_PROGRESS: 'false'");
    expect(dispatcher).toContain("runNodeScript('scripts/release/validate-release-go-no-go-evidence.mjs')");
    expect(dispatcher).toContain("runNodeScript('scripts/release/verify-enterprise-evidence-bundle.mjs')");
  });
});
