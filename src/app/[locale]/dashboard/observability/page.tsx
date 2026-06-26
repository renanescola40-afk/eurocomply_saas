import { unstable_noStore as noStore } from 'next/cache';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Activity, AlertTriangle, Clock3, CreditCard, Gauge, ShieldAlert } from 'lucide-react';

import { getCurrentUser } from '@/server/queries/auth';
import { locales, type Locale } from '@/lib/i18n/routing';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

type PageProps = {
  params: Promise<{ locale: string }>;
};

function getSafeLocale(locale: string): Locale {
  return (locales.includes(locale as Locale) ? locale : 'en') as Locale;
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

const metrics = [
  {
    label: 'Error rate',
    value: '< 1%',
    description: 'Alert when 5xx errors or Sentry issue volume exceed baseline.',
    icon: Activity,
  },
  {
    label: 'p95 latency',
    value: '< 800ms',
    description: 'Track Vercel function duration and route-level p95 for API endpoints.',
    icon: Clock3,
  },
  {
    label: 'Auth failures',
    value: 'Baseline + 3x',
    description: 'Alert on abnormal sign-in, token, origin, RBAC or step-up failures.',
    icon: ShieldAlert,
  },
  {
    label: 'Billing failures',
    value: '0 critical',
    description: 'Alert immediately on checkout errors and Stripe webhook processing failures.',
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
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${safeLocale}/login`);
  }

  const sentryUrl = getSentryProjectUrl();
  const vercelUrl = getVercelProjectUrl();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.14),_transparent_32%),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--muted)/0.34))] px-4 py-8 md:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="rounded-[2rem] border bg-background/85 p-6 shadow-sm backdrop-blur md:p-8">
          <div className="flex flex-wrap items-center gap-3 text-sm font-medium text-muted-foreground">
            <span className="rounded-full border px-3 py-1">RISCK COMPLY Ops</span>
            <span className="rounded-full border px-3 py-1">no-store</span>
            <span className="rounded-full border px-3 py-1">production-ready</span>
          </div>
          <div className="mt-5 grid gap-6 md:grid-cols-[1.2fr_0.8fr] md:items-end">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">Observability dashboard</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground md:text-base">
                Minimal operating surface for production incidents: error rate, p95 latency, auth failures and billing failures.
                Live investigation stays in Sentry, Vercel, Stripe and Supabase; this page keeps the enterprise control checklist visible inside the app.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 md:justify-end">
              {sentryUrl ? (
                <Link className="rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background" href={sentryUrl} target="_blank" rel="noreferrer">
                  Open Sentry
                </Link>
              ) : null}
              {vercelUrl ? (
                <Link className="rounded-full border px-4 py-2 text-sm font-semibold" href={vercelUrl} target="_blank" rel="noreferrer">
                  Open Vercel
                </Link>
              ) : null}
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          {metrics.map((metric) => (
            <article key={metric.label} className="rounded-[1.5rem] border bg-background/85 p-5 shadow-sm">
              <metric.icon className="h-5 w-5 text-primary" />
              <p className="mt-4 text-sm text-muted-foreground">{metric.label}</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight">{metric.value}</p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{metric.description}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-4 md:grid-cols-[0.8fr_1.2fr]">
          <article className="rounded-[1.5rem] border bg-background/85 p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <Gauge className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Production smoke test</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Run <code className="rounded bg-muted px-1 py-0.5">POST /api/observability/smoke</code> with <code className="rounded bg-muted px-1 py-0.5">Authorization: Bearer $HEALTHCHECK_TOKEN</code> after deploys and before enterprise demos.
            </p>
            <p className="mt-4 rounded-2xl border bg-muted/40 p-4 text-sm text-muted-foreground">
              Expected result: HTTP 200, no-store headers, no stack trace in response, and one sanitized smoke event visible in Sentry.
            </p>
          </article>

          <article className="rounded-[1.5rem] border bg-background/85 p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Alert coverage</h2>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {alertChecks.map((check) => (
                <div key={check} className="rounded-2xl border bg-muted/30 p-4 text-sm font-medium">
                  {check}
                </div>
              ))}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
