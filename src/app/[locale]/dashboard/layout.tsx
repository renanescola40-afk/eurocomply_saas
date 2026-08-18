import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import DashboardChildI18nRuntime from '@/components/DashboardChildI18nRuntime';
import InventoryCsvExportRuntime from '@/components/InventoryCsvExportRuntime';
import InventoryDateI18nRuntime from '@/components/InventoryDateI18nRuntime';
import { EnterpriseDashboardShell } from '@/components/dashboard/enterprise-dashboard-shell';
import { getOrganizationBillingAuthority } from '@/server/queries/subscription';
import { getCurrentUser } from '@/server/queries/auth';
import { getUserOrganizationMemberships } from '@/server/queries/current-organization';
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
  const billingRecoveryRoute = isBillingRecoveryRoute(pathname, locale);
  const user = await getCurrentUser();
  const organization = user ? await getCurrentOrganizationForUser(user.id) : null;
  const authority = organization?.id ? await getOrganizationBillingAuthority(organization.id) : null;

  // Preserve the pre-redesign commercial boundary exactly: billing recovery remains
  // reachable without an existing paid licence, while every other dashboard surface
  // requires the same durable authority used before the enterprise shell existed.
  if (!billingRecoveryRoute) {
    if (!user) redirect(`/${locale}/login`);
    if (!organization?.id) redirect(`/${locale}/onboarding`);
    if (!authority?.licensed) {
      redirect(`/${locale}/pricing?billing=subscription_required`);
    }
  }

  const runtimeChildren = (
    <>
      <DashboardChildI18nRuntime />
      <InventoryDateI18nRuntime />
      <InventoryCsvExportRuntime />
      {children}
    </>
  );

  // Do not invent workspace identity on recovery routes if the downstream billing
  // page has not authenticated/resolved its organization yet.
  if (!user || !organization) {
    return runtimeChildren;
  }

  const memberships = await getUserOrganizationMemberships(user.id);
  const membership = memberships.find((candidate) => candidate.id === organization.id) ?? null;
  const userDisplayName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'RISCK COMPLY user';

  return (
    <EnterpriseDashboardShell
      locale={locale}
      organizationName={organization.name}
      userDisplayName={userDisplayName}
      role={membership?.role ?? 'unknown'}
      selectedPlan={authority?.licensed ? authority.plan : null}
    >
      {runtimeChildren}
    </EnterpriseDashboardShell>
  );
}
