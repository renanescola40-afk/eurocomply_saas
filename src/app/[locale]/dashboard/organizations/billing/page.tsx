import { unstable_noStore as noStore } from 'next/cache';
import { redirect } from 'next/navigation';

import { getBillingPlan } from '@/lib/billing/plans';
import { getCurrentUser } from '@/server/queries/auth';
import { getOrganizationBillingContext } from '@/server/queries/billing';
import { getCurrentOrganizationForUser, getUserOrganizationMemberships } from '@/server/queries/current-organization';
import { canManageDashboardBilling } from '@/server/queries/organization-dashboard';
import { BillingPageView } from './billing-page-view';
import { BillingPlanIntentBanner } from './billing-plan-intent-banner';

type BillingPageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ checkout?: string; billing_error?: string; plan?: string }>;
};

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

function getPublicBillingFailureMessage(locale: string) {
  switch (locale) {
    case 'pt':
      return 'Tente novamente. Se o problema continuar, contacte o suporte.';
    case 'es':
      return 'Inténtalo de nuevo. Si el problema continúa, contacta con soporte.';
    case 'fr':
      return 'Réessayez. Si le problème persiste, contactez le support.';
    case 'it':
      return 'Riprova. Se il problema persiste, contatta l’assistenza.';
    case 'de':
      return 'Versuchen Sie es erneut. Wenn das Problem weiterhin besteht, wenden Sie sich an den Support.';
    default:
      return 'Please try again. If the problem continues, contact support.';
  }
}

export default async function BillingPage({ params, searchParams }: BillingPageProps) {
  noStore();

  const { locale } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const validationOrganizationOverride = process.env.RISCK_COMPLY_BILLING_VALIDATION_ORGANIZATION_ID?.trim();
  let organization = await getCurrentOrganizationForUser(user.id);

  if (process.env.RISCK_COMPLY_PAID_BILLING_REQUIRED !== 'true' && validationOrganizationOverride) {
    const memberships = await getUserOrganizationMemberships(user.id);
    const validationMembership = memberships.find((membership) => membership.organization_id === validationOrganizationOverride);
    if (validationMembership) organization = validationMembership;
  }

  if (!organization) {
    redirect(`/${locale}/dashboard`);
  }

  const billing = await getOrganizationBillingContext(organization.id);
  const canManageBilling = canManageDashboardBilling(organization.role);
  const selectedPlan = getBillingPlan(resolvedSearchParams.plan);
  const billingError = resolvedSearchParams.billing_error
    ? getPublicBillingFailureMessage('en')
    : undefined;

  return (
    <div className="min-h-0 space-y-4 bg-transparent">
      {selectedPlan ? (
        <BillingPlanIntentBanner
          locale={locale}
          selectedPlan={selectedPlan}
          canManageBilling={canManageBilling}
          billingAuthority={billing.authority}
        />
      ) : null}
      <BillingPageView
        locale={locale}
        billing={billing}
        canManageBilling={canManageBilling}
        checkout={resolvedSearchParams.checkout}
        billingError={billingError}
      />
    </div>
  );
}
