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

const annual = (monthly: number) => monthly * 10;
const allPaidPlans: CanonicalSubscriptionPlan[] = ['starter', 'professional', 'business', 'enterprise'];
const proAndUp: CanonicalSubscriptionPlan[] = ['professional', 'business', 'enterprise'];

export const BILLING_ADD_ONS: BillingAddOn[] = [
  ['regulatory-monitoring-pro', 'Regulatory Monitoring Pro', 'Expanded regulatory feeds, alerts and monitoring workflows.', 39, 'compliance', allPaidPlans, []],
  ['ai-literacy-hub', 'AI Literacy Hub', 'Training assignments, attestations and literacy evidence.', 49, 'compliance', allPaidPlans, []],
  ['fria-workspace', 'FRIA Workspace', 'Dedicated fundamental-rights impact assessment workspace.', 79, 'compliance', allPaidPlans, []],
  ['annex-iv-pro', 'Annex IV Pro', 'Advanced Annex IV technical-documentation workflows.', 59, 'compliance', allPaidPlans, []],
  ['vendor-assurance', 'Vendor Assurance', 'Expanded vendor due diligence and assurance workflows.', 79, 'compliance', allPaidPlans, []],
  ['procurement-pack', 'Procurement Pack', 'Buyer questionnaires, procurement evidence and review packs.', 99, 'compliance', proAndUp, ['vendor-assurance']],
  ['advanced-reporting', 'Advanced Reporting', 'Executive, board and custom reporting capabilities.', 49, 'platform', allPaidPlans, []],
  ['api-pack', 'API Pack', 'Expanded API quota, credentials and webhook capacity.', 99, 'platform', allPaidPlans, []],
  ['evidence-vault', 'Evidence Vault', 'Long-term protected evidence storage and retention.', 149, 'platform', allPaidPlans, []],
  ['white-label', 'White Label', 'Custom product identity, domains and exported branding.', 299, 'branding', proAndUp, []],
  ['extra-organization', 'Extra Organization', 'One additional licensed organization.', 29, 'capacity', allPaidPlans, []],
  ['extra-user', 'Extra User', 'One additional licensed user seat.', 8, 'capacity', allPaidPlans, []],
  ['extra-storage-100gb', 'Extra Storage 100GB', 'An additional 100 GB storage allocation.', 19, 'capacity', allPaidPlans, []],
].map(([slug, name, description, priceMonthly, category, availableOn, dependencies]) => ({
  id: `addon_${slug}`,
  slug,
  name,
  description,
  priceMonthly,
  priceAnnual: annual(priceMonthly),
  category,
  availableOn,
  dependencies,
  status: 'active',
  stripePriceEnvKeyMonthly: `STRIPE_ADDON_${slug.toUpperCase().replaceAll('-', '_')}_MONTHLY`,
  stripePriceEnvKeyAnnual: `STRIPE_ADDON_${slug.toUpperCase().replaceAll('-', '_')}_ANNUAL`,
})) as BillingAddOn[];

export function getBillingAddOn(slug: string | null | undefined) {
  const normalized = slug?.trim().toLowerCase();
  return BILLING_ADD_ONS.find((addOn) => addOn.slug === normalized);
}

export function isAddOnAvailableForPlan(addOn: BillingAddOn, plan: CanonicalSubscriptionPlan) {
  return addOn.status === 'active' && addOn.availableOn.includes(plan);
}
