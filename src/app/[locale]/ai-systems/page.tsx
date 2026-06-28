import { redirect } from 'next/navigation';
import { DashboardCommandNavigation } from '@/components/dashboard/dashboard-command-navigation';
import { buildAiGovernanceReadiness } from '@/server/ai-governance/readiness';
import { getCurrentUser } from '@/server/queries/auth';
import { listAiIncidents } from '@/server/queries/ai-incidents';
import { listAiSystems } from '@/server/queries/ai-systems';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { AiSystemsClient } from './ai-systems-client';

export default async function AiSystemsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const organization = await getCurrentOrganizationForUser(user.id);
  const [systems, incidents] = organization
    ? await Promise.all([listAiSystems(organization.id), listAiIncidents(organization.id)])
    : [[], []];
  const readiness = buildAiGovernanceReadiness({ locale, systems, incidents });

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,_hsl(var(--primary)/0.12),_transparent_32%),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--muted)/0.35))]">
      <DashboardCommandNavigation locale={locale} activePage="AI Governance" />
      <AiSystemsClient locale={locale} initialSystems={systems} organizationName={organization?.name} readiness={readiness} />
    </main>
  );
}
