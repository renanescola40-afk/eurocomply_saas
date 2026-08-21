import { unstable_noStore as noStore } from 'next/cache';
import { headers } from 'next/headers';

import { routing, type Locale } from '@/lib/i18n/routing';
import {
  classifyLocalizedCommercialRoute,
  INTERNAL_PATHNAME_HEADER,
} from '@/lib/security/commercial-route-policy';
import { getOrganizationDashboardRedirect } from '@/server/queries/organization-dashboard-access';

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function OrganizationDashboardLayout({ children, params }: Props) {
  noStore();

  const { locale } = await params;
  const safeLocale = routing.locales.includes(locale as Locale) ? locale : 'en';
  const requestHeaders = await headers();
  const pathname = requestHeaders.get(INTERNAL_PATHNAME_HEADER) ?? '';
  const commercialRouteClass = classifyLocalizedCommercialRoute(pathname, safeLocale);

  // Billing recovery is the only organization-dashboard descendant that must
  // remain reachable before onboarding and paid authority are complete. The
  // outer locale and dashboard layouts enforce the same canonical exception;
  // every missing/unknown route context still classifies as licensed_product.
  if (commercialRouteClass === 'billing_recovery') {
    return children;
  }

  const redirectTarget = await getOrganizationDashboardRedirect(safeLocale);

  if (redirectTarget) {
    const navigation = await import('next/navigation');
    navigation.redirect(redirectTarget);
  }

  return children;
}
