import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const probe = readFileSync('scripts/security/probe-stripe-provider-config.mjs', 'utf8');
const writer = readFileSync('scripts/security/write-stripe-provider-evidence.mjs', 'utf8');
const workflow = readFileSync('.github/workflows/stripe-provider-proof.yml', 'utf8');

describe('Stripe provider proof contract', () => {
  it('requires test mode and validates active recurring prices plus webhook coverage', () => {
    expect(probe).toContain("startsWith('sk_test_')");
    expect(probe).toContain("starter.type === 'recurring'");
    expect(probe).toContain("growth.type === 'recurring'");
    expect(probe).toContain("'checkout.session.completed'");
    expect(probe).toContain("'invoice.payment_failed'");
  });

  it('keeps provider secrets and identifiers out of evidence', () => {
    expect(writer).not.toContain('STRIPE_SECRET_KEY');
    expect(writer).not.toContain('STRIPE_PRICE_STARTER');
    expect(writer).not.toContain('STRIPE_PRICE_GROWTH');
    expect(writer).toContain('priceIdsStored: false');
    expect(writer).toContain('webhookUrlsStored: false');
    expect(writer).toContain('providerPayloadStored: false');
  });

  it('requires exact-sha protected provenance with read-only permissions', () => {
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain('environment: production');
    expect(workflow).toContain('contents: read');
    expect(workflow).toContain('persist-credentials: false');
    expect(workflow).not.toContain('pull_request_target');
    expect(writer).toContain("branch !== 'main'");
    expect(writer).toContain('/^[0-9a-f]{40}$/');
  });

  it('does not overclaim end-to-end billing validation', () => {
    expect(writer).toContain('not an end-to-end authenticated checkout');
    expect(writer).toContain('remain separate runtime acceptance checks');
  });
});
