import { unstable_noStore as noStore } from 'next/cache';
import { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, Building2, FileCheck2, Gauge, LockKeyhole, ShieldCheck, Sparkles, UsersRound } from 'lucide-react';
import { DashboardHomeOverview } from '@/components/dashboard/dashboard-home-overview';
import { EnterpriseDashboardOverview } from '@/components/dashboard/enterprise-dashboard-overview';
import { OnboardingProgressCard } from '@/components/onboarding/onboarding-progress-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { locales, type Locale } from '@/lib/i18n/routing';
import { getDashboardCopy } from '@/lib/i18n/dashboard-copy';
import { getBillingPlan } from '@/lib/billing/plans';
import { formatLimit } from '@/server/billing/entitlements';
import { getCurrentUser } from '@/server/queries/auth';
import { listOrganizationMembers, listPendingInvitations } from '@/server/queries/members';
import { getOrganizationDashboardData } from '@/server/queries/organization-dashboard';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

const planLabels = {
  essential: 'Starter',
  starter: 'Starter',
  professional: 'Growth',
  growth: 'Growth',
  business: 'Growth',
  enterprise: 'Enterprise',
};

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ plan?: string }>;
};

function getSafeLocale(locale: string): Locale {
  return (locales.includes(locale as Locale) ? locale : 'en') as Locale;
}

function isActivePendingInvitation(invitation: { expires_at?: string | null }) {
  if (!invitation.expires_at) return true;

  const expiresAt = new Date(invitation.expires_at).getTime();

  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

async function getTeamActivationStatus(organizationId: string) {
  try {
    const [members, pendingInvitations] = await Promise.all([
      listOrganizationMembers(organizationId),
      listPendingInvitations(organizationId),
    ]);
    const activePendingInvitations = pendingInvitations.filter(isActivePendingInvitation);

    return {
      hasMembers: members.length > 1 || activePendingInvitations.length > 0,
      memberCount: members.length,
      pendingInviteCount: activePendingInvitations.length,
    };
  } catch (error) {
    console.warn('[activation] team_status_unavailable', { code: error instanceof Error ? error.name : 'unknown' });
    return { hasMembers: false, memberCount: 0, pendingInviteCount: 0 };
  }
}

function DashboardHomeOverviewSkeleton() {
  return (
    <div className="space-y-6" aria-label="Loading audit-ready dashboard overview" role="status" aria-live="polite">
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="premium-card rounded-[1.5rem] p-5">
            <div className="h-4 w-24 animate-pulse rounded-full bg-white/10" />
            <div className="mt-4 h-8 w-20 animate-pulse rounded-xl bg-white/10" />
            <div className="mt-3 h-4 w-full animate-pulse rounded-full bg-white/10" />
          </div>
        ))}
      </div>
      <div className="premium-card rounded-[2rem] p-6">
        <div className="h-6 w-56 animate-pulse rounded-full bg-white/10" />
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-2xl bg-white/10" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default async function OrganizationDashboardPage({ params, searchParams }: PageProps) {
  noStore();

  const { locale } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const safeLocale = getSafeLocale(locale);
  const copy = getDashboardCopy(safeLocale);
  const organizationCopy = copy.organization;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${safeLocale}/login`);
  }

  const data = await getOrganizationDashboardData(user.id);

  if (!data) {
    const requestedPlan = resolvedSearchParams.plan ? `?plan=${encodeURIComponent(resolvedSearchParams.plan)}` : '';
    redirect(`/${safeLocale}/onboarding${requestedPlan}`);
  }

  const entitlements = data.entitlements;
  const dashboardBasePath = `/dashboard/organizations`;
  const localizedDashboardBasePath = `/${safeLocale}${dashboardBasePath}`;
  const localizedTasksPath = `/${safeLocale}/aprovacoes`;
  const planName = planLabels[entitlements.plan] ?? entitlements.plan;
  const complianceHealth = data.summary.complianceScore >= 80 ? organizationCopy.health.auditReady : data.summary.complianceScore >= 55 ? organizationCopy.health.needsAttention : organizationCopy.health.remediation;
  const requestedPlan = resolvedSearchParams.plan ? getBillingPlan(resolvedSearchParams.plan) : undefined;
  const shouldShowRequestedPlan = requestedPlan && requestedPlan.id !== entitlements.plan;
  const teamActivation = await getTeamActivationStatus(data.organization.id);
  const activationState = {
    hasOrganization: true,
    hasMembers: teamActivation.hasMembers,
    hasComplianceTasks: data.summary.totals.tasks > 0 || data.tasks.length > 0,
    hasDocuments: data.summary.totals.documents > 0 || data.documentsExpiringSoon.length > 0,
    hasRisks: data.summary.totals.risks > 0 || data.topRisks.length > 0,
    hasVendors: data.summary.totals.vendors > 0 || data.vendorsRequiringReview.length > 0,
    hasDashboardOpened: true,
  };
  const limitCards = [
    { label: organizationCopy.documentsIncluded, value: formatLimit(entitlements.maxDocuments) },
    { label: organizationCopy.usersIncluded, value: formatLimit(entitlements.maxUsers) },
    { label: organizationCopy.fiscalCountriesIncluded, value: formatLimit(entitlements.maxFiscalCountries) },
  ];
  const limitsSummary = limitCards.map((item) => `${item.label}: ${item.value}`).join(' · ');
  const quickLinks = [
    { href: localizedTasksPath, label: organizationCopy.quickLinks.tasks.label, description: organizationCopy.quickLinks.tasks.description, icon: FileCheck2, meta: 'approval queue' },
    { href: `${localizedDashboardBasePath}/documents`, label: organizationCopy.quickLinks.evidence.label, description: organizationCopy.quickLinks.evidence.description, icon: ShieldCheck, meta: 'audit-ready evidence' },
    { href: `/${safeLocale}/vendor-assurance`, label: organizationCopy.quickLinks.vendors.label, description: organizationCopy.quickLinks.vendors.description, icon: UsersRound, meta: 'third-party exposure' },
    { href: `/${safeLocale}/riscos`, label: organizationCopy.quickLinks.risks.label, description: organizationCopy.quickLinks.risks.description, icon: Gauge, meta: 'risk register' },
  ];
  const trustSignals = [
    { label: 'audit-ready', icon: ShieldCheck },
    { label: 'tenant isolated', icon: Building2 },
    { label: 'GDPR aligned', icon: LockKeyhole },
    { label: 'role-based access', icon: UsersRound },
  ];

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.18),_transparent_34rem),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.09),_transparent_30rem),linear-gradient(180deg,#050505_0%,#080b12_46%,#050505_100%)]">
      <div className="pointer-events-none fixed inset-0 tech-grid opacity-25" />
      <div className="relative mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 md:py-10 lg:px-8">
        {shouldShowRequestedPlan ? (
          <section className="premium-card rounded-[1.5rem] p-5 md:flex md:items-center md:justify-between md:gap-6">
            <div>
              <Badge className="rounded-full px-3 py-1">{organizationCopy.selectedPlanBadge}</Badge>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
                {organizationCopy.continueWithPlan} {requestedPlan.name} · €{requestedPlan.priceMonthly}/{organizationCopy.month}
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-white/58">
                {organizationCopy.requestedPlanDescription}
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-3 md:mt-0 md:justify-end">
              <Button asChild className="rounded-full">
                <Link href={`/${safeLocale}/dashboard/organizations/add-ons?plan=${requestedPlan.id}`}>
                  {organizationCopy.reviewPlan} <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full border-white/15 bg-white/[0.04] text-white hover:bg-white/10">
                <Link href={`/${safeLocale}/dashboard/organizations/billing`}>{organizationCopy.comparePlans}</Link>
              </Button>
            </div>
          </section>
        ) : null}

        <section className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="premium-card rounded-[2rem] p-6 md:p-8">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="rounded-full bg-white px-3 py-1 text-black">{planName}</Badge>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-white/64">{complianceHealth}</span>
              {trustSignals.map((signal) => {
                const Icon = signal.icon;
                return (
                  <span key={signal.label} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.035] px-3 py-1 text-xs font-medium text-white/58">
                    <Icon className="h-3.5 w-3.5" /> {signal.label}
                  </span>
                );
              })}
            </div>
            <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-[-0.055em] text-white md:text-5xl">{organizationCopy.title}</h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-white/58 md:text-base">{organizationCopy.subtitle}</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {limitCards.map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/38">{item.label}</p>
                  <p className="mt-2 text-xl font-semibold text-white">{item.value}</p>
                </div>
              ))}
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">{organizationCopy.title}</h1>
            <p className="mt-3 max-w-3xl text-muted-foreground">{organizationCopy.subtitle}</p>
            <p className="mt-4 text-sm text-muted-foreground">{limitsSummary}</p>
            <p className="mt-3 text-xs text-muted-foreground">Team activation: {teamActivation.memberCount} members · {teamActivation.pendingInviteCount} active pending invites</p>
          </div>
          <div className="premium-card shine-line after:pointer-events-none rounded-[2rem] p-6 text-white">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-white/10 p-3"><Sparkles className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-white/55">{organizationCopy.complianceScore}</p>
                <p className="text-5xl font-semibold tracking-[-0.05em]">{data.summary.complianceScore}%</p>
              </div>
            </div>
            <p className="mt-5 text-sm leading-6 text-white/58">Clear executive readiness score for board, audit and procurement conversations.</p>
            <Button asChild className="mt-6 w-full rounded-full bg-white text-black hover:bg-white/90">
              <Link href={`${localizedDashboardBasePath}/reports-governance`}>Open executive report <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="premium-card premium-card-hover group rounded-[1.5rem] p-5 focus:outline-none focus:ring-2 focus:ring-primary">
                <div className="flex items-start justify-between gap-3">
                  <span className="rounded-2xl bg-white/10 p-3 text-white"><Icon className="h-5 w-5" /></span>
                  <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] font-medium text-white/44">{item.meta}</span>
                </div>
                <h2 className="mt-5 font-semibold text-white">{item.label}</h2>
                <p className="mt-2 text-sm leading-6 text-white/56">{item.description}</p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-white/76 transition group-hover:text-white">
                  Open workspace <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </span>
              </Link>
            );
          })}
        </section>

        <Suspense fallback={<DashboardHomeOverviewSkeleton />}>
          <DashboardHomeOverview
            summary={data.summary}
            tasks={data.tasks}
            trendComparison={data.trendComparison}
            workflowReadiness={data.workflowReadiness}
            basePath={localizedDashboardBasePath}
            vendorsRequiringReview={data.vendorsRequiringReview}
            documentsExpiringSoon={data.documentsExpiringSoon}
          />
          <EnterpriseDashboardOverview
            copy={copy.enterprise}
            summary={data.summary}
            tasks={data.tasks}
            vendorsRequiringReview={data.vendorsRequiringReview}
            documentsExpiringSoon={data.documentsExpiringSoon}
            basePath={localizedDashboardBasePath}
            tasksPath={localizedTasksPath}
            planName={planName}
            limitsSummary={limitsSummary}
          />
          <OnboardingProgressCard state={activationState} />
        </Suspense>
      </div>
    </main>
  );
}
