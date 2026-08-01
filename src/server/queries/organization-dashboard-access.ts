import { getBillingPlan } from '@/lib/billing/plans';
import { getCurrentUser } from '@/server/queries/auth';
import { getOrganizationBillingContext } from '@/server/queries/billing';
import { getCurrentOrganizationForUser } from '@/server/queries/current-organization';

const PAID_ACCESS_STATUSES = new Set(['active', 'trialing']);

function getPaymentRequiredPath(locale: string, selectedPlanId: string | null) {
  const selectedPlan = getBillingPlan(selectedPlanId) ?? getBillingPlan('starter');

  if (selectedPlan?.salesLed) {
    return `/${locale}/contact?intent=sales&plan=${encodeURIComponent(selectedPlan.id)}&access=required`;
  }

  const planId = selectedPlan?.id ?? 'starter';
  return `/${locale}/checkout?plan=${encodeURIComponent(planId)}&checkout=required`;
}

export async function getOrganizationDashboardRedirect(locale: string) {
  const user = await getCurrentUser();

  if (!user) {
    return `/${locale}/login?next=${encodeURIComponent(`/${locale}/dashboard/organizations`)}`;
  }

  const currentOrganization = await getCurrentOrganizationForUser(user.id);

  if (!currentOrganization || !currentOrganization.is_onboarding_completed) {
    return `/${locale}/onboarding`;
  }

  try {
    const billing = await getOrganizationBillingContext(currentOrganization.id);
    if (billing.status && PAID_ACCESS_STATUSES.has(billing.status)) {
      return null;
    }
  } catch (error) {
    console.warn('[dashboard-access] billing_entitlement_lookup_failed', {
      organizationId: currentOrganization.id,
      message: error instanceof Error ? error.message : 'unknown',
    });
  }

  return getPaymentRequiredPath(locale, currentOrganization.selected_plan);
}
