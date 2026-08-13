import type Stripe from 'stripe';
import { afterEach, describe, expect, it } from 'vitest';

import { resolveStripeSubscriptionPlan } from './stripe-webhooks';

const starterKey = ['STRIPE', 'PRICE', 'STARTER', 'MONTHLY'].join('_');
const businessKey = ['STRIPE', 'PRICE', 'BUSINESS', 'MONTHLY'].join('_');
const originalStarter = process.env[starterKey];
const originalBusiness = process.env[businessKey];

function subscriptionWithPrices(priceIds: string[], metadata: Record<string, string> = {}) {
  return {
    metadata,
    items: {
      data: priceIds.map((priceId, index) => ({
        id: `si_contract_${index}`,
        price: { id: priceId },
      })),
    },
  } as unknown as Stripe.Subscription;
}

afterEach(() => {
  if (originalStarter === undefined) delete process.env[starterKey];
  else process.env[starterKey] = originalStarter;

  if (originalBusiness === undefined) delete process.env[businessKey];
  else process.env[businessKey] = originalBusiness;
});

describe('Stripe subscription base-plan resolution', () => {
  it('finds the base plan even when a non-plan item comes first', () => {
    process.env[starterKey] = 'price_starter_item_order_contract';

    const resolution = resolveStripeSubscriptionPlan(
      subscriptionWithPrices(['price_addon_item_order_contract', 'price_starter_item_order_contract']),
    );

    expect(resolution).toEqual({
      plan: 'starter',
      stripePriceId: 'price_starter_item_order_contract',
      source: 'stripe_price_id',
    });
  });

  it('fails closed when one subscription contains conflicting base-plan prices', () => {
    process.env[starterKey] = 'price_starter_conflict_contract';
    process.env[businessKey] = 'price_business_conflict_contract';

    expect(() =>
      resolveStripeSubscriptionPlan(
        subscriptionWithPrices(['price_starter_conflict_contract', 'price_business_conflict_contract']),
      ),
    ).toThrow('Stripe subscription contains conflicting base plan prices');
  });

  it('uses metadata only when no subscription item resolves to a configured base plan', () => {
    const resolution = resolveStripeSubscriptionPlan(
      subscriptionWithPrices(['price_unknown_contract'], { plan: 'business' }),
    );

    expect(resolution).toEqual({
      plan: 'business',
      stripePriceId: 'price_unknown_contract',
      source: 'subscription_metadata_fallback',
    });
  });
});
