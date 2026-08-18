import type { OrganizationPermission } from '@/lib/security/permissions';
import type { SubscriptionPlan } from '@/server/queries/subscription';

/**
 * Operational API permissions that must never be usable by an authenticated
 * but commercially unlicensed organization.
 *
 * `manage_team` is intentionally API-scoped instead of being added to the
 * global RBAC commercial set: onboarding uses the same RBAC capability as a
 * narrow pre-payment bootstrap operation. API team administration is paid
 * product; onboarding bootstrap is not.
 *
 * `manage_settings` is deliberately not defaulted here because account/GDPR
 * rights also reuse that permission. Paid security-control mutations opt in
 * explicitly at their route boundary.
 */
const API_DEFAULT_MINIMUM_PLAN_BY_PERMISSION: Partial<Record<OrganizationPermission, SubscriptionPlan>> = {
  manage_team: 'starter',
};

export function resolveApiCommercialMinimumPlan(
  permission: OrganizationPermission,
  explicitMinimumPlan?: SubscriptionPlan,
): SubscriptionPlan | undefined {
  return explicitMinimumPlan ?? API_DEFAULT_MINIMUM_PLAN_BY_PERMISSION[permission];
}
