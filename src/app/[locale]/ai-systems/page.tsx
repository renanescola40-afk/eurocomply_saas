import { redirect } from 'next/navigation';

import { EnterpriseDashboardShell } from '@/components/dashboard/enterprise-dashboard-shell';
import { roleHasPermission } from '@/lib/security/permissions';
import { buildAiGovernanceReadiness } from '@/server/ai-governance/readiness';
import { getOrganizationBillingAuthority } from '@/server/queries/subscription';
import { getCurrentUser } from '@/server/queries/auth';
import { listAiIncidents } from '@/server/queries/ai-incidents';
import { listAiSystems } from '@/server/queries/ai-systems';
import { getCurrentOrganizationForUser } from '@/server/queries/current-organization';
import { AiSystemsClient } from './ai-systems-client';
import { AiSystemsReadonlyView } from './ai-systems-readonly-view';

export default async function AiSystemsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const organization = await getCurrentOrganizationForUser(user.id);
  const [systems, incidents, authority] = organization
    ? await Promise.all([
        listAiSystems(organization.id),
        listAiIncidents(organization.id),
        getOrganizationBillingAuthority(organization.id),
      ])
    : [[], [], null];
  const readiness = buildAiGovernanceReadiness({ locale, systems, incidents });
  const canManageAiGovernance = organization ? roleHasPermission(organization.role, 'manage_ai_governance') : false;
  const userDisplayName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'RISCK COMPLY user';

  const content = (
    <main className="min-h-0 bg-transparent text-white">
      {canManageAiGovernance ? (
        <AiSystemsClient locale={locale} initialSystems={systems} organizationName={organization?.name} readiness={readiness} />
      ) : (
        <AiSystemsReadonlyView locale={locale} systems={systems} organizationName={organization?.name} readiness={readiness} />
      )}
    </main>
  );

  if (!organization) {
    return <div className="min-h-screen bg-[#0b100f]">{content}</div>;
  }

  return (
    <EnterpriseDashboardShell
      locale={locale}
      organizationName={organization.name}
      userDisplayName={userDisplayName}
      role={organization.role}
      selectedPlan={authority?.plan}
    >
      {content}
    </EnterpriseDashboardShell>
  );
}
