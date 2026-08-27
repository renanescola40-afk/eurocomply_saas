import { unstable_noStore as noStore } from 'next/cache';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Activity, AlertTriangle, Clock3, CreditCard, Gauge, ShieldAlert } from 'lucide-react';

import { locales, type Locale } from '@/lib/i18n/routing';
import { getCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser } from '@/server/queries/current-organization';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

type PageProps = {
  params: Promise<{ locale: string }>;
};

function getSafeLocale(locale: string): Locale {
  return (locales.includes(locale as Locale) ? locale : 'en') as Locale;
}

function getLoginPath(locale: Locale, nextPath: string) {
  return `/${locale}/login?next=${encodeURIComponent(nextPath)}`;
}

function getSentryProjectUrl() {
  const org = process.env.SENTRY_ORG;
  const project = process.env.SENTRY_PROJECT;

  if (!org || !project) return null;
  return `https://${org}.sentry.io/issues/?project=${encodeURIComponent(project)}`;
}

function getVercelProjectUrl() {
  const team = process.env.VERCEL_TEAM_SLUG;
  const project = process.env.VERCEL_PROJECT_SLUG;

  if (!team || !project) return null;
  return `https://vercel.com/${team}/${project}`;
}

const operatingSignals = [
  {
    label: 'Error rate alert',
    target: '< 1% target',
    description: 'Investigate when 5xx errors or Sentry issue volume exceed the operating baseline.',
    icon: Activity,
  },
  {
    label: 'p95 latency alert',
    target: '< 800ms target',
    description: 'Track Vercel function duration and route-level p95 for API endpoints.',
    icon: Clock3,
  },
  {
    label: 'Auth failure alert',
    target: 'Baseline + 3x',
    description: 'Investigate abnormal sign-in, token, origin, RBAC or step-up failures.',
    icon: ShieldAlert,
  },
  {
    label: 'Billing failure alert',
    target: '0 critical target',
    description: 'Escalate checkout errors and Stripe webhook processing failures immediately.',
    icon: CreditCard,
  },
];

const alertChecks = [
  '5xx rate high for 5 minutes',
  'Stripe checkout/webhook failures',
  'Abnormal auth failures',
  'Deploy failed',
  'Supabase connection failures',
];

export default async function ObservabilityDashboardPage({ params }: PageProps) {
  noStore();

  const { locale } = await params;
  const safeLocale = getSafeLocale(locale);
  const dashboardPath = `/${safeLocale}/dashboard/observability`;
  const user = await getCurrentUser();

  if (!user) {
    redirect(getLoginPath(safeLocale, dashboardPath));
  }

  const currentOrganization = await getCurrentOrganizationForUser(user.id);

  if (!currentOrganization || !currentOrganization.is_onboarding_completed) {
    redirect(`/${safeLocale}/onboarding`);
  }

  const sentryUrl = getSentryProjectUrl();
  const vercelUrl = getVercelProjectUrl();

  return (
    <main className="space-y-6 text-white">
      <header className="border-b border-white/[0.07] pb-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/32">
              <span>RISCK COMPLY Ops</span>
              <span className="h-1 w-1 rounded-full bg-white/20" />
              <span>No-store runtime</span>
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">Observability dashboard</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/48 md:text-base">
              Operating checklist for production incidents. Live investigation remains in Sentry and Vercel; this page keeps the governed response thresholds and smoke-test path visible inside the workspace.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {sentryUrl ? (
              <Link className="inline-flex h-10 items-center rounded-xl bg-emerald-300 px-4 text-sm font-semibold text-[#06100d] transition hover:bg-emerald-200" href={sentryUrl} target="_blank" rel="noreferrer">
                Open Sentry
              </Link>
            ) : null}
            {vercelUrl ? (
              <Link className="inline-flex h-10 items-center rounded-xl border border-white/[0.09] bg-white/[0.025] px-4 text-sm font-semibold text-white/72 transition hover:bg-white/[0.06] hover:text-white" href={vercelUrl} target="_blank" rel="noreferrer">
                Open Vercel
              </Link>
            ) : null}
          </div>
        </div>
      </header>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {operatingSignals.map((signal) => (
          <article key={signal.label} className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-4">
            <div className="flex items-center justify-between gap-3">
              <signal.icon className="h-4 w-4 text-emerald-300" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/28">threshold</span>
            </div>
            <p className="mt-4 text-sm font-medium text-white/58">{signal.label}</p>
            <p className="mt-1.5 text-xl font-semibold tracking-tight text-white/90">{signal.target}</p>
            <p className="mt-2 text-xs leading-5 text-white/38">{signal.description}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <article className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-5">
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-emerald-300" />
            <h2 className="text-sm font-semibold text-white/88">Production smoke test</h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-white/48">
            Run <code className="rounded bg-white/[0.05] px-1 py-0.5 text-white/70">POST /api/observability/smoke</code> with <code className="rounded bg-white/[0.05] px-1 py-0.5 text-white/70">Authorization: Bearer $HEALTHCHECK_TOKEN</code> after governed deploys and before enterprise demos.
          </p>
          <div className="mt-4 border-t border-white/[0.07] pt-4 text-xs leading-5 text-white/38">
            Expected contract: HTTP 200, no-store headers, no stack trace in the response, and one sanitized smoke event visible in Sentry.
          </div>
        </article>

        <article className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-300" />
            <h2 className="text-sm font-semibold text-white/88">Alert coverage</h2>
          </div>
          <div className="mt-4 divide-y divide-white/[0.06] border-y border-white/[0.06]">
            {alertChecks.map((check) => (
              <div key={check} className="flex items-center gap-3 py-3 text-sm text-white/58">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300/80" />
                {check}
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
