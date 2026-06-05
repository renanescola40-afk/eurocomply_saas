import { redirect } from 'next/navigation';
import { DashboardOverview } from '@/components/dashboard/dashboard-overview';
import { getCurrentUser } from '@/server/queries/auth';
import { getOrganizationDashboardData } from '@/server/queries/organization-dashboard';

export default async function OrganizationDashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const data = await getOrganizationDashboardData(user.id);

  if (!data) {
    redirect('/onboarding');
  }

  return (
    <main className="min-h-screen bg-background px-6 py-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div>
          <p className="text-sm text-muted-foreground">Organization dashboard</p>
          <h1 className="text-3xl font-semibold tracking-tight">{data.organization.name}</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Monitor compliance tasks, vendors, risks and required evidence from one organization-first view.
          </p>
        </div>

        <DashboardOverview summary={data.summary} tasks={data.tasks} />
      </div>
    </main>
  );
}
