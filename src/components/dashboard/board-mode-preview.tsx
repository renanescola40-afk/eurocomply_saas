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
  tone: 'emerald' | 'amber' | 'rose' | 'neutral';
};

function toneClasses(tone: BoardDecision['tone']) {
  const tones = {
    emerald: 'border-emerald-300/15 bg-emerald-300/[0.055] text-emerald-100/80',
    amber: 'border-amber-300/15 bg-amber-300/[0.055] text-amber-100/80',
    rose: 'border-rose-300/15 bg-rose-300/[0.055] text-rose-100/80',
    neutral: 'border-white/[0.075] bg-white/[0.025] text-white/52',
  };
  return tones[tone];
}

function getTrend(trendComparison?: DashboardTrendComparison) {
  const delta = trendComparison?.complianceScoreDelta;
  if (delta === undefined || delta === null) return 'Baseline';
  if (delta === 0) return 'Stable';
  return `${delta > 0 ? '+' : ''}${delta} pts`;
}

function getLeadershipReadout(summary: DashboardSummary) {
  if (summary.criticalRisks > 0) return `${summary.criticalRisks} critical risks require leadership attention.`;
  if (summary.highRiskVendors > 0) return `${summary.highRiskVendors} high-risk vendors remain in the review posture.`;
  if (summary.missingDocuments > 0) return `${summary.missingDocuments} evidence items remain missing from the current register.`;
  if (summary.openTasks > 0) return `${summary.openTasks} open actions remain in the remediation plan.`;
  return 'No critical risk, high-risk vendor or missing-evidence signal is currently shown in this summary.';
}

function getPrimaryAsk(summary: DashboardSummary) {
  if (summary.criticalRisks > 0) return 'Review critical risk treatment';
  if (summary.highRiskVendors > 0) return 'Review high-risk vendors';
  if (summary.missingDocuments > 0) return 'Close evidence gaps';
  if (summary.openTasks > 0) return 'Review open actions';
  return 'Review current governance report';
}

export function BoardModePreview({ summary, trendComparison, basePath }: BoardModePreviewProps) {
  const decisions: BoardDecision[] = [
    {
      label: 'Leadership focus',
      value: getPrimaryAsk(summary),
      detail: 'The highest-priority workstream derived from the current workspace signals.',
      href: summary.criticalRisks > 0 ? `${basePath}/risks` : summary.highRiskVendors > 0 ? `${basePath}/vendors` : summary.missingDocuments > 0 ? `${basePath}/documents` : summary.openTasks > 0 ? `${basePath}/tasks` : `${basePath}/reports`,
      tone: summary.criticalRisks > 0 ? 'rose' : summary.highRiskVendors > 0 || summary.missingDocuments > 0 ? 'amber' : 'emerald',
    },
    {
      label: 'Critical risks',
      value: String(summary.criticalRisks),
      detail: `${summary.openRisks} open risks are currently tracked in total.`,
      href: `${basePath}/risks`,
      tone: summary.criticalRisks > 0 ? 'rose' : summary.openRisks > 0 ? 'amber' : 'emerald',
    },
    {
      label: 'Evidence gap',
      value: String(summary.missingDocuments),
      detail: `${summary.totals.documents} documents are currently tracked by the workspace.`,
      href: `${basePath}/documents`,
      tone: summary.missingDocuments > 3 ? 'rose' : summary.missingDocuments > 0 ? 'amber' : 'emerald',
    },
    {
      label: 'Operating load',
      value: `${summary.openTasks} actions`,
      detail: 'Open actions in the current governance and remediation queue.',
      href: `${basePath}/tasks`,
      tone: summary.openTasks > 10 ? 'amber' : 'neutral',
    },
  ];

  return (
    <section className="overflow-hidden rounded-xl border border-white/[0.075] bg-[#101715] text-white">
      <div className="grid xl:grid-cols-[300px_minmax(0,1fr)]">
        <div className="border-b border-white/[0.055] px-5 py-5 xl:border-b-0 xl:border-r">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-100/55">Leadership summary</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">Current governance posture</h2>
          <p className="mt-3 text-sm leading-6 text-white/42">A compact readout for leadership using only current score, risk, vendor, evidence and action data.</p>

          <dl className="mt-6 divide-y divide-white/[0.055] border-y border-white/[0.055]">
            <div className="py-3.5">
              <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/28">Compliance score</dt>
              <dd className="mt-1.5 text-3xl font-semibold tracking-[-0.04em]">{summary.complianceScore}%</dd>
            </div>
            <div className="py-3.5">
              <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/28">Trend</dt>
              <dd className="mt-1.5 text-lg font-semibold text-white/72">{getTrend(trendComparison)}</dd>
            </div>
            <div className="py-3.5">
              <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/28">Readout</dt>
              <dd className="mt-1.5 text-sm leading-6 text-white/52">{getLeadershipReadout(summary)}</dd>
            </div>
          </dl>

          <div className="mt-5 flex flex-wrap gap-2.5">
            <Link href={`${basePath}/reports`} className="inline-flex h-10 items-center justify-center rounded-lg bg-emerald-300 px-4 text-sm font-semibold text-[#07110d] transition hover:bg-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200/60">Open report</Link>
            <Link href={`${basePath}/reports/print`} className="inline-flex h-10 items-center justify-center rounded-lg border border-white/[0.09] bg-white/[0.025] px-4 text-sm font-semibold text-white/70 transition hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200/40">Review pack</Link>
          </div>
        </div>

        <div className="grid md:grid-cols-2">
          {decisions.map((decision, index) => (
            <Link key={decision.label} href={decision.href} className={`group min-h-44 px-5 py-5 transition hover:bg-white/[0.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-300/35 ${index > 0 ? 'border-t border-white/[0.055] md:border-l md:border-t-0' : ''} ${index === 2 ? 'md:border-t md:border-white/[0.055]' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/30">{decision.label}</p>
                <span className={`rounded-md border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] ${toneClasses(decision.tone)}`}>Current</span>
              </div>
              <p className="mt-5 text-xl font-semibold tracking-[-0.025em] text-white/84">{decision.value}</p>
              <p className="mt-3 text-xs leading-5 text-white/38">{decision.detail}</p>
              <p className="mt-4 text-[10px] font-semibold text-emerald-100/0 transition group-hover:text-emerald-100/65">Open context →</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
