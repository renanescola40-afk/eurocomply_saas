import { redirect } from 'next/navigation';
import { DashboardCommandNavigation } from '@/components/dashboard/dashboard-command-navigation';
import { getCurrentUser } from '@/server/queries/auth';
import { RisksClient } from './risks-client';

export default async function RisksPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,_hsl(var(--primary)/0.12),_transparent_32%),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--muted)/0.35))]">
      <DashboardCommandNavigation locale={locale} activePage="Evidence & Risk" />
      <RisksClient locale={locale} />
    </main>
  );
}
