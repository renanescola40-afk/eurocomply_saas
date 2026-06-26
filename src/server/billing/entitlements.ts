import { createAdminClient } from '@/lib/supabase/admin';
import { getOrganizationPlan, isPlanAtLeast, type SubscriptionPlan } from '@/server/queries/subscription';

export type PlanEntitlements = {
  plan: SubscriptionPlan;
  maxDocuments: number;
  maxUsers: number;
  csvExports: boolean;
  auditLog: boolean;
};

const ENTITLEMENTS: Record<SubscriptionPlan, Omit<PlanEntitlements, 'plan'>> = {
  starter: { maxDocuments: 40, maxUsers: 3, csvExports: true, auditLog: true },
  growth: { maxDocuments: 250, maxUsers: 15, csvExports: true, auditLog: true },
  enterprise: { maxDocuments: 10000, maxUsers: 250, csvExports: true, auditLog: true },
};

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
  return { ok: true as const, entitlements };
}

export async function assertGdprSelfServiceEnabled(organizationId: string) {
  const entitlements = await getOrganizationEntitlements(organizationId);
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
