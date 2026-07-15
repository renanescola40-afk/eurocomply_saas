import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const probe = readFileSync('scripts/security/probe-stripe-provider-config.mjs', 'utf8');
const writer = readFileSync('scripts/security/write-stripe-provider-evidence.mjs', 'utf8');
const workflow = readFileSync('.github/workflows/stripe-provider-proof.yml', 'utf8');

describe('Stripe provider proof contract', () => {
  it('requires test mode and validates active recurring billing catalog prices plus webhook coverage', () => {
    expect(probe).toContain("startsWith('sk_test_')");
    expect(probe).toContain("requiredEnv('STRIPE_PRICE_STARTER_MONTHLY', 'STRIPE_PRICE_STARTER')");
    expect(probe).toContain("requiredEnv('STRIPE_PRICE_GROWTH_MONTHLY', 'STRIPE_PRICE_GROWTH')");
    expect(probe).toContain("requiredEnv('STRIPE_PRICE_ENTERPRISE_MONTHLY', 'STRIPE_PRICE_ENTERPRISE')");
    expect(probe).toContain("price.type === 'recurring'");
    expect(probe).toContain('enterprisePriceActive');
    expect(probe).toContain("'checkout.session.completed'");
    expect(probe).toContain("'invoice.payment_failed'");
  });

  it('keeps provider secrets and identifiers out of evidence', () => {
    expect(writer).not.toContain('STRIPE_SECRET_KEY');
    expect(writer).not.toContain('STRIPE_PRICE_STARTER');
    expect(writer).not.toContain('STRIPE_PRICE_GROWTH');
    expect(writer).not.toContain('STRIPE_PRICE_ENTERPRISE');
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
    expect(workflow).not.toContain('pull_request_target');
    expect(writer).toContain("branch !== 'main'");
    expect(writer).toContain('/^[0-9a-f]{40}$/');
  });

  it('does not overclaim end-to-end billing validation', () => {
    expect(writer).toContain('not an end-to-end authenticated checkout');
    expect(writer).toContain('remain separate runtime acceptance checks');
  });
});
