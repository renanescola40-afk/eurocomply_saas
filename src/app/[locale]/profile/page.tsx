import { unstable_noStore as noStore } from 'next/cache';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowUpRight, Bell, Building2, CreditCard, ShieldCheck, UserRound, UsersRound } from 'lucide-react';

import { EnterpriseDashboardShell } from '@/components/dashboard/enterprise-dashboard-shell';
import { ProfilePersonalControls } from '@/components/profile/profile-personal-controls';
import { roleHasPermission } from '@/lib/security/permissions';
import { locales, type Locale } from '@/lib/i18n/routing';
import { getCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser } from '@/server/queries/current-organization';
import { canManageDashboardBilling } from '@/server/queries/organization-dashboard';
import { getOrganizationBillingAuthority } from '@/server/queries/subscription';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

type ProfileCopy = {
  eyebrow: string;
  title: string;
  body: string;
  personal: string;
  personalBody: string;
  name: string;
  email: string;
  workspace: string;
  workspaceBody: string;
  organization: string;
  role: string;
  accountControls: string;
  notifications: string;
  privacy: string;
  orgSettings: string;
  team: string;
  billing: string;
  addOns: string;
  restricted: string;
};

const ENGLISH_COPY: ProfileCopy = { eyebrow: 'Personal account', title: 'Your profile, without workspace administration mixed in.', body: 'Personal identity stays here. Organization settings, team access, add-ons and billing live in their own dedicated areas.', personal: 'Personal identity', personalBody: 'Identity currently verified by your authenticated account.', name: 'Name', email: 'Email', workspace: 'Workspace membership', workspaceBody: 'Your organization context and role are read from server-side membership data.', organization: 'Organization', role: 'Role', accountControls: 'Account controls', notifications: 'Notifications', privacy: 'Privacy controls', orgSettings: 'Organization settings', team: 'Team & access', billing: 'Billing', addOns: 'Add-ons', restricted: 'Available to authorized workspace administrators only.' };
const copyByLocale: Record<Locale, ProfileCopy> = {
  en: ENGLISH_COPY,
  pt: ENGLISH_COPY,
  es: ENGLISH_COPY,
  fr: ENGLISH_COPY,
  it: ENGLISH_COPY,
  de: ENGLISH_COPY,
};


function initials(firstName?: string | null, lastName?: string | null, email?: string | null) {
  const value = `${firstName ?? ''} ${lastName ?? ''}`.trim();
  if (value) return value.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');
  return email?.slice(0, 2).toUpperCase() ?? 'RC';
}

export default async function ProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  noStore();

  const { locale } = await params;
  const safeLocale = (locales.includes(locale as Locale) ? locale : 'en') as Locale;
  const copy = copyByLocale[safeLocale];
  const user = await getCurrentUser();

  if (!user) redirect(`/${safeLocale}/login?next=${encodeURIComponent(`/${safeLocale}/profile`)}`);

  const organization = await getCurrentOrganizationForUser(user.id);
  const authority = organization ? await getOrganizationBillingAuthority(organization.id) : null;
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'RISCK COMPLY user';
  const canManageTeam = organization ? roleHasPermission(organization.role, 'manage_team') : false;
  const canManageSettings = organization ? roleHasPermission(organization.role, 'manage_settings') : false;
  const canManageBilling = organization ? canManageDashboardBilling(organization.role) : false;
  const localized = (path: string) => `/${safeLocale}${path}`;

  const accountLinks = [
    { href: localized('/notificacoes'), label: copy.notifications, Icon: Bell },
    { href: localized('/dashboard/privacy'), label: copy.privacy, Icon: ShieldCheck },
    canManageSettings ? { href: localized('/settings/organization'), label: copy.orgSettings, Icon: Building2 } : null,
    canManageTeam ? { href: localized('/dashboard/organizations/team'), label: copy.team, Icon: UsersRound } : null,
    canManageBilling ? { href: localized('/dashboard/organizations/billing'), label: copy.billing, Icon: CreditCard } : null,
    canManageBilling ? { href: localized('/dashboard/organizations/add-ons'), label: copy.addOns, Icon: Building2 } : null,
  ].filter(Boolean) as Array<{ href: string; label: string; Icon: typeof Bell }>;

  const content = (
    <main className="min-h-0 bg-transparent text-white">
      <div className="w-full space-y-6">
        <header className="border-b border-white/[0.07] pb-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-300/70">{copy.eyebrow}</p>
          <h1 className="mt-2 max-w-4xl text-3xl font-semibold tracking-[-0.04em] text-white">{copy.title}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/48">{copy.body}</p>
        </header>

        <section className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
          <article className="overflow-hidden rounded-xl border border-white/[0.075] bg-[#0d1522]">
            <div className="flex items-center gap-4 border-b border-white/[0.06] px-5 py-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-blue-400/20 bg-blue-500/15 text-sm font-black text-blue-100">
                {initials(user.firstName, user.lastName, user.email)}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-300/60">{copy.personal}</p>
                <h2 className="mt-1 truncate text-lg font-semibold text-white/90">{displayName}</h2>
                <p className="mt-0.5 text-xs text-white/36">{copy.personalBody}</p>
              </div>
            </div>
            <dl className="divide-y divide-white/[0.055] px-5">
              <div className="grid gap-1 py-4 sm:grid-cols-[9rem_1fr] sm:items-center"><dt className="text-sm text-white/36">{copy.name}</dt><dd className="text-sm font-medium text-white/82">{displayName}</dd></div>
              <div className="grid gap-1 py-4 sm:grid-cols-[9rem_1fr] sm:items-center"><dt className="text-sm text-white/36">{copy.email}</dt><dd className="break-all text-sm font-medium text-white/82">{user.email ?? '—'}</dd></div>
            </dl>
          </article>

          <article className="overflow-hidden rounded-xl border border-white/[0.075] bg-[#0d1522]">
            <div className="flex items-center gap-3 border-b border-white/[0.06] px-5 py-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-blue-400/20 bg-blue-500/10 text-blue-300"><Building2 className="h-4 w-4" aria-hidden="true" /></div>
              <div>
                <h2 className="text-sm font-semibold text-white/88">{copy.workspace}</h2>
                <p className="mt-0.5 text-xs text-white/34">{copy.workspaceBody}</p>
              </div>
            </div>
            <dl className="divide-y divide-white/[0.055] px-5">
              <div className="grid gap-1 py-4 sm:grid-cols-[9rem_1fr]"><dt className="text-sm text-white/36">{copy.organization}</dt><dd className="text-sm font-medium text-white/82">{organization?.name ?? '—'}</dd></div>
              <div className="grid gap-1 py-4 sm:grid-cols-[9rem_1fr]"><dt className="text-sm text-white/36">{copy.role}</dt><dd className="text-sm font-medium capitalize text-blue-100/80">{organization?.role ?? '—'}</dd></div>
            </dl>
          </article>
        </section>

        <ProfilePersonalControls locale={safeLocale} />

        <section className="overflow-hidden rounded-xl border border-white/[0.075] bg-[#0d1522]" aria-labelledby="account-controls-title">
          <div className="flex items-center gap-3 border-b border-white/[0.06] px-5 py-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-blue-400/20 bg-blue-500/10 text-blue-300"><UserRound className="h-4 w-4" aria-hidden="true" /></div>
            <h2 id="account-controls-title" className="text-sm font-semibold text-white/88">{copy.accountControls}</h2>
          </div>
          <div className="grid gap-px bg-white/[0.055] sm:grid-cols-2 lg:grid-cols-3">
            {accountLinks.map(({ href, label, Icon }) => (
              <Link key={href} href={href} className="group flex min-h-20 items-center justify-between gap-4 bg-[#0d1522] px-5 py-4 transition hover:bg-blue-500/[0.055] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400/60">
                <div className="flex min-w-0 items-center gap-3">
                  <Icon className="h-4 w-4 shrink-0 text-blue-300/80" aria-hidden="true" />
                  <span className="font-medium text-white/66 transition group-hover:text-white">{label}</span>
                </div>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-white/22 transition group-hover:text-blue-300" aria-hidden="true" />
              </Link>
            ))}
          </div>
          {!canManageSettings && !canManageTeam && !canManageBilling ? <p className="border-t border-white/[0.055] px-5 py-4 text-sm text-white/40">{copy.restricted}</p> : null}
        </section>
      </div>
    </main>
  );

  if (!organization) {
    return <div className="min-h-screen bg-[#07101a] p-4 md:p-6">{content}</div>;
  }

  return (
    <EnterpriseDashboardShell
      locale={safeLocale}
      organizationName={organization.name}
      userDisplayName={displayName}
      role={organization.role}
      selectedPlan={authority?.plan}
    >
      {content}
    </EnterpriseDashboardShell>
  );
}
