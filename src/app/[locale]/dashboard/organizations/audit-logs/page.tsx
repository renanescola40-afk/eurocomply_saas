import { redirect } from 'next/navigation';
import { ScrollText } from 'lucide-react';

import { getCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser } from '@/server/queries/current-organization';
import { listAuditEvents } from '@/server/queries/audit-events';

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
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 md:px-8">
      <section className="rounded-[2rem] border bg-background/90 p-6 shadow-sm md:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.26em] text-muted-foreground">Audit trail</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">Audit logs</h1>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          Review organization activity, evidence actions and operational changes.
        </p>
      </section>

      {events.length === 0 ? (
        <section className="rounded-[1.75rem] border border-dashed bg-muted/20 p-8 text-center">
          <ScrollText className="mx-auto h-8 w-8 text-muted-foreground" />
          <h2 className="mt-4 text-2xl font-semibold tracking-tight">No audit activity yet.</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Create an organization action such as uploading a document, inviting a member or changing billing to start building the activity trail.
          </p>
        </section>
      ) : (
        <section className="space-y-3">
          {events.map((event) => (
            <article key={event.id} className="rounded-2xl border bg-background p-4 shadow-sm">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="font-semibold">{event.action}</h2>
                  <p className="text-sm text-muted-foreground">{event.entity_type} · {event.entity_id ?? 'system'}</p>
                </div>
                <p className="text-sm text-muted-foreground">{new Date(event.created_at).toLocaleString('en-GB')}</p>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
