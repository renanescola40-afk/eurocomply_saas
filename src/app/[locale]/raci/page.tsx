import { redirect } from 'next/navigation';

import { DashboardCommandNavigation } from '@/components/dashboard/dashboard-command-navigation';
import { getCurrentUser } from '@/server/queries/auth';

import RaciClient from './raci-client';

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function RaciPage({ params }: PageProps) {
  const { locale } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-6 text-white">
      <div className="mx-auto max-w-7xl space-y-8">
        <DashboardCommandNavigation locale={locale} />
        <RaciClient locale={locale} />
      </div>
    </main>
  );
}
