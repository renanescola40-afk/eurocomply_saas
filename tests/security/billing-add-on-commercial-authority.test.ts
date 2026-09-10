import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { BILLING_ADD_ONS, getBillingAddOn, isAddOnAvailableForPlan } from '../../src/lib/billing/add-ons';
import { canAccessFeature } from '../../src/lib/billing/feature-gates';
import { normalizeAddOnSelections } from '../../src/server/billing/add-ons';
import { isActiveAddOnRow } from '../../src/server/billing/addons';

const read = (path: string) => readFileSync(path, 'utf8');

describe('billing add-on commercial authority boundary', () => {
  it('activates only add-ons whose protected product effect is already enforced', () => {
    const active = BILLING_ADD_ONS.filter((addOn) => addOn.status === 'active').map((addOn) => addOn.slug);
    expect(active).toEqual([
      'regulatory-monitoring-pro',
      'ai-literacy-hub',
      'fria-workspace',
      'annex-iv-pro',
      'vendor-assurance',
      'advanced-reporting',
      'evidence-vault',
    ]);

    for (const addOn of BILLING_ADD_ONS.filter((candidate) => candidate.status === 'active')) {
      for (const plan of addOn.availableOn) expect(isAddOnAvailableForPlan(addOn, plan)).toBe(true);
    }
  });

  it('continues rejecting preview capacity and provisioning add-ons before provider mutation', () => {
    for (const slug of ['extra-user', 'extra-organization', 'extra-storage-100gb', 'api-pack', 'white-label', 'procurement-pack']) {
      const addOn = getBillingAddOn(slug);
      expect(addOn?.status).toBe('private_preview');
    }
    expect(() => normalizeAddOnSelections([{ slug: 'extra-user', quantity: 1 }], 'professional'))
      .toThrow('invalid_billing_add_on_extra-user');
    expect(() => normalizeAddOnSelections([{ slug: 'api-pack', quantity: 1 }], 'professional'))
      .toThrow('invalid_billing_add_on_api-pack');
  });

  it('accepts an active add-on only on its explicit purchasable plan set', () => {
    expect(normalizeAddOnSelections([{ slug: 'fria-workspace', quantity: 1 }], 'starter'))
      .toEqual([{ slug: 'fria-workspace', quantity: 1 }]);
    expect(() => normalizeAddOnSelections([{ slug: 'fria-workspace', quantity: 1 }], 'professional'))
      .toThrow('invalid_billing_add_on_fria-workspace');
  });

  it('treats only a canonical active database row as organization add-on authority', () => {
    expect(isActiveAddOnRow({ add_on_id: 'fria-workspace', status: 'active' }, new Date())).toBe(true);
    expect(isActiveAddOnRow({ add_on_id: 'extra-user', status: 'active' }, new Date())).toBe(false);
    expect(isActiveAddOnRow({ add_on_id: 'fria-workspace', status: 'past_due' }, new Date())).toBe(false);
    expect(canAccessFeature('fria', {
      plan: 'starter',
      licensed: true,
      activeAddOns: ['fria-workspace'],
    })).toBe(true);
    expect(canAccessFeature('fria', {
      plan: 'starter',
      licensed: false,
      activeAddOns: ['fria-workspace'],
    })).toBe(false);
  });

  it('keeps public catalog sourced only from commercially active add-ons', () => {
    const route = read('src/app/api/billing/catalog/route.ts');
    const serverCatalog = read('src/server/billing/add-ons.ts');

    expect(route).toContain('listActiveBillingAddOns()');
    expect(serverCatalog).toContain("addOn.status === 'active'");
  });

  it('requires signed provider reconciliation before an active row can materialize', () => {
    const reconciliation = read('src/server/billing/add-on-reconciliation.ts');
    const webhook = read('src/server/billing/stripe-webhook-recovery.ts');
    const migration = read('supabase/migrations/20260813124224_reconcile_organization_add_ons.sql');

    expect(reconciliation).toContain(".from('subscriptions')");
    expect(reconciliation).toContain('stripe_add_on_subscription_binding_mismatch');
    expect(reconciliation).toContain('getBillingAddOnSlugForStripePriceId');
    expect(reconciliation).toContain(".from('organization_add_ons').upsert");
    expect(reconciliation).toContain("status: 'cancelled'");
    expect(webhook).toContain('reconcileOrganizationAddOnsFromStripeEvent(event)');
    expect(migration).toContain('force row level security');
    expect(migration).toContain('grant all on table public.organization_add_ons to service_role');
  });

  it('shows catalog prices for preview items but never renders a purchase action for them', () => {
    const page = read('src/app/[locale]/dashboard/organizations/add-ons/page.tsx');

    expect(page).toContain("status === 'preview'");
    expect(page).toContain('€{addOn.priceMonthly}');
    expect(page).toContain('status === \'available\' && canManageBilling');
    expect(page).toContain('action="replace_add_ons"');
    expect(page).not.toMatch(/status === 'preview'[\s\S]{0,350}action="replace_add_ons"/);
  });
});
