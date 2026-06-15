import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, Building2, FileCheck2, Gauge, ShieldCheck, Sparkles, UsersRound } from 'lucide-react';
import { DashboardHomeOverview } from '@/components/dashboard/dashboard-home-overview';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { locales, type Locale } from '@/lib/i18n/routing';
import { getBillingPlan } from '@/lib/billing/plans';
import { formatLimit } from '@/server/billing/entitlements';
import { getCurrentUser } from '@/server/queries/auth';
import { getOrganizationDashboardData } from '@/server/queries/organization-dashboard';

const quickLinks = [
  { href: '/aprovacoes', label: 'Tasks', description: 'Assign owners and unblock overdue work', icon: FileCheck2 },
  { href: '/documentos', label: 'Evidence', description: 'Review policies, proofs and expirations', icon: ShieldCheck },
  { href: '/vendor-assurance', label: 'Vendors', description: 'Track third-party review exposure', icon: UsersRound },
  { href: '/riscos', label: 'Risks', description: 'Prioritise high-impact compliance gaps', icon: Gauge },
];

const planLabels = {
  essential: 'Essential',
  professional: 'Professional',
  business: 'Business',
  enterprise: 'Enterprise',
};

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ plan?: string }>;
};

function getSafeLocale(locale: string): Locale {
  return (locales.includes(locale as Locale) ? locale : 'en') as Locale;
}

export default async function OrganizationDashboardPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const safeLocale = getSafeLocale(locale);
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
  const complianceHealth = data.summary.complianceScore >= 80 ? 'Audit ready' : data.summary.complianceScore >= 55 ? 'Needs attention' : 'Remediation needed';
  const requestedPlan = resolvedSearchParams.plan ? getBillingPlan(resolvedSearchParams.plan) : undefined;
  const shouldShowRequestedPlan = requestedPlan && requestedPlan.id !== entitlements.plan;

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.16),_transparent_34%),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--muted)/0.34))]">
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 md:px-8 md:py-10">
        {shouldShowRequestedPlan ? (
          <section className="rounded-[1.5rem] border border-primary/25 bg-primary/8 p-5 shadow-lg shadow-primary/5 md:flex md:items-center md:justify-between md:gap-6">
            <div>
              <Badge className="rounded-full px-3 py-1">Plano selecionado</Badge>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight">
                Continuar com {requestedPlan.name} · €{requestedPlan.priceMonthly}/mês
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                Você chegou ao dashboard com intenção de assinar este plano. Continue para rever limites, add-ons e finalizar a configuração comercial sem perder a escolha feita no pricing.
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-3 md:mt-0 md:justify-end">
              <Button asChild className="rounded-full">
                <Link href={`/${safeLocale}/dashboard/organizations/add-ons?plan=${requestedPlan.id}`}>
                  Rever plano e add-ons <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full bg-background/70">
                <Link href={`/${safeLocale}/pricing`}>Comparar planos</Link>
              </Button>
            </div>
          </section>
        ) : null}

        <section id="overview" className="relative scroll-mt-28 overflow-hidden rounded-[2rem] border bg-background/86 p-6 shadow-2xl shadow-primary/5 backdrop-blur md:p-8">
          <div className="pointer-events-none absolute right-0 top-0 h-72 w-72 rounded-full bg-primary/10 blur-3xl" aria-hidden="true" />
          <div className="relative grid gap-8 lg:grid-cols-[1.35fr_0.65fr] lg:items-end">
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <Badge className="gap-2 rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em]">
                  <Sparkles className="h-3.5 w-3.5" /> EuroComply
                </Badge>
                <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">
                  {complianceHealth}
                </Badge>
                <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">
                  Plano {planLabels[entitlements.plan]}
                </Badge>
              </div>

              <div className="space-y-3">
                <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Building2 className="h-4 w-4" /> {data.organization.name}
                </p>
                <h1 className="max-w-4xl text-4xl font-semibold tracking-[-0.04em] md:text-6xl">
                  Your regulatory operating system, focused on what needs action today.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
                  Monitor GDPR, AI Act and operational compliance from one executive cockpit: risk, evidence, vendors and remediation work — without the spreadsheet chaos.
                </p>
              </div>

              <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
                <div className="rounded-2xl border bg-background/70 p-4">
                  <p className="font-semibold text-foreground">Documentos</p>
                  <p>{formatLimit(entitlements.maxDocuments)} incluídos</p>
                </div>
                <div className="rounded-2xl border bg-background/70 p-4">
                  <p className="font-semibold text-foreground">Utilizadores</p>
                  <p>{formatLimit(entitlements.maxUsers)} incluídos</p>
                </div>
                <div className="rounded-2xl border bg-background/70 p-4">
                  <p className="font-semibold text-foreground">Países fiscais</p>
                  <p>{formatLimit(entitlements.maxFiscalCountries)} incluídos</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg" className="rounded-full">
                  <Link href={`${localizedDashboardBasePath}/reports-governance`}>
                    Generate audit pack <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="rounded-full bg-background/70">
                  <Link href={`/${safeLocale}/aprovacoes`}>Review priority tasks</Link>
                </Button>
              </div>
            </div>

            <div className="rounded-3xl border bg-muted/30 p-5">
              <p className="text-sm font-medium text-muted-foreground">Compliance score</p>
              <div className="mt-3 flex items-end justify-between gap-4">
                <p className="text-6xl font-bold tracking-tight">{data.summary.complianceScore}%</p>
                <p className="pb-2 text-right text-sm text-muted-foreground">
                  {data.summary.criticalRisks} critical risks<br />
                  {data.summary.missingDocuments} missing evidence
                </p>
              </div>
              <div className="mt-5 h-3 overflow-hidden rounded-full bg-background">
                <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(Math.max(data.summary.complianceScore, 0), 100)}%` }} />
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link key={link.href} href={`/${safeLocale}${link.href}`} className="group rounded-2xl border bg-background/78 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg">
                <div className="flex items-start justify-between gap-3">
                  <div className="rounded-xl bg-primary/10 p-2 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
                </div>
                <p className="mt-4 font-semibold">{link.label}</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{link.description}</p>
              </Link>
            );
          })}
        </section>

        <DashboardHomeOverview
          summary={data.summary}
          tasks={data.tasks}
          trendHistory={data.trendHistory}
          trendComparison={data.trendComparison}
          workflowReadiness={data.workflowReadiness}
          basePath={localizedDashboardBasePath}
          vendorsRequiringReview={data.vendorsRequiringReview}
          documentsExpiringSoon={data.documentsExpiringSoon}
        />
      </div>
    </main>
  );
}
