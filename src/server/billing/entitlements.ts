import { getOrganizationPlan, type SubscriptionPlan } from '@/server/queries/subscription';

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

export async function assertPlanAtLeast(organizationId: string, _minimumPlan: SubscriptionPlan) {
  const entitlements = await getOrganizationEntitlements(organizationId);
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
  return { ok: true as const, entitlements, currentCount: 0 };
}
