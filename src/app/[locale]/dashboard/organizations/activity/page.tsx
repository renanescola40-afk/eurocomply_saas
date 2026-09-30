import { unstable_noStore as noStore } from 'next/cache';
import { redirect } from 'next/navigation';
import { Activity } from 'lucide-react';

import { getCurrentUser } from '@/server/queries/auth';
import { getOrganizationDashboardData } from '@/server/queries/organization-dashboard';

type PageProps = {
  params: Promise<{ locale: string }>;
};

function formatWhen(value: string | null | undefined) {
  if (!value) return 'Unknown time';
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
    <main className="min-h-0 bg-transparent text-white">
      <div className="w-full space-y-6">
        <header className="border-b border-slate-800 pb-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-400">{data.organization.name}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-white">Activity timeline</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            Recent organization events from persisted dashboard activity data.
          </p>
        </header>

        {data.auditEvents.length === 0 ? (
          <section className="rounded-xl border border-dashed border-slate-700 bg-[#0b121e] p-8 text-center" role="status">
            <Activity className="mx-auto h-5 w-5 text-blue-400" aria-hidden="true" />
            <h2 className="mt-3 text-sm font-semibold text-slate-100">No activity yet</h2>
            <p className="mt-1 text-sm leading-6 text-slate-400">Create organization records to populate this timeline.</p>
          </section>
        ) : (
          <section className="overflow-hidden rounded-xl border border-slate-800 bg-[#0b121e]" aria-label="Organization activity">
            <div className="divide-y divide-slate-800/80">
              {data.auditEvents.map((event) => (
                <article key={event.id} className="px-5 py-4 transition hover:bg-[#0e1827] sm:px-6">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h2 className="text-sm font-semibold text-slate-100">{event.action}</h2>
                      <p className="mt-1 text-xs text-slate-500">{event.entity_type ?? 'organization activity'}</p>
                    </div>
                    <p className="shrink-0 text-xs text-slate-600">{formatWhen(event.created_at)}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
