import Link from 'next/link';
import { redirect } from 'next/navigation';
import { StepUpCsvExportButton } from '@/components/reports/step-up-csv-export-button';
import { buildBoardCommentary, buildNextBestActions, buildRecommendations, buildScorecards, getComplianceMaturity } from '@/lib/reports/recommendations';
import { assertPlanAtLeast } from '@/server/billing/entitlements';
import { getCurrentUser } from '@/server/queries/auth';
import { getDashboardSummary } from '@/server/queries/dashboard';
import { getCurrentOrganizationForUser } from '@/server/queries/current-organization';

function getScoreLabel(score: number) {
  if (score >= 85) return 'Strong';
  if (score >= 65) return 'Needs attention';
  return 'High risk';
}

function getScoreNarrative(score: number) {
  if (score >= 85) return 'The current workspace records stronger control coverage, with remaining work visible below for leadership review.';
  if (score >= 65) return 'The current workspace is operational, with clear focus areas that should be reviewed before external assurance or customer review.';
  return 'The current workspace records material open work across evidence, risk or vendor operations that should be prioritized before external review.';
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

  const entitlement = await assertPlanAtLeast(organization.id, 'business');
  if (!entitlement.ok) {
    redirect(`/${params.locale}/dashboard/organizations/billing?upgrade=business&from=executive-reports`);
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
    { label: 'Maturity', value: maturity.level, detail: 'Current maturity level' },
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
    <main className="space-y-6 text-white">
      <header className="border-b border-white/[0.07] pb-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-emerald-300/75">Executive report</p>
        <div className="mt-3 grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-end">
          <div className="min-w-0">
            <h1 className="max-w-4xl text-3xl font-semibold tracking-tight md:text-4xl">{organization.name}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/48 md:text-base">
              Snapshot generated on {reportDate}. {getScoreNarrative(summary.complianceScore)}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={`/${params.locale}/dashboard/organizations/reports/print`} className="inline-flex h-10 items-center justify-center rounded-xl bg-emerald-300 px-4 text-sm font-semibold text-[#06100d] transition-colors hover:bg-emerald-200">Save PDF / print</Link>
              {csvExports.map((item) => (
                <StepUpCsvExportButton key={item.endpoint} endpoint={item.endpoint} filename={item.filename} label={item.label} className="inline-flex h-10 items-center justify-center rounded-xl border border-white/[0.09] bg-white/[0.025] px-4 text-sm font-semibold text-white/62 transition-colors hover:bg-white/[0.06] hover:text-white disabled:opacity-60" />
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30">Current score</p>
            <div className="mt-2 flex items-end justify-between gap-3">
              <p className={`text-4xl font-semibold tracking-tight ${getScoreTone(summary.complianceScore)}`}>{summary.complianceScore}%</p>
              <p className="pb-1 text-sm font-medium text-white/55">{scoreLabel}</p>
            </div>
            <p className="mt-2 text-xs leading-5 text-white/35">{maturity.level}: {maturity.description}</p>
          </div>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        {cards.map((card) => (
          <article key={card.label} className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-white/30">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold text-white/88">{card.value}</p>
            <p className="mt-1.5 text-xs text-white/35">{card.detail}</p>
          </article>
        ))}
      </section>

      <section className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30">Narrative</p>
            <h2 className="mt-1.5 text-lg font-semibold text-white/85">Leadership review commentary</h2>
          </div>
          <p className="max-w-xl text-xs leading-5 text-white/35">Derived from the current workspace summary; review against source registers before external use.</p>
        </div>
        <div className="mt-4 divide-y divide-white/[0.06] border-y border-white/[0.06]">
          <article className="py-3 text-sm leading-6 text-white/52">{commentary.posture}</article>
          <article className="py-3 text-sm leading-6 text-white/52">{commentary.exposure}</article>
          <article className="py-3 text-sm leading-6 text-white/52">{commentary.operatingFocus}</article>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {scorecards.map((scorecard) => (
          <article key={scorecard.area} className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-white/30">{scorecard.area}</p>
            <p className="mt-2 text-3xl font-semibold text-white/88">{scorecard.score}%</p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
              <div className="h-full rounded-full bg-emerald-300" style={{ width: `${scorecard.score}%` }} />
            </div>
            <ul className="mt-4 space-y-2 text-xs leading-5 text-white/38">
              {scorecard.metrics.map((metric) => (
                <li key={metric}>• {metric}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30">Maturity</p>
          <h2 className="mt-1.5 text-sm font-semibold text-white/70">Maturity score</h2>
          <p className="mt-3 text-2xl font-semibold text-white/88">{maturity.level}</p>
          <p className="mt-2 text-xs leading-5 text-white/38">{maturity.description}</p>
        </article>
        <article className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30">Execution</p>
          <h2 className="mt-1.5 text-sm font-semibold text-white/70">Next best actions</h2>
          <ul className="mt-3 divide-y divide-white/[0.06] border-y border-white/[0.06] text-sm text-white/48">
            {nextBestActions.map((action) => (
              <li key={action} className="py-2.5">{action}</li>
            ))}
          </ul>
        </article>
        <article className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30">Advisory</p>
          <h2 className="mt-1.5 text-sm font-semibold text-white/70">Recommendations</h2>
          <ul className="mt-3 divide-y divide-white/[0.06] border-y border-white/[0.06] text-sm text-white/48">
            {recommendations.map((recommendation) => (
              <li key={recommendation} className="py-2.5">{recommendation}</li>
            ))}
          </ul>
        </article>
      </section>
    </main>
  );
}
