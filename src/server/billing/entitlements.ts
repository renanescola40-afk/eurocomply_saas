import { getOrganizationPlan, isPlanAtLeast, type SubscriptionPlan } from '@/server/queries/subscription';
import { createAdminClient } from '@/lib/supabase/admin';

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

export async function getOrganizationEntitlements(organizationId: string): Promise<PlanEntitlements> {
  const plan = await getOrganizationPlan(organizationId);
  return { plan, ...ENTITLEMENTS[plan] };
}

export function formatLimit(limit: number) {
  return Number.isFinite(limit) ? String(limit) : 'unlimited';
}

export async function assertPlanAtLeast(organizationId: string, minimumPlan: SubscriptionPlan) {
  const entitlements = await getOrganizationEntitlements(organizationId);

  if (!isPlanAtLeast(entitlements.plan, minimumPlan)) {
    return {
      ok: false as const,
      status: 402,
      error: `${minimumPlan}_plan_required`,
      message: `This feature requires the ${minimumPlan} plan or higher.`,
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
      error: 'professional_plan_required',
      message: 'CSV exports require the Professional plan or higher.',
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
      error: 'professional_plan_required',
      message: 'Self-service GDPR exports require the Professional plan or higher.',
      entitlements,
    };
  }

  return { ok: true as const, entitlements };
}

export async function assertDocumentQuota(organizationId: string) {
  const entitlements = await getOrganizationEntitlements(organizationId);

  if (!Number.isFinite(entitlements.maxDocuments)) {
    return { ok: true as const, entitlements, currentCount: 0 };
  }

  const supabase = createAdminClient();

  if (!supabase) {
    return {
      ok: false as const,
      status: 503,
      error: 'billing_unavailable',
      message: 'Plan limits cannot be verified right now.',
      entitlements,
      currentCount: 0,
    };
  }

  const { count, error } = await supabase
    .from('documents')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId);

  if (error) {
    console.warn('[entitlements] document_quota_lookup_failed', { code: error.code ?? 'unknown' });
    return {
      ok: false as const,
      status: 503,
      error: 'quota_unavailable',
      message: 'Document quota cannot be verified right now.',
      entitlements,
      currentCount: 0,
    };
  }

  const currentCount = count ?? 0;

  if (currentCount >= entitlements.maxDocuments) {
    return {
      ok: false as const,
      status: 402,
      error: 'document_limit_reached',
      message: `Your ${entitlements.plan} plan includes up to ${formatLimit(entitlements.maxDocuments)} controlled documents.`,
      entitlements,
      currentCount,
    };
  }

  return { ok: true as const, entitlements, currentCount };
}
