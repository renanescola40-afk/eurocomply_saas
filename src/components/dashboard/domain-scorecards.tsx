import Link from 'next/link';
import type { DashboardSummary } from '@/server/queries/dashboard';

type DomainScorecardsProps = {
  summary: DashboardSummary;
  basePath: string;
};

type Scorecard = {
  area: string;
  score: number;
  href: string;
  status: string;
  description: string;
  metrics: Array<{ label: string; value: string | number }>;
};

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function scoreFromRatio(good: number, total: number) {
  if (total <= 0) return 100;
  return clampScore((good / total) * 100);
}

function getStatus(score: number) {
  if (score >= 85) return 'Strong';
  if (score >= 70) return 'Controlled';
  if (score >= 50) return 'Needs focus';
  return 'At risk';
}

function getScoreTone(score: number) {
  if (score >= 85) return 'text-emerald-300';
  if (score >= 70) return 'text-sky-300';
  if (score >= 50) return 'text-amber-300';
  return 'text-rose-300';
}

function getBarTone(score: number) {
  if (score >= 85) return 'bg-emerald-400';
  if (score >= 70) return 'bg-sky-400';
  if (score >= 50) return 'bg-amber-300';
  return 'bg-rose-400';
}

function buildScorecards(summary: DashboardSummary, basePath: string): Scorecard[] {
  const completedTasks = Math.max(0, summary.totals.tasks - summary.openTasks);
  const controlledRisks = Math.max(0, summary.totals.risks - summary.openRisks - summary.criticalRisks);
  const reviewedVendors = Math.max(0, summary.totals.vendors - summary.highRiskVendors);
  const availableDocuments = Math.max(0, summary.totals.documents - summary.missingDocuments);

  const tasksScore = scoreFromRatio(completedTasks, summary.totals.tasks);
  const risksScore = scoreFromRatio(controlledRisks, summary.totals.risks);
  const vendorsScore = scoreFromRatio(reviewedVendors, summary.totals.vendors);
  const documentsScore = scoreFromRatio(availableDocuments, summary.totals.documents);

  return [
    {
      area: 'Tasks',
      score: tasksScore,
      href: `${basePath}/tasks`,
      status: getStatus(tasksScore),
      description: 'Execution velocity and open compliance work.',
      metrics: [
        { label: 'Open', value: summary.openTasks },
        { label: 'Total', value: summary.totals.tasks },
      ],
    },
    {
      area: 'Risks',
      score: risksScore,
      href: `${basePath}/risks`,
      status: getStatus(risksScore),
      description: 'Residual exposure and critical risk load.',
      metrics: [
        { label: 'Open', value: summary.openRisks },
        { label: 'Critical', value: summary.criticalRisks },
      ],
    },
    {
      area: 'Vendors',
      score: vendorsScore,
      href: `${basePath}/vendors`,
      status: getStatus(vendorsScore),
      description: 'Third-party review and high-risk suppliers.',
      metrics: [
        { label: 'High risk', value: summary.highRiskVendors },
        { label: 'Total', value: summary.totals.vendors },
      ],
    },
    {
      area: 'Documents',
      score: documentsScore,
      href: `${basePath}/documents`,
      status: getStatus(documentsScore),
      description: 'Evidence readiness and missing approvals.',
      metrics: [
        { label: 'Missing', value: summary.missingDocuments },
        { label: 'Total', value: summary.totals.documents },
      ],
    },
  ];
}

export function DomainScorecards({ summary, basePath }: DomainScorecardsProps) {
  const scorecards = buildScorecards(summary, basePath);

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {scorecards.map((scorecard) => (
        <Link
          key={scorecard.area}
          href={scorecard.href}
          className="group rounded-3xl border border-white/10 bg-slate-950 p-5 text-white shadow-lg transition hover:-translate-y-0.5 hover:border-primary/50 hover:bg-slate-900"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{scorecard.area}</p>
              <h3 className="mt-2 text-lg font-semibold">{scorecard.status}</h3>
            </div>
            <p className={`text-3xl font-bold ${getScoreTone(scorecard.score)}`}>{scorecard.score}%</p>
          </div>

          <p className="mt-4 min-h-10 text-sm leading-5 text-slate-400">{scorecard.description}</p>

          <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
            <div className={`h-full rounded-full ${getBarTone(scorecard.score)}`} style={{ width: `${scorecard.score}%` }} />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
            {scorecard.metrics.map((metric) => (
              <div key={metric.label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                <p className="text-xs text-slate-500">{metric.label}</p>
                <p className="mt-1 font-semibold text-slate-100">{metric.value}</p>
              </div>
            ))}
          </div>

          <p className="mt-5 text-xs font-medium text-primary opacity-80 transition group-hover:opacity-100">Open {scorecard.area.toLowerCase()} →</p>
        </Link>
      ))}
    </section>
  );
}
