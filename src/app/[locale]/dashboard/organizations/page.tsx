import { unstable_noStore as noStore } from 'next/cache';
import { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { DashboardHomeOverview } from '@/components/dashboard/dashboard-home-overview';
import { EnterpriseComplianceCommandCenter } from '@/components/dashboard/enterprise-compliance-command-center';
import { EnterpriseDashboardOverview } from '@/components/dashboard/enterprise-dashboard-overview';
import { OnboardingProgressCard } from '@/components/onboarding/onboarding-progress-card';
import { getBillingPlan } from '@/lib/billing/plans';
import { locales, type Locale } from '@/lib/i18n/routing';
import { getDashboardCopy } from '@/lib/i18n/dashboard-copy';
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
            <div className="skeleton-pulse h-4 w-24 rounded-full bg-white/[0.055]" />
            <div className="skeleton-pulse mt-4 h-8 w-20 rounded-xl bg-white/[0.055]" />
            <div className="skeleton-pulse mt-3 h-4 w-full rounded-full bg-white/[0.055]" />
          </div>
        ))}
      </div>
      <div className="premium-card rounded-[2rem] p-6">
        <div className="skeleton-pulse h-6 w-56 rounded-full bg-white/[0.055]" />
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="skeleton-pulse h-24 rounded-2xl bg-white/[0.055]" />
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
  const localizedDashboardBasePath = `/${safeLocale}/dashboard/organizations`;
  const localizedTasksPath = `/${safeLocale}/aprovacoes`;
  const planName = planLabels[entitlements.plan as keyof typeof planLabels] ?? entitlements.plan;
  const requestedPlan = getBillingPlan(resolvedSearchParams.plan);
  const currentCatalogPlan = getBillingPlan(entitlements.plan);
  const shouldShowPlanContinuation = Boolean(requestedPlan && requestedPlan.id !== currentCatalogPlan?.id);
  const planContinuationHref = data.canManageBilling
    ? `/${safeLocale}/dashboard/organizations/billing?plan=${encodeURIComponent(requestedPlan?.id ?? '')}`
    : `/${safeLocale}/dashboard/organizations/team`;
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
  const limitsSummary = [
    `${organizationCopy.documentsIncluded}: ${formatLimit(entitlements.maxDocuments)}`,
    `${organizationCopy.usersIncluded}: ${formatLimit(entitlements.maxUsers)}`,
    `${organizationCopy.fiscalCountriesIncluded}: ${formatLimit(entitlements.maxFiscalCountries)}`,
  ].join(' · ');

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.18),_transparent_34rem),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.09),_transparent_30rem),linear-gradient(180deg,#050505_0%,#080b12_46%,#050505_100%)]">
      <div className="pointer-events-none fixed inset-0 tech-grid opacity-25" />
      <div className="relative mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 md:py-10 lg:px-8">
        {shouldShowPlanContinuation && requestedPlan ? (
          <section className="rounded-[1.5rem] border border-blue-300/20 bg-blue-400/10 p-5 text-blue-50 shadow-sm" aria-label="Selected plan continuation">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-100/70">Selected plan</p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight">Review {requestedPlan.name} for this workspace</h2>
                <p className="mt-2 text-sm leading-6 text-blue-50/72">
                  This workspace is currently on {planName}. Continue to billing to review the selected plan, or ask an admin if you do not manage billing.
                </p>
              </div>
              <Link href={planContinuationHref} className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-blue-50">
                {data.canManageBilling ? 'Review billing' : 'Ask an admin'}
              </Link>
            </div>
          </section>
        ) : null}

        <EnterpriseComplianceCommandCenter
          locale={safeLocale}
          summary={data.summary}
          tasks={data.tasks}
          topRisks={data.topRisks}
          vendorsRequiringReview={data.vendorsRequiringReview}
          documentsExpiringSoon={data.documentsExpiringSoon}
          aiSystemSummary={data.aiSystemSummary}
          auditEvents={data.auditEvents}
          workflowReadiness={data.workflowReadiness}
          basePath={localizedDashboardBasePath}
          tasksPath={localizedTasksPath}
          planName={planName}
          limitsSummary={limitsSummary}
          currentUserRole={data.currentUserRole}
          canManageWorkspace={data.canManageWorkspace}
          canManageBilling={data.canManageBilling}
        />

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
