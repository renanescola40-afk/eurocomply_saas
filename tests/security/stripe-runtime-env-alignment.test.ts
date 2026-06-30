import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const envExample = readFileSync(join(process.cwd(), '.env.example'), 'utf8');
const runtimeEnv = readFileSync(join(process.cwd(), 'src/lib/security/env.ts'), 'utf8');
const opsSmoke = readFileSync(join(process.cwd(), 'src/app/api/ops/smoke/route.ts'), 'utf8');

describe('Stripe runtime env alignment', () => {
  it('documents canonical Stripe price envs for Vercel production setup', () => {
    expect(envExample).toContain('STRIPE_PRICE_STARTER_MONTHLY=');
    expect(envExample).toContain('STRIPE_PRICE_GROWTH_MONTHLY=');
    expect(envExample).toContain('STRIPE_PRICE_ENTERPRISE_MONTHLY=');
    expect(envExample).toContain('RISCK_COMPLY_PAID_BILLING_REQUIRED=false');
    expect(envExample).toContain('Set RISCK_COMPLY_PAID_BILLING_REQUIRED=true before selling paid plans.');
  });

  it('uses canonical Stripe price envs in runtime validation', () => {
    expect(runtimeEnv).toContain("envName('STRIPE', 'PRICE', 'STARTER', 'MONTHLY')");
    expect(runtimeEnv).toContain("envName('STRIPE', 'PRICE', 'GROWTH', 'MONTHLY')");
    expect(runtimeEnv).toContain("envName('STRIPE', 'PRICE', 'ENTERPRISE', 'MONTHLY')");
    expect(runtimeEnv).toContain('process.env.STRIPE_PRICE_ESSENTIAL_MONTHLY');
    expect(runtimeEnv).toContain('process.env.STRIPE_PRICE_BUSINESS_ENTERPRISE_MONTHLY');
  });

  it('uses canonical Stripe price envs in ops smoke checks with legacy fallback only', () => {
    expect(opsSmoke).toContain("'STRIPE_PRICE_STARTER_MONTHLY'");
    expect(opsSmoke).toContain("'STRIPE_PRICE_GROWTH_MONTHLY'");
    expect(opsSmoke).toContain("'STRIPE_PRICE_ENTERPRISE_MONTHLY'");
    expect(opsSmoke).toContain('LEGACY_STRIPE_PRICE_FALLBACKS');
    expect(opsSmoke).toContain('hasRequiredEnv');
  });
});
