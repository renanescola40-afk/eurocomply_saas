import { describe, expect, it } from 'vitest';

import { isActiveAddOnRow } from './addons';

const now = new Date('2026-08-13T12:00:00.000Z');
const canonicalAddOnId = 'regulatory-monitoring-pro';

describe('organization add-on entitlement state', () => {
  it('accepts an active canonical catalog add-on without an expiry', () => {
    expect(isActiveAddOnRow({ add_on_id: canonicalAddOnId, status: 'active', current_period_end: null }, now)).toBe(true);
  });

  it('accepts a trialing canonical add-on only while its period is in the future', () => {
    expect(
      isActiveAddOnRow(
        { add_on_id: canonicalAddOnId, status: 'trialing', current_period_end: '2026-08-14T12:00:00.000Z' },
        now,
      ),
    ).toBe(true);
    expect(
      isActiveAddOnRow(
        { add_on_id: canonicalAddOnId, status: 'trialing', current_period_end: '2026-08-12T12:00:00.000Z' },
        now,
      ),
    ).toBe(false);
  });

  it('fails closed when the provider period end is malformed', () => {
    expect(
      isActiveAddOnRow(
        { add_on_id: canonicalAddOnId, status: 'active', current_period_end: 'not-a-provider-timestamp' },
        now,
      ),
    ).toBe(false);
  });

  it('rejects unknown add-ons, legacy ids and non-entitled statuses', () => {
    expect(isActiveAddOnRow({ add_on_id: 'unknown', status: 'active', current_period_end: null }, now)).toBe(false);
    expect(isActiveAddOnRow({ add_on_id: 'premium_news', status: 'active', current_period_end: null }, now)).toBe(false);
    expect(isActiveAddOnRow({ add_on_id: canonicalAddOnId, status: 'past_due', current_period_end: null }, now)).toBe(false);
  });
});
