import Link from 'next/link';
import type { DashboardSummary, DashboardTrendComparison } from '@/server/queries/dashboard';

type DashboardExperienceIndexProps = {
  summary: DashboardSummary;
  trendComparison?: DashboardTrendComparison;
  basePath: string;
};

type ExperienceSignal = {
  label: string;
  value: string;
  description: string;
  href: string;
  status: 'strong' | 'active' | 'watch';
};

function statusClasses(status: ExperienceSignal['status']) {
  const tones = {
    strong: 'border-emerald-300/15 bg-emerald-300/[0.055] text-emerald-100/80',
    active: 'border-white/[0.075] bg-white/[0.025] text-white/55',
    watch: 'border-amber-300/15 bg-amber-300/[0.055] text-amber-100/80',
  };
  return tones[status];
}

function getOperatingGrade(summary: DashboardSummary) {
  if (summary.complianceScore >= 85 && summary.criticalRisks === 0 && summary.missingDocuments <= 2) return 'Strong operating posture';
  if (summary.complianceScore >= 75) return 'Leadership review posture';
  if (summary.complianceScore >= 60) return 'Operational';
  return 'Needs focus';
}

function getDeltaText(trendComparison?: DashboardTrendComparison) {
  const delta = trendComparison?.complianceScoreDelta;
  if (delta === undefined || delta === null) return 'Baseline';
  if (delta === 0) return 'Stable';
  return `${delta > 0 ? '+' : ''}${delta} pts`;
}

export function DashboardExperienceIndex({ summary, trendComparison, basePath }: DashboardExperienceIndexProps) {
  const signals: ExperienceSignal[] = [
    {
      label: 'Health',
      value: `${summary.complianceScore}%`,
      description: `${getOperatingGrade(summary)} with ${getDeltaText(trendComparison)} score movement.`,
      href: `${basePath}/reports`,
      status: summary.complianceScore >= 80 ? 'strong' : summary.complianceScore >= 60 ? 'active' : 'watch',
    },
    {
      label: 'Evidence',
      value: String(summary.missingDocuments),
      description: 'Missing evidence items in the current document register.',
      href: `${basePath}/documents`,
      status: summary.missingDocuments === 0 ? 'strong' : summary.missingDocuments <= 3 ? 'active' : 'watch',
    },
    {
      label: 'Exposure',
      value: String(summary.criticalRisks + summary.highRiskVendors),
      description: 'Critical risks and high-risk vendors in the current workspace posture.',
      href: `${basePath}/risks`,
      status: summary.criticalRisks + summary.highRiskVendors === 0 ? 'strong' : summary.criticalRisks + summary.highRiskVendors <= 3 ? 'active' : 'watch',
    },
    {
      label: 'Execution',
      value: String(summary.openTasks),
      description: 'Open work items carrying the remediation and governance plan.',
      href: `${basePath}/tasks`,
      status: summary.openTasks <= 3 ? 'strong' : summary.openTasks <= 10 ? 'active' : 'watch',
    },
  ];

  return (
    <section className="overflow-hidden rounded-xl border border-white/[0.075] bg-[#101715] text-white">
      <div className="grid xl:grid-cols-[300px_minmax(0,1fr)]">
        <div className="border-b border-white/[0.055] px-5 py-5 xl:border-b-0 xl:border-r">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-100/55">Operating index</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">Health, evidence, exposure and execution</h2>
          <p className="mt-3 text-sm leading-6 text-white/42">A compact summary derived from the current workspace registers and compliance score.</p>
          <div className="mt-6 border-y border-white/[0.055] py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/28">Operating grade</p>
            <p className="mt-2 text-xl font-semibold text-white/80">{getOperatingGrade(summary)}</p>
            <p className="mt-2 text-xs leading-5 text-white/34">Derived from score, critical risks and current evidence gaps.</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 xl:grid-cols-4">
          {signals.map((signal, index) => (
            <Link key={signal.label} href={signal.href} className={`group min-h-44 px-5 py-5 transition hover:bg-white/[0.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-300/35 ${index > 0 ? 'border-t border-white/[0.055] md:border-l md:border-t-0' : ''} ${index === 2 ? 'md:border-t md:border-white/[0.055] xl:border-t-0' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/30">{signal.label}</p>
                <span className={`rounded-md border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] ${statusClasses(signal.status)}`}>{signal.status}</span>
              </div>
              <p className="mt-5 text-3xl font-semibold tracking-[-0.04em]">{signal.value}</p>
              <p className="mt-3 text-xs leading-5 text-white/38">{signal.description}</p>
              <p className="mt-4 text-[10px] font-semibold text-emerald-100/0 transition group-hover:text-emerald-100/65">Open signal →</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
