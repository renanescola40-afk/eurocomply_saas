import { redirect } from 'next/navigation';
import { CommandCenterPage } from '@/components/dashboard/dashboard-overview';
import { getCurrentUser } from '@/server/queries/auth';
import { getOrganizationDashboardData } from '@/server/queries/organization-dashboard';

export default async function OrganizationCommandCenterPage({ params }: { params: { locale: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect(`/${params.locale}/login`);

  const data = await getOrganizationDashboardData(user.id);
  if (!data) redirect(`/${params.locale}/onboarding`);

  const dashboardBasePath = '/dashboard/organizations';
  const localizedDashboardBasePath = `/${params.locale}${dashboardBasePath}`;

  return (
    <main className="min-h-0 bg-transparent text-white">
      <div className="w-full space-y-6">
        <CommandCenterPage summary={data.summary} tasks={data.tasks} trendHistory={data.trendHistory} trendComparison={data.trendComparison} basePath={localizedDashboardBasePath} topRisks={data.topRisks} vendorsRequiringReview={data.vendorsRequiringReview} documentsExpiringSoon={data.documentsExpiringSoon} />
      </div>
    </main>
  );
}
