import { redirect } from 'next/navigation';

import { DashboardCommandNavigation } from '@/components/dashboard/dashboard-command-navigation';
import { getOrganizationEntitlements } from '@/server/billing/entitlements';
import { getCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';

import ComplianceCalendarClient from './compliance-calendar-client';

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function ComplianceCalendarPage({ params }: PageProps) {
  const { locale } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const organization = await getCurrentOrganizationForUser(user.id);
  const entitlements = organization ? await getOrganizationEntitlements(organization.id) : null;
  const canUseAiSearch = entitlements?.aiCalendar === 'advanced';

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-6 text-white">
      <div className="mx-auto max-w-7xl space-y-8">
        <DashboardCommandNavigation locale={locale} />
        <ComplianceCalendarClient locale={locale} canUseAiSearch={canUseAiSearch} plan={entitlements?.plan ?? 'essential'} />
      </div>
    </main>
  );
}
