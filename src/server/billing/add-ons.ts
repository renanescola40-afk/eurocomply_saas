import { BILLING_ADD_ONS, getBillingAddOn, isAddOnAvailableForPlan, type BillingAddOnSlug } from '@/lib/billing/add-ons';
import type { CanonicalSubscriptionPlan } from '@/server/queries/subscription';
import type { BillingInterval } from './plans';

export type BillingAddOnSelection = { slug: string; quantity: number };

type LivePricePair = { month: string; year: string };

const CANONICAL_LIVE_ADD_ON_PRICES: Record<BillingAddOnSlug, LivePricePair> = {
  'regulatory-monitoring-pro': { month: 'price_1UE34UGt3cgjPOtqOFswahIY', year: 'price_1UE34bGt3cgjPOtqLQX22yAg' },
  'ai-literacy-hub': { month: 'price_1UE34iGt3cgjPOtqfe5oO1vf', year: 'price_1UE34rGt3cgjPOtqmgIMi1MD' },
  'fria-workspace': { month: 'price_1UE354Gt3cgjPOtqUMRXYSkx', year: 'price_1UE35AGt3cgjPOtq6BJSAoa9' },
  'annex-iv-pro': { month: 'price_1UE35HGt3cgjPOtqeCwIBcF9', year: 'price_1UE35NGt3cgjPOtqiV6tDm2o' },
  'vendor-assurance': { month: 'price_1UE35UGt3cgjPOtqhwTmPT3Y', year: 'price_1UE35aGt3cgjPOtqQWHTLDNC' },
  'procurement-pack': { month: 'price_1UE35lGt3cgjPOtq6jFgBr61', year: 'price_1UE35sGt3cgjPOtqtYya6HeW' },
  'advanced-reporting': { month: 'price_1UE35yGt3cgjPOtqqoiEBfRv', year: 'price_1UE363Gt3cgjPOtqhDGKkT37' },
  'api-pack': { month: 'price_1UE36BGt3cgjPOtqDUD8WLJN', year: 'price_1UE36IGt3cgjPOtq3aB3MLiY' },
  'evidence-vault': { month: 'price_1UE36QGt3cgjPOtqUQe4IEiK', year: 'price_1UE36WGt3cgjPOtqYkgQjtql' },
  'white-label': { month: 'price_1UE36dGt3cgjPOtqBiV2KHv9', year: 'price_1UE36kGt3cgjPOtqIJJRbvHb' },
  'extra-organization': { month: 'price_1UE36sGt3cgjPOtqmp3x5Fd4', year: 'price_1UE36yGt3cgjPOtqpxedj1JE' },
  'extra-user': { month: 'price_1UE374Gt3cgjPOtq24EEXT30', year: 'price_1UE379Gt3cgjPOtqRWpTiapl' },
  'extra-storage-100gb': { month: 'price_1UE37KGt3cgjPOtqcmMWe1M6', year: 'price_1UE37XGt3cgjPOtqAHRinGvM' },
};

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

function isLiveStripeProviderConfigured() {
  const secret = process.env.STRIPE_SECRET_KEY?.trim() ?? '';
  return secret.startsWith('sk_live_') || secret.startsWith('rk_live_');
}

export function getCanonicalLiveStripeAddOnPriceId(slug: string, interval: BillingInterval) {
  const addOn = getBillingAddOn(slug);
  if (!addOn) throw new Error(`unknown_billing_add_on_${slug}`);
  const pair = CANONICAL_LIVE_ADD_ON_PRICES[addOn.slug as BillingAddOnSlug];
  return pair[interval];
}

export function getStripeAddOnPriceId(slug: string, interval: BillingInterval) {
  const addOn = getBillingAddOn(slug);
  if (!addOn) throw new Error(`unknown_billing_add_on_${slug}`);
  const key = interval === 'year' ? addOn.stripePriceEnvKeyAnnual : addOn.stripePriceEnvKeyMonthly;
  const configuredPriceId = process.env[key]?.trim();
  if (configuredPriceId) return configuredPriceId;

  // Price IDs are identifiers, not secrets. Production may use the provider-verified
  // canonical LIVE IDs as a fail-safe binding when the matching Vercel env aliases
  // have not been populated yet. Test/sandbox providers never fall through to LIVE.
  if (isLiveStripeProviderConfigured()) {
    return getCanonicalLiveStripeAddOnPriceId(slug, interval);
  }

  throw new Error(`missing_stripe_add_on_price_${slug}_${interval}`);
}

export function getBillingAddOnSlugForStripePriceId(priceId: string | null | undefined): BillingAddOnSlug | undefined {
  const normalized = priceId?.trim();
  if (!normalized) return undefined;

  for (const addOn of BILLING_ADD_ONS) {
    const canonical = CANONICAL_LIVE_ADD_ON_PRICES[addOn.slug as BillingAddOnSlug];
    const configured = [
      process.env[addOn.stripePriceEnvKeyMonthly]?.trim(),
      process.env[addOn.stripePriceEnvKeyAnnual]?.trim(),
    ].filter((value): value is string => Boolean(value));

    if (canonical.month === normalized || canonical.year === normalized || configured.includes(normalized)) {
      return addOn.slug as BillingAddOnSlug;
    }
  }

  return undefined;
}

export function listActiveBillingAddOns() {
  return BILLING_ADD_ONS.filter((addOn) => addOn.status === 'active');
}
