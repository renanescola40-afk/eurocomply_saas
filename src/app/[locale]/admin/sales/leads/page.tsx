import { unstable_noStore as noStore } from 'next/cache';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { locales, type Locale } from '@/lib/i18n/routing';
import { getCurrentUser } from '@/server/queries/auth';
import {
  getSalesLeadMetrics,
  listSalesLeads,
  normalizeSalesLeadFilters,
  SALES_LEAD_PRIORITIES,
  SALES_LEAD_STATUSES,
  type SalesLeadStatus,
} from '@/server/queries/sales-leads';
import { PlatformAdminError, requirePlatformAdmin } from '@/server/security/platform-admin';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const METRIC_LABELS: Array<[SalesLeadStatus, string]> = [
  ['new', 'New leads'],
  ['qualified', 'Qualified'],
  ['demo_scheduled', 'Demo scheduled'],
  ['proposal_sent', 'Proposal sent'],
  ['won', 'Won'],
  ['lost', 'Lost'],
];

function getSafeLocale(locale: string): Locale {
  return (locales.includes(locale as Locale) ? locale : 'en') as Locale;
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

async function requireSalesConsoleAccess(locale: Locale) {
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login?next=/${locale}/admin/sales/leads`);

  try {
    await requirePlatformAdmin(user.id);
  } catch (error) {
    if (error instanceof PlatformAdminError && error.status === 403) {
      redirect(`/${locale}/dashboard/organizations`);
    }
    throw error;
  }

  return user;
}

function buildPageHref(locale: Locale, searchParams: Record<string, string | string[] | undefined>, page: number) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    const current = Array.isArray(value) ? value[0] : value;
    if (current && key !== 'page') params.set(key, current);
  }
  params.set('page', String(page));
  return `/${locale}/admin/sales/leads?${params.toString()}`;
}

const fieldClass = 'h-10 w-full rounded-lg border border-slate-800 bg-[#0d1624] px-3 text-sm text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-blue-500/60 focus-visible:ring-2 focus-visible:ring-blue-500/20';
const filterLabelClass = 'space-y-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500';

export default async function SalesLeadsPage({ params, searchParams }: PageProps) {
  noStore();
  const { locale } = await params;
  const safeLocale = getSafeLocale(locale);
  const rawSearchParams = searchParams ? await searchParams : {};
  await requireSalesConsoleAccess(safeLocale);

  const filters = normalizeSalesLeadFilters(rawSearchParams);
  const [result, metrics] = await Promise.all([listSalesLeads(filters), getSalesLeadMetrics()]);
  const totalPages = Math.max(1, Math.ceil(result.count / result.pageSize));

  return (
    <main className="min-h-screen bg-[#080e18] text-white">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-5 border-b border-slate-800 pb-5 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0 max-w-3xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-400">Internal lead operations</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-slate-100">Sales Console</h1>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Internal lead operations for demo, trial and enterprise follow-up.
            </p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-[#0d1624] px-4 py-3 text-sm text-slate-500">
            <span className="block font-mono text-xl font-semibold tabular-nums text-slate-100">{result.count}</span>
            leads in current view
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6" aria-label="Lead status metrics">
          {METRIC_LABELS.map(([status, label]) => (
            <Link key={status} href={`/${safeLocale}/admin/sales/leads?status=${status}`} className="rounded-xl border border-slate-800 bg-[#0b121e] p-4 transition hover:border-blue-500/40 hover:bg-[#0e1827] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-600">{label}</p>
              <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-slate-100">{metrics[status]}</p>
            </Link>
          ))}
        </section>

        <form className="grid gap-4 rounded-xl border border-slate-800 bg-[#0b121e] p-5 md:grid-cols-6" action={`/${safeLocale}/admin/sales/leads`}>
          <label className={`${filterLabelClass} md:col-span-2`}>
            Search
            <input name="search" defaultValue={filters.search ?? ''} placeholder="Company or email" className={fieldClass} />
          </label>
          <label className={filterLabelClass}>
            Status
            <select name="status" defaultValue={filters.status ?? ''} className={fieldClass}>
              <option value="">All</option>
              {SALES_LEAD_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
          <label className={filterLabelClass}>
            Priority
            <select name="priority" defaultValue={filters.priority ?? ''} className={fieldClass}>
              <option value="">All</option>
              {SALES_LEAD_PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
            </select>
          </label>
          <label className={filterLabelClass}>
            Source
            <input name="source" defaultValue={filters.source ?? ''} placeholder="book-demo" className={fieldClass} />
          </label>
          <div className="flex items-end">
            <button className="h-10 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40" type="submit">Filter</button>
          </div>
          <div className="flex items-end md:col-span-6">
            <Link href={`/${safeLocale}/admin/sales/leads`} className="inline-flex h-10 items-center rounded-lg border border-slate-700 bg-[#0d1624] px-4 text-sm font-semibold text-slate-300 transition hover:border-blue-500/50 hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30">Clear filters</Link>
          </div>
        </form>

        <section className="overflow-hidden rounded-xl border border-slate-800 bg-[#0b121e]" aria-label="Sales leads">
          <div className="overflow-x-auto">
            <table className="min-w-[1100px] w-full border-collapse text-sm">
              <thead className="bg-[#080e18] text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-600">
                <tr className="border-b border-slate-800">
                  <th className="px-5 py-3">Company</th>
                  <th className="px-5 py-3">Contact</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Priority</th>
                  <th className="px-5 py-3">Timeline</th>
                  <th className="px-5 py-3">Source</th>
                  <th className="px-5 py-3">Created</th>
                  <th className="px-5 py-3">Next follow-up</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-400">
                {result.leads.map((lead) => (
                  <tr key={lead.id} className="transition hover:bg-[#0e1827]">
                    <td className="px-5 py-4">
                      <Link href={`/${safeLocale}/admin/sales/leads/${lead.id}`} className="font-semibold text-slate-100 transition hover:text-blue-300">{lead.company_name}</Link>
                      <p className="mt-1 text-xs text-slate-600">{lead.company_size ?? 'Unknown size'} · {lead.region ?? 'No region'}</p>
                    </td>
                    <td className="px-5 py-4">{lead.full_name}</td>
                    <td className="px-5 py-4 text-slate-500">{lead.work_email}</td>
                    <td className="px-5 py-4"><span className="rounded-md border border-slate-800 bg-[#0d1624] px-2 py-1 text-xs text-slate-300">{lead.status}</span></td>
                    <td className="px-5 py-4">{lead.priority}</td>
                    <td className="px-5 py-4">{lead.timeline ?? '—'}</td>
                    <td className="px-5 py-4">{lead.source}</td>
                    <td className="px-5 py-4">{formatDate(lead.created_at)}</td>
                    <td className="px-5 py-4">{formatDate(lead.next_follow_up_at)}</td>
                  </tr>
                ))}
                {result.leads.length === 0 ? (
                  <tr>
                    <td className="px-5 py-12 text-center" colSpan={9}>
                      <div className="mx-auto max-w-xl">
                        <p className="text-sm font-semibold text-slate-100">No leads yet</p>
                        <p className="mt-2 text-sm leading-6 text-slate-400">When Early Access, demo or enterprise requests arrive through the public form, they will appear here for internal follow-up.</p>
                      </div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <nav className="flex items-center justify-between gap-4 text-sm text-slate-500" aria-label="Lead pagination">
          <Link aria-disabled={filters.page <= 1} className={`inline-flex h-10 items-center rounded-lg border border-slate-700 bg-[#0d1624] px-4 ${filters.page <= 1 ? 'pointer-events-none opacity-40' : 'transition hover:border-blue-500/50 hover:text-white'}`} href={buildPageHref(safeLocale, rawSearchParams, Math.max(1, filters.page - 1))}>Previous</Link>
          <span>Page {filters.page} of {totalPages}</span>
          <Link aria-disabled={filters.page >= totalPages} className={`inline-flex h-10 items-center rounded-lg border border-slate-700 bg-[#0d1624] px-4 ${filters.page >= totalPages ? 'pointer-events-none opacity-40' : 'transition hover:border-blue-500/50 hover:text-white'}`} href={buildPageHref(safeLocale, rawSearchParams, Math.min(totalPages, filters.page + 1))}>Next</Link>
        </nav>
      </div>
    </main>
  );
}
