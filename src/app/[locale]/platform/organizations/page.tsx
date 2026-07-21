import { unstable_noStore as noStore } from 'next/cache';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { locales, type Locale } from '@/lib/i18n/routing';
import { listPlatformEnterpriseOrganizations } from '@/server/enterprise/platform-directory';
import { getCurrentUser } from '@/server/queries/auth';
import {
  PlatformAdminError,
  requirePlatformCapability,
} from '@/server/security/platform-admin';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

const CONTRACT_STATUSES = [
  'uncontracted',
  'draft',
  'pending_activation',
  'active',
  'past_due',
  'grace_period',
  'read_only',
  'suspended',
  'expired',
  'terminated',
] as const;

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function safeLocale(value: string): Locale {
  return (locales.includes(value as Locale) ? value : 'en') as Locale;
}

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function buildHref(locale: string, input: { search?: string; status?: string; page: number }) {
  const params = new URLSearchParams();
  if (input.search) params.set('search', input.search);
  if (input.status) params.set('status', input.status);
  params.set('page', String(input.page));
  return `/${locale}/platform/organizations?${params.toString()}`;
}

function number(value: number) {
  return new Intl.NumberFormat('en-GB').format(value);
}

export default async function PlatformOrganizationsPage({ params, searchParams }: PageProps) {
  noStore();
  const { locale } = await params;
  const resolvedLocale = safeLocale(locale);
  const user = await getCurrentUser();
  if (!user) redirect(`/${resolvedLocale}/login?next=/${resolvedLocale}/platform/organizations`);

  try {
    await requirePlatformCapability(user.id, 'organizations');
  } catch (error) {
    if (error instanceof PlatformAdminError && error.status === 403) {
      redirect(`/${resolvedLocale}/dashboard/organizations`);
    }
    throw error;
  }

  const raw = searchParams ? await searchParams : {};
  const search = one(raw.search)?.trim() ?? '';
  const requestedStatus = one(raw.status)?.trim() ?? '';
  const status = CONTRACT_STATUSES.includes(requestedStatus as (typeof CONTRACT_STATUSES)[number])
    ? requestedStatus
    : '';
  const page = positiveInteger(one(raw.page), 1);
  const result = await listPlatformEnterpriseOrganizations({
    actorUserId: user.id,
    search,
    contractStatus: status,
    page,
    pageSize: 50,
  });

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.18),_transparent_34rem),linear-gradient(180deg,#050505_0%,#080b12_48%,#050505_100%)] text-white">
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-200/70">Platform Control Center</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">Enterprise organizations</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-white/60">
              Search tenants and review contract, billing, committed capacity and open usage alerts without exposing employee data.
            </p>
          </div>
          <Link className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200" href={`/${resolvedLocale}/platform/organizations/new`}>
            Create tenant
          </Link>
        </header>

        <form action={`/${resolvedLocale}/platform/organizations`} className="grid gap-4 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 md:grid-cols-[1fr_16rem_auto]">
          <label className="space-y-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/50">
            Search
            <input className="h-11 w-full rounded-2xl border border-white/10 bg-black/35 px-4 text-sm text-white outline-none placeholder:text-white/25 focus:border-blue-200/45" defaultValue={search} name="search" placeholder="Name, slug, UUID or contract code" />
          </label>
          <label className="space-y-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/50">
            Contract status
            <select className="h-11 w-full rounded-2xl border border-white/10 bg-black/35 px-4 text-sm text-white outline-none focus:border-blue-200/45" defaultValue={status} name="status">
              <option value="">All</option>
              {CONTRACT_STATUSES.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <div className="flex items-end gap-3">
            <button className="h-11 rounded-full bg-white px-5 text-sm font-semibold text-black" type="submit">Filter</button>
            <Link className="h-11 rounded-full border border-white/10 px-5 py-3 text-sm text-white/65" href={`/${resolvedLocale}/platform/organizations`}>Clear</Link>
          </div>
        </form>

        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.035] shadow-2xl">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/10 text-sm">
              <thead className="bg-white/[0.04] text-left text-xs uppercase tracking-[0.16em] text-white/45">
                <tr>
                  <th className="px-5 py-4">Organization</th>
                  <th className="px-5 py-4">Contract</th>
                  <th className="px-5 py-4">Billing</th>
                  <th className="px-5 py-4">Capacity</th>
                  <th className="px-5 py-4">Alerts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 text-white/75">
                {result.organizations.map((organization) => (
                  <tr className="transition hover:bg-white/[0.04]" key={organization.organizationId}>
                    <td className="px-5 py-4">
                      <Link className="font-semibold text-white hover:text-blue-100" href={`/${resolvedLocale}/platform/organizations/${organization.organizationId}`}>
                        {organization.name}
                      </Link>
                      <p className="mt-1 text-xs text-white/40">{organization.slug ?? organization.organizationId}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs">{organization.contractStatus}</span>
                      <p className="mt-2 text-xs text-white/40">{organization.contractCode ?? 'No negotiated contract'}</p>
                    </td>
                    <td className="px-5 py-4">{organization.billingStatus}</td>
                    <td className="px-5 py-4">
                      <span className="font-semibold text-white">{number(organization.committedMembers)}</span>
                      <span className="text-white/40"> / {number(organization.memberLimit)}</span>
                      <p className="mt-1 text-xs text-white/40">{number(organization.availableMembers)} available</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={organization.openAlerts > 0 ? 'font-semibold text-amber-200' : 'text-white/45'}>{organization.openAlerts}</span>
                    </td>
                  </tr>
                ))}
                {result.organizations.length === 0 ? (
                  <tr><td className="px-5 py-16 text-center text-white/50" colSpan={5}>No organizations match these filters.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <nav className="flex items-center justify-between text-sm text-white/60">
          <Link aria-disabled={result.page <= 1} className={`rounded-full border border-white/10 px-4 py-2 ${result.page <= 1 ? 'pointer-events-none opacity-40' : 'hover:border-white/25 hover:text-white'}`} href={buildHref(resolvedLocale, { search, status, page: Math.max(1, result.page - 1) })}>Previous</Link>
          <span>Page {result.page} of {result.totalPages} · {number(result.total)} organizations</span>
          <Link aria-disabled={result.page >= result.totalPages} className={`rounded-full border border-white/10 px-4 py-2 ${result.page >= result.totalPages ? 'pointer-events-none opacity-40' : 'hover:border-white/25 hover:text-white'}`} href={buildHref(resolvedLocale, { search, status, page: Math.min(result.totalPages, result.page + 1) })}>Next</Link>
        </nav>
      </div>
    </main>
  );
}
