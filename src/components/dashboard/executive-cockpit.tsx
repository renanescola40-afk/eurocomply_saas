import Link from 'next/link';
import type { DashboardSummary, DashboardTrendComparison } from '@/server/queries/dashboard';

type ExecutiveCockpitProps = {
  summary: DashboardSummary;
  trendComparison?: DashboardTrendComparison;
  basePath: string;
};

function getHealth(score: number) {
  if (score >= 80) return { label: 'Healthy', description: 'Above operating threshold', tone: 'text-emerald-300', ring: 'rgb(52,211,153)' };
  if (score >= 60) return { label: 'Attention', description: 'Focused remediation needed', tone: 'text-amber-300', ring: 'rgb(252,211,77)' };
  return { label: 'Critical', description: 'Executive action required', tone: 'text-rose-300', ring: 'rgb(251,113,133)' };
}

function formatDelta(value?: number | null, suffix = '') {
  if (value === null || value === undefined) return 'No prior snapshot';
  if (value === 0) return `No change${suffix}`;
  return `${value > 0 ? '+' : ''}${value}${suffix}`;
}

function getExposure(summary: DashboardSummary) {
  const exposures = [
    { label: 'Vendor exposure', value: summary.highRiskVendors, href: 'vendors', detail: `${summary.highRiskVendors} high-risk vendors` },
    { label: 'Risk backlog', value: summary.criticalRisks, href: 'risks', detail: `${summary.criticalRisks} critical risks` },
    { label: 'Evidence gap', value: summary.missingDocuments, href: 'documents', detail: `${summary.missingDocuments} missing documents` },
    { label: 'Execution load', value: summary.openTasks, href: 'tasks', detail: `${summary.openTasks} open tasks` },
  ].sort((a, b) => b.value - a.value);

  return exposures[0];
}

function getRadarLevel(value: number) {
  if (value >= 5) return { label: 'High', width: '92%', tone: 'bg-rose-400' };
  if (value >= 2) return { label: 'Medium', width: '62%', tone: 'bg-amber-300' };
  return { label: 'Low', width: '28%', tone: 'bg-emerald-300' };
}

export function ExecutiveCockpit({ summary, trendComparison, basePath }: ExecutiveCockpitProps) {
  const health = getHealth(summary.complianceScore);
  const exposure = getExposure(summary);
  const scoreDelta = trendComparison?.complianceScoreDelta;
  const ringDegrees = Math.min(360, Math.max(0, Math.round((summary.complianceScore / 100) * 360)));
  const radar = [
    { label: 'Vendors', value: summary.highRiskVendors, href: `${basePath}/vendors` },
    { label: 'Risks', value: summary.criticalRisks, href: `${basePath}/risks` },
    { label: 'Evidence', value: summary.missingDocuments, href: `${basePath}/documents` },
    { label: 'Tasks', value: summary.openTasks, href: `${basePath}/tasks` },
  ];
  const quickActions = [
    { label: 'Upload evidence', href: `${basePath}/documents` },
    { label: 'Create risk', href: `${basePath}/risks` },
    { label: 'Review vendors', href: `${basePath}/vendors` },
    { label: 'Leadership report', href: `${basePath}/reports` },
  ];

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 p-5 text-white shadow-2xl md:p-6">
      <div className="absolute right-0 top-0 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />
      <div className="absolute bottom-0 left-10 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="relative grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">Executive cockpit</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">Compliance health center</h2>
            </div>
            <span className={`rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-semibold ${health.tone}`}>{health.label}</span>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-[0.8fr_1fr] md:items-center">
            <div className="mx-auto flex h-48 w-48 items-center justify-center rounded-full" style={{ background: `conic-gradient(${health.ring} ${ringDegrees}deg, rgba(255,255,255,0.10) 0deg)` }}>
              <div className="flex h-36 w-36 flex-col items-center justify-center rounded-full bg-slate-950 shadow-inner">
                <p className="text-5xl font-bold tracking-tight">{summary.complianceScore}%</p>
                <p className={`mt-1 text-sm font-semibold ${health.tone}`}>{health.label}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">30-day movement</p>
                <p className={`mt-2 text-2xl font-semibold ${(scoreDelta ?? 0) >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{formatDelta(scoreDelta, ' pts')}</p>
                <p className="mt-1 text-sm text-slate-400">{health.description}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Benchmark</p>
                <p className="mt-2 text-xl font-semibold">{summary.complianceScore >= 75 ? 'Above early-stage B2B average' : 'Below leadership review threshold'}</p>
                <p className="mt-1 text-sm text-slate-400">Target operating score: 80%+</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Leadership intelligence</p>
            <div className="mt-5 space-y-4">
              <Link href={`${basePath}/${exposure.href}`} className="block rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:border-primary/50 hover:bg-white/[0.06]">
                <p className="text-sm text-slate-400">Biggest exposure</p>
                <p className="mt-2 text-2xl font-semibold">{exposure.detail}</p>
                <p className="mt-2 text-xs text-primary">Open workstream →</p>
              </Link>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-sm text-slate-400">Positive trend</p>
                <p className="mt-2 text-lg font-semibold">{formatDelta(scoreDelta, ' pts')} compliance score movement</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-sm text-slate-400">Recommendation</p>
                <p className="mt-2 text-lg font-semibold">Prioritize {exposure.label.toLowerCase()} before the next leadership report.</p>
              </div>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Risk radar</p>
            <div className="mt-5 space-y-4">
              {radar.map((item) => {
                const level = getRadarLevel(item.value);
                return (
                  <Link key={item.label} href={item.href} className="block rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:border-primary/50 hover:bg-white/[0.06]">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium">{item.label}</span>
                      <span className="text-slate-400">{level.label}</span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                      <div className={`h-full rounded-full ${level.tone}`} style={{ width: level.width }} />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="relative mt-5 grid gap-3 md:grid-cols-4">
        {quickActions.map((action) => (
          <Link key={action.label} href={action.href} className="rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-center text-sm font-semibold transition hover:-translate-y-0.5 hover:border-primary/50 hover:bg-white/[0.08]">
            {action.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
