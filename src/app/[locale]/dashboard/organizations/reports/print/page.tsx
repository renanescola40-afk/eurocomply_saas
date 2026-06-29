import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PrintReportButton } from '@/components/reports/print-report-button';
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
  if (score >= 85) return 'Ready for executive review and external stakeholder conversations.';
  if (score >= 65) return 'Operationally active with a clear set of focus areas to close.';
  return 'Requires leadership focus before external audit, customer or investor review.';
}

const printReportStyles = `
  @page {
    size: A4;
    margin: 14mm;
  }

  @media print {
    html,
    body {
      background: #ffffff !important;
      color: #0f172a !important;
    }

    body {
      min-height: auto !important;
      background-image: none !important;
    }

    a {
      color: inherit !important;
      text-decoration: none !important;
    }

    .print-report {
      width: 100% !important;
    }

    .print-report section,
    .print-report article,
    .print-report table,
    .print-report tr,
    .print-report footer {
      break-inside: avoid;
      page-break-inside: avoid;
    }
  }
`;

export default async function PrintableExecutiveReportPage({ params }: { params: { locale: string } }) {
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
  const commentary = buildBoardCommentary(summary);
  const scorecards = buildScorecards(summary);
  const nextBestActions = buildNextBestActions(summary);
  const recommendations = buildRecommendations(summary);
  const generatedAt = new Intl.DateTimeFormat('en', { dateStyle: 'long', timeStyle: 'short' }).format(new Date());

  const metrics = [
    ['Compliance score', `${summary.complianceScore}%`],
    ['Readiness label', scoreLabel],
    ['Maturity level', maturity.level],
    ['Open tasks', summary.openTasks],
    ['Total tasks', summary.totals.tasks],
    ['Open risks', summary.openRisks],
    ['Critical risks', summary.criticalRisks],
    ['Total risks', summary.totals.risks],
    ['High-risk vendors', summary.highRiskVendors],
    ['Total vendors', summary.totals.vendors],
    ['Missing documents', summary.missingDocuments],
    ['Total documents', summary.totals.documents],
  ];

  const executiveHighlights = [
    { label: 'Overall readiness', value: `${summary.complianceScore}%`, detail: scoreLabel },
    { label: 'Maturity', value: maturity.level, detail: 'Board readiness' },
    { label: 'Critical risks', value: summary.criticalRisks, detail: `${summary.openRisks} open risks` },
    { label: 'Evidence gap', value: summary.missingDocuments, detail: `${summary.totals.documents} total docs` },
  ];

  return (
    <main className="print-report mx-auto min-h-screen max-w-5xl bg-white px-8 py-10 text-slate-950 shadow-2xl print:min-h-0 print:max-w-none print:px-0 print:py-0 print:shadow-none">
      <style dangerouslySetInnerHTML={{ __html: printReportStyles }} />
      <div className="mb-8 flex items-center justify-between gap-4 rounded-2xl border bg-slate-50 p-4 print:hidden">
        <Link href={`/${params.locale}/dashboard/organizations/reports`} className="rounded-md border bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50">
          Back to reports
        </Link>
        <PrintReportButton />
      </div>

      <section className="break-inside-avoid overflow-hidden rounded-3xl border bg-slate-950 text-white print:rounded-none print:border-slate-300">
        <div className="grid gap-6 p-8 md:grid-cols-[1.3fr_0.7fr] print:grid-cols-[1.3fr_0.7fr] print:p-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-300">EuroComply Executive Report</p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight print:text-3xl">{organization.name}</h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300">
              Generated on {generatedAt}. {getScoreNarrative(summary.complianceScore)}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 text-center print:border-slate-600">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Readiness</p>
            <p className="mt-2 text-6xl font-bold print:text-5xl">{summary.complianceScore}%</p>
            <p className="mt-2 text-sm font-semibold text-slate-300">{scoreLabel}</p>
            <p className="mt-2 text-xs text-slate-400">{maturity.level}</p>
          </div>
        </div>
      </section>

      <section className="grid break-inside-avoid grid-cols-4 gap-3 py-6 print:gap-2 print:py-4">
        {executiveHighlights.map((highlight) => (
          <article key={highlight.label} className="rounded-2xl border bg-slate-50 p-4 print:rounded-lg print:p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{highlight.label}</p>
            <p className="mt-2 text-3xl font-bold print:text-2xl">{highlight.value}</p>
            <p className="mt-1 text-xs text-slate-500">{highlight.detail}</p>
          </article>
        ))}
      </section>

      <section className="break-inside-avoid py-4">
        <h2 className="text-2xl font-bold">Board-ready commentary</h2>
        <div className="mt-4 grid grid-cols-3 gap-4 text-sm leading-6 text-slate-600 print:gap-3">
          <article className="rounded-xl border bg-slate-50 p-4 print:p-3">{commentary.posture}</article>
          <article className="rounded-xl border bg-slate-50 p-4 print:p-3">{commentary.exposure}</article>
          <article className="rounded-xl border bg-slate-50 p-4 print:p-3">{commentary.operatingFocus}</article>
        </div>
      </section>

      <section className="break-inside-avoid py-4">
        <h2 className="text-2xl font-bold">Scorecards by area</h2>
        <div className="mt-4 grid grid-cols-4 gap-3">
          {scorecards.map((scorecard) => (
            <article key={scorecard.area} className="rounded-xl border p-4 print:p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{scorecard.area}</p>
              <p className="mt-2 text-3xl font-bold print:text-2xl">{scorecard.score}%</p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-slate-950" style={{ width: `${scorecard.score}%` }} />
              </div>
              <ul className="mt-3 space-y-1 text-xs text-slate-600">
                {scorecard.metrics.map((metric) => (
                  <li key={metric}>{metric}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="grid break-inside-avoid grid-cols-2 gap-5 py-6 print:gap-4 print:py-4">
        <article className="rounded-2xl border p-5 print:rounded-lg print:p-4">
          <h2 className="text-xl font-bold">Next best actions</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-600">
            {nextBestActions.map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ol>
        </article>
        <article className="rounded-2xl border p-5 print:rounded-lg print:p-4">
          <h2 className="text-xl font-bold">Recommendations</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-600">
            {recommendations.map((recommendation) => (
              <li key={recommendation}>{recommendation}</li>
            ))}
          </ol>
        </article>
      </section>

      <section className="break-inside-avoid py-4">
        <h2 className="text-2xl font-bold">Metrics appendix</h2>
        <table className="mt-4 w-full border-collapse text-left text-sm">
          <tbody>
            {metrics.map(([label, value]) => (
              <tr key={label} className="border-b">
                <th className="py-3 font-medium text-slate-600 print:py-2">{label}</th>
                <td className="py-3 font-semibold print:py-2">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <footer className="mt-8 flex items-center justify-between gap-4 border-t pt-6 text-xs text-slate-500 print:mt-4">
        <span>EuroComply report generated for {organization.name}.</span>
        <span>Operational compliance summary · Not legal advice</span>
      </footer>
    </main>
  );
}
