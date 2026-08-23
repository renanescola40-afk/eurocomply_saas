import { getBillingPlan } from '@/lib/billing/plans';
import { getCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser } from '@/server/queries/current-organization';
import { getOrganizationBillingAuthority } from '@/server/queries/subscription';

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

  // No tenant exists yet: the narrow onboarding entry may create the single
  // purchase-context organization shell required to bind checkout.
  if (!currentOrganization) {
    return `/${locale}/onboarding`;
  }

  try {
    const authority = await getOrganizationBillingAuthority(currentOrganization.id);

    if (!authority.licensed) {
      return getPaymentRequiredPath(locale, currentOrganization.selected_plan);
    }

    // Product onboarding is post-license. A paid tenant that has not completed
    // activation goes to onboarding; an unlicensed tenant never reaches it.
    if (!currentOrganization.is_onboarding_completed) {
      return `/${locale}/onboarding`;
    }

    return null;
  } catch (error) {
    console.warn('[dashboard-access] commercial_authority_lookup_failed', {
      organizationId: currentOrganization.id,
      errorName: error instanceof Error ? error.name : 'unknown',
    });

    // Fail closed without inventing a free tier. Purchase/recovery surfaces are
    // intentionally outside the paid product boundary.
    return getPaymentRequiredPath(locale, currentOrganization.selected_plan);
  }
}
