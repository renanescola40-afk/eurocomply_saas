import { getBillingEntitlements } from '@/lib/billing/plans';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  getOrganizationBillingAuthority,
  isPlanAtLeast,
  normalizePlan,
  type BillingAuthoritySource,
  type SubscriptionPlan,
} from '@/server/queries/subscription';

export type PlanEntitlements = {
  plan: SubscriptionPlan;
  maxDocuments: number;
  maxUsers: number;
  maxVendors: number;
  maxRisks: number;
  maxFiscalCountries: number;
  aiCalendar: 'basic' | 'advanced';
  aiNews: 'basic' | 'standard' | 'advanced';
  riskMatrix: 'simple' | 'complete' | 'advanced' | 'enterprise';
  auditLog: boolean;
  employeeInvites: boolean;
  approvalWorkflows: boolean;
  executiveReports: boolean;
  csvExports: boolean;
  gdprSelfService: boolean;
  whiteLabelReports: boolean;
};

export type OrganizationEntitlements = PlanEntitlements & {
  licensed: boolean;
  authoritySource: BillingAuthoritySource;
};

export type ResourceQuota = 'vendors' | 'risks';

const ENTITLEMENTS: Record<SubscriptionPlan, Omit<PlanEntitlements, 'plan'>> = {
  essential: {
    maxDocuments: 10,
    maxUsers: 1,
    maxVendors: 0,
    maxRisks: 0,
    maxFiscalCountries: 1,
    aiCalendar: 'basic',
    aiNews: 'basic',
    riskMatrix: 'simple',
    auditLog: false,
    employeeInvites: false,
    approvalWorkflows: false,
    executiveReports: false,
    csvExports: false,
    gdprSelfService: false,
    whiteLabelReports: false,
  },
  starter: {
    maxDocuments: 40,
    maxUsers: 3,
    maxVendors: 0,
    maxRisks: 0,
    maxFiscalCountries: 1,
    aiCalendar: 'basic',
    aiNews: 'basic',
    riskMatrix: 'simple',
    auditLog: true,
    employeeInvites: true,
    approvalWorkflows: false,
    executiveReports: false,
    csvExports: true,
    gdprSelfService: false,
    whiteLabelReports: false,
  },
  professional: {
    maxDocuments: 100,
    maxUsers: 3,
    maxVendors: 30,
    maxRisks: 75,
    maxFiscalCountries: 2,
    aiCalendar: 'advanced',
    aiNews: 'standard',
    riskMatrix: 'complete',
    auditLog: true,
    employeeInvites: false,
    approvalWorkflows: false,
    executiveReports: false,
    csvExports: true,
    gdprSelfService: true,
    whiteLabelReports: false,
  },
  growth: {
    maxDocuments: 250,
    maxUsers: 15,
    maxVendors: 30,
    maxRisks: 75,
    maxFiscalCountries: 5,
    aiCalendar: 'advanced',
    aiNews: 'advanced',
    riskMatrix: 'advanced',
    auditLog: true,
    employeeInvites: true,
    approvalWorkflows: true,
    executiveReports: true,
    csvExports: true,
    gdprSelfService: true,
    whiteLabelReports: false,
  },
  business: {
    maxDocuments: 500,
    maxUsers: 10,
    maxVendors: 150,
    maxRisks: 300,
    maxFiscalCountries: 5,
    aiCalendar: 'advanced',
    aiNews: 'advanced',
    riskMatrix: 'advanced',
    auditLog: true,
    employeeInvites: true,
    approvalWorkflows: true,
    executiveReports: true,
    csvExports: true,
    gdprSelfService: true,
    whiteLabelReports: false,
  },
  enterprise: {
    maxDocuments: Number.POSITIVE_INFINITY,
    maxUsers: Number.POSITIVE_INFINITY,
    maxVendors: Number.POSITIVE_INFINITY,
    maxRisks: Number.POSITIVE_INFINITY,
    maxFiscalCountries: Number.POSITIVE_INFINITY,
    aiCalendar: 'advanced',
    aiNews: 'advanced',
    riskMatrix: 'enterprise',
    auditLog: true,
    employeeInvites: true,
    approvalWorkflows: true,
    executiveReports: true,
    csvExports: true,
    gdprSelfService: true,
    whiteLabelReports: true,
  },
};

const UNLICENSED_ENTITLEMENTS: Omit<PlanEntitlements, 'plan'> = {
  maxDocuments: 0,
  maxUsers: 0,
  maxVendors: 0,
  maxRisks: 0,
  maxFiscalCountries: 0,
  aiCalendar: 'basic',
  aiNews: 'basic',
  riskMatrix: 'simple',
  auditLog: false,
  employeeInvites: false,
  approvalWorkflows: false,
  executiveReports: false,
  csvExports: false,
  gdprSelfService: false,
  whiteLabelReports: false,
};

export function formatLimit(limit: number) {
  return Number.isFinite(limit) ? String(limit) : 'unlimited';
}

export function getPlanEntitlements(plan: SubscriptionPlan): PlanEntitlements {
  const canonicalPlan = normalizePlan(plan);
  const canonicalLimits = getBillingEntitlements(canonicalPlan);
  const unlimited = canonicalPlan === 'enterprise';

  return {
    plan,
    ...ENTITLEMENTS[plan],
    maxDocuments: unlimited ? Number.POSITIVE_INFINITY : canonicalLimits.documents,
    maxUsers: unlimited ? Number.POSITIVE_INFINITY : canonicalLimits.users,
    maxVendors: unlimited ? Number.POSITIVE_INFINITY : canonicalLimits.vendors,
    maxRisks: unlimited ? Number.POSITIVE_INFINITY : canonicalLimits.risks,
    employeeInvites: unlimited || canonicalLimits.users > 1,
  };
}

export async function getOrganizationEntitlements(organizationId: string): Promise<OrganizationEntitlements> {
  const authority = await getOrganizationBillingAuthority(organizationId);

  if (!authority.licensed) {
    return {
      plan: authority.plan,
      ...UNLICENSED_ENTITLEMENTS,
      licensed: false,
      authoritySource: 'none',
    };
  }

  return {
    ...getPlanEntitlements(authority.plan),
    licensed: true,
    authoritySource: authority.source,
  };
}

export async function assertPlanAtLeast(organizationId: string, minimumPlan: SubscriptionPlan) {
  const entitlements = await getOrganizationEntitlements(organizationId);

  if (!entitlements.licensed || !isPlanAtLeast(entitlements.plan, minimumPlan)) {
    return {
      ok: false as const,
      status: 402,
      error: 'upgrade_required',
      message: `${minimumPlan} plan required.`,
      requiredPlan: minimumPlan,
      entitlements,
    };
  }

  return { ok: true as const, entitlements };
}

export async function assertCsvExportsEnabled(organizationId: string) {
  const entitlements = await getOrganizationEntitlements(organizationId);

  if (!entitlements.licensed || !entitlements.csvExports) {
    return {
      ok: false as const,
      status: 402,
      error: 'upgrade_required',
      message: 'CSV exports require a paid plan.',
      entitlements,
    };
  }

  return { ok: true as const, entitlements };
}

export async function assertGdprSelfServiceEnabled(organizationId: string) {
  const entitlements = await getOrganizationEntitlements(organizationId);

  if (!entitlements.licensed || !entitlements.gdprSelfService) {
    return {
      ok: false as const,
      status: 402,
      error: 'upgrade_required',
      message: 'Self-service GDPR workflows require the Growth plan or higher.',
      entitlements,
    };
  }

  return { ok: true as const, entitlements };
}

export async function assertDocumentQuota(organizationId: string) {
  const entitlements = await getOrganizationEntitlements(organizationId);

  if (!entitlements.licensed) {
    return {
      ok: false as const,
      status: 402,
      error: 'subscription_required',
      message: 'An active paid subscription or signed contract is required.',
      entitlements,
      currentCount: 0,
    };
  }

  const supabase = createAdminClient();
  const { count, error } = await supabase
    .from('documents')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId);

  if (error) {
    console.warn('[billing] document_quota_count_failed', { code: error.code ?? 'unknown' });
    return {
      ok: false as const,
      status: 503,
      error: 'quota_unavailable',
      message: 'Document quota could not be verified. Please try again.',
      entitlements,
      currentCount: 0,
    };
  }

  const currentCount = count ?? 0;

  if (currentCount >= entitlements.maxDocuments) {
    return {
      ok: false as const,
      status: 402,
      error: 'document_quota_exceeded',
      message: `Document quota exceeded for the ${entitlements.plan} plan.`,
      entitlements,
      currentCount,
    };
  }

  return { ok: true as const, entitlements, currentCount };
}

function resourceQuotaLimit(entitlements: OrganizationEntitlements, resource: ResourceQuota) {
  return resource === 'vendors' ? entitlements.maxVendors : entitlements.maxRisks;
}

function resourceQuotaLabel(resource: ResourceQuota) {
  return resource === 'vendors' ? 'Vendor' : 'Risk';
}

async function countResourceRows(organizationId: string, resource: ResourceQuota) {
  const supabase = createAdminClient();
  const { count, error } = await supabase
    .from(resource)
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId);

  if (error) {
    console.warn('[billing] resource_quota_count_failed', {
      resource,
      code: error.code ?? 'unknown',
    });
    return { ok: false as const, currentCount: 0 };
  }

  return { ok: true as const, currentCount: count ?? 0 };
}

export async function assertResourceQuota(organizationId: string, resource: ResourceQuota) {
  const entitlements = await getOrganizationEntitlements(organizationId);

  if (!entitlements.licensed) {
    return {
      ok: false as const,
      status: 402,
      error: 'subscription_required',
      message: 'An active paid subscription or signed contract is required.',
      entitlements,
      currentCount: 0,
      maxAllowed: 0,
    };
  }

  const maxAllowed = resourceQuotaLimit(entitlements, resource);
  const label = resourceQuotaLabel(resource);

  if (maxAllowed <= 0) {
    return {
      ok: false as const,
      status: 402,
      error: 'upgrade_required',
      message: `${label} management is not included in the ${entitlements.plan} plan.`,
      entitlements,
      currentCount: 0,
      maxAllowed,
    };
  }

  if (!Number.isFinite(maxAllowed)) {
    return {
      ok: true as const,
      entitlements,
      currentCount: 0,
      maxAllowed,
    };
  }

  const countResult = await countResourceRows(organizationId, resource);
  if (!countResult.ok) {
    return {
      ok: false as const,
      status: 503,
      error: 'quota_unavailable',
      message: `${label} quota could not be verified. Please try again.`,
      entitlements,
      currentCount: 0,
      maxAllowed,
    };
  }

  if (countResult.currentCount >= maxAllowed) {
    return {
      ok: false as const,
      status: 402,
      error: `${resource}_quota_exceeded`,
      message: `${label} quota exceeded for the ${entitlements.plan} plan.`,
      entitlements,
      currentCount: countResult.currentCount,
      maxAllowed,
    };
  }

  return {
    ok: true as const,
    entitlements,
    currentCount: countResult.currentCount,
    maxAllowed,
  };
}

export async function verifyResourceQuotaAfterCreate(
  organizationId: string,
  resource: ResourceQuota,
  maxAllowed: number,
) {
  if (!Number.isFinite(maxAllowed)) {
    return { ok: true as const, currentCount: 0, maxAllowed };
  }

  const label = resourceQuotaLabel(resource);
  const countResult = await countResourceRows(organizationId, resource);
  if (!countResult.ok) {
    return {
      ok: false as const,
      status: 503,
      error: 'quota_unavailable',
      message: `${label} quota could not be verified after creation.`,
      currentCount: 0,
      maxAllowed,
    };
  }

  if (countResult.currentCount > maxAllowed) {
    return {
      ok: false as const,
      status: 402,
      error: `${resource}_quota_exceeded`,
      message: `${label} quota exceeded. The new record was not kept.`,
      currentCount: countResult.currentCount,
      maxAllowed,
    };
  }

  return {
    ok: true as const,
    currentCount: countResult.currentCount,
    maxAllowed,
  };
}
