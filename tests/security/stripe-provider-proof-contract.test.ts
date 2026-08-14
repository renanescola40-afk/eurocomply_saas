import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const probe = readFileSync('scripts/security/probe-stripe-provider-config.mjs', 'utf8');
const writer = readFileSync('scripts/security/write-stripe-provider-evidence.mjs', 'utf8');
const workflow = readFileSync('.github/workflows/stripe-provider-proof.yml', 'utf8');
const webhookContract = JSON.parse(readFileSync('config/stripe-webhook-contract.json', 'utf8')) as {
  canonicalPath: string;
  productionBaseUrl: string;
  requiredEvents: string[];
};

describe('Stripe provider proof contract', () => {
  it('requires live mode and validates the canonical commercial price ladder', () => {
    expect(probe).toContain("/^(?:sk|rk)_live_/");
    expect(probe).toContain("const CANONICAL_PUBLIC_PLANS = ['essential', 'professional', 'business']");
    expect(probe).toContain("requiredEnv(plan.monthlyPriceEnvKey)");
    expect(probe).toContain("price?.recurring?.interval === 'month'");
    expect(probe).toContain('canonicalPriceMetadataMatches');
    expect(probe).toContain('essentialPriceActive');
    expect(probe).toContain('professionalPriceActive');
    expect(probe).toContain('businessPriceActive');
    expect(probe).not.toContain('enterprisePriceActive');
  });

  it('uses one exact canonical webhook contract including invoice-paid recovery', () => {
    expect(webhookContract.productionBaseUrl).toBe('https://www.risckcomply.com');
    expect(webhookContract.canonicalPath).toBe('/api/stripe/webhook');
    expect(webhookContract.requiredEvents).toEqual([
      'checkout.session.completed',
      'customer.subscription.created',
      'customer.subscription.updated',
      'customer.subscription.deleted',
      'invoice.payment_failed',
      'invoice.paid',
    ]);
    expect(probe).toContain("WEBHOOK_CONTRACT_PATH = 'config/stripe-webhook-contract.json'");
    expect(probe).toContain("endpoint?.url === canonicalWebhookUrl");
    expect(probe).toContain("endpoint?.livemode === true");
    expect(probe).toContain('requiredWebhookEventsPresent');
  });

  it('bounds every Stripe API response before JSON parsing', () => {
    expect(probe).toContain('const MAX_PROVIDER_RESPONSE_BYTES = 64 * 1024');
    expect(probe).toContain("response.headers.get('content-length')");
    expect(probe).toContain('response.body.getReader()');
    expect(probe).toContain('totalBytes > MAX_PROVIDER_RESPONSE_BYTES');
    expect(probe).toContain("reader.cancel('provider_response_too_large')");
    expect(probe).toContain("new TextDecoder('utf-8', { fatal: true })");
    expect(probe).toContain('JSON.parse(text)');
    expect(probe).not.toContain('response.json()');
    expect(probe).toContain('AbortSignal.timeout(15000)');
  });

  it('keeps provider secrets and identifiers out of evidence', () => {
    expect(writer).not.toContain('STRIPE_SECRET_KEY');
    expect(writer).not.toContain('STRIPE_PRICE_ESSENTIAL_MONTHLY');
    expect(writer).not.toContain('STRIPE_PRICE_PROFESSIONAL_MONTHLY');
    expect(writer).not.toContain('STRIPE_PRICE_BUSINESS_MONTHLY');
    expect(writer).toContain('priceIdsStored: false');
    expect(writer).toContain('webhookUrlsStored: false');
    expect(writer).toContain('providerPayloadStored: false');
  });

  it('requires exact main-sha protected provenance with read-only permissions', () => {
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain('environment: production');
    expect(workflow).toContain('contents: read');
    expect(workflow).toContain('persist-credentials: false');
    expect(workflow).toContain('fetch-depth: 0');
    expect(workflow).toContain('git merge-base --is-ancestor "${RELEASE_SHA,,}" origin/main');
    expect(workflow).toContain('git checkout --detach "${RELEASE_SHA,,}"');
    expect(workflow).toContain('STRIPE_PRICE_ESSENTIAL_MONTHLY: ${{ vars.STRIPE_PRICE_ESSENTIAL_MONTHLY }}');
    expect(workflow).toContain('STRIPE_PRICE_PROFESSIONAL_MONTHLY: ${{ vars.STRIPE_PRICE_PROFESSIONAL_MONTHLY }}');
    expect(workflow).toContain('STRIPE_PRICE_BUSINESS_MONTHLY: ${{ vars.STRIPE_PRICE_BUSINESS_MONTHLY }}');
    expect(workflow).not.toContain('STRIPE_PRICE_ENTERPRISE_MONTHLY');
    expect(workflow).not.toContain('pull_request_target');
    expect(writer).toContain("branch !== 'main'");
    expect(writer).toContain('/^[0-9a-f]{40}$/');
  });

  it('does not overclaim end-to-end billing validation', () => {
    expect(writer).toContain('not an end-to-end authenticated checkout');
    expect(writer).toContain('STRIPE_WEBHOOK_SECRET');
    expect(writer).toContain('remain separate runtime acceptance checks');
  });
});
