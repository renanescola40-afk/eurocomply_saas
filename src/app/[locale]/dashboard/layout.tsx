import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import DashboardChildI18nRuntime from '@/components/DashboardChildI18nRuntime';
import InventoryCsvExportRuntime from '@/components/InventoryCsvExportRuntime';
import InventoryDateI18nRuntime from '@/components/InventoryDateI18nRuntime';
import { getOrganizationBillingAuthority } from '@/server/queries/subscription';
import { getCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

const INTERNAL_PATHNAME_HEADER = 'x-risck-internal-pathname';

function isBillingRecoveryRoute(pathname: string, locale: string) {
  const allowed = [
    `/${locale}/dashboard/billing`,
    `/${locale}/dashboard/organizations/billing`,
  ];

  return allowed.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const requestHeaders = await headers();
  const pathname = requestHeaders.get(INTERNAL_PATHNAME_HEADER) ?? '';

  // Billing recovery surfaces remain reachable so an authenticated organization
  // can purchase, retry or inspect billing without already holding a paid license.
  // Every other dashboard surface requires durable commercial authority.
  if (!isBillingRecoveryRoute(pathname, locale)) {
    const user = await getCurrentUser();
    if (!user) redirect(`/${locale}/login`);

    const organization = await getCurrentOrganizationForUser(user.id);
    if (!organization?.id) redirect(`/${locale}/onboarding`);

    const authority = await getOrganizationBillingAuthority(organization.id);
    if (!authority.licensed) {
      redirect(`/${locale}/pricing?billing=subscription_required`);
    }
  }

  return (
    <>
      <DashboardChildI18nRuntime />
      <InventoryDateI18nRuntime />
      <InventoryCsvExportRuntime />
      {children}
    </>
  );
}
