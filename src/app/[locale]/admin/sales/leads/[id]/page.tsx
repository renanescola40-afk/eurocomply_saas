import { unstable_noStore as noStore } from 'next/cache';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { locales, type Locale } from '@/lib/i18n/routing';
import { getCurrentUser } from '@/server/queries/auth';
import {
  getSalesLeadDetail,
  listSalesLeadActivities,
  listSalesLeadNotes,
  SALES_LEAD_PRIORITIES,
  SALES_LEAD_STATUSES,
  type SalesLeadStatus,
} from '@/server/queries/sales-leads';
import { PlatformAdminError, requirePlatformAdmin } from '@/server/security/platform-admin';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

type PageProps = {
  params: Promise<{ locale: string; id: string }>;
  searchParams?: Promise<{ salesError?: string }>;
};

const QUICK_ACTIONS: Array<[SalesLeadStatus, string]> = [
  ['qualified', 'Qualify'],
  ['demo_scheduled', 'Schedule demo'],
  ['proposal_sent', 'Mark proposal sent'],
  ['won', 'Mark won'],
  ['lost', 'Mark lost'],
];

function getSafeLocale(locale: string): Locale {
  return (locales.includes(locale as Locale) ? locale : 'en') as Locale;
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function toDateTimeLocal(value: string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return date.toISOString().slice(0, 16);
}

function formatMoney(cents: number | null, currency: string) {
  if (typeof cents !== 'number') return '—';
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(cents / 100);
}

async function requireSalesConsoleAccess(locale: Locale, id: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login?next=/${locale}/admin/sales/leads/${id}`);

  try {
    await requirePlatformAdmin(user.id);
  } catch (error) {
    if (error instanceof PlatformAdminError && error.status === 403) {
      redirect(`/${locale}/dashboard/organizations`);
    }
    throw error;
  }
}

export default async function SalesLeadDetailPage({ params, searchParams }: PageProps) {
  noStore();
  const { locale, id } = await params;
  const safeLocale = getSafeLocale(locale);
  const resolvedSearchParams = searchParams ? await searchParams : {};
  await requireSalesConsoleAccess(safeLocale, id);

  const [lead, notes, activities] = await Promise.all([
    getSalesLeadDetail(id),
    listSalesLeadNotes(id),
    listSalesLeadActivities(id),
  ]);

  if (!lead) notFound();

  const basePath = `/${safeLocale}/admin/sales/leads/${lead.id}`;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.18),_transparent_34rem),linear-gradient(180deg,#050505_0%,#080b12_48%,#050505_100%)] text-white">
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <Link href={`/${safeLocale}/admin/sales/leads`} className="text-sm font-semibold text-blue-100/70 transition hover:text-blue-50">← Back to Sales Console</Link>
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.28em] text-blue-200/70">Lead detail</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">{lead.company_name}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/60">{lead.full_name} · {lead.work_email} · {lead.role ?? 'Role not provided'}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm text-white/70">
            <span className="block text-2xl font-semibold text-white">{lead.status}</span>
            current status
          </div>
        </header>

        {resolvedSearchParams.salesError ? (
          <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-5 py-4 text-sm text-red-100">Sales Console update failed. Check the value and try again.</div>
        ) : null}

        <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-5">
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl">
              <h2 className="text-xl font-semibold">Lead intelligence</h2>
              <dl className="mt-5 grid gap-4 md:grid-cols-2">
                <div><dt className="text-xs uppercase tracking-[0.18em] text-white/40">Company size</dt><dd className="mt-1 text-white/80">{lead.company_size ?? '—'}</dd></div>
                <div><dt className="text-xs uppercase tracking-[0.18em] text-white/40">Region</dt><dd className="mt-1 text-white/80">{lead.region ?? '—'}</dd></div>
                <div><dt className="text-xs uppercase tracking-[0.18em] text-white/40">Timeline</dt><dd className="mt-1 text-white/80">{lead.timeline ?? '—'}</dd></div>
                <div><dt className="text-xs uppercase tracking-[0.18em] text-white/40">Source</dt><dd className="mt-1 text-white/80">{lead.source}</dd></div>
                <div><dt className="text-xs uppercase tracking-[0.18em] text-white/40">Created</dt><dd className="mt-1 text-white/80">{formatDate(lead.created_at)}</dd></div>
                <div><dt className="text-xs uppercase tracking-[0.18em] text-white/40">Next follow-up</dt><dd className="mt-1 text-white/80">{formatDate(lead.next_follow_up_at)}</dd></div>
                <div><dt className="text-xs uppercase tracking-[0.18em] text-white/40">Estimated value</dt><dd className="mt-1 text-white/80">{formatMoney(lead.estimated_value_cents, lead.currency)}</dd></div>
                <div><dt className="text-xs uppercase tracking-[0.18em] text-white/40">Plan interest</dt><dd className="mt-1 text-white/80">{lead.plan_interest ?? '—'}</dd></div>
                <div><dt className="text-xs uppercase tracking-[0.18em] text-white/40">Priority</dt><dd className="mt-1 text-white/80">{lead.priority}</dd></div>
                <div><dt className="text-xs uppercase tracking-[0.18em] text-white/40">Last contacted</dt><dd className="mt-1 text-white/80">{formatDate(lead.last_contacted_at)}</dd></div>
              </dl>
              <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4"><p className="text-xs uppercase tracking-[0.18em] text-white/40">Compliance drivers</p><p className="mt-2 text-sm leading-6 text-white/75">{lead.compliance_drivers ?? '—'}</p></div>
              <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4"><p className="text-xs uppercase tracking-[0.18em] text-white/40">Current process</p><p className="mt-2 text-sm leading-6 text-white/75">{lead.current_process ?? '—'}</p></div>
              <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4"><p className="text-xs uppercase tracking-[0.18em] text-white/40">Original message</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/75">{lead.message ?? '—'}</p></div>
              {lead.lost_reason ? <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-500/10 p-4"><p className="text-xs uppercase tracking-[0.18em] text-red-100/60">Lost reason</p><p className="mt-2 text-sm leading-6 text-red-50/80">{lead.lost_reason}</p></div> : null}
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl">
              <h2 className="text-xl font-semibold">Internal notes</h2>
              <p className="mt-2 text-sm leading-6 text-white/55">Keep notes concise and avoid unnecessary personal or sensitive data.</p>
              <form className="mt-5 space-y-3" method="post" action={`${basePath}/note`}>
                <input type="hidden" name="leadId" value={lead.id} />
                <textarea name="body" required maxLength={2000} rows={4} className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-blue-200/40" placeholder="Add a concise internal follow-up note..." />
                <button type="submit" className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-200">Add note</button>
              </form>
              <div className="mt-6 space-y-3">
                {notes.map((note) => <article key={note.id} className="rounded-2xl border border-white/10 bg-black/20 p-4"><p className="whitespace-pre-wrap text-sm leading-6 text-white/75">{note.body}</p><p className="mt-3 text-xs text-white/35">{formatDate(note.created_at)}</p></article>)}
                {notes.length === 0 ? <p className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-white/45">No internal notes yet.</p> : null}
              </div>
            </div>
          </div>

          <aside className="space-y-5">
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl">
              <h2 className="text-xl font-semibold">Quick actions</h2>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                {QUICK_ACTIONS.map(([status, label]) => (
                  <form key={status} method="post" action={`${basePath}/status`}>
                    <input type="hidden" name="leadId" value={lead.id} />
                    <input type="hidden" name="status" value={status} />
                    <button type="submit" className="w-full rounded-full border border-white/10 bg-black/30 px-4 py-2.5 text-sm font-semibold text-white/75 transition hover:border-blue-200/35 hover:text-white">{label}</button>
                  </form>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl">
              <h2 className="text-xl font-semibold">Lead operations</h2>
              <div className="mt-5 space-y-5">
                <form className="space-y-2" method="post" action={`${basePath}/status`}><input type="hidden" name="leadId" value={lead.id} /><label className="text-xs uppercase tracking-[0.18em] text-white/40">Status</label><div className="flex gap-2"><select name="status" defaultValue={lead.status} className="h-11 flex-1 rounded-2xl border border-white/10 bg-black/35 px-4 text-sm text-white outline-none focus:border-blue-200/40">{SALES_LEAD_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</select><button type="submit" className="rounded-full bg-white px-4 text-sm font-semibold text-black">Save</button></div></form>
                <form className="space-y-2" method="post" action={`${basePath}/priority`}><input type="hidden" name="leadId" value={lead.id} /><label className="text-xs uppercase tracking-[0.18em] text-white/40">Priority</label><div className="flex gap-2"><select name="priority" defaultValue={lead.priority} className="h-11 flex-1 rounded-2xl border border-white/10 bg-black/35 px-4 text-sm text-white outline-none focus:border-blue-200/40">{SALES_LEAD_PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority}</option>)}</select><button type="submit" className="rounded-full bg-white px-4 text-sm font-semibold text-black">Save</button></div></form>
                <form className="space-y-2" method="post" action={`${basePath}/follow-up`}><input type="hidden" name="leadId" value={lead.id} /><label htmlFor="next-follow-up-at" className="text-xs uppercase tracking-[0.18em] text-white/40">Next follow-up (UTC)</label><div className="flex gap-2"><input id="next-follow-up-at" name="nextFollowUpAt" type="datetime-local" defaultValue={toDateTimeLocal(lead.next_follow_up_at)} className="h-11 flex-1 rounded-2xl border border-white/10 bg-black/35 px-4 text-sm text-white outline-none focus:border-blue-200/40" /><button type="submit" className="rounded-full bg-white px-4 text-sm font-semibold text-black">Save</button></div></form>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl">
              <h2 className="text-xl font-semibold">Activity timeline</h2>
              <div className="mt-5 space-y-3">
                {activities.map((activity) => <article key={activity.id} className="rounded-2xl border border-white/10 bg-black/20 p-4"><p className="text-sm font-semibold text-white/85">{activity.type}</p><p className="mt-2 text-sm leading-6 text-white/65">{activity.body}</p><p className="mt-2 text-xs text-white/35">{formatDate(activity.created_at)}</p></article>)}
                {activities.length === 0 ? <p className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-white/45">No commercial activity yet.</p> : null}
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
