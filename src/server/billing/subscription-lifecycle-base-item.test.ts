import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  billingLifecycleRequestFingerprint,
  getBaseSubscriptionItem,
  getEligibleProviderAddOnSelectionsForPlan,
  mergeProviderAddOnSelections,
} from './subscription-lifecycle';

const REGULATORY_MONITORING_MONTH = 'price_1UE34UGt3cgjPOtqOFswahIY';
const AI_LITERACY_MONTH = 'price_1UE34iGt3cgjPOtqfe5oO1vf';
const FRIA_WORKSPACE_MONTH = 'price_1UE354Gt3cgjPOtqUMRXYSkx';
const EVIDENCE_VAULT_MONTH = 'price_1UE36QGt3cgjPOtqUQe4IEiK';
const ORIGINAL_ESSENTIAL_PRICE = process.env.STRIPE_PRICE_ESSENTIAL_MONTHLY;
const ORIGINAL_PROFESSIONAL_PRICE = process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY;

function subscriptionWithItems(items: Array<{ priceId: string; quantity?: number }>) {
  return {
    items: {
      data: items.map((item, index) => ({
        id: `si_${index}`,
        quantity: item.quantity ?? 1,
        price: {
          id: item.priceId,
          recurring: { interval: 'month', usage_type: 'licensed' },
        },
      })),
    },
  } as never;
}

describe('subscription lifecycle base item authority', () => {
  beforeEach(() => {
    process.env.STRIPE_PRICE_ESSENTIAL_MONTHLY = 'price_plan_base';
    process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY = 'price_plan_professional';
  });

  afterEach(() => {
    if (ORIGINAL_ESSENTIAL_PRICE === undefined) delete process.env.STRIPE_PRICE_ESSENTIAL_MONTHLY;
    else process.env.STRIPE_PRICE_ESSENTIAL_MONTHLY = ORIGINAL_ESSENTIAL_PRICE;

    if (ORIGINAL_PROFESSIONAL_PRICE === undefined) delete process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY;
    else process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY = ORIGINAL_PROFESSIONAL_PRICE;
  });

  it('identifies the allowlisted base plan independently of Stripe item ordering', () => {
    const subscription = subscriptionWithItems([
      { priceId: REGULATORY_MONITORING_MONTH },
      { priceId: 'price_plan_base' },
      { priceId: FRIA_WORKSPACE_MONTH },
    ]);

    expect(getBaseSubscriptionItem(subscription).price.id).toBe('price_plan_base');
  });

  it('does not mistake a licensed recurring add-on for the base plan', () => {
    const subscription = subscriptionWithItems([
      { priceId: FRIA_WORKSPACE_MONTH },
      { priceId: 'price_plan_base' },
    ]);

    const base = getBaseSubscriptionItem(subscription);
    expect(base.price.id).toBe('price_plan_base');
    expect(base.price.recurring?.usage_type).toBe('licensed');
  });

  it('fails closed when no allowlisted base item exists', () => {
    const subscription = subscriptionWithItems([
      { priceId: REGULATORY_MONITORING_MONTH },
      { priceId: FRIA_WORKSPACE_MONTH },
    ]);

    expect(() => getBaseSubscriptionItem(subscription)).toThrow('stripe_base_subscription_item_not_found');
  });

  it('fails closed when more than one allowlisted base plan item exists', () => {
    const subscription = subscriptionWithItems([
      { priceId: 'price_plan_base' },
      { priceId: REGULATORY_MONITORING_MONTH },
      { priceId: 'price_plan_professional' },
    ]);

    expect(() => getBaseSubscriptionItem(subscription)).toThrow('stripe_base_subscription_item_ambiguous');
  });

  it('preserves provider items, including pending ones, when appending a new add-on', () => {
    const subscription = subscriptionWithItems([
      { priceId: REGULATORY_MONITORING_MONTH, quantity: 2 },
      { priceId: 'price_plan_base' },
    ]);
    const base = getBaseSubscriptionItem(subscription);

    expect(mergeProviderAddOnSelections(
      subscription,
      base.id,
      [{ slug: 'fria-workspace', quantity: 1 }],
      'starter',
    )).toEqual([
      { slug: 'regulatory-monitoring-pro', quantity: 2 },
      { slug: 'fria-workspace', quantity: 1 },
    ]);
  });

  it('preserves only add-ons still billable after a plan upgrade', () => {
    const subscription = subscriptionWithItems([
      { priceId: 'price_plan_base' },
      { priceId: REGULATORY_MONITORING_MONTH },
      { priceId: AI_LITERACY_MONTH, quantity: 2 },
      { priceId: EVIDENCE_VAULT_MONTH },
    ]);
    const base = getBaseSubscriptionItem(subscription);

    expect(getEligibleProviderAddOnSelectionsForPlan(subscription, base.id, 'professional')).toEqual([
      { slug: 'ai-literacy-hub', quantity: 2 },
      { slug: 'evidence-vault', quantity: 1 },
    ]);
  });

  it('removes paid duplicates when the target plan includes the capability', () => {
    const subscription = subscriptionWithItems([
      { priceId: 'price_plan_base' },
      { priceId: AI_LITERACY_MONTH },
      { priceId: EVIDENCE_VAULT_MONTH },
    ]);
    const base = getBaseSubscriptionItem(subscription);

    expect(getEligibleProviderAddOnSelectionsForPlan(subscription, base.id, 'business')).toEqual([
      { slug: 'evidence-vault', quantity: 1 },
    ]);
  });

  it('fails closed instead of silently dropping an unknown provider item during append', () => {
    const subscription = subscriptionWithItems([
      { priceId: 'price_plan_base' },
      { priceId: 'price_unknown_extra' },
    ]);
    const base = getBaseSubscriptionItem(subscription);

    expect(() => mergeProviderAddOnSelections(
      subscription,
      base.id,
      [{ slug: 'fria-workspace', quantity: 1 }],
      'starter',
    )).toThrow('stripe_subscription_add_on_item_not_allowlisted');
  });

  it('fails closed on unknown provider items during a plan transition too', () => {
    const subscription = subscriptionWithItems([
      { priceId: 'price_plan_base' },
      { priceId: 'price_unknown_extra' },
    ]);
    const base = getBaseSubscriptionItem(subscription);

    expect(() => getEligibleProviderAddOnSelectionsForPlan(subscription, base.id, 'professional'))
      .toThrow('stripe_subscription_add_on_item_not_allowlisted');
  });

  it('binds append semantics into the durable request fingerprint', () => {
    const base = {
      action: 'replace_add_ons' as const,
      addOns: [{ slug: 'fria-workspace', quantity: 1 }],
    };

    expect(billingLifecycleRequestFingerprint({ ...base, preserveExistingAddOns: false }))
      .not.toBe(billingLifecycleRequestFingerprint({ ...base, preserveExistingAddOns: true }));
  });
});
