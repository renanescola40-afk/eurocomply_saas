import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/enterprise-production-gate.yml', 'utf8');
const preflight = readFileSync('scripts/release/check-enterprise-release-env.mjs', 'utf8');

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

function productionValidationEnvBlock() {
  const jobStart = workflow.indexOf('  production-release-validation:');
  expect(jobStart).toBeGreaterThanOrEqual(0);

  const stepsStart = workflow.indexOf('\n    steps:', jobStart);
  expect(stepsStart).toBeGreaterThan(jobStart);

  return workflow.slice(jobStart, stepsStart);
}

describe('enterprise production provider environment wiring', () => {
  it('binds the production runtime job to the protected Production environment', () => {
    const job = productionValidationEnvBlock();
    expect(job).toContain('environment: Production');
    expect(job).toContain("RISCK_COMPLY_ENTERPRISE_RELEASE: 'true'");
  });

  it('forces a real authenticated observability smoke for enterprise release evidence', () => {
    const job = productionValidationEnvBlock();
    expect(job).toContain("RELEASE_RUN_OBSERVABILITY_SMOKE: 'true'");
    expect(job).not.toContain('RELEASE_RUN_OBSERVABILITY_SMOKE: ${{ vars.');
    expect(job).not.toContain('RELEASE_RUN_OBSERVABILITY_SMOKE: ${{ secrets.');
    expect(workflow).toContain(
      'grep -Fq "RELEASE_RUN_OBSERVABILITY_SMOKE: \'true\'" .github/workflows/enterprise-production-gate.yml',
    );
  });

  it('passes every provider group required by the fail-closed enterprise preflight', () => {
    const job = productionValidationEnvBlock();
    const requiredBindings = [
      'RELEASE_DEPLOYMENT_URL',
      'RELEASE_PRODUCTION_URL',
      'HEALTHCHECK_TOKEN',
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET',
      ...canonicalSelfServeStripePrices,
      'UPSTASH_REDIS_REST_URL',
      'UPSTASH_REDIS_REST_TOKEN',
      'NEXT_PUBLIC_SENTRY_DSN',
      'SENTRY_DSN',
      'SENTRY_ORG',
      'SENTRY_PROJECT',
      'SENTRY_AUTH_TOKEN',
      'RELEASE_ROLLBACK_TARGET',
      'LAST_KNOWN_GOOD_DEPLOYMENT_URL',
      'RELEASE_ROLLBACK_TARGET_SHA',
      'LAST_KNOWN_GOOD_COMMIT_SHA',
      'RELEASE_ROLLBACK_TARGET_VALIDATED',
      'MALWARE_SCANNER_PROVIDER',
      'MALWARE_SCANNER_URL',
      'MALWARE_SCANNER_ENDPOINT',
      'MALWARE_SCANNER_ALLOWED_HOSTS',
      'MALWARE_SCANNER_CLAMAV_HOST',
      'MALWARE_SCANNER_CLAMAV_PORT',
    ];

    for (const name of requiredBindings) {
      expect(job, `${name} must be wired into production-release-validation`).toMatch(
        new RegExp(`^\\s+${name}:`, 'm'),
      );
      expect(preflight, `${name} must remain part of the release preflight contract`).toContain(name);
    }

    for (const name of legacyReadinessStripeAliases) {
      expect(job).not.toMatch(new RegExp(`^\\s+${name}:`, 'm'));
      expect(preflight).not.toContain(name);
    }
    expect(preflight).toContain('legacyAliasesAcceptedForReadiness: false');
  });

  it('keeps provider credentials in GitHub secrets while allowing documented non-secret variable fallbacks', () => {
    const job = productionValidationEnvBlock();

    for (const binding of [
      'HEALTHCHECK_TOKEN: ${{ secrets.HEALTHCHECK_TOKEN }}',
      'STRIPE_SECRET_KEY: ${{ secrets.STRIPE_SECRET_KEY }}',
      'STRIPE_WEBHOOK_SECRET: ${{ secrets.STRIPE_WEBHOOK_SECRET }}',
      'UPSTASH_REDIS_REST_URL: ${{ secrets.UPSTASH_REDIS_REST_URL }}',
      'UPSTASH_REDIS_REST_TOKEN: ${{ secrets.UPSTASH_REDIS_REST_TOKEN }}',
      'SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}',
      'MALWARE_SCANNER_API_KEY: ${{ secrets.MALWARE_SCANNER_API_KEY }}',
      'CLOUDMERSIVE_API_KEY: ${{ secrets.CLOUDMERSIVE_API_KEY }}',
    ]) {
      expect(job).toContain(binding);
    }

    for (const binding of [
      'STRIPE_PRICE_ESSENTIAL_MONTHLY: ${{ vars.STRIPE_PRICE_ESSENTIAL_MONTHLY || secrets.STRIPE_PRICE_ESSENTIAL_MONTHLY }}',
      'STRIPE_PRICE_ESSENTIAL_ANNUAL: ${{ vars.STRIPE_PRICE_ESSENTIAL_ANNUAL || secrets.STRIPE_PRICE_ESSENTIAL_ANNUAL }}',
      'STRIPE_PRICE_PROFESSIONAL_MONTHLY: ${{ vars.STRIPE_PRICE_PROFESSIONAL_MONTHLY || secrets.STRIPE_PRICE_PROFESSIONAL_MONTHLY }}',
      'STRIPE_PRICE_PROFESSIONAL_ANNUAL: ${{ vars.STRIPE_PRICE_PROFESSIONAL_ANNUAL || secrets.STRIPE_PRICE_PROFESSIONAL_ANNUAL }}',
      'SENTRY_ORG: ${{ vars.SENTRY_ORG || secrets.SENTRY_ORG }}',
      'RELEASE_ROLLBACK_TARGET_VALIDATED: ${{ vars.RELEASE_ROLLBACK_TARGET_VALIDATED || secrets.RELEASE_ROLLBACK_TARGET_VALIDATED }}',
      'MALWARE_SCANNER_PROVIDER: ${{ vars.MALWARE_SCANNER_PROVIDER || secrets.MALWARE_SCANNER_PROVIDER }}',
    ]) {
      expect(job).toContain(binding);
    }
  });
});
