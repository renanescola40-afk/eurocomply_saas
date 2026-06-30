import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const preflight = readFileSync(join(process.cwd(), 'scripts/preflight.mjs'), 'utf8');

describe('Stripe production preflight env contract', () => {
  it('uses canonical billing plan price envs for release readiness', () => {
    expect(preflight).toContain("env('STRIPE', 'PRICE', 'STARTER', 'MONTHLY')");
    expect(preflight).toContain("env('STRIPE', 'PRICE', 'GROWTH', 'MONTHLY')");
    expect(preflight).toContain("env('STRIPE', 'PRICE', 'ENTERPRISE', 'MONTHLY')");
  });

  it('keeps legacy Stripe price envs only as backwards-compatible fallbacks', () => {
    expect(preflight).toContain("starter: [stripePriceStarterEnv, env('STRIPE', 'PRICE', 'ESSENTIAL', 'MONTHLY')]");
    expect(preflight).toContain("growth: [stripePriceGrowthEnv, env('STRIPE', 'PRICE', 'PROFESSIONAL', 'MONTHLY'), env('STRIPE', 'PRICE', 'BUSINESS', 'MONTHLY')]");
    expect(preflight).toContain("enterprise: [stripePriceEnterpriseEnv, env('STRIPE', 'PRICE', 'BUSINESS', 'ENTERPRISE', 'MONTHLY')]");
    expect(preflight).toContain('is using legacy env');
  });

  it('fails production billing preflight when paid billing is required but Stripe is incomplete', () => {
    expect(preflight).toContain("env('RISCK', 'COMPLY', 'PAID', 'BILLING', 'REQUIRED')");
    expect(preflight).toContain('paidBillingRequired');
    expect(preflight).toContain('Paid billing release requires');
    expect(preflight).toContain('Stripe billing plans missing price envs');
    expect(preflight).toContain('process.exitCode = 1');
  });
});
