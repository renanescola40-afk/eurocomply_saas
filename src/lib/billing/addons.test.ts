import { describe, expect, it } from 'vitest';

import { BILLING_ADD_ONS } from './add-ons';
import { ADD_ON_CATALOG, getAddOnStatus } from './addons';

describe('add-on catalog adapter', () => {
  it('mirrors canonical ids, monthly values and commercial status', () => {
    expect(ADD_ON_CATALOG.map((item) => item.id)).toEqual(BILLING_ADD_ONS.map((item) => item.slug));
    expect(ADD_ON_CATALOG.map((item) => item.priceMonthly)).toEqual(BILLING_ADD_ONS.map((item) => item.priceMonthly));
    expect(ADD_ON_CATALOG.map((item) => item.status)).toEqual(BILLING_ADD_ONS.map((item) => item.status));
  });

  it('keeps private-preview authority fail closed across every plan and stale active row', () => {
    const base = ADD_ON_CATALOG.find((item) => item.id === 'regulatory-monitoring-pro');
    const pro = ADD_ON_CATALOG.find((item) => item.id === 'procurement-pack');

    expect(base).toBeDefined();
    expect(pro).toBeDefined();
    expect(getAddOnStatus('enterprise', base!)).toBe('preview');
    expect(getAddOnStatus('starter', base!)).toBe('preview');
    expect(getAddOnStatus('professional', pro!, ['procurement-pack'])).toBe('preview');
  });
});
