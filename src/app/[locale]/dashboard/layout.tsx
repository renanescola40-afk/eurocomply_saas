import type { Metadata } from 'next';
import { headers } from 'next/headers';

import DashboardChildI18nRuntime from '@/components/DashboardChildI18nRuntime';
import InventoryCsvExportRuntime from '@/components/InventoryCsvExportRuntime';
import InventoryDateI18nRuntime from '@/components/InventoryDateI18nRuntime';
import { EnterpriseDashboardShell } from '@/components/dashboard/enterprise-dashboard-shell';
import {
  classifyLocalizedCommercialRoute,
  INTERNAL_PATHNAME_HEADER,
} from '@/lib/security/commercial-route-policy';
import { requireLicensedCommercialPageAccess } from '@/server/security/commercial-access';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

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
  const commercialRouteClass = classifyLocalizedCommercialRoute(pathname, locale);

  const runtimeChildren = (
    <>
      <DashboardChildI18nRuntime />
      <InventoryDateI18nRuntime />
      <InventoryCsvExportRuntime />
      {children}
    </>
  );

  // Billing recovery is deliberately reachable by authenticated organizations
  // that are not licensed yet. It owns its purchase/retry state and must never
  // be trapped behind the very subscription it is intended to recover.
  if (commercialRouteClass === 'billing_recovery') {
    return runtimeChildren;
  }

  // Defense in depth: the locale layout already enforces the same canonical
  // boundary for licensed product routes. React request-level cache in the
  // resolver prevents duplicate authority queries across nested layouts.
  const { user, organization, authority } = await requireLicensedCommercialPageAccess({
    locale,
    pathname,
  });

  const userDisplayName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'RISCK COMPLY user';

  return (
    <EnterpriseDashboardShell
      locale={locale}
      organizationName={organization.name}
      userDisplayName={userDisplayName}
      role={organization.role}
      selectedPlan={authority.plan}
    >
      {runtimeChildren}
    </EnterpriseDashboardShell>
  );
}
