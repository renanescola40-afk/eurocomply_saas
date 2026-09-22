import { redirect } from 'next/navigation';
import { AuthenticatedProductShell } from '@/components/dashboard/authenticated-product-shell';
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
  if (!organization) {
    redirect(`/${locale}/onboarding`);
  }

  const [incidents, systems] = await Promise.all([
    listAiIncidents(organization.id),
    listAiSystems(organization.id),
  ]);

  const content = (
    <main className="min-h-0 bg-transparent">
      <AiIncidentsClient locale={locale} initialIncidents={incidents} systems={systems} organizationName={organization.name} />
    </main>
  );

  return <AuthenticatedProductShell locale={locale}>{content}</AuthenticatedProductShell>;
}
