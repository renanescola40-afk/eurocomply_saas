import { redirect } from 'next/navigation';
import { DashboardCommandNavigation } from '@/components/dashboard/dashboard-command-navigation';
import { getCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { listAiSystems } from '@/server/queries/ai-systems';
import { listAiIncidents } from '@/server/queries/ai-incidents';
import { AiIncidentsClient } from './ai-incidents-client';

export default async function AiIncidentsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const organization = await getCurrentOrganizationForUser(user.id);
  const [incidents, systems] = organization
    ? await Promise.all([listAiIncidents(organization.id), listAiSystems(organization.id)])
    : [[], []];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,_hsl(var(--primary)/0.12),_transparent_32%),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--muted)/0.35))]">
      <DashboardCommandNavigation locale={locale} activePage="AI Governance" />
      <AiIncidentsClient locale={locale} initialIncidents={incidents} systems={systems} organizationName={organization?.name} />
    </main>
  );
}
