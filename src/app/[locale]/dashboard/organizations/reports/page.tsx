import Link from 'next/link';
import { redirect } from 'next/navigation';
import { StepUpCsvExportButton } from '@/components/reports/step-up-csv-export-button';
import { buildBoardCommentary, buildNextBestActions, buildRecommendations, buildScorecards, getComplianceMaturity } from '@/lib/reports/recommendations';
import { getCurrentUser } from '@/server/queries/auth';
import { getDashboardSummary } from '@/server/queries/dashboard';
import { getCurrentOrganizationForUser } from '@/server/queries/current-organization';

function getScoreLabel(score: number) {
  if (score >= 85) return 'Strong';
  if (score >= 65) return 'Needs attention';
  return 'High risk';
}

function getScoreNarrative(score: number) {
  if (score >= 85) return 'The program is ready for leadership review, customer security discussions and executive reporting.';
  if (score >= 65) return 'The program is operational, with clear focus areas that should be closed before a formal review or customer review.';
  return 'The program needs immediate attention across evidence, risk or vendor operations before external review.';
}

function getScoreTone(score: number) {
  if (score >= 85) return 'text-emerald-300';
  if (score >= 65) return 'text-amber-300';
  return 'text-rose-300';
}

export default async function ExecutiveReportsPage({ params }: { params: { locale: string } }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${params.locale}/login`);
  }

  const organization = await getCurrentOrganizationForUser(user.id);

  if (!organization) {
    redirect(`/${params.locale}/onboarding`);
  }

  const summary = await getDashboardSummary(organization.id);
  const scoreLabel = getScoreLabel(summary.complianceScore);
  const maturity = getComplianceMaturity(summary.complianceScore);
  const scorecards = buildScorecards(summary);
  const commentary = buildBoardCommentary(summary);
  const nextBestActions = buildNextBestActions(summary);
  const recommendations = buildRecommendations(summary);
  const reportDate = new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date());

  const cards = [
    { label: 'Compliance score', value: `${summary.complianceScore}%`, detail: scoreLabel },
    { label: 'Maturity', value: maturity.level, detail: 'Leadership readiness level' },
    { label: 'Open tasks', value: summary.openTasks, detail: `${summary.totals.tasks} total tasks` },
    { label: 'Open risks', value: summary.openRisks, detail: `${summary.criticalRisks} critical risks` },
    { label: 'High-risk vendors', value: summary.highRiskVendors, detail: `${summary.totals.vendors} total vendors` },
    { label: 'Missing documents', value: summary.missingDocuments, detail: `${summary.totals.documents} total documents` },
  ];

  const csvExports = [
    { endpoint: '/api/reports/executive.csv', filename: 'executive-report.csv', label: 'Executive CSV' },
    { endpoint: '/api/reports/tasks.csv', filename: 'tasks-report.csv', label: 'Tasks CSV' },
    { endpoint: '/api/reports/risks.csv', filename: 'risks-report.csv', label: 'Risks CSV' },
    { endpoint: '/api/reports/vendors.csv', filename: 'vendors-report.csv', label: 'Vendors CSV' },
    { endpoint: '/api/reports/documents.csv', filename: 'documents-report.csv', label: 'Documents CSV' },
  ];

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-10">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 p-6 text-white shadow-2xl md:p-8">
        <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-0 left-10 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-primary/80">Executive report</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-bold tracking-tight md:text-6xl">{organization.name}</h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-slate-300">
              Snapshot generated on {reportDate}. {getScoreNarrative(summary.complianceScore)}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={`/${params.locale}/dashboard/organizations/reports/print`} className="inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100">Save PDF / print</Link>
              {csvExports.map((item) => (
                <StepUpCsvExportButton key={item.endpoint} endpoint={item.endpoint} filename={item.filename} label={item.label} className="inline-flex h-11 items-center justify-center rounded-full border border-white/15 px-5 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-60" />
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.05] p-6 text-center shadow-xl backdrop-blur">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Overall readiness</p>
            <p className={`mt-3 text-7xl font-bold tracking-tight ${getScoreTone(summary.complianceScore)}`}>{summary.complianceScore}%</p>
            <p className="mt-3 text-lg font-semibold">{scoreLabel}</p>
            <p className="mt-3 text-sm leading-6 text-slate-400">{maturity.level}: {maturity.description}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        {cards.map((card) => (
          <article key={card.label} className="rounded-3xl border bg-card p-5 shadow-sm transition hover:border-primary/40">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{card.label}</p>
            <p className="mt-3 text-3xl font-bold">{card.value}</p>
            <p className="mt-2 text-sm text-muted-foreground">{card.detail}</p>
          </article>
        ))}
      </section>

      <section className="rounded-3xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Narrative</p>
            <h2 className="mt-2 text-2xl font-semibold">Leadership review commentary</h2>
          </div>
          <p className="max-w-xl text-sm text-muted-foreground">Use this section as the executive framing for leadership, customers or advisory review.</p>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border bg-muted/30 p-4 text-sm leading-6 text-muted-foreground">{commentary.posture}</article>
          <article className="rounded-2xl border bg-muted/30 p-4 text-sm leading-6 text-muted-foreground">{commentary.exposure}</article>
          <article className="rounded-2xl border bg-muted/30 p-4 text-sm leading-6 text-muted-foreground">{commentary.operatingFocus}</article>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {scorecards.map((scorecard) => (
          <article key={scorecard.area} className="rounded-3xl border bg-card p-6 shadow-sm transition hover:border-primary/40">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{scorecard.area}</p>
            <p className="mt-3 text-5xl font-bold">{scorecard.score}%</p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${scorecard.score}%` }} />
            </div>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              {scorecard.metrics.map((metric) => (
                <li key={metric}>• {metric}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <article className="rounded-3xl border bg-card p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Maturity</p>
          <h2 className="mt-2 text-lg font-semibold">Maturity score</h2>
          <p className="mt-4 text-3xl font-bold">{maturity.level}</p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{maturity.description}</p>
        </article>
        <article className="rounded-3xl border bg-card p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Execution</p>
          <h2 className="mt-2 text-lg font-semibold">Next best actions</h2>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            {nextBestActions.map((action) => (
              <li key={action}>• {action}</li>
            ))}
          </ul>
        </article>
        <article className="rounded-3xl border bg-card p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Advisory</p>
          <h2 className="mt-2 text-lg font-semibold">Recommendations</h2>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            {recommendations.map((recommendation) => (
              <li key={recommendation}>• {recommendation}</li>
            ))}
          </ul>
        </article>
      </section>
    </main>
  );
}
