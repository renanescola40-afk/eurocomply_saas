import type { CanonicalSubscriptionPlan } from '@/server/queries/subscription';

export type AddOnCategory = 'compliance' | 'platform' | 'capacity' | 'branding';
export type AddOnStatus = 'active' | 'private_preview' | 'retired';

export type BillingAddOn = {
  id: string;
  slug: string;
  name: string;
  description: string;
  priceMonthly: number;
  priceAnnual: number;
  category: AddOnCategory;
  availableOn: CanonicalSubscriptionPlan[];
  dependencies: string[];
  status: AddOnStatus;
  stripePriceEnvKeyMonthly: string;
  stripePriceEnvKeyAnnual: string;
};

const allPaidPlans: CanonicalSubscriptionPlan[] = ['starter', 'professional', 'business', 'enterprise'];
const proAndUp: CanonicalSubscriptionPlan[] = ['professional', 'business', 'enterprise'];

function addOn<const TSlug extends string>(
  slug: TSlug,
  name: string,
  description: string,
  priceMonthly: number,
  category: AddOnCategory,
  availableOn: CanonicalSubscriptionPlan[],
  dependencies: string[] = [],
) {
  const envSlug = slug.toUpperCase().replaceAll('-', '_');
  return {
    id: `addon_${slug}`,
    slug,
    name,
    description,
    priceMonthly,
    priceAnnual: priceMonthly * 10,
    category,
    availableOn,
    dependencies,
    status: 'active' as const,
    stripePriceEnvKeyMonthly: `STRIPE_ADDON_${envSlug}_MONTHLY`,
    stripePriceEnvKeyAnnual: `STRIPE_ADDON_${envSlug}_ANNUAL`,
  };
}

export const BILLING_ADD_ONS = [
  addOn('regulatory-monitoring-pro', 'Regulatory Monitoring Pro', 'Expanded regulatory feeds, alerts and monitoring workflows.', 39, 'compliance', allPaidPlans),
  addOn('ai-literacy-hub', 'AI Literacy Hub', 'Training assignments, attestations and literacy evidence.', 49, 'compliance', allPaidPlans),
  addOn('fria-workspace', 'FRIA Workspace', 'Dedicated fundamental-rights impact assessment workspace.', 79, 'compliance', allPaidPlans),
  addOn('annex-iv-pro', 'Annex IV Pro', 'Advanced Annex IV technical-documentation workflows.', 59, 'compliance', allPaidPlans),
  addOn('vendor-assurance', 'Vendor Assurance', 'Expanded vendor due diligence and assurance workflows.', 79, 'compliance', allPaidPlans),
  addOn('procurement-pack', 'Procurement Pack', 'Buyer questionnaires, procurement evidence and review packs.', 99, 'compliance', proAndUp, ['vendor-assurance']),
  addOn('advanced-reporting', 'Advanced Reporting', 'Executive, board and custom reporting capabilities.', 49, 'platform', allPaidPlans),
  addOn('api-pack', 'API Pack', 'Expanded API quota, credentials and webhook capacity.', 99, 'platform', allPaidPlans),
  addOn('evidence-vault', 'Evidence Vault', 'Long-term protected evidence storage and retention.', 149, 'platform', allPaidPlans),
  addOn('white-label', 'White Label', 'Custom product identity, domains and exported branding.', 299, 'branding', proAndUp),
  addOn('extra-organization', 'Extra Organization', 'One additional licensed organization.', 29, 'capacity', allPaidPlans),
  addOn('extra-user', 'Extra User', 'One additional licensed user seat.', 8, 'capacity', allPaidPlans),
  addOn('extra-storage-100gb', 'Extra Storage 100GB', 'An additional 100 GB storage allocation.', 19, 'capacity', allPaidPlans),
] satisfies BillingAddOn[];

export type BillingAddOnSlug = (typeof BILLING_ADD_ONS)[number]['slug'];

export function getBillingAddOn(slug: string | null | undefined) {
  const normalized = slug?.trim().toLowerCase();
  return BILLING_ADD_ONS.find((candidate) => candidate.slug === normalized);
}

export function isAddOnAvailableForPlan(candidate: BillingAddOn, plan: CanonicalSubscriptionPlan) {
  return candidate.status === 'active' && candidate.availableOn.includes(plan);
}
