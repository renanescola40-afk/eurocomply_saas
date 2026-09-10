import { describe, expect, it } from 'vitest';

import { BILLING_ADD_ONS } from './add-ons';
import { ADD_ON_CATALOG, getAddOnStatus } from './addons';

describe('add-on catalog adapter', () => {
  it('mirrors canonical ids, monthly values, inclusion and commercial status', () => {
    expect(ADD_ON_CATALOG.map((item) => item.id)).toEqual(BILLING_ADD_ONS.map((item) => item.slug));
    expect(ADD_ON_CATALOG.map((item) => item.priceMonthly)).toEqual(BILLING_ADD_ONS.map((item) => item.priceMonthly));
    expect(ADD_ON_CATALOG.map((item) => item.includedFromPlan)).toEqual(BILLING_ADD_ONS.map((item) => item.includedFrom));
    expect(ADD_ON_CATALOG.map((item) => item.status)).toEqual(BILLING_ADD_ONS.map((item) => item.status));
  });

  it('exposes commercially active add-ons while keeping private-preview authority fail closed', () => {
    const active = ADD_ON_CATALOG.find((item) => item.id === 'regulatory-monitoring-pro');
    const preview = ADD_ON_CATALOG.find((item) => item.id === 'procurement-pack');

    expect(active).toBeDefined();
    expect(preview).toBeDefined();
    expect(getAddOnStatus('starter', active!)).toBe('inactive');
    expect(getAddOnStatus('starter', active!, ['regulatory-monitoring-pro'])).toBe('active');
    expect(getAddOnStatus('professional', active!)).toBe('included');
    expect(getAddOnStatus('enterprise', active!)).toBe('included');
    expect(getAddOnStatus('professional', preview!, ['procurement-pack'])).toBe('preview');
  });
});
