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

const fieldClass = 'h-10 w-full rounded-lg border border-slate-800 bg-[#0d1624] px-3 text-sm text-slate-200 outline-none transition focus:border-blue-500/60 focus-visible:ring-2 focus-visible:ring-blue-500/20';
const panelClass = 'rounded-xl border border-slate-800 bg-[#0b121e] p-5 sm:p-6';
const labelClass = 'text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-600';
const secondaryButtonClass = 'inline-flex h-10 items-center justify-center rounded-lg border border-slate-700 bg-[#0d1624] px-4 text-sm font-semibold text-slate-300 transition hover:border-blue-500/50 hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30';
const primaryButtonClass = 'inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40';

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
    <main className="min-h-screen bg-[#080e18] text-white">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-5 border-b border-slate-800 pb-5 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0 max-w-3xl">
            <Link href={`/${safeLocale}/admin/sales/leads`} className="text-sm font-semibold text-blue-400 transition hover:text-blue-300">← Back to Sales Console</Link>
            <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-400">Lead detail</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-slate-100">{lead.company_name}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-400">{lead.full_name} · {lead.work_email} · {lead.role ?? 'Role not provided'}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-[#0d1624] px-4 py-3 text-sm text-slate-500">
            <span className="block text-sm font-semibold text-slate-100">{lead.status}</span>
            current status
          </div>
        </header>

        {resolvedSearchParams.salesError ? (
          <div className="rounded-lg border border-rose-500/25 bg-rose-500/[0.08] px-4 py-3 text-sm text-rose-100" role="alert">Sales Console update failed. Check the value and try again.</div>
        ) : null}

        <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-5">
            <div className={panelClass}>
              <h2 className="text-sm font-semibold text-slate-100">Lead intelligence</h2>
              <dl className="mt-5 grid gap-4 md:grid-cols-2">
                <Meta label="Company size" value={lead.company_size ?? '—'} />
                <Meta label="Region" value={lead.region ?? '—'} />
                <Meta label="Timeline" value={lead.timeline ?? '—'} />
                <Meta label="Source" value={lead.source} />
                <Meta label="Created" value={formatDate(lead.created_at)} />
                <Meta label="Next follow-up" value={formatDate(lead.next_follow_up_at)} />
                <Meta label="Estimated value" value={formatMoney(lead.estimated_value_cents, lead.currency)} />
                <Meta label="Plan interest" value={lead.plan_interest ?? '—'} />
                <Meta label="Priority" value={lead.priority} />
                <Meta label="Last contacted" value={formatDate(lead.last_contacted_at)} />
              </dl>
              <DetailBlock label="Compliance drivers" value={lead.compliance_drivers ?? '—'} />
              <DetailBlock label="Current process" value={lead.current_process ?? '—'} />
              <DetailBlock label="Original message" value={lead.message ?? '—'} preserveWhitespace />
              {lead.lost_reason ? (
                <div className="mt-4 rounded-lg border border-rose-500/20 bg-rose-500/[0.08] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-rose-300/70">Lost reason</p>
                  <p className="mt-2 text-sm leading-6 text-rose-100/85">{lead.lost_reason}</p>
                </div>
              ) : null}
            </div>

            <div className={panelClass}>
              <h2 className="text-sm font-semibold text-slate-100">Internal notes</h2>
              <p className="mt-1 text-sm leading-6 text-slate-400">Keep notes concise and avoid unnecessary personal or sensitive data.</p>
              <form className="mt-5 space-y-3" method="post" action={`${basePath}/note`}>
                <input type="hidden" name="leadId" value={lead.id} />
                <textarea name="body" required maxLength={2000} rows={4} className="min-h-28 w-full resize-y rounded-lg border border-slate-800 bg-[#0d1624] px-3 py-2 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-blue-500/60 focus-visible:ring-2 focus-visible:ring-blue-500/20" placeholder="Add a concise internal follow-up note..." />
                <button type="submit" className={primaryButtonClass}>Add note</button>
              </form>
              <div className="mt-6 divide-y divide-slate-800/80 overflow-hidden rounded-lg border border-slate-800">
                {notes.map((note) => (
                  <article key={note.id} className="bg-[#0d1624] p-4">
                    <p className="whitespace-pre-wrap text-sm leading-6 text-slate-300">{note.body}</p>
                    <p className="mt-3 text-xs text-slate-600">{formatDate(note.created_at)}</p>
                  </article>
                ))}
                {notes.length === 0 ? <p className="bg-[#0d1624] p-5 text-sm text-slate-500" role="status">No internal notes yet.</p> : null}
              </div>
            </div>
          </div>

          <aside className="space-y-5">
            <div className={panelClass}>
              <h2 className="text-sm font-semibold text-slate-100">Quick actions</h2>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {QUICK_ACTIONS.map(([status, label]) => (
                  <form key={status} method="post" action={`${basePath}/status`}>
                    <input type="hidden" name="leadId" value={lead.id} />
                    <input type="hidden" name="status" value={status} />
                    <button type="submit" className={`${secondaryButtonClass} w-full`}>{label}</button>
                  </form>
                ))}
              </div>
            </div>

            <div className={panelClass}>
              <h2 className="text-sm font-semibold text-slate-100">Lead operations</h2>
              <div className="mt-5 space-y-5">
                <form className="space-y-1.5" method="post" action={`${basePath}/status`}>
                  <input type="hidden" name="leadId" value={lead.id} />
                  <label className={labelClass}>Status</label>
                  <div className="flex flex-col gap-2 sm:flex-row"><select name="status" defaultValue={lead.status} className={`${fieldClass} flex-1`}>{SALES_LEAD_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</select><button type="submit" className={primaryButtonClass}>Save</button></div>
                </form>
                <form className="space-y-1.5" method="post" action={`${basePath}/priority`}>
                  <input type="hidden" name="leadId" value={lead.id} />
                  <label className={labelClass}>Priority</label>
                  <div className="flex flex-col gap-2 sm:flex-row"><select name="priority" defaultValue={lead.priority} className={`${fieldClass} flex-1`}>{SALES_LEAD_PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority}</option>)}</select><button type="submit" className={primaryButtonClass}>Save</button></div>
                </form>
                <form className="space-y-1.5" method="post" action={`${basePath}/follow-up`}>
                  <input type="hidden" name="leadId" value={lead.id} />
                  <label htmlFor="next-follow-up-at" className={labelClass}>Next follow-up (UTC)</label>
                  <div className="flex flex-col gap-2 sm:flex-row"><input id="next-follow-up-at" name="nextFollowUpAt" type="datetime-local" defaultValue={toDateTimeLocal(lead.next_follow_up_at)} className={`${fieldClass} flex-1`} /><button type="submit" className={primaryButtonClass}>Save</button></div>
                </form>
              </div>
            </div>

            <div className={panelClass}>
              <h2 className="text-sm font-semibold text-slate-100">Activity timeline</h2>
              <div className="mt-4 divide-y divide-slate-800/80 overflow-hidden rounded-lg border border-slate-800">
                {activities.map((activity) => (
                  <article key={activity.id} className="bg-[#0d1624] p-4">
                    <p className="text-sm font-semibold text-slate-200">{activity.type}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">{activity.body}</p>
                    <p className="mt-2 text-xs text-slate-600">{formatDate(activity.created_at)}</p>
                  </article>
                ))}
                {activities.length === 0 ? <p className="bg-[#0d1624] p-5 text-sm text-slate-500" role="status">No commercial activity yet.</p> : null}
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return <div><dt className={labelClass}>{label}</dt><dd className="mt-1 text-sm text-slate-300">{value}</dd></div>;
}

function DetailBlock({ label, value, preserveWhitespace = false }: { label: string; value: string; preserveWhitespace?: boolean }) {
  return (
    <div className="mt-4 rounded-lg border border-slate-800 bg-[#0d1624] p-4">
      <p className={labelClass}>{label}</p>
      <p className={`mt-2 text-sm leading-6 text-slate-300 ${preserveWhitespace ? 'whitespace-pre-wrap' : ''}`}>{value}</p>
    </div>
  );
}
