import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/server/auth/user';
import { getDashboardSummary } from '@/server/queries/dashboard';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';

function getScoreLabel(score: number) {
  if (score >= 85) return 'Strong';
  if (score >= 65) return 'Needs attention';
  return 'High risk';
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
  const reportDate = new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date());

  const cards = [
    { label: 'Compliance score', value: `${summary.complianceScore}%`, detail: scoreLabel },
    { label: 'Open tasks', value: summary.openTasks, detail: `${summary.totals.tasks} total tasks` },
    { label: 'Open risks', value: summary.openRisks, detail: `${summary.criticalRisks} critical risks` },
    { label: 'High-risk vendors', value: summary.highRiskVendors, detail: `${summary.totals.vendors} total vendors` },
    { label: 'Missing documents', value: summary.missingDocuments, detail: `${summary.totals.documents} total documents` },
  ];

  const exportLinks = [
    { href: '/api/reports/executive.csv', label: 'Export executive CSV' },
    { href: '/api/reports/risks.csv', label: 'Export risks CSV' },
    { href: '/api/reports/vendors.csv', label: 'Export vendors CSV' },
    { href: '/api/reports/documents.csv', label: 'Export documents CSV' },
  ];

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10">
      <section className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Executive report</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">{organization.name}</h1>
          <p className="mt-3 max-w-3xl text-muted-foreground">
            Snapshot generated on {reportDate}. Use this summary to brief leadership on compliance workload, vendor exposure, risk posture and evidence readiness.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {exportLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-medium hover:bg-muted"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-5 text-center shadow-sm">
          <p className="text-sm text-muted-foreground">Overall readiness</p>
          <p className="mt-2 text-4xl font-bold">{summary.complianceScore}%</p>
          <p className="mt-1 text-sm font-medium">{scoreLabel}</p>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 lg:grid-cols-5">
        {cards.map((card) => (
          <article key={card.label} className="rounded-2xl border bg-card p-5 shadow-sm">
            <p className="text-sm text-muted-foreground">{card.label}</p>
            <p className="mt-2 text-3xl font-bold">{card.value}</p>
            <p className="mt-2 text-sm text-muted-foreground">{card.detail}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <article className="rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Leadership summary</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            The current compliance score is {summary.complianceScore}%. Focus should remain on reducing open tasks, closing critical risks and completing missing evidence.
          </p>
        </article>
        <article className="rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Top priorities</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>• Close {summary.criticalRisks} critical risks</li>
            <li>• Review {summary.highRiskVendors} high-risk vendors</li>
            <li>• Complete {summary.missingDocuments} missing document approvals</li>
          </ul>
        </article>
        <article className="rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Next report upgrades</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>• PDF export</li>
            <li>• Trend comparison</li>
            <li>• Board-ready commentary</li>
          </ul>
        </article>
      </section>
    </main>
  );
}
