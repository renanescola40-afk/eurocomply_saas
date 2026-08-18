import { unstable_noStore as noStore } from 'next/cache';

import { routing, type Locale } from '@/lib/i18n/routing';
import { getOrganizationDashboardRedirect } from '@/server/queries/organization-dashboard-access';

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function OrganizationDashboardLayout({ children, params }: Props) {
  noStore();

  const { locale } = await params;
  const safeLocale = routing.locales.includes(locale as Locale) ? locale : 'en';
  const redirectTarget = await getOrganizationDashboardRedirect(safeLocale);

  if (redirectTarget) {
    const navigation = await import('next/navigation');
    navigation.redirect(redirectTarget);
  }

  return children;
}
