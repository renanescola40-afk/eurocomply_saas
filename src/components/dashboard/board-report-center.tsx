import Link from 'next/link';
import type { DashboardSummary, DashboardTrendComparison } from '@/server/queries/dashboard';

type BoardReportCenterProps = {
  summary: DashboardSummary;
  trendComparison?: DashboardTrendComparison;
  basePath: string;
};

type ReportSection = {
  title: string;
  status: 'clear' | 'attention' | 'blocked';
  description: string;
  href: string;
};

function statusClasses(status: ReportSection['status']) {
  const tones = {
    clear: 'border-emerald-300/15 bg-emerald-300/[0.055] text-emerald-100/80',
    attention: 'border-amber-300/15 bg-amber-300/[0.055] text-amber-100/80',
    blocked: 'border-rose-300/15 bg-rose-300/[0.055] text-rose-100/80',
  };
  return tones[status];
}

function statusLabel(status: ReportSection['status']) {
  if (status === 'clear') return 'No open signal';
  if (status === 'attention') return 'Review';
  return 'Action required';
}

function getDeltaText(trendComparison?: DashboardTrendComparison) {
  const delta = trendComparison?.complianceScoreDelta;
  if (delta === null || delta === undefined) return 'First report baseline';
  if (delta === 0) return 'Stable since previous snapshot';
  return `${delta > 0 ? '+' : ''}${delta} pts since previous snapshot`;
}

export function BoardReportCenter({ summary, trendComparison, basePath }: BoardReportCenterProps) {
  const sections: ReportSection[] = [
    {
      title: 'Executive posture',
      status: summary.criticalRisks === 0 && summary.missingDocuments === 0 ? 'clear' : 'attention',
      description: `Compliance score is ${summary.complianceScore}% with ${getDeltaText(trendComparison).toLowerCase()}.`,
      href: `${basePath}/reports`,
    },
    {
      title: 'Risk narrative',
      status: summary.criticalRisks === 0 ? (summary.openRisks === 0 ? 'clear' : 'attention') : 'blocked',
      description: `${summary.openRisks} open risks, including ${summary.criticalRisks} critical risks in the current register.`,
      href: `${basePath}/risks`,
    },
    {
      title: 'Vendor appendix',
      status: summary.highRiskVendors === 0 ? 'clear' : 'attention',
      description: `${summary.highRiskVendors} high-risk vendors are currently flagged for review.`,
      href: `${basePath}/vendors`,
    },
    {
      title: 'Evidence appendix',
      status: summary.missingDocuments === 0 ? 'clear' : summary.missingDocuments <= 3 ? 'attention' : 'blocked',
      description: `${summary.missingDocuments} missing evidence items remain across ${summary.totals.documents} tracked documents.`,
      href: `${basePath}/documents`,
    },
  ];
  const openSections = sections.filter((section) => section.status !== 'clear').length;

  return (
    <section className="overflow-hidden rounded-xl border border-white/[0.075] bg-[#0d1522] text-white">
      <div className="grid xl:grid-cols-[300px_minmax(0,1fr)]">
        <div className="border-b border-white/[0.055] px-5 py-5 xl:border-b-0 xl:border-r">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-200/65">Leadership report center</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">Report package status</h2>
          <p className="mt-3 text-sm leading-6 text-white/42">Review the current report inputs without assigning an invented readiness percentage.</p>

          <dl className="mt-6 divide-y divide-white/[0.055] border-y border-white/[0.055]">
            <div className="py-3.5"><dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/28">Compliance score</dt><dd className="mt-1.5 text-3xl font-semibold tracking-[-0.04em]">{summary.complianceScore}%</dd></div>
            <div className="py-3.5"><dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/28">Sections needing review</dt><dd className="mt-1.5 text-2xl font-semibold tracking-[-0.03em]">{openSections}</dd></div>
            <div className="py-3.5"><dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/28">Trend</dt><dd className="mt-1.5 text-sm font-semibold text-white/62">{getDeltaText(trendComparison)}</dd></div>
          </dl>

          <div className="mt-5 flex flex-wrap gap-2.5">
            <Link href={`${basePath}/reports`} className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60">Open reports</Link>
            <Link href={`${basePath}/reports/print`} className="inline-flex h-10 items-center justify-center rounded-lg border border-white/[0.09] bg-white/[0.025] px-4 text-sm font-semibold text-white/70 transition hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/40">Review pack</Link>
          </div>
        </div>

        <div className="divide-y divide-white/[0.055]">
          {sections.map((section) => (
            <Link key={section.title} href={section.href} className="group block px-5 py-4 transition hover:bg-white/[0.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400/35 md:px-6">
              <div className="grid gap-3 md:grid-cols-[190px_130px_minmax(0,1fr)_auto] md:items-start">
                <h3 className="text-sm font-semibold text-white/82">{section.title}</h3>
                <span className={`w-fit rounded-md border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] ${statusClasses(section.status)}`}>{statusLabel(section.status)}</span>
                <p className="text-sm leading-6 text-white/42">{section.description}</p>
                <span className="text-xs font-semibold text-blue-200/60 transition group-hover:text-blue-100">Review →</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
