import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/production-provider-runtime-proof.yml', 'utf8');
const producer = readFileSync('scripts/security/run-production-provider-runtime-proof.mjs', 'utf8');
const billingProducer = readFileSync('scripts/security/run-stripe-live-billing-provider-proof.mjs', 'utf8');
const priceBindingLoader = readFileSync('scripts/security/load-vercel-stripe-price-bindings.mjs', 'utf8');
const diagnostics = readFileSync('scripts/security/diagnose-production-provider-blockers.mjs', 'utf8');
const targets = JSON.parse(readFileSync('config/production-provider-targets.json', 'utf8')) as {
  schema: string;
  vercel: { teamId: string; projectId: string; projectName: string };
};
const billingCatalog = JSON.parse(readFileSync('config/billing-commercial-catalog.json', 'utf8')) as {
  plans: Record<string, { monthlyPriceEnvKey: string; annualPriceEnvKey: string }>;
};

describe('protected production provider runtime proof', () => {
  it('runs on exact main with the protected Production environment and read-only permissions', () => {
    expect(workflow).toContain('push:\n    branches: [main]');
    expect(workflow).toContain('environment: Production');
    expect(workflow).toContain('needs: production-environment-governance');
    expect(workflow).toContain('contents: read');
    expect(workflow).toContain('actions: read');
    expect(workflow).not.toContain('contents: write');
    expect(workflow).not.toContain('pull_request_target');
    expect(workflow).toContain('/commits/main');
    expect(workflow).toContain('test "$main_sha" = "$TARGET_SHA"');
    expect(workflow).toContain('persist-credentials: false');
  });

  it('checks GitHub, Vercel, Supabase, Stripe and Sentry without persisting provider values', () => {
    for (const provider of ['github', 'vercel', 'supabase', 'stripe', 'sentry']) {
      expect(producer).toContain(`providerEntry('${provider}'`);
    }
    expect(producer).toContain('decrypt=false');
    expect(producer).toContain('providerResponseBodiesStored: false');
    expect(producer).toContain('decryptedProviderEnvironmentValuesStored: false');
    expect(producer).toContain('credentialsStored: false');
    expect(producer).toContain('valuesRedacted: true');
    expect(producer).toContain('CANONICAL_REDACTION_CONFIRMATION');
    expect(producer).toContain('No secret values, tokens, URLs, DSNs, cookies, Authorization headers or customer data are stored.');
    expect(producer).not.toContain('console.log(process.env');
  });

  it('binds non-secret Vercel identity to versioned configuration and keeps only its token secret', () => {
    expect(targets).toEqual({
      schema: 'risck-comply.production-provider-targets.v1',
      vercel: {
        teamId: 'team_wu3LZI6ReFxO16xipv73GLwG',
        projectId: 'prj_APpXAyQFy1Gie50xfbO45zjkyUSm',
        projectName: 'eurocomply-saas',
      },
    });
    expect(workflow).toContain('PROVIDER_TARGETS_PATH: config/production-provider-targets.json');
    expect(workflow).toContain('VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}');
    expect(workflow).not.toContain('VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}');
    expect(workflow).not.toContain('VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}');
    expect(producer).toContain('projectIdentityMatched');
    expect(producer).toContain("body?.name === target.projectName");
    expect(producer).toContain("body?.accountId === target.teamId");
  });

  it('verifies Sentry provider-side client-key availability without requiring a DSN copy in GitHub', () => {
    expect(workflow).not.toContain('NEXT_PUBLIC_SENTRY_DSN: ${{ vars.NEXT_PUBLIC_SENTRY_DSN }}');
    expect(workflow).toContain('SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}');
    expect(producer).toContain('/keys/?status=active');
    expect(producer).toContain('clientKeyInventoryReachable');
    expect(producer).toContain('activeClientKeyPresent');
    expect(producer).toContain('DSN and token not stored');
  });

  it('publishes redacted blocker codes even when the authoritative provider proof fails', () => {
    expect(workflow).toContain('if: always()\n        run: node scripts/security/diagnose-production-provider-blockers.mjs');
    expect(workflow).toContain('release-validation/provider-blocker-diagnostics.json');
    expect(diagnostics).toContain('vercel_api_token_missing');
    expect(diagnostics).toContain('sentry_project_api_unreachable');
    expect(diagnostics).toContain('providerResponseBodiesStored: false');
    expect(diagnostics).toContain('requestUrlsStored: false');
    expect(diagnostics).toContain("category: 'forbidden_or_insufficient_scope'");
    expect(diagnostics).not.toContain('response.text()');
    expect(diagnostics).not.toContain('response.json()');
  });

  it('requires the high-impact Vercel production controls that drive readiness', () => {
    for (const key of [
      'SUPABASE_SERVICE_ROLE_KEY',
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET',
      'UPSTASH_REDIS_REST_URL',
      'UPSTASH_REDIS_REST_TOKEN',
      'HEALTHCHECK_TOKEN',
      'NEXT_PUBLIC_SENTRY_DSN',
      'SENTRY_AUTH_TOKEN',
      'STEP_UP_SIGNING_SECRET',
      'STEP_UP_PROVIDER_MODE',
      'REQUIRE_MALWARE_SCAN_FOR_UPLOADS',
      'MALWARE_SCANNER_PROVIDER',
    ]) {
      expect(producer).toContain(`'${key}'`);
    }
  });

  it('uses actual Vercel Production Stripe Price bindings as authority and rejects parallel GitHub variable truth', () => {
    const canonicalSelfServeKeys = ['essential', 'professional'].flatMap((planId) => [
      billingCatalog.plans[planId].monthlyPriceEnvKey,
      billingCatalog.plans[planId].annualPriceEnvKey,
    ]);
    expect(canonicalSelfServeKeys).toEqual([
      'STRIPE_PRICE_ESSENTIAL_MONTHLY',
      'STRIPE_PRICE_ESSENTIAL_ANNUAL',
      'STRIPE_PRICE_PROFESSIONAL_MONTHLY',
      'STRIPE_PRICE_PROFESSIONAL_ANNUAL',
    ]);
    expect(workflow).toContain('Load canonical Stripe Price bindings from Vercel Production');
    expect(workflow).toContain('run: node scripts/security/load-vercel-stripe-price-bindings.mjs');
    expect(priceBindingLoader).toContain('target=production&decrypt=true');
    expect(priceBindingLoader).toContain('GITHUB_ENV');
    expect(priceBindingLoader).toContain("for (const publicId of ['essential', 'professional'])");
    expect(priceBindingLoader).toContain('plan.monthlyPriceEnvKey');
    expect(priceBindingLoader).toContain('plan.annualPriceEnvKey');
    expect(priceBindingLoader).toContain('legacyStripePriceFallbackAllowed !== false');
    expect(priceBindingLoader).not.toContain('const compatibility =');
    expect(priceBindingLoader).not.toContain('const business = catalog.plans?.business');
    for (const key of canonicalSelfServeKeys) {
      expect(workflow).not.toContain(`${key}: ` + '${{ vars.' + key + ' }}');
      expect(billingProducer).toContain(`'${key}'`);
    }
    expect(workflow).not.toContain('STRIPE_PRICE_STARTER_MONTHLY: ${{ vars.STRIPE_PRICE_STARTER_MONTHLY }}');
    expect(workflow).not.toContain('STRIPE_PRICE_GROWTH_MONTHLY: ${{ vars.STRIPE_PRICE_GROWTH_MONTHLY }}');
    expect(workflow).not.toContain('STRIPE_PRICE_ENTERPRISE_MONTHLY: ${{ vars.STRIPE_PRICE_ENTERPRISE_MONTHLY }}');
    expect(billingProducer).toContain('transitionPolicyRejectsLegacy');
    expect(billingProducer).toContain('fourCanonicalSelfServeBindingsConfigured');
    expect(billingProducer).toContain('fourCanonicalSelfServeBindingsDistinct');
  });

  it('keeps the broad provider Stripe probe on the same four canonical self-serve prices', () => {
    expect(producer).toContain("for (const publicId of ['essential', 'professional'])");
    expect(producer).toContain("for (const cadence of ['monthly', 'annual'])");
    expect(producer).toContain('transitionPolicyRejectsLegacy');
    expect(producer).toContain('legacyMonthlyPriceEnvKeys');
    expect(producer).toContain('legacyAnnualPriceEnvKeys');
    expect(producer).toContain('legacyPriceKeys.every((key) => !env(key))');
    expect(producer).toContain('legacyAliasesRejected');
    expect(producer).toContain('fourCanonicalSelfServeBindingsConfigured');
    expect(producer).toContain('fourCanonicalSelfServePricesVerified');
    expect(producer).toContain("body?.livemode === true");
    expect(producer).toContain("body?.product?.metadata?.catalog_status === 'canonical_live'");
    expect(producer).not.toContain('LEGACY_STRIPE_PRICE_KEYS');
    expect(producer).not.toContain("env('STRIPE_PRICE_STARTER_MONTHLY') ||");
    expect(producer).not.toContain("env('STRIPE_PRICE_GROWTH_MONTHLY') ||");
    expect(producer).not.toContain("env('STRIPE_PRICE_ENTERPRISE_MONTHLY') ||");
    expect(producer).not.toContain('threePriceIdsConfigured');
    expect(producer).not.toContain('billableMonthlyPrices');
  });

  it('uses the versioned Portal contract as the only Portal selector', () => {
    expect(workflow).not.toContain('STRIPE_BILLING_PORTAL_CONFIGURATION_ID');
    expect(billingProducer).not.toContain("env('STRIPE_BILLING_PORTAL_CONFIGURATION_ID')");
    expect(billingProducer).toContain("contractSource = explicitId === null || explicitId === undefined ? 'default' : 'explicit'");
    expect(billingProducer).toContain('configuration?.is_default === true');
  });

  it('gates provider completion on Portal policy, canonical webhook and all six Production Billing bindings', () => {
    expect(workflow).toContain('node --check scripts/security/run-stripe-live-billing-provider-proof.mjs');
    expect(workflow).toContain('node --test tests/enterprise/stripe-live-billing-provider-proof.test.mjs');
    expect(workflow).toContain('run: node scripts/security/run-stripe-live-billing-provider-proof.mjs');
    expect(billingProducer).toContain('billingPortalContractResolvedAndPolicyMatched');
    expect(billingProducer).toContain('canonicalLifecycleWebhookLive');
    expect(billingProducer).toContain('productionBillingBindingKeysPresent');
    expect(billingProducer).toContain('productionWebhookSigningSecretBindingPresent');
    for (const key of [
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET',
      'STRIPE_PRICE_ESSENTIAL_MONTHLY',
      'STRIPE_PRICE_ESSENTIAL_ANNUAL',
      'STRIPE_PRICE_PROFESSIONAL_MONTHLY',
      'STRIPE_PRICE_PROFESSIONAL_ANNUAL',
    ]) {
      expect(billingProducer).toContain(`'${key}'`);
    }
    expect(billingProducer).toContain('decrypt=false');
    expect(billingProducer).toContain('providerResponseBodiesStored: false');
    expect(billingProducer).toContain('stripePriceIdsStored: false');
    expect(billingProducer).toContain('portalConfigurationIdStored: false');
    expect(billingProducer).toContain('webhookEndpointIdStored: false');
  });

  it('stages supplemental billing proof outside the canonical P0 evidence namespace', () => {
    const strictProofIndex = workflow.indexOf('run: node scripts/security/run-stripe-live-billing-provider-proof.mjs');
    const stagingIndex = workflow.indexOf('Stage strict billing provider evidence outside canonical P0 evidence namespace');
    const scannerIndex = workflow.indexOf('run: node scripts/security/check-p0-runtime-evidence-files.mjs');

    expect(strictProofIndex).toBeGreaterThanOrEqual(0);
    expect(stagingIndex).toBeGreaterThan(strictProofIndex);
    expect(scannerIndex).toBeGreaterThan(stagingIndex);
    expect(workflow).toContain('mv docs/security/evidence/runtime/stripe-live-billing-provider-proof.json');
    expect(workflow).toContain('release-validation/stripe-live-billing-provider-proof.json');
  });

  it('fails closed instead of emitting Complete when any provider is blocked', () => {
    expect(producer).toContain("status: allPassed ? 'Complete' : 'Open'");
    expect(producer).toContain("outcome: allPassed ? 'passed' : 'blocked'");
    expect(producer).toContain('if (!allPassed) process.exitCode = 1');
    expect(billingProducer).toContain("status: passed ? 'Complete' : 'Open'");
    expect(billingProducer).toContain("outcome: passed ? 'passed' : 'blocked'");
    expect(billingProducer).toContain("if (evidence.outcome !== 'passed') process.exitCode = 1");
  });
});
