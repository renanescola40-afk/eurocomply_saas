import { redirect } from 'next/navigation';
import { ScrollText } from 'lucide-react';

import { getCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser } from '@/server/queries/current-organization';
import { listAuditEvents } from '@/server/queries/audit-events';

function humanizeAuditValue(value: string) {
  return value
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export default async function AuditLogsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const organization = await getCurrentOrganizationForUser(user.id);

  if (!organization) {
    redirect(`/${locale}/onboarding`);
  }

  const events = await listAuditEvents(organization.id, 50);

  return (
    <main className="min-h-0 bg-transparent text-white">
      <header className="border-b border-slate-800 pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">Audit trail</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Audit logs</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
          Review organization activity, evidence actions and operational changes.
        </p>
      </header>

      <div className="mt-6">
        {events.length === 0 ? (
          <section className="rounded-xl border border-dashed border-slate-700 bg-[#0b121e] p-8 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800 text-slate-300">
              <ScrollText className="h-5 w-5" aria-hidden="true" />
            </div>
            <h2 className="mt-4 text-xl font-semibold tracking-tight">No audit activity yet.</h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Create an organization action such as uploading a document, inviting a member or changing billing to start building the activity trail.
            </p>
          </section>
        ) : (
          <section className="overflow-hidden rounded-xl border border-slate-800 bg-[#0b121e]" aria-label="Organization audit activity">
            <div className="divide-y divide-slate-800">
              {events.map((event) => (
                <article key={event.id} className="p-4 md:p-5">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between md:gap-6">
                    <div className="min-w-0">
                      <h2 className="font-semibold text-slate-100">{humanizeAuditValue(event.action)}</h2>
                      <p className="mt-1 break-words text-sm text-slate-400">
                        {humanizeAuditValue(event.entity_type)} · {event.entity_id ?? 'System'}
                      </p>
                    </div>
                    <time className="shrink-0 text-sm text-slate-400" dateTime={new Date(event.created_at).toISOString()}>
                      {new Date(event.created_at).toLocaleString(locale)}
                    </time>
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
