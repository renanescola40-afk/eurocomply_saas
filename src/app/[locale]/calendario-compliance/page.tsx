import { redirect } from 'next/navigation';

import { DashboardCommandNavigation } from '@/components/dashboard/dashboard-command-navigation';
import { getCurrentUser } from '@/server/queries/auth';

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

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-6 text-white">
      <div className="mx-auto max-w-7xl space-y-8">
        <DashboardCommandNavigation locale={locale} active="command-center" />
        <ComplianceCalendarClient locale={locale} />
      </div>
    </main>
  );
}
