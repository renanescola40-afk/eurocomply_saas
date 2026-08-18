import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { BILLING_ADD_ONS, isAddOnAvailableForPlan } from '../../src/lib/billing/add-ons';
import { canAccessFeature } from '../../src/lib/billing/feature-gates';
import { normalizeAddOnSelections } from '../../src/server/billing/add-ons';
import { isActiveAddOnRow } from '../../src/server/billing/addons';

const read = (path: string) => readFileSync(path, 'utf8');

describe('billing add-on commercial authority boundary', () => {
  it('keeps every unproven add-on private preview and out of purchase eligibility', () => {
    expect(BILLING_ADD_ONS.length).toBeGreaterThan(0);
    for (const addOn of BILLING_ADD_ONS) {
      expect(addOn.status).toBe('private_preview');
      for (const plan of addOn.availableOn) {
        expect(isAddOnAvailableForPlan(addOn, plan)).toBe(false);
      }
    }
  });

  it('rejects private-preview subscription item selections before provider mutation', () => {
    expect(() => normalizeAddOnSelections([{ slug: 'fria-workspace', quantity: 1 }], 'starter'))
      .toThrow('invalid_billing_add_on_fria-workspace');
    expect(() => normalizeAddOnSelections([{ slug: 'extra-user', quantity: 1 }], 'professional'))
      .toThrow('invalid_billing_add_on_extra-user');
  });

  it('does not treat stale database rows or client feature context as add-on authority', () => {
    expect(isActiveAddOnRow({ add_on_id: 'fria-workspace', status: 'active' }, new Date())).toBe(false);
    expect(canAccessFeature('fria', {
      plan: 'starter',
      licensed: true,
      activeAddOns: ['fria-workspace'],
    })).toBe(false);
  });

  it('keeps the public catalog sourced only from commercially active add-ons', () => {
    const route = read('src/app/api/billing/catalog/route.ts');
    const serverCatalog = read('src/server/billing/add-ons.ts');

    expect(route).toContain('listActiveBillingAddOns()');
    expect(serverCatalog).toContain("addOn.status === 'active'");
  });

  it('keeps private-preview items non-purchasable in the Upgrade Center', () => {
    const page = read('src/app/[locale]/dashboard/organizations/add-ons/page.tsx');

    expect(page).toContain("return 'preview'");
    expect(page).toContain("status === 'preview'");
    expect(page).toContain('copy.noDirectPurchaseBody');
  });
});
