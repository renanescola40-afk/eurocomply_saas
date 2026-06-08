import Link from 'next/link';
import type { DashboardSummary, DashboardTrendComparison } from '@/server/queries/dashboard';

type StickyExecutiveKpiBarProps = {
  summary: DashboardSummary;
  trendComparison?: DashboardTrendComparison;
  basePath: string;
};

function getDelta(trendComparison?: DashboardTrendComparison) {
  const delta = trendComparison?.complianceScoreDelta;
  if (delta === undefined || delta === null) return 'Base';
  if (delta === 0) return '0';
  return `${delta > 0 ? '+' : ''}${delta}`;
}

function scoreTone(score: number) {
  if (score >= 80) return 'text-emerald-300';
  if (score >= 60) return 'text-amber-300';
  return 'text-rose-300';
}

export function StickyExecutiveKpiBar({ summary, trendComparison, basePath }: StickyExecutiveKpiBarProps) {
  const items = [
    { label: 'Score', value: `${summary.complianceScore}%`, href: `${basePath}/reports`, valueClassName: scoreTone(summary.complianceScore) },
    { label: 'Trend', value: getDelta(trendComparison), href: `${basePath}/reports`, valueClassName: 'text-sky-300' },
    { label: 'Critical', value: summary.criticalRisks, href: `${basePath}/risks`, valueClassName: summary.criticalRisks > 0 ? 'text-rose-300' : 'text-emerald-300' },
    { label: 'Tasks', value: summary.openTasks, href: `${basePath}/tasks`, valueClassName: 'text-white' },
    { label: 'Vendors', value: summary.highRiskVendors, href: `${basePath}/vendors`, valueClassName: summary.highRiskVendors > 0 ? 'text-amber-300' : 'text-emerald-300' },
    { label: 'Evidence gap', value: summary.missingDocuments, href: `${basePath}/documents`, valueClassName: summary.missingDocuments > 0 ? 'text-amber-300' : 'text-emerald-300' },
  ];

  return (
    <div className="sticky top-[5.6rem] z-20 rounded-[1.35rem] border border-white/10 bg-slate-950/90 p-2 text-white shadow-2xl backdrop-blur supports-[backdrop-filter]:bg-slate-950/75">
      <div className="flex items-center gap-2 overflow-x-auto">
        <div className="hidden shrink-0 rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 md:block">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary/80">Live posture</p>
          <p className="mt-1 text-xs text-slate-400">Executive KPI strip</p>
        </div>

        {items.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="group min-w-28 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 transition hover:border-primary/50 hover:bg-white/[0.08]"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 transition group-hover:text-slate-300">{item.label}</p>
            <p className={`mt-1 text-xl font-bold leading-none ${item.valueClassName}`}>{item.value}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
