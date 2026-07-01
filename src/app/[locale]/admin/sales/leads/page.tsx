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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.18),_transparent_34rem),linear-gradient(180deg,#050505_0%,#080b12_48%,#050505_100%)] text-white">
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-200/70">Internal Lead Operations</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">Sales Console</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/60">
              Internal lead operations for demo, trial and enterprise follow-up.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm text-white/70">
            <span className="block text-2xl font-semibold text-white">{result.count}</span>
            leads in current view
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          {METRIC_LABELS.map(([status, label]) => (
            <Link key={status} href={`/${safeLocale}/admin/sales/leads?status=${status}`} className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5 shadow-2xl transition hover:border-blue-200/35 hover:bg-white/[0.07]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">{label}</p>
              <p className="mt-3 text-3xl font-semibold text-white">{metrics[status]}</p>
            </Link>
          ))}
        </section>

        <form className="grid gap-3 rounded-[2rem] border border-white/10 bg-white/[0.04] p-4 shadow-2xl md:grid-cols-6" action={`/${safeLocale}/admin/sales/leads`}>
          <label className="space-y-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/50 md:col-span-2">
            Search
            <input name="search" defaultValue={filters.search ?? ''} placeholder="Company or email" className="h-11 w-full rounded-2xl border border-white/10 bg-black/35 px-4 text-sm text-white outline-none placeholder:text-white/25 focus:border-blue-200/40" />
          </label>
          <label className="space-y-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
            Status
            <select name="status" defaultValue={filters.status ?? ''} className="h-11 w-full rounded-2xl border border-white/10 bg-black/35 px-4 text-sm text-white outline-none focus:border-blue-200/40">
              <option value="">All</option>
              {SALES_LEAD_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
          <label className="space-y-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
            Priority
            <select name="priority" defaultValue={filters.priority ?? ''} className="h-11 w-full rounded-2xl border border-white/10 bg-black/35 px-4 text-sm text-white outline-none focus:border-blue-200/40">
              <option value="">All</option>
              {SALES_LEAD_PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
            </select>
          </label>
          <label className="space-y-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
            Source
            <input name="source" defaultValue={filters.source ?? ''} placeholder="book-demo" className="h-11 w-full rounded-2xl border border-white/10 bg-black/35 px-4 text-sm text-white outline-none placeholder:text-white/25 focus:border-blue-200/40" />
          </label>
          <div className="flex items-end gap-3 md:col-span-1">
            <button className="h-11 rounded-full bg-white px-5 text-sm font-semibold text-black transition hover:bg-zinc-200" type="submit">Filter</button>
          </div>
          <div className="flex items-end md:col-span-6">
            <Link href={`/${safeLocale}/admin/sales/leads`} className="inline-flex h-11 items-center rounded-full border border-white/10 px-5 text-sm font-semibold text-white/70 transition hover:border-white/25 hover:text-white">Clear filters</Link>
          </div>
        </form>

        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.035] shadow-2xl">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/10 text-sm">
              <thead className="bg-white/[0.04] text-left text-xs uppercase tracking-[0.18em] text-white/45">
                <tr>
                  <th className="px-5 py-4">Company</th>
                  <th className="px-5 py-4">Contact</th>
                  <th className="px-5 py-4">Email</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Priority</th>
                  <th className="px-5 py-4">Timeline</th>
                  <th className="px-5 py-4">Source</th>
                  <th className="px-5 py-4">Created</th>
                  <th className="px-5 py-4">Next follow-up</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 text-white/75">
                {result.leads.map((lead) => (
                  <tr key={lead.id} className="transition hover:bg-white/[0.04]">
                    <td className="px-5 py-4">
                      <Link href={`/${safeLocale}/admin/sales/leads/${lead.id}`} className="font-semibold text-white hover:text-blue-100">{lead.company_name}</Link>
                      <p className="mt-1 text-xs text-white/45">{lead.company_size ?? 'Unknown size'} · {lead.region ?? 'No region'}</p>
                    </td>
                    <td className="px-5 py-4">{lead.full_name}</td>
                    <td className="px-5 py-4 text-white/55">{lead.work_email}</td>
                    <td className="px-5 py-4"><span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs">{lead.status}</span></td>
                    <td className="px-5 py-4">{lead.priority}</td>
                    <td className="px-5 py-4">{lead.timeline ?? '—'}</td>
                    <td className="px-5 py-4">{lead.source}</td>
                    <td className="px-5 py-4">{formatDate(lead.created_at)}</td>
                    <td className="px-5 py-4">{formatDate(lead.next_follow_up_at)}</td>
                  </tr>
                ))}
                {result.leads.length === 0 ? (
                  <tr>
                    <td className="px-5 py-16 text-center" colSpan={9}>
                      <div className="mx-auto max-w-xl rounded-[2rem] border border-dashed border-white/10 bg-black/20 p-8">
                        <p className="text-lg font-semibold text-white">No leads yet</p>
                        <p className="mt-2 text-sm leading-6 text-white/55">When Early Access, demo or enterprise requests arrive through the public form, they will appear here for internal follow-up.</p>
                      </div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <nav className="flex items-center justify-between text-sm text-white/60">
          <Link aria-disabled={filters.page <= 1} className={`rounded-full border border-white/10 px-4 py-2 ${filters.page <= 1 ? 'pointer-events-none opacity-40' : 'hover:border-white/25 hover:text-white'}`} href={buildPageHref(safeLocale, rawSearchParams, Math.max(1, filters.page - 1))}>Previous</Link>
          <span>Page {filters.page} of {totalPages}</span>
          <Link aria-disabled={filters.page >= totalPages} className={`rounded-full border border-white/10 px-4 py-2 ${filters.page >= totalPages ? 'pointer-events-none opacity-40' : 'hover:border-white/25 hover:text-white'}`} href={buildPageHref(safeLocale, rawSearchParams, Math.min(totalPages, filters.page + 1))}>Next</Link>
        </nav>
      </div>
    </main>
  );
}
