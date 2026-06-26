import { createAdminClient } from '@/lib/supabase/admin';
import { getOrganizationPlan, isPlanAtLeast, normalizePlan, type SubscriptionPlan } from '@/server/queries/subscription';

export type PlanEntitlements = {
  plan: SubscriptionPlan;
  maxDocuments: number;
  maxUsers: number;
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

const ENTITLEMENTS: Record<SubscriptionPlan, Omit<PlanEntitlements, 'plan'>> = {
  essential: {
    maxDocuments: 10,
    maxUsers: 1,
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

export function formatLimit(limit: number) {
  return Number.isFinite(limit) ? String(limit) : 'unlimited';
}

export function getPlanEntitlements(plan: SubscriptionPlan): PlanEntitlements {
  return { plan, ...ENTITLEMENTS[plan] };
}

export async function getOrganizationEntitlements(organizationId: string): Promise<PlanEntitlements> {
  return getPlanEntitlements(await getOrganizationPlan(organizationId));
}

export async function assertPlanAtLeast(organizationId: string, minimumPlan: SubscriptionPlan) {
  const entitlements = await getOrganizationEntitlements(organizationId);

  if (!isPlanAtLeast(entitlements.plan, minimumPlan)) {
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

  if (!entitlements.csvExports) {
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

  if (!entitlements.gdprSelfService) {
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
