import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const envExample = readFileSync(join(process.cwd(), '.env.example'), 'utf8');
const runtimeEnv = readFileSync(join(process.cwd(), 'src/lib/security/env.ts'), 'utf8');
const opsSmoke = readFileSync(join(process.cwd(), 'src/app/api/ops/smoke/route.ts'), 'utf8');
const commercialCatalog = readFileSync(join(process.cwd(), 'config/billing-commercial-catalog.json'), 'utf8');

describe('Stripe runtime env alignment', () => {
  it('documents canonical commercial Stripe price envs before legacy compatibility keys', () => {
    expect(envExample).toContain('STRIPE_PRICE_ESSENTIAL_MONTHLY=');
    expect(envExample).toContain('STRIPE_PRICE_ESSENTIAL_ANNUAL=');
    expect(envExample).toContain('STRIPE_PRICE_PROFESSIONAL_MONTHLY=');
    expect(envExample).toContain('STRIPE_PRICE_PROFESSIONAL_ANNUAL=');
    expect(envExample).toContain('STRIPE_PRICE_BUSINESS_MONTHLY=');
    expect(envExample).toContain('STRIPE_PRICE_BUSINESS_ANNUAL=');
    expect(envExample).toContain('STRIPE_PRICE_STARTER_MONTHLY=');
    expect(envExample.indexOf('STRIPE_PRICE_ESSENTIAL_MONTHLY='))
      .toBeLessThan(envExample.indexOf('STRIPE_PRICE_STARTER_MONTHLY='));
    expect(envExample).toContain('Enterprise has no fixed generic public Price requirement');
    expect(envExample).toContain('RISCK_COMPLY_PAID_BILLING_REQUIRED=false');
  });

  it('requires all canonical self-serve Essential and Professional prices in global runtime validation', () => {
    expect(runtimeEnv).toContain("envName('STRIPE', 'PRICE', 'ESSENTIAL', 'MONTHLY')");
    expect(runtimeEnv).toContain("envName('STRIPE', 'PRICE', 'ESSENTIAL', 'ANNUAL')");
    expect(runtimeEnv).toContain("envName('STRIPE', 'PRICE', 'PROFESSIONAL', 'MONTHLY')");
    expect(runtimeEnv).toContain("envName('STRIPE', 'PRICE', 'PROFESSIONAL', 'ANNUAL')");
    expect(runtimeEnv).not.toContain('process.env.STRIPE_PRICE_STARTER_MONTHLY');
    expect(runtimeEnv).not.toContain('process.env.STRIPE_PRICE_STARTER_ANNUAL');
    expect(runtimeEnv).not.toContain('process.env.STRIPE_PRICE_GROWTH_MONTHLY');
    expect(runtimeEnv).not.toContain('process.env.STRIPE_PRICE_GROWTH_ANNUAL');
    expect(runtimeEnv).not.toContain("envName('STRIPE', 'PRICE', 'ENTERPRISE', 'MONTHLY')");
    expect(runtimeEnv).not.toContain('process.env.STRIPE_PRICE_BUSINESS_MONTHLY ||');
  });

  it('uses the same canonical self-serve requirement in protected ops smoke', () => {
    expect(opsSmoke).toContain('billingCommercialCatalog.plans.essential.monthlyPriceEnvKey');
    expect(opsSmoke).toContain('billingCommercialCatalog.plans.essential.annualPriceEnvKey');
    expect(opsSmoke).toContain('billingCommercialCatalog.plans.professional.monthlyPriceEnvKey');
    expect(opsSmoke).toContain('billingCommercialCatalog.plans.professional.annualPriceEnvKey');
    expect(opsSmoke).not.toContain('LEGACY_STRIPE_PRICE_FALLBACKS');
    expect(opsSmoke).not.toContain('STRIPE_PRICE_STARTER_MONTHLY');
    expect(opsSmoke).not.toContain('STRIPE_PRICE_GROWTH_MONTHLY');
    expect(opsSmoke).not.toContain("'STRIPE_PRICE_ENTERPRISE_MONTHLY'");
    expect(opsSmoke).not.toContain("'STRIPE_PRICE_BUSINESS_MONTHLY'");
  });

  it('keeps Business canonical provider proof separate from application readiness', () => {
    expect(commercialCatalog).toContain('"monthlyPriceEnvKey": "STRIPE_PRICE_BUSINESS_MONTHLY"');
    expect(commercialCatalog).toContain('"salesLed": true');
    expect(commercialCatalog).toContain('"fixedPublicStripePriceRequired": false');
  });
});
