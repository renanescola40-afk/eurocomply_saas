import { unstable_noStore as noStore } from 'next/cache';
import { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { DashboardHomeOverview } from '@/components/dashboard/dashboard-home-overview';
import { EnterpriseExecutiveOverviewV2 } from '@/components/dashboard/enterprise-executive-overview-v2';
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

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ plan?: string }>;
};

function getSafeLocale(locale: string): Locale {
  return (locales.includes(locale as Locale) ? locale : 'en') as Locale;
}

function getPlanQuery(plan?: string | null) {
  return getBillingPlan(plan)?.id ? `?plan=${encodeURIComponent(getBillingPlan(plan)!.id)}` : '';
}

function getLocalizedDashboardPath(locale: Locale, plan?: string | null) {
  const planQuery = getPlanQuery(plan);
  return `/${locale}/dashboard/organizations${planQuery}`;
}

function getLoginPath(locale: Locale, nextPath: string) {
  return `/${locale}/login?next=${encodeURIComponent(nextPath)}`;
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
    <div className="space-y-6" aria-label="Loading dashboard overview" role="status" aria-live="polite">
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="rounded-xl border border-slate-800/80 bg-[#0d1420] p-5">
            <div className="skeleton-pulse h-4 w-24 rounded bg-slate-800" />
            <div className="skeleton-pulse mt-4 h-8 w-40 rounded bg-slate-800" />
            <div className="skeleton-pulse mt-3 h-4 w-full rounded bg-slate-800" />
          </div>
        ))}
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
  const dashboardPath = getLocalizedDashboardPath(safeLocale, resolvedSearchParams.plan);
  const user = await getCurrentUser();

  if (!user) {
    redirect(getLoginPath(safeLocale, dashboardPath));
  }

  const data = await getOrganizationDashboardData(user.id);

  if (!data) {
    const requestedPlan = getPlanQuery(resolvedSearchParams.plan);
    redirect(`/${safeLocale}/onboarding${requestedPlan}`);
  }

  const entitlements = data.entitlements;
  const localizedDashboardBasePath = `/${safeLocale}/dashboard/organizations`;
  const localizedTasksPath = `${localizedDashboardBasePath}/tasks`;
  const currentCatalogPlan = getBillingPlan(entitlements.plan);
  const planName = currentCatalogPlan?.name ?? entitlements.plan;
  const requestedPlan = getBillingPlan(resolvedSearchParams.plan);
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
    hasFirstAiSystem: data.aiSystemSummary.total > 0,
    hasRiskClassification: data.summary.totals.risks > 0,
    hasDocumentSuggestions: data.summary.totals.documents > 0,
    hasInitialTasks: data.summary.totals.tasks > 0,
    hasReadinessScore: data.summary.totals.tasks + data.summary.totals.risks + data.summary.totals.documents + data.summary.totals.vendors > 0,
    hasDashboardOpened: true,
  };
  const limitsSummary = [
    `${organizationCopy.documentsIncluded}: ${formatLimit(entitlements.maxDocuments)}`,
    `${organizationCopy.usersIncluded}: ${formatLimit(entitlements.maxUsers)}`,
    `${organizationCopy.fiscalCountriesIncluded}: ${formatLimit(entitlements.maxFiscalCountries)}`,
  ].join(' · ');

  return (
    <div className="min-h-0 bg-transparent">
      <div className="space-y-6 lg:space-y-8">
        {shouldShowPlanContinuation && requestedPlan ? (
          <section className="rounded-xl border border-blue-400/20 bg-blue-500/[0.07] p-5 text-white" aria-label="Selected plan continuation">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-300">Selected plan</p>
                <h2 className="mt-2 text-lg font-semibold tracking-tight text-white">Review {requestedPlan.name} for this workspace</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                  This workspace is currently on {planName}. Continue to billing to review the selected plan, or ask an admin if you do not manage billing.
                </p>
              </div>
              <Link href={planContinuationHref} className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#070b12]">
                {data.canManageBilling ? 'Review billing' : 'Ask an admin'}
              </Link>
            </div>
          </section>
        ) : null}

        <EnterpriseExecutiveOverviewV2
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
          <OnboardingProgressCard state={activationState} compact locale={safeLocale} />
          <DashboardHomeOverview
            summary={data.summary}
            tasks={data.tasks}
            trendComparison={data.trendComparison}
            workflowReadiness={data.workflowReadiness}
            basePath={localizedDashboardBasePath}
            vendorsRequiringReview={data.vendorsRequiringReview}
            documentsExpiringSoon={data.documentsExpiringSoon}
          />
        </Suspense>
      </div>
    </div>
  );
}
