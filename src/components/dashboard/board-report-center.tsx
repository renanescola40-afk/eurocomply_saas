import Link from 'next/link';
import type { DashboardSummary, DashboardTrendComparison } from '@/server/queries/dashboard';

type BoardReportCenterProps = {
  summary: DashboardSummary;
  trendComparison?: DashboardTrendComparison;
  basePath: string;
};

type ReportSection = {
  title: string;
  status: 'ready' | 'attention' | 'blocked';
  description: string;
  href: string;
};

function statusClasses(status: ReportSection['status']) {
  const tones = {
    ready: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
    attention: 'border-amber-300/30 bg-amber-300/10 text-amber-200',
    blocked: 'border-rose-400/30 bg-rose-400/10 text-rose-200',
  };

  return tones[status];
}

function statusLabel(status: ReportSection['status']) {
  if (status === 'ready') return 'Ready';
  if (status === 'attention') return 'Needs review';
  return 'Blocked';
}

function getReadiness(summary: DashboardSummary) {
  let score = summary.complianceScore;

  if (summary.criticalRisks > 0) score -= 8;
  if (summary.highRiskVendors > 0) score -= 5;
  if (summary.missingDocuments > 0) score -= Math.min(15, summary.missingDocuments * 2);

  return Math.max(0, Math.min(100, Math.round(score)));
}

function getReadinessLabel(score: number) {
  if (score >= 85) return 'Leadership review-ready';
  if (score >= 70) return 'Review-ready';
  if (score >= 50) return 'Needs remediation';
  return 'Not ready';
}

function getDeltaText(trendComparison?: DashboardTrendComparison) {
  const delta = trendComparison?.complianceScoreDelta;
  if (delta === null || delta === undefined) return 'First report baseline';
  if (delta === 0) return 'Stable since previous snapshot';
  return `${delta > 0 ? '+' : ''}${delta} pts since previous snapshot`;
}

export function BoardReportCenter({ summary, trendComparison, basePath }: BoardReportCenterProps) {
  const readiness = getReadiness(summary);
  const sections: ReportSection[] = [
    {
      title: 'Executive posture',
      status: summary.complianceScore >= 70 ? 'ready' : 'attention',
      description: `Compliance score is ${summary.complianceScore}% with ${getDeltaText(trendComparison).toLowerCase()}.`,
      href: `${basePath}/reports`,
    },
    {
      title: 'Risk narrative',
      status: summary.criticalRisks === 0 ? 'ready' : 'attention',
      description: `${summary.openRisks} open risks, including ${summary.criticalRisks} critical risks requiring leadership context.`,
      href: `${basePath}/risks`,
    },
    {
      title: 'Vendor appendix',
      status: summary.highRiskVendors === 0 ? 'ready' : 'attention',
      description: `${summary.highRiskVendors} high-risk vendors should be explained before customer or leadership review.`,
      href: `${basePath}/vendors`,
    },
    {
      title: 'Evidence appendix',
      status: summary.missingDocuments === 0 ? 'ready' : summary.missingDocuments <= 3 ? 'attention' : 'blocked',
      description: `${summary.missingDocuments} missing evidence items may weaken external confidence.`,
      href: `${basePath}/documents`,
    },
  ];

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 p-5 text-white shadow-2xl md:p-6">
      <div className="absolute right-10 top-0 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />

      <div className="relative grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200/80">Leadership report center</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight">Monthly executive package</h2>
          <p className="mt-4 text-sm leading-6 text-slate-400">
            Package compliance posture, risks, vendors and evidence into a leadership-ready report without rebuilding context manually.
          </p>

          <div className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-5 text-center">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Report readiness</p>
            <p className="mt-3 text-6xl font-bold tracking-tight">{readiness}%</p>
            <p className="mt-2 text-sm font-semibold text-emerald-200">{getReadinessLabel(readiness)}</p>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Link href={`${basePath}/reports`} className="rounded-2xl bg-white px-4 py-3 text-center text-sm font-bold text-slate-950 transition hover:bg-slate-100">
              Open reports
            </Link>
            <Link href={`${basePath}/reports/print`} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center text-sm font-bold transition hover:border-primary/50 hover:bg-white/[0.08]">
              Print review pack
            </Link>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {sections.map((section) => (
            <Link key={section.title} href={section.href} className="group rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-5 transition hover:-translate-y-1 hover:border-primary/50 hover:bg-white/[0.075]">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-semibold">{section.title}</h3>
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses(section.status)}`}>
                  {statusLabel(section.status)}
                </span>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-400">{section.description}</p>
              <p className="mt-5 text-xs font-semibold text-primary/80 opacity-0 transition group-hover:opacity-100">Review section →</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
