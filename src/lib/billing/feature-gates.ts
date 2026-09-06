import { getBillingAddOn, isAddOnAvailableForPlan } from '@/lib/billing/add-ons';
import { getBillingPlan, type BillingLimit } from '@/lib/billing/plans';
import type { CanonicalSubscriptionPlan } from '@/server/queries/subscription';

export type LicensedFeature =
  | 'ai_inventory'
  | 'risk_classification'
  | 'pdf_export'
  | 'risk_register'
  | 'tasks'
  | 'reports'
  | 'regulatory_monitoring'
  | 'vendor_register'
  | 'fria'
  | 'annex_iv'
  | 'api'
  | 'webhooks'
  | 'branding'
  | 'ai_literacy'
  | 'procurement'
  | 'qms'
  | 'approval_workflows'
  | 'advanced_reporting'
  | 'integrations'
  | 'departments'
  | 'environments'
  | 'sso'
  | 'scim'
  | 'advanced_rbac'
  | 'custom_roles'
  | 'custom_workflows'
  | 'evidence_vault';

export type FeatureLicenseRule = {
  minimumPlan: CanonicalSubscriptionPlan;
  addOnSlugs?: string[];
};

const RULES: Record<LicensedFeature, FeatureLicenseRule> = {
  ai_inventory: { minimumPlan: 'starter' },
  risk_classification: { minimumPlan: 'starter' },
  pdf_export: { minimumPlan: 'starter' },
  risk_register: { minimumPlan: 'professional' },
  tasks: { minimumPlan: 'professional' },
  reports: { minimumPlan: 'professional' },
  regulatory_monitoring: { minimumPlan: 'professional', addOnSlugs: ['regulatory-monitoring-pro'] },
  vendor_register: { minimumPlan: 'professional', addOnSlugs: ['vendor-assurance'] },
  fria: { minimumPlan: 'professional', addOnSlugs: ['fria-workspace'] },
  annex_iv: { minimumPlan: 'professional', addOnSlugs: ['annex-iv-pro'] },
  // The implemented credential/webhook control plane is Enterprise-only: API
  // keys are platform-provisioned against an active Enterprise contract and the
  // outbound subscription tables live in that same authority plane. Keep lower
  // plans closed until a separate self-service provisioning chain is proven.
  api: { minimumPlan: 'enterprise' },
  webhooks: { minimumPlan: 'enterprise' },
  branding: { minimumPlan: 'professional', addOnSlugs: ['white-label'] },
  ai_literacy: { minimumPlan: 'business', addOnSlugs: ['ai-literacy-hub'] },
  procurement: { minimumPlan: 'business', addOnSlugs: ['procurement-pack'] },
  qms: { minimumPlan: 'business' },
  approval_workflows: { minimumPlan: 'business' },
  advanced_reporting: { minimumPlan: 'business', addOnSlugs: ['advanced-reporting'] },
  integrations: { minimumPlan: 'business' },
  departments: { minimumPlan: 'business' },
  environments: { minimumPlan: 'business' },
  sso: { minimumPlan: 'enterprise' },
  scim: { minimumPlan: 'enterprise' },
  advanced_rbac: { minimumPlan: 'enterprise' },
  custom_roles: { minimumPlan: 'enterprise' },
  custom_workflows: { minimumPlan: 'enterprise' },
  evidence_vault: { minimumPlan: 'enterprise', addOnSlugs: ['evidence-vault'] },
};

const PLAN_RANK: Record<CanonicalSubscriptionPlan, number> = { starter: 1, professional: 2, business: 3, enterprise: 4 };

export type LicenseContext = {
  plan: CanonicalSubscriptionPlan;
  licensed?: boolean;
  activeAddOns?: Iterable<string>;
  featureFlags?: Record<string, boolean>;
};

export function canAccessFeature(feature: LicensedFeature, context: LicenseContext) {
  // Catalog plan labels are not commercial authority. Organization-scoped callers
  // must propagate licensed=false when no signed contract or correlated live Stripe
  // authority exists. Add-ons and feature flags can never override that boundary.
  if (context.licensed === false) return false;
  if (context.featureFlags?.[feature] === false) return false;

  const rule = RULES[feature];
  if (PLAN_RANK[context.plan] >= PLAN_RANK[rule.minimumPlan]) return true;

  if (!rule.addOnSlugs?.length) return false;
  const active = new Set(context.activeAddOns ?? []);
  return rule.addOnSlugs.some((slug) => {
    if (!active.has(slug)) return false;
    const addOn = getBillingAddOn(slug);
    // A persisted/client-supplied slug is never enough by itself. The canonical
    // commercial catalog must explicitly mark the add-on active and eligible for
    // the caller's plan before it can elevate a feature.
    return Boolean(addOn && isAddOnAvailableForPlan(addOn, context.plan));
  });
}

export function requireLicensedFeature(feature: LicensedFeature, context: LicenseContext) {
  if (!canAccessFeature(feature, context)) throw new Error(`feature_not_licensed:${feature}`);
}

export type UsageLimitKey = 'users' | 'organizations' | 'aiSystems' | 'documents' | 'storageGb' | 'apiRequestsMonthly' | 'webhooks' | 'exportsMonthly';

export function getPlanLimit(plan: CanonicalSubscriptionPlan, key: UsageLimitKey): BillingLimit {
  const catalogPlan = getBillingPlan(plan);
  if (!catalogPlan) throw new Error('billing_plan_not_found');
  return catalogPlan.limits[key];
}

export function isWithinLimit(currentUsage: number, requestedIncrease: number, limit: BillingLimit) {
  if (currentUsage < 0 || requestedIncrease < 0) throw new Error('invalid_usage_value');
  return limit === 'unlimited' || currentUsage + requestedIncrease <= limit;
}

export function requireWithinLimit(currentUsage: number, requestedIncrease: number, limit: BillingLimit, key: UsageLimitKey) {
  if (!isWithinLimit(currentUsage, requestedIncrease, limit)) throw new Error(`billing_limit_exceeded:${key}`);
}
