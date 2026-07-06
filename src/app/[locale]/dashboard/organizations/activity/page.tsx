import { unstable_noStore as noStore } from 'next/cache';
import { redirect } from 'next/navigation';

import { getCurrentUser } from '@/server/queries/auth';
import { getOrganizationDashboardData } from '@/server/queries/organization-dashboard';

type PageProps = {
  params: Promise<{ locale: string }>;
};

function formatWhen(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unknown time' : date.toLocaleString('en-GB');
}

export default async function OrganizationActivityPage({ params }: PageProps) {
  noStore();
  const { locale } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const data = await getOrganizationDashboardData(user.id);

  if (!data) {
    redirect(`/${locale}/onboarding`);
  }

  return (
    <main className="min-h-screen bg-[#050505] px-5 py-8 text-white lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.22em] text-white/40">{data.organization.name}</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">Activity timeline</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55">
            Recent organization events from the same persisted activity stream used by the dashboard.
          </p>
        </div>

        {data.auditEvents.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-white/10 bg-white/[0.03] p-8 text-center">
            <h2 className="text-2xl font-semibold tracking-tight">No activity yet</h2>
            <p className="mt-2 text-sm text-white/55">Create systems, tasks, documents, vendors or risks to populate this timeline.</p>
          </section>
        ) : (
          <section className="space-y-3">
            {data.auditEvents.map((event) => (
              <article key={event.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="font-medium text-white">{event.action}</h2>
                    <p className="mt-1 text-sm text-white/55">{event.entity_type} {event.entity_id ? `· ${event.entity_id.slice(0, 8)}` : ''}</p>
                  </div>
                  <p className="text-xs text-white/45">{formatWhen(event.created_at)}</p>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
