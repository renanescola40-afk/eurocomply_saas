import { unstable_noStore as noStore } from 'next/cache';
import { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, FileCheck2, Gauge, ShieldCheck, Sparkles, UsersRound } from 'lucide-react';
import { DashboardHomeOverview } from '@/components/dashboard/dashboard-home-overview';
import { EnterpriseDashboardOverview } from '@/components/dashboard/enterprise-dashboard-overview';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { locales, type Locale } from '@/lib/i18n/routing';
import { getDashboardCopy } from '@/lib/i18n/dashboard-copy';
import { getBillingPlan } from '@/lib/billing/plans';
import { formatLimit } from '@/server/billing/entitlements';
import { getCurrentUser } from '@/server/queries/auth';
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

function DashboardHomeOverviewSkeleton() {
  return (
    <div className="space-y-6" aria-label="Loading dashboard overview" role="status" aria-live="polite">
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="rounded-[1.5rem] border bg-background/80 p-5 shadow-sm">
            <div className="h-4 w-24 animate-pulse rounded-full bg-muted" />
            <div className="mt-4 h-8 w-20 animate-pulse rounded-xl bg-muted" />
            <div className="mt-3 h-4 w-full animate-pulse rounded-full bg-muted" />
          </div>
        ))}
      </div>
      <div className="rounded-[2rem] border bg-background/80 p-6 shadow-sm">
        <div className="h-6 w-56 animate-pulse rounded-full bg-muted" />
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-2xl bg-muted" />
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
  const planName = planLabels[entitlements.plan];
  const complianceHealth = data.summary.complianceScore >= 80 ? organizationCopy.health.auditReady : data.summary.complianceScore >= 55 ? organizationCopy.health.needsAttention : organizationCopy.health.remediation;
  const requestedPlan = resolvedSearchParams.plan ? getBillingPlan(resolvedSearchParams.plan) : undefined;
  const shouldShowRequestedPlan = requestedPlan && requestedPlan.id !== entitlements.plan;
  const limitCards = [
    { label: organizationCopy.documentsIncluded, value: formatLimit(entitlements.maxDocuments) },
    { label: organizationCopy.usersIncluded, value: formatLimit(entitlements.maxUsers) },
    { label: organizationCopy.fiscalCountriesIncluded, value: formatLimit(entitlements.maxFiscalCountries) },
  ];
  const limitsSummary = limitCards.map((item) => `${item.label}: ${item.value}`).join(' · ');
  const quickLinks = [
    { href: localizedTasksPath, label: organizationCopy.quickLinks.tasks.label, description: organizationCopy.quickLinks.tasks.description, icon: FileCheck2 },
    { href: `${localizedDashboardBasePath}/documents`, label: organizationCopy.quickLinks.evidence.label, description: organizationCopy.quickLinks.evidence.description, icon: ShieldCheck },
    { href: `/${safeLocale}/vendor-assurance`, label: organizationCopy.quickLinks.vendors.label, description: organizationCopy.quickLinks.vendors.description, icon: UsersRound },
    { href: `/${safeLocale}/riscos`, label: organizationCopy.quickLinks.risks.label, description: organizationCopy.quickLinks.risks.description, icon: Gauge },
  ];

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.16),_transparent_34%),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--muted)/0.34))]">
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 md:px-8 md:py-10">
        {shouldShowRequestedPlan ? (
          <section className="rounded-[1.5rem] border border-primary/25 bg-primary/8 p-5 shadow-lg shadow-primary/5 md:flex md:items-center md:justify-between md:gap-6">
            <div>
              <Badge className="rounded-full px-3 py-1">{organizationCopy.selectedPlanBadge}</Badge>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight">
                {organizationCopy.continueWithPlan} {requestedPlan.name} · €{requestedPlan.priceMonthly}/{organizationCopy.month}
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                {organizationCopy.requestedPlanDescription}
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-3 md:mt-0 md:justify-end">
              <Button asChild className="rounded-full">
                <Link href={`/${safeLocale}/dashboard/organizations/add-ons?plan=${requestedPlan.id}`}>
                  {organizationCopy.reviewPlan} <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full">
                <Link href={`/${safeLocale}/dashboard/organizations/billing`}>{organizationCopy.comparePlans}</Link>
              </Button>
            </div>
          </section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-[2rem] border bg-background/80 p-6 shadow-sm backdrop-blur">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="rounded-full px-3 py-1">{planName}</Badge>
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">{complianceHealth}</span>
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">{organizationCopy.title}</h1>
            <p className="mt-3 max-w-3xl text-muted-foreground">{organizationCopy.subtitle}</p>
            <p className="mt-4 text-sm text-muted-foreground">{limitsSummary}</p>
          </div>
          <div className="rounded-[2rem] border bg-foreground p-6 text-background shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-background/10 p-3"><Sparkles className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-background/70">{organizationCopy.complianceScore}</p>
                <p className="text-3xl font-semibold">{data.summary.complianceScore}%</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          {quickLinks.map((item) => (
            <Link key={item.href} href={item.href} className="group rounded-[1.5rem] border bg-background/80 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <item.icon className="h-5 w-5 text-primary" />
              <h2 className="mt-4 font-semibold">{item.label}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
              <ArrowRight className="mt-4 h-4 w-4 transition group-hover:translate-x-1" />
            </Link>
          ))}
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
        </Suspense>
      </div>
    </main>
  );
}
