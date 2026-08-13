import { describe, expect, it } from 'vitest';

import { BILLING_ADD_ONS } from './add-ons';
import { ADD_ON_CATALOG, getAddOnStatus } from './addons';

describe('add-on catalog adapter', () => {
  it('mirrors canonical ids and monthly values', () => {
    expect(ADD_ON_CATALOG.map((item) => item.id)).toEqual(BILLING_ADD_ONS.map((item) => item.slug));
    expect(ADD_ON_CATALOG.map((item) => item.priceMonthly)).toEqual(BILLING_ADD_ONS.map((item) => item.priceMonthly));
  });

  it('preserves plan visibility semantics', () => {
    const base = ADD_ON_CATALOG.find((item) => item.id === 'regulatory-monitoring-pro');
    const pro = ADD_ON_CATALOG.find((item) => item.id === 'procurement-pack');

    expect(base).toBeDefined();
    expect(pro).toBeDefined();
    expect(getAddOnStatus('enterprise', base!)).toBe('included');
    expect(getAddOnStatus('starter', base!)).toBe('inactive');
    expect(getAddOnStatus('starter', pro!)).toBe('blocked');
  });
});
