import { describe, expect, it } from 'vitest';

import { getBaseSubscriptionItem } from './subscription-lifecycle';

const REGULATORY_MONITORING_MONTH = 'price_1UE34UGt3cgjPOtqOFswahIY';
const FRIA_WORKSPACE_MONTH = 'price_1UE354Gt3cgjPOtqUMRXYSkx';

function subscriptionWithPrices(priceIds: string[]) {
  return {
    items: {
      data: priceIds.map((priceId, index) => ({
        id: `si_${index}`,
        quantity: 1,
        price: {
          id: priceId,
          recurring: { interval: 'month', usage_type: 'licensed' },
        },
      })),
    },
  } as never;
}

describe('subscription lifecycle base item authority', () => {
  it('identifies the base plan independently of Stripe item ordering', () => {
    const subscription = subscriptionWithPrices([
      REGULATORY_MONITORING_MONTH,
      'price_plan_base',
      FRIA_WORKSPACE_MONTH,
    ]);

    expect(getBaseSubscriptionItem(subscription).price.id).toBe('price_plan_base');
  });

  it('does not mistake a licensed recurring add-on for the base plan', () => {
    const subscription = subscriptionWithPrices([
      FRIA_WORKSPACE_MONTH,
      'price_plan_base',
    ]);

    const base = getBaseSubscriptionItem(subscription);
    expect(base.price.id).toBe('price_plan_base');
    expect(base.price.recurring?.usage_type).toBe('licensed');
  });

  it('fails closed when no non-add-on base item exists', () => {
    const subscription = subscriptionWithPrices([
      REGULATORY_MONITORING_MONTH,
      FRIA_WORKSPACE_MONTH,
    ]);

    expect(() => getBaseSubscriptionItem(subscription)).toThrow('stripe_base_subscription_item_not_found');
  });

  it('fails closed when more than one unknown base candidate exists', () => {
    const subscription = subscriptionWithPrices([
      'price_unknown_a',
      REGULATORY_MONITORING_MONTH,
      'price_unknown_b',
    ]);

    expect(() => getBaseSubscriptionItem(subscription)).toThrow('stripe_base_subscription_item_ambiguous');
  });
});
