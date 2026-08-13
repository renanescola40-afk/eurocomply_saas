import { afterEach, describe, expect, it } from 'vitest';

import { getBillingAddOn } from '@/lib/billing/add-ons';
import { resolveBillingAddOnFromStripePriceId } from './add-ons';

const addOn = getBillingAddOn('regulatory-monitoring-pro')!;
const originalMonthly = process.env[addOn.stripePriceEnvKeyMonthly];
const originalAnnual = process.env[addOn.stripePriceEnvKeyAnnual];

afterEach(() => {
  if (originalMonthly === undefined) delete process.env[addOn.stripePriceEnvKeyMonthly];
  else process.env[addOn.stripePriceEnvKeyMonthly] = originalMonthly;

  if (originalAnnual === undefined) delete process.env[addOn.stripePriceEnvKeyAnnual];
  else process.env[addOn.stripePriceEnvKeyAnnual] = originalAnnual;
});

describe('Stripe add-on reverse mapping', () => {
  it('resolves a configured monthly price to the canonical add-on slug', () => {
    process.env[addOn.stripePriceEnvKeyMonthly] = 'price_addon_monthly_contract';

    const resolved = resolveBillingAddOnFromStripePriceId('price_addon_monthly_contract');
    expect(resolved?.addOn.slug).toBe('regulatory-monitoring-pro');
    expect(resolved?.interval).toBe('month');
  });

  it('resolves a configured annual price to the canonical add-on slug', () => {
    process.env[addOn.stripePriceEnvKeyAnnual] = 'price_addon_annual_contract';

    const resolved = resolveBillingAddOnFromStripePriceId('price_addon_annual_contract');
    expect(resolved?.addOn.slug).toBe('regulatory-monitoring-pro');
    expect(resolved?.interval).toBe('year');
  });

  it('fails closed for unknown or blank Stripe prices', () => {
    expect(resolveBillingAddOnFromStripePriceId('price_unknown_contract')).toBeNull();
    expect(resolveBillingAddOnFromStripePriceId('   ')).toBeNull();
    expect(resolveBillingAddOnFromStripePriceId(null)).toBeNull();
  });
});
