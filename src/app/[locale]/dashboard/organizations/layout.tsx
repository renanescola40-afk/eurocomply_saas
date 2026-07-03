import { unstable_noStore as noStore } from 'next/cache';

import { DashboardCommandNavigation } from '@/components/dashboard/dashboard-command-navigation';
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

  return (
    <div className="min-h-screen bg-background">
      <div className="print:hidden">
        <DashboardCommandNavigation locale={safeLocale} activePage="RISCK COMPLY" />
      </div>
      {children}
    </div>
  );
}
