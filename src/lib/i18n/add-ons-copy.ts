export type AddOnsCopy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  currentPlan: string;
  planActive: string;
  activeAddOns: string;
  billingAuthority: string;
  billingAuthorityBody: string;
  included: string;
  active: string;
  available: string;
  unavailable: string;
  requiresPlan: (plan: string) => string;
  perMonth: string;
  perYear: string;
  includedWithEnterprise: string;
  availableOn: string;
  dependencies: string;
  catalogTitle: string;
  catalogSubtitle: string;
  viewPlans: string;
  reviewBilling: string;
  contactBillingAdmin: string;
  invalidPlan: string;
  selectedPlan: string;
  selectedPlanBody: string;
  selectedPlanPrice: string;
  continuePlanReview: string;
  backToPricing: string;
  focusLabel: string;
  noDirectPurchase: string;
  noDirectPurchaseBody: string;
  categories: Record<'compliance' | 'platform' | 'capacity' | 'branding', string>;
};

const ENGLISH_COPY: AddOnsCopy = {
    eyebrow: 'Upgrade Center', title: 'Know exactly what your organization can use — and what unlocks next.', subtitle: 'This workspace reads the current organization plan and active add-ons from the billing authority. Nothing is unlocked by a URL, preview mode or browser state.', currentPlan: 'Current plan', planActive: 'Plan authority active', activeAddOns: 'Active add-ons', billingAuthority: 'Billing-confirmed access', billingAuthorityBody: 'Access changes only after the billing authority confirms the plan or add-on. This page never grants entitlements by itself.', included: 'Included', active: 'Active', available: 'Available', unavailable: 'Not available on this plan', requiresPlan: (plan) => `Requires ${plan} or higher`, perMonth: '/month', perYear: '/year', includedWithEnterprise: 'Included with Enterprise', availableOn: 'Available on', dependencies: 'Dependencies', catalogTitle: 'Available capability extensions', catalogSubtitle: 'Canonical prices and availability come from the billing catalog. Add-ons already included or active cannot be purchased twice.', viewPlans: 'View plans', reviewBilling: 'Review billing', contactBillingAdmin: 'Ask an Owner or Admin to review billing options.', invalidPlan: 'The requested plan is not valid. Showing your organization’s real billing state instead.', selectedPlan: 'Plan selected for review', selectedPlanBody: 'This is a commercial intent only. It does not change access until billing confirms the subscription.', selectedPlanPrice: 'Plan price', continuePlanReview: 'Continue plan review', backToPricing: 'Back to pricing', focusLabel: 'Suggested extension', noDirectPurchase: 'Provider-backed add-on checkout is not enabled yet', noDirectPurchaseBody: 'RISCK COMPLY will not show a fake purchase button. Until the billing engine exposes a verified add-on checkout, Owners/Admins can compare the catalog and plan upgrade options here.', categories: { compliance: 'Compliance', platform: 'Platform', capacity: 'Capacity', branding: 'Branding' },
  };

export function getAddOnsCopy(_locale: string): AddOnsCopy {
  return ENGLISH_COPY;
}
