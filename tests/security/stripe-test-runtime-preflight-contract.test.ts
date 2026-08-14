import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/stripe-test-runtime-preflight.yml', 'utf8');
const preflight = readFileSync('scripts/enterprise/run-stripe-test-runtime-preflight.mjs', 'utf8');
const primaryRoute = readFileSync('src/app/api/stripe/webhook/route.ts', 'utf8');
const legacyRoute = readFileSync('src/app/api/billing/webhook/route.ts', 'utf8');
const recovery = readFileSync('src/server/billing/stripe-webhook-recovery.ts', 'utf8');
const webhookContract = JSON.parse(readFileSync('config/stripe-webhook-contract.json', 'utf8')) as {
  canonicalPath: string;
  requiredEvents: string[];
};

describe('Stripe test runtime preflight contract', () => {
  it('is manual, exact-SHA, staging-only and explicitly confirmed', () => {
    expect(workflow).toContain('name: Stripe Test Runtime Preflight');
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).not.toContain('pull_request:');
    expect(workflow).not.toContain('push:');
    expect(workflow).toContain('environment: staging');
    expect(workflow).toContain("test \"$CONFIRMATION\" = 'PREFLIGHT_STRIPE_TEST_RUNTIME'");
    expect(workflow).toContain('test "$main_sha" = "${RELEASE_SHA,,}"');
    expect(workflow).toContain("case \"$STRIPE_SECRET_KEY\" in sk_test_*)");
    expect(workflow).toContain('production host is forbidden for Stripe test runtime preflight');
  });

  it('uses the canonical Essential Professional and Business price contract', () => {
    expect(preflight).toContain("const CANONICAL_PUBLIC_PLANS = ['essential', 'professional', 'business']");
    expect(preflight).toContain("COMMERCIAL_CATALOG_PATH = 'config/billing-commercial-catalog.json'");
    expect(preflight).toContain("required(plan.monthlyPriceEnvKey)");
    expect(preflight).toContain('canonicalPriceMetadataMatches');
    expect(workflow).toContain('STRIPE_PRICE_ESSENTIAL_MONTHLY:');
    expect(workflow).toContain('STRIPE_PRICE_PROFESSIONAL_MONTHLY:');
    expect(workflow).toContain('STRIPE_PRICE_BUSINESS_MONTHLY:');
    expect(workflow).not.toContain('STRIPE_PRICE_ENTERPRISE_MONTHLY:');
  });

  it('uses the exact staging webhook URL read-only and requires invoice-paid recovery coverage', () => {
    expect(webhookContract.canonicalPath).toBe('/api/stripe/webhook');
    expect(webhookContract.requiredEvents).toContain('invoice.payment_failed');
    expect(webhookContract.requiredEvents).toContain('invoice.paid');
    expect(preflight).toContain("WEBHOOK_CONTRACT_PATH = 'config/stripe-webhook-contract.json'");
    expect(preflight).toContain("const canonicalWebhookUrl = `${targetBaseUrl}${webhookContract.canonicalPath}`;");
    expect(preflight).toContain("stripe('/webhook_endpoints?limit=100', stripeSecretKey)");
    expect(preflight).toContain("endpoint?.url === canonicalWebhookUrl && endpoint?.status === 'enabled' && endpoint?.livemode === false");
    expect(preflight).toContain('requiredWebhookEventsPresent');
    expect(recovery).toContain("'invoice.paid'");
    expect(preflight).not.toContain("method: 'POST'");
    expect(preflight).not.toContain("method: 'DELETE'");
  });

  it('cannot be promoted as completed billing runtime evidence', () => {
    expect(preflight).toContain("id: 'stripe-test-runtime-preflight'");
    expect(preflight).toContain('mutationPerformed: false');
    expect(preflight).toContain('p0PromotionPerformed: false');
    expect(preflight).toContain('It does not create Stripe objects, deliver an entitlement event, prove database mutation, or close billing runtime evidence.');
    expect(workflow).not.toContain('promote-stripe-runtime-evidence.mjs');
    expect(workflow).not.toContain('stripe-billing-validation.json');
  });

  it('binds both production webhook routes to the configured Stripe provider mode before dispatch', () => {
    for (const route of [primaryRoute, legacyRoute]) {
      const modeCheck = route.indexOf('validateStripeWebhookEventMode(event)');
      const receivedAudit = route.indexOf("action: 'webhook_received', event");
      expect(modeCheck).toBeGreaterThan(-1);
      expect(receivedAudit).toBeGreaterThan(modeCheck);
      expect(route).toContain('reason: mode.reason');
      expect(route).toContain("'webhook_mode_mismatch'");
      expect(route).toContain("'webhook_mode_not_configured'");
    }
  });
});
