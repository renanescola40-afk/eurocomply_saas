import { describe, expect, it } from 'vitest';

import { isActiveAddOnRow } from './addons';

const now = new Date('2026-08-13T12:00:00.000Z');
const activeAddOnId = 'regulatory-monitoring-pro';
const previewAddOnId = 'procurement-pack';

describe('organization add-on entitlement state', () => {
  it('accepts an active provider row only when the canonical add-on is commercially active', () => {
    expect(
      isActiveAddOnRow(
        { add_on_id: activeAddOnId, status: 'active', current_period_end: null },
        now,
      ),
    ).toBe(true);
    expect(
      isActiveAddOnRow(
        { add_on_id: previewAddOnId, status: 'active', current_period_end: null },
        now,
      ),
    ).toBe(false);
  });

  it('rejects trialing rows because signed active provider state is required', () => {
    expect(
      isActiveAddOnRow(
        { add_on_id: activeAddOnId, status: 'trialing', current_period_end: '2026-08-14T12:00:00.000Z' },
        now,
      ),
    ).toBe(false);
    expect(
      isActiveAddOnRow(
        { add_on_id: activeAddOnId, status: 'trialing', current_period_end: '2026-08-12T12:00:00.000Z' },
        now,
      ),
    ).toBe(false);
  });

  it('fails closed when the provider period end is malformed', () => {
    expect(
      isActiveAddOnRow(
        { add_on_id: activeAddOnId, status: 'active', current_period_end: 'not-a-provider-timestamp' },
        now,
      ),
    ).toBe(false);
  });

  it('rejects unknown add-ons, legacy ids and non-entitled statuses', () => {
    expect(isActiveAddOnRow({ add_on_id: 'unknown', status: 'active', current_period_end: null }, now)).toBe(false);
    expect(isActiveAddOnRow({ add_on_id: 'premium_news', status: 'active', current_period_end: null }, now)).toBe(false);
    expect(isActiveAddOnRow({ add_on_id: activeAddOnId, status: 'past_due', current_period_end: null }, now)).toBe(false);
  });
});
