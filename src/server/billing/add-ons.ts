import { BILLING_ADD_ONS, getBillingAddOn, isAddOnAvailableForPlan } from '@/lib/billing/add-ons';
import type { CanonicalSubscriptionPlan } from '@/server/queries/subscription';
import type { BillingInterval } from './plans';

export type BillingAddOnSelection = { slug: string; quantity: number };

export function normalizeAddOnSelections(
  selections: Array<{ slug?: unknown; quantity?: unknown }> | null | undefined,
  plan: CanonicalSubscriptionPlan,
): BillingAddOnSelection[] {
  if (!selections?.length) return [];

  const unique = new Map<string, BillingAddOnSelection>();
  for (const item of selections) {
    const slug = typeof item.slug === 'string' ? item.slug.trim().toLowerCase() : '';
    const addOn = getBillingAddOn(slug);
    const quantity = typeof item.quantity === 'number' && Number.isInteger(item.quantity) ? item.quantity : 1;
    if (!addOn || !isAddOnAvailableForPlan(addOn, plan) || quantity < 1 || quantity > 10000) {
      throw new Error(`invalid_billing_add_on_${slug || 'unknown'}`);
    }
    unique.set(slug, { slug, quantity });
  }

  for (const selection of unique.values()) {
    const addOn = getBillingAddOn(selection.slug)!;
    for (const dependency of addOn.dependencies) {
      if (!unique.has(dependency)) throw new Error(`missing_add_on_dependency_${dependency}`);
    }
  }

  return [...unique.values()];
}

export function getStripeAddOnPriceId(slug: string, interval: BillingInterval) {
  const addOn = getBillingAddOn(slug);
  if (!addOn) throw new Error(`unknown_billing_add_on_${slug}`);
  const key = interval === 'year' ? addOn.stripePriceEnvKeyAnnual : addOn.stripePriceEnvKeyMonthly;
  const priceId = process.env[key];
  if (!priceId) throw new Error(`missing_stripe_add_on_price_${slug}_${interval}`);
  return priceId;
}

export function resolveBillingAddOnFromStripePriceId(priceId: string | null | undefined) {
  const normalizedPriceId = priceId?.trim();
  if (!normalizedPriceId) return null;

  for (const addOn of BILLING_ADD_ONS) {
    if (process.env[addOn.stripePriceEnvKeyMonthly]?.trim() === normalizedPriceId) {
      return { addOn, interval: 'month' as const };
    }

    if (process.env[addOn.stripePriceEnvKeyAnnual]?.trim() === normalizedPriceId) {
      return { addOn, interval: 'year' as const };
    }
  }

  return null;
}

export function listActiveBillingAddOns() {
  return BILLING_ADD_ONS.filter((addOn) => addOn.status === 'active');
}
