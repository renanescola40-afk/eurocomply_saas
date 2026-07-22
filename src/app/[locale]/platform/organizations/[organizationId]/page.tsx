import { unstable_noStore as noStore } from 'next/cache';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { z } from 'zod';

import { locales, type Locale } from '@/lib/i18n/routing';
import { getPlatformEnterpriseOrganizationDetail } from '@/server/enterprise/platform-directory';
import { getCurrentUser } from '@/server/queries/auth';
import {
  PlatformAdminError,
  requirePlatformCapability,
} from '@/server/security/platform-admin';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

type PageProps = { params: Promise<{ locale: string; organizationId: string }> };

function safeLocale(value: string): Locale {
  return (locales.includes(value as Locale) ? value : 'en') as Locale;
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function text(value: unknown, fallback = '—') {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function number(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? new Intl.NumberFormat('en-GB').format(parsed) : '—';
}

function date(value: unknown) {
  if (typeof value !== 'string' || !value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? '—'
    : new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(parsed);
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/40">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      {hint ? <p className="mt-1 text-xs text-white/40">{hint}</p> : null}
    </div>
  );
}

export default async function PlatformOrganizationDetailPage({ params }: PageProps) {
  noStore();
  const resolved = await params;
  const locale = safeLocale(resolved.locale);
  const organizationId = z.string().uuid().safeParse(resolved.organizationId);
  if (!organizationId.success) notFound();

  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login?next=/${locale}/platform/organizations/${organizationId.data}`);

  try {
    await requirePlatformCapability(user.id, 'organizations');
  } catch (error) {
    if (error instanceof PlatformAdminError && error.status === 403) {
      redirect(`/${locale}/dashboard/organizations`);
    }
    throw error;
  }

  const detail = await getPlatformEnterpriseOrganizationDetail({
    actorUserId: user.id,
    organizationId: organizationId.data,
  });
  if (detail.outcome === 'not_found') notFound();

  const organization = object(detail.organization);
  const contract = object(detail.contract);
  const limits = object(detail.limits);
  const usage = object(detail.usage);
  const features = object(detail.features);
  const jobs = object(detail.jobs);
  const identity = object(detail.identity);
  const alerts = object(detail.alerts);
  const committedMembers = Number(usage.activeMembers ?? 0) + Number(usage.pendingInvitations ?? 0);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.18),_transparent_34rem),linear-gradient(180deg,#050505_0%,#080b12_48%,#050505_100%)] text-white">
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <Link className="text-sm text-blue-200/70 hover:text-blue-100" href={`/${locale}/platform/organizations`}>← Enterprise organizations</Link>
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.28em] text-blue-200/70">Tenant operations</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">{text(organization.name, 'Enterprise organization')}</h1>
            <p className="mt-3 text-sm text-white/45">{text(organization.slug, organizationId.data)} · {organizationId.data}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white/70 hover:border-white/25 hover:text-white" href={`/${locale}/platform`}>
              Open controls
            </Link>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Contract" value={text(contract.status, 'uncontracted')} hint={text(contract.code, 'No negotiated contract')} />
          <Stat label="Billing" value={text(contract.billingStatus, 'unlinked')} hint={text(contract.paymentMethod, 'No method')} />
          <Stat label="Committed members" value={number(committedMembers)} hint={`${number(limits.members)} licensed`} />
          <Stat label="Open alerts" value={number(alerts.open)} hint={`${number(alerts.critical)} at 100%`} />
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 shadow-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-200/70">Contract and billing</p>
            <dl className="mt-5 grid gap-4 sm:grid-cols-2 text-sm">
              {[
                ['Contract ID', text(contract.id)],
                ['Version', number(contract.version)],
                ['Annual value', `${number(contract.annualValueMinor)} ${text(contract.currency, '')}`.trim()],
                ['Starts', date(contract.startsAt)],
                ['Ends', date(contract.endsAt)],
                ['Renews', date(contract.renewsAt)],
                ['Payment due', date(contract.paymentDueAt)],
                ['Created', date(organization.createdAt)],
              ].map(([label, value]) => (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4" key={label}>
                  <dt className="text-xs uppercase tracking-[0.16em] text-white/40">{label}</dt>
                  <dd className="mt-2 break-words text-white/80">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 shadow-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-200/70">Licensed capacity</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <Stat label="Members" value={`${number(committedMembers)} / ${number(limits.members)}`} />
              <Stat label="Full users" value={`${number(usage.fullUsers)} / ${number(limits.fullUsers)}`} />
              <Stat label="Participants" value={`${number(usage.participants)} / ${number(limits.participants)}`} />
              <Stat label="Viewers" value={`${number(usage.viewers)} / ${number(limits.viewers)}`} />
              <Stat label="Admins" value={`${number(usage.activeAdmins)} / ${number(limits.admins)}`} />
              <Stat label="Pending invites" value={number(usage.pendingInvitations)} />
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-3">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-200/70">Features</p>
            <div className="mt-5 space-y-3 text-sm text-white/70">
              {Object.entries(features).map(([key, value]) => (
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3" key={key}>
                  <span>{key}</span><span>{value === true ? 'Enabled' : 'Disabled'}</span>
                </div>
              ))}
              {Object.keys(features).length === 0 ? <p className="text-white/40">No negotiated features.</p> : null}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-200/70">Provisioning and identity</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <Stat label="Jobs" value={number(jobs.total)} hint={`${number(jobs.queued)} queued · ${number(jobs.processing)} processing`} />
              <Stat label="Identity connections" value={number(identity.connections)} hint={`${number(identity.activeScimTokens)} active SCIM tokens`} />
              <Stat label="Enforced SSO" value={number(identity.enforcedSso)} />
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-200/70">Additional limits</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <Stat label="Legal entities" value={number(limits.legalEntities)} />
              <Stat label="AI systems" value={number(limits.aiSystems)} />
              <Stat label="Storage bytes" value={number(limits.storageBytes)} />
              <Stat label="Audit retention" value={`${number(limits.auditRetentionDays)} days`} />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
