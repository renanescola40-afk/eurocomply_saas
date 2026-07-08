import Link from 'next/link';
import type { DashboardSummary, DashboardTrendComparison } from '@/server/queries/dashboard';

type BoardModePreviewProps = {
  summary: DashboardSummary;
  trendComparison?: DashboardTrendComparison;
  basePath: string;
};

type BoardDecision = {
  label: string;
  value: string;
  detail: string;
  href: string;
  tone: 'emerald' | 'amber' | 'rose' | 'sky';
};

function toneClasses(tone: BoardDecision['tone']) {
  const tones = {
    emerald: 'border-emerald-300/30 bg-emerald-300/10 text-emerald-100',
    amber: 'border-amber-300/30 bg-amber-300/10 text-amber-100',
    rose: 'border-rose-300/30 bg-rose-300/10 text-rose-100',
    sky: 'border-sky-300/30 bg-sky-300/10 text-sky-100',
  };

  return tones[tone];
}

function getTrend(trendComparison?: DashboardTrendComparison) {
  const delta = trendComparison?.complianceScoreDelta;
  if (delta === undefined || delta === null) return 'Baseline';
  if (delta === 0) return 'Stable';
  return `${delta > 0 ? '+' : ''}${delta} pts`;
}

function getBoardReadout(summary: DashboardSummary) {
  if (summary.complianceScore >= 85 && summary.criticalRisks === 0 && summary.missingDocuments <= 2) {
    return 'Ready for customer, investor and leadership review.';
  }

  if (summary.complianceScore >= 70) {
    return 'Leadership-reviewable with focused remediation required.';
  }

  return 'Not yet ready for leadership review. Executive remediation should be prioritized.';
}

function getPrimaryAsk(summary: DashboardSummary) {
  if (summary.criticalRisks > 0) return 'Approve critical risk remediation plan.';
  if (summary.highRiskVendors > 0) return 'Approve vendor review sprint.';
  if (summary.missingDocuments > 0) return 'Approve evidence completion sprint.';
  return 'Approve customer review compliance package.';
}

export function BoardModePreview({ summary, trendComparison, basePath }: BoardModePreviewProps) {
  const decisions: BoardDecision[] = [
    {
      label: 'Decision ask',
      value: getPrimaryAsk(summary),
      detail: 'The single decision leadership should make from this posture.',
      href: `${basePath}/reports`,
      tone: summary.criticalRisks > 0 ? 'rose' : summary.highRiskVendors > 0 || summary.missingDocuments > 0 ? 'amber' : 'emerald',
    },
    {
      label: 'Business risk',
      value: summary.criticalRisks > 0 ? 'Material' : summary.highRiskVendors > 0 ? 'Elevated' : 'Controlled',
      detail: `${summary.criticalRisks} critical risks and ${summary.highRiskVendors} high-risk vendors currently visible.`,
      href: `${basePath}/risks`,
      tone: summary.criticalRisks > 0 ? 'rose' : summary.highRiskVendors > 0 ? 'amber' : 'emerald',
    },
    {
      label: 'Customer confidence',
      value: summary.missingDocuments > 3 ? 'At risk' : summary.missingDocuments > 0 ? 'Needs proof' : 'Strong',
      detail: `${summary.missingDocuments} missing evidence items could affect external reviews.`,
      href: `${basePath}/documents`,
      tone: summary.missingDocuments > 3 ? 'rose' : summary.missingDocuments > 0 ? 'amber' : 'emerald',
    },
    {
      label: 'Operating load',
      value: `${summary.openTasks} actions`,
      detail: 'Open actions represent the work required to move posture forward.',
      href: `${basePath}/tasks`,
      tone: summary.openTasks > 10 ? 'amber' : 'sky',
    },
  ];

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 p-5 text-white shadow-2xl md:p-7">
      <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-sky-500/10 blur-3xl" />

      <div className="relative grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-200/80">Leadership mode</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">Executive view without operational noise.</h2>
          <p className="mt-5 text-sm leading-6 text-slate-400">
            A C-level summary designed for leadership meetings, investor updates and enterprise customer reviews.
          </p>

          <div className="mt-7 rounded-3xl border border-white/10 bg-black/20 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Compliance posture</p>
                <p className="mt-3 text-6xl font-bold tracking-tight">{summary.complianceScore}%</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-right">
                <p className="text-xs text-slate-500">Trend</p>
                <p className="mt-1 text-xl font-bold">{getTrend(trendComparison)}</p>
              </div>
            </div>
            <p className="mt-5 text-sm leading-6 text-slate-300">{getBoardReadout(summary)}</p>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Link href={`${basePath}/reports`} className="rounded-2xl bg-white px-4 py-3 text-center text-sm font-bold text-slate-950 transition hover:bg-slate-100">
              Open leadership report
            </Link>
            <Link href={`${basePath}/reports/print`} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center text-sm font-bold transition hover:border-primary/50 hover:bg-white/[0.08]">
              Prepare review pack
            </Link>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {decisions.map((decision) => (
            <Link key={decision.label} href={decision.href} className="group rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-5 transition hover:-translate-y-1 hover:border-primary/50 hover:bg-white/[0.075]">
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{decision.label}</p>
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${toneClasses(decision.tone)}`}>Review</span>
              </div>
              <p className="mt-5 text-2xl font-semibold tracking-tight">{decision.value}</p>
              <p className="mt-4 min-h-12 text-sm leading-6 text-slate-400">{decision.detail}</p>
              <p className="mt-5 text-xs font-semibold text-primary/80 opacity-0 transition group-hover:opacity-100">Open executive context →</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
