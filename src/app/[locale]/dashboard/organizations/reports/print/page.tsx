import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PrintReportButton } from '@/components/reports/print-report-button';
import { buildBoardCommentary, buildNextBestActions, buildRecommendations, buildScorecards, getComplianceMaturity } from '@/lib/reports/recommendations';
import { getCurrentUser } from '@/server/auth/user';
import { getDashboardSummary } from '@/server/queries/dashboard';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';

function getScoreLabel(score: number) {
  if (score >= 85) return 'Strong';
  if (score >= 65) return 'Needs attention';
  return 'High risk';
}

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

  return (
    <main className="print-report mx-auto min-h-screen max-w-4xl bg-white px-8 py-10 text-slate-950 shadow-2xl print:min-h-0 print:max-w-none print:px-0 print:py-0 print:shadow-none">
      <div className="mb-8 flex items-center justify-between gap-4 rounded-2xl border bg-slate-50 p-4 print:hidden">
        <Link href={`/${params.locale}/dashboard/organizations/reports`} className="rounded-md border bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50">
          Back to reports
        </Link>
        <PrintReportButton />
      </div>

      <section className="break-inside-avoid border-b pb-8">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">EuroComply Executive Report</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight">{organization.name}</h1>
            <p className="mt-4 max-w-3xl text-slate-600">
              Generated on {generatedAt}. This report summarizes compliance workload, vendor exposure, risk posture and evidence readiness.
            </p>
          </div>
          <div className="hidden rounded-xl border px-4 py-3 text-right print:block">
            <p className="text-xs uppercase tracking-wide text-slate-500">Readiness</p>
            <p className="text-2xl font-bold">{summary.complianceScore}%</p>
            <p className="text-xs text-slate-500">{maturity.level}</p>
          </div>
        </div>
      </section>

      <section className="grid break-inside-avoid grid-cols-2 gap-4 py-8 print:gap-3">
        <article className="rounded-2xl border p-6 print:rounded-lg print:p-4">
          <p className="text-sm text-slate-500">Overall readiness</p>
          <p className="mt-2 text-5xl font-bold">{summary.complianceScore}%</p>
          <p className="mt-2 font-medium">{scoreLabel}</p>
        </article>
        <article className="rounded-2xl border p-6 print:rounded-lg print:p-4">
          <p className="text-sm text-slate-500">Maturity</p>
          <p className="mt-2 text-2xl font-bold">{maturity.level}</p>
          <p className="mt-2 text-sm text-slate-600">{maturity.description}</p>
        </article>
      </section>

      <section className="break-inside-avoid py-4">
        <h2 className="text-2xl font-bold">Board-ready commentary</h2>
        <div className="mt-4 grid grid-cols-3 gap-4 text-sm leading-6 text-slate-600 print:gap-3">
          <p>{commentary.posture}</p>
          <p>{commentary.exposure}</p>
          <p>{commentary.operatingFocus}</p>
        </div>
      </section>

      <section className="break-inside-avoid py-4">
        <h2 className="text-2xl font-bold">Metrics</h2>
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

      <section className="break-inside-avoid py-6">
        <h2 className="text-2xl font-bold">Scorecards by area</h2>
        <div className="mt-4 grid grid-cols-4 gap-3">
          {scorecards.map((scorecard) => (
            <article key={scorecard.area} className="rounded-lg border p-3">
              <p className="text-sm text-slate-500">{scorecard.area}</p>
              <p className="mt-1 text-2xl font-bold">{scorecard.score}%</p>
              <ul className="mt-2 space-y-1 text-xs text-slate-600">
                {scorecard.metrics.map((metric) => (
                  <li key={metric}>{metric}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="grid break-inside-avoid grid-cols-2 gap-6 py-8 print:gap-4">
        <article>
          <h2 className="text-xl font-bold">Next best actions</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            {nextBestActions.map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ul>
        </article>
        <article>
          <h2 className="text-xl font-bold">Recommendations</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            {recommendations.map((recommendation) => (
              <li key={recommendation}>{recommendation}</li>
            ))}
          </ul>
        </article>
      </section>

      <footer className="mt-8 border-t pt-6 text-xs text-slate-500 print:mt-4">
        EuroComply report generated for {organization.name}. This report is an operational compliance summary and is not legal advice.
      </footer>
    </main>
  );
}
