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
  if (score >= 80) return 'text-emerald-200';
  if (score >= 60) return 'text-amber-200';
  return 'text-rose-200';
}

export function StickyExecutiveKpiBar({ summary, trendComparison, basePath }: StickyExecutiveKpiBarProps) {
  const items = [
    { label: 'Score', value: `${summary.complianceScore}%`, href: `${basePath}/reports`, valueClassName: scoreTone(summary.complianceScore) },
    { label: 'Trend', value: getDelta(trendComparison), href: `${basePath}/reports`, valueClassName: 'text-white/72' },
    { label: 'Critical', value: summary.criticalRisks, href: `${basePath}/risks`, valueClassName: summary.criticalRisks > 0 ? 'text-rose-200' : 'text-emerald-200' },
    { label: 'Tasks', value: summary.openTasks, href: `${basePath}/tasks`, valueClassName: 'text-white/85' },
    { label: 'Vendors', value: summary.highRiskVendors, href: `${basePath}/vendors`, valueClassName: summary.highRiskVendors > 0 ? 'text-amber-200' : 'text-emerald-200' },
    { label: 'Evidence gap', value: summary.missingDocuments, href: `${basePath}/documents`, valueClassName: summary.missingDocuments > 0 ? 'text-amber-200' : 'text-emerald-200' },
  ];

  return (
    <div className="sticky top-[5.25rem] z-20 overflow-hidden rounded-xl border border-white/[0.075] bg-[#0d1311]/95 text-white backdrop-blur supports-[backdrop-filter]:bg-[#0d1311]/88">
      <div className="flex min-w-max items-stretch overflow-x-auto">
        <div className="hidden shrink-0 border-r border-white/[0.055] px-4 py-3 md:block">
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-emerald-100/48">Live posture</p>
          <p className="mt-1 text-xs text-white/34">Executive KPIs</p>
        </div>

        {items.map((item, index) => (
          <Link
            key={item.label}
            href={item.href}
            className={`group min-w-28 px-4 py-3 transition hover:bg-white/[0.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-300/35 ${index > 0 ? 'border-l border-white/[0.055]' : ''}`}
          >
            <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-white/28 transition group-hover:text-white/45">{item.label}</p>
            <p className={`mt-1 text-lg font-semibold leading-none tracking-[-0.02em] ${item.valueClassName}`}>{item.value}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
