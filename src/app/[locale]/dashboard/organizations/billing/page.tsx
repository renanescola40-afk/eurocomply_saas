import { redirect } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { getCurrentUser } from '@/server/queries/auth';
import { getOrganizationBillingContext } from '@/server/queries/billing';
import { getCurrentOrganizationForUser } from '@/server/queries/current-organization';
import { BillingPageView } from './billing-page-view';

type BillingPageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ checkout?: string; billing_error?: string }>;
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

  return (
    <BillingPageView
      locale={locale}
      billing={billing}
      checkout={resolvedSearchParams.checkout}
      billingError={resolvedSearchParams.billing_error}
    />
  );
}
