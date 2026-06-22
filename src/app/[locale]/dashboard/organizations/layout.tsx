import { DashboardCommandNavigation } from '@/components/dashboard/dashboard-command-navigation';
import { routing, type Locale } from '@/lib/i18n/routing';

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function OrganizationDashboardLayout({ children, params }: Props) {
  const { locale } = await params;
  const safeLocale = routing.locales.includes(locale as Locale) ? locale : 'en';

  return (
    <div className="min-h-screen bg-background">
      <div className="print:hidden">
        <DashboardCommandNavigation locale={safeLocale} activePage="RISCK COMPLY" />
      </div>
      {children}
    </div>
  );
}
