import { unstable_noStore as noStore } from 'next/cache';
import { redirect } from 'next/navigation';

import { getBillingPlan } from '@/lib/billing/plans';
import { getCurrentUser } from '@/server/queries/auth';
import { getOrganizationBillingContext } from '@/server/queries/billing';
import { getCurrentOrganizationForUser } from '@/server/queries/current-organization';
import { canManageDashboardBilling } from '@/server/queries/organization-dashboard';
import { BillingPageView } from './billing-page-view';
import { BillingPlanIntentBanner } from './billing-plan-intent-banner';

type BillingPageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ checkout?: string; billing_error?: string; plan?: string }>;
};

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export default async function BillingPage({ params, searchParams }: BillingPageProps) {
  noStore();

  const { locale } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const organization = await getCurrentOrganizationForUser(user.id);

  if (!organization) {
    redirect(`/${locale}/dashboard`);
  }

  const billing = await getOrganizationBillingContext(organization.id);
  const canManageBilling = canManageDashboardBilling(organization.role);
  const selectedPlan = getBillingPlan(resolvedSearchParams.plan);

  return (
    <div className="min-h-screen bg-[#03070b]">
      {selectedPlan ? (
        <BillingPlanIntentBanner
          locale={locale}
          selectedPlan={selectedPlan}
          canManageBilling={canManageBilling}
        />
      ) : null}
      <BillingPageView
        locale={locale}
        billing={billing}
        canManageBilling={canManageBilling}
        checkout={resolvedSearchParams.checkout}
        billingError={resolvedSearchParams.billing_error}
      />
    </div>
  );
}
