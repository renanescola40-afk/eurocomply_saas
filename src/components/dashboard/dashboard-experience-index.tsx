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
    strong: 'border-emerald-300/30 bg-emerald-300/10 text-emerald-200',
    active: 'border-sky-300/30 bg-sky-300/10 text-sky-200',
    watch: 'border-amber-300/30 bg-amber-300/10 text-amber-200',
  };

  return tones[status];
}

function getOperatingGrade(summary: DashboardSummary) {
  if (summary.complianceScore >= 85 && summary.criticalRisks === 0 && summary.missingDocuments <= 2) return 'Enterprise review-ready';
  if (summary.complianceScore >= 75) return 'Leadership review-ready';
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
      description: `${getOperatingGrade(summary)} posture with ${getDeltaText(trendComparison)} movement.`,
      href: `${basePath}/reports`,
      status: summary.complianceScore >= 80 ? 'strong' : summary.complianceScore >= 60 ? 'active' : 'watch',
    },
    {
      label: 'Evidence',
      value: String(summary.missingDocuments),
      description: 'Missing evidence items that may weaken customer or leadership confidence.',
      href: `${basePath}/documents`,
      status: summary.missingDocuments === 0 ? 'strong' : summary.missingDocuments <= 3 ? 'active' : 'watch',
    },
    {
      label: 'Exposure',
      value: String(summary.criticalRisks + summary.highRiskVendors),
      description: 'Critical risk and high-risk vendor items demanding executive attention.',
      href: `${basePath}/risks`,
      status: summary.criticalRisks + summary.highRiskVendors === 0 ? 'strong' : summary.criticalRisks + summary.highRiskVendors <= 3 ? 'active' : 'watch',
    },
    {
      label: 'Execution',
      value: String(summary.openTasks),
      description: 'Open work items carrying the remediation and governance operating plan.',
      href: `${basePath}/tasks`,
      status: summary.openTasks <= 3 ? 'strong' : summary.openTasks <= 10 ? 'active' : 'watch',
    },
  ];

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 p-5 text-white shadow-2xl md:p-6">
      <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
      <div className="absolute bottom-0 left-10 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="relative grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">Experience index</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">One view for the full compliance operating system</h2>
          <p className="mt-4 text-sm leading-6 text-slate-400">
            A compact index that turns the premium dashboard into one coherent executive narrative: health, evidence, exposure and execution.
          </p>
          <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.045] p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Operating grade</p>
            <p className="mt-2 text-3xl font-bold tracking-tight">{getOperatingGrade(summary)}</p>
            <p className="mt-2 text-sm text-slate-400">Generated from compliance score, risks, vendors and evidence gaps.</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {signals.map((signal) => (
            <Link key={signal.label} href={signal.href} className="group rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-5 transition hover:-translate-y-1 hover:border-primary/50 hover:bg-white/[0.075]">
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{signal.label}</p>
                <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusClasses(signal.status)}`}>{signal.status}</span>
              </div>
              <p className="mt-5 text-4xl font-bold tracking-tight">{signal.value}</p>
              <p className="mt-4 min-h-16 text-sm leading-6 text-slate-400">{signal.description}</p>
              <p className="mt-5 text-xs font-semibold text-primary/80 opacity-0 transition group-hover:opacity-100">Open signal →</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
