import { redirect } from 'next/navigation';
import { UpgradeRequiredCard } from '@/components/billing/upgrade-required-card';
import { ReportsGovernancePage } from '@/components/dashboard/dashboard-overview';
import { getOrganizationEntitlements } from '@/server/billing/entitlements';
import { getCurrentUser } from '@/server/queries/auth';
import { getOrganizationDashboardData } from '@/server/queries/organization-dashboard';
import { isPlanAtLeast } from '@/server/queries/subscription';

export default async function OrganizationReportsGovernancePage({ params }: { params: { locale: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect(`/${params.locale}/login`);

  const data = await getOrganizationDashboardData(user.id);
  if (!data) redirect(`/${params.locale}/onboarding`);

  const dashboardBasePath = '/dashboard/organizations';
  const localizedDashboardBasePath = `/${params.locale}${dashboardBasePath}`;
  const entitlements = await getOrganizationEntitlements(data.organization.id);
  const canViewExecutiveReports = isPlanAtLeast(entitlements.plan, 'business');

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.16),_transparent_34%),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--muted)/0.34))]">
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 md:px-8 md:py-10">
        {canViewExecutiveReports ? (
          <ReportsGovernancePage summary={data.summary} tasks={data.tasks} trendHistory={data.trendHistory} trendComparison={data.trendComparison} basePath={localizedDashboardBasePath} topRisks={data.topRisks} vendorsRequiringReview={data.vendorsRequiringReview} documentsExpiringSoon={data.documentsExpiringSoon} />
        ) : (
          <UpgradeRequiredCard
            locale={params.locale}
            requiredPlan="Business"
            title="Relatórios executivos desbloqueiam a operação de compliance"
            description="O plano Business adiciona relatórios de governação, visão executiva, evidências prontas para auditoria e leitura consolidada de riscos para empresas em expansão europeia."
          />
        )}
      </div>
    </main>
  );
}
