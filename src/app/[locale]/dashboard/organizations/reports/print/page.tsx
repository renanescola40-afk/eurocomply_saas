import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PrintReportButton } from '@/components/reports/print-report-button';
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
  const generatedAt = new Intl.DateTimeFormat('en', { dateStyle: 'long', timeStyle: 'short' }).format(new Date());

  const metrics = [
    ['Compliance score', `${summary.complianceScore}%`],
    ['Readiness label', scoreLabel],
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
          <p className="text-sm text-slate-500">Top focus</p>
          <p className="mt-2 text-2xl font-bold">Reduce unresolved exposure</p>
          <p className="mt-2 text-sm text-slate-600">
            Prioritize critical risks, high-risk vendors and missing document approvals.
          </p>
        </article>
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

      <section className="grid break-inside-avoid grid-cols-2 gap-6 py-8 print:gap-4">
        <article>
          <h2 className="text-xl font-bold">Leadership summary</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            The current compliance score is {summary.complianceScore}%. Leadership should monitor open tasks, critical risks, vendor risk and document evidence gaps.
          </p>
        </article>
        <article>
          <h2 className="text-xl font-bold">Recommended priorities</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li>Close {summary.criticalRisks} critical risks.</li>
            <li>Review {summary.highRiskVendors} high-risk vendors.</li>
            <li>Complete {summary.missingDocuments} missing document approvals.</li>
          </ul>
        </article>
      </section>

      <footer className="mt-8 border-t pt-6 text-xs text-slate-500 print:mt-4">
        EuroComply report generated for {organization.name}. This report is an operational compliance summary and is not legal advice.
      </footer>
    </main>
  );
}
