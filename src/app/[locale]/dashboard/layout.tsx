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

  const runtimeChildren = (
    <>
      <DashboardChildI18nRuntime />
      <InventoryDateI18nRuntime />
      <InventoryCsvExportRuntime />
      {children}
    </>
  );

  // Preserve the pre-redesign billing recovery boundary exactly. These routes are
  // intentionally allowed to resolve their own auth/purchase/retry state and must
  // not acquire a new shell-level subscription dependency.
  if (billingRecoveryRoute) {
    return runtimeChildren;
  }

  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);

  const organization = await getCurrentOrganizationForUser(user.id);
  if (!organization?.id) redirect(`/${locale}/onboarding`);

  const authority = await getOrganizationBillingAuthority(organization.id);
  if (!authority.licensed) {
    redirect(`/${locale}/pricing?billing=subscription_required`);
  }

  // Membership data is presentation-only here. It cannot grant access or alter the
  // licensed plan; those decisions remain bound to the existing organization and
  // durable billing authority above.
  const memberships = await getUserOrganizationMemberships(user.id);
  const membership = memberships.find((candidate) => candidate.id === organization.id) ?? null;
  const userDisplayName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'RISCK COMPLY user';

  return (
    <EnterpriseDashboardShell
      locale={locale}
      organizationName={organization.name}
      userDisplayName={userDisplayName}
      role={membership?.role ?? 'unknown'}
      selectedPlan={authority.plan}
    >
      {runtimeChildren}
    </EnterpriseDashboardShell>
  );
}
