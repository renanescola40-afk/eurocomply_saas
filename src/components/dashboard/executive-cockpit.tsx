import Link from 'next/link';
import type { DashboardSummary, DashboardTrendComparison } from '@/server/queries/dashboard';

type ExecutiveCockpitProps = {
  summary: DashboardSummary;
  trendComparison?: DashboardTrendComparison;
  basePath: string;
};

function getHealth(score: number) {
  if (score >= 80) return { label: 'Healthy', description: 'Above the product operating threshold', tone: 'text-emerald-200', ring: 'rgb(110,231,183)' };
  if (score >= 60) return { label: 'Attention', description: 'Focused remediation needed', tone: 'text-amber-200', ring: 'rgb(253,230,138)' };
  return { label: 'Critical', description: 'Executive action required', tone: 'text-rose-200', ring: 'rgb(253,164,175)' };
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
  if (value >= 5) return { label: 'High', width: '92%', tone: 'bg-rose-300' };
  if (value >= 2) return { label: 'Medium', width: '62%', tone: 'bg-amber-200' };
  return { label: 'Low', width: '28%', tone: 'bg-emerald-200' };
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
    <section className="overflow-hidden rounded-xl border border-white/[0.075] bg-[#0d1522] text-white">
      <div className="grid xl:grid-cols-[0.88fr_1.12fr]">
        <div className="border-b border-white/[0.055] p-5 md:p-6 xl:border-b-0 xl:border-r">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-200/55">Executive cockpit</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">Compliance health</h2>
            </div>
            <span className={`rounded-md border border-white/[0.075] bg-white/[0.025] px-2.5 py-1 text-xs font-semibold ${health.tone}`}>{health.label}</span>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-[180px_minmax(0,1fr)] md:items-center">
            <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-full" style={{ background: `conic-gradient(${health.ring} ${ringDegrees}deg, rgba(255,255,255,0.08) 0deg)` }} aria-label={`Compliance score ${summary.complianceScore}%`}>
              <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full border border-white/[0.06] bg-[#07101a]">
                <p className="text-4xl font-semibold tracking-[-0.045em]">{summary.complianceScore}%</p>
                <p className={`mt-1 text-xs font-semibold ${health.tone}`}>{health.label}</p>
              </div>
            </div>

            <dl className="divide-y divide-white/[0.055] border-y border-white/[0.055]">
              <div className="py-3.5">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/30">Score movement</dt>
                <dd className={`mt-1.5 text-xl font-semibold ${(scoreDelta ?? 0) >= 0 ? 'text-emerald-200' : 'text-rose-200'}`}>{formatDelta(scoreDelta, ' pts')}</dd>
              </div>
              <div className="py-3.5">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/30">Operating status</dt>
                <dd className="mt-1.5 text-sm font-medium text-white/72">{health.description}</dd>
              </div>
              <div className="py-3.5">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/30">Largest current exposure</dt>
                <dd className="mt-1.5 text-sm font-medium text-white/72">{exposure.detail}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="grid lg:grid-cols-2">
          <div className="border-b border-white/[0.055] p-5 lg:border-b-0 lg:border-r">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/30">Leadership focus</p>
            <div className="mt-4 divide-y divide-white/[0.055] border-y border-white/[0.055]">
              <Link href={`${basePath}/${exposure.href}`} className="block py-4 transition hover:bg-white/[0.025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400/40">
                <p className="text-xs text-white/34">Biggest exposure</p>
                <p className="mt-1.5 text-lg font-semibold text-white/86">{exposure.detail}</p>
                <p className="mt-2 text-xs font-semibold text-blue-200/70">Open workstream →</p>
              </Link>
              <div className="py-4">
                <p className="text-xs text-white/34">Trend</p>
                <p className="mt-1.5 text-base font-semibold text-white/78">{formatDelta(scoreDelta, ' pts')} compliance score movement</p>
              </div>
              <div className="py-4">
                <p className="text-xs text-white/34">Recommended next step</p>
                <p className="mt-1.5 text-base font-semibold text-white/78">Prioritize {exposure.label.toLowerCase()} before the next leadership report.</p>
              </div>
            </div>
          </div>

          <div className="p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/30">Exposure radar</p>
            <div className="mt-4 divide-y divide-white/[0.055] border-y border-white/[0.055]">
              {radar.map((item) => {
                const level = getRadarLevel(item.value);
                return (
                  <Link key={item.label} href={item.href} className="block py-3.5 transition hover:bg-white/[0.025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400/40">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium text-white/78">{item.label}</span>
                      <span className="text-xs text-white/38">{level.label}</span>
                    </div>
                    <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-white/[0.07]">
                      <div className={`h-full rounded-full ${level.tone}`} style={{ width: level.width }} />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="grid border-t border-white/[0.055] sm:grid-cols-2 lg:grid-cols-4">
        {quickActions.map((action, index) => (
          <Link key={action.label} href={action.href} className={`px-4 py-3.5 text-center text-sm font-semibold text-white/62 transition hover:bg-white/[0.035] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400/40 ${index > 0 ? 'border-t border-white/[0.055] sm:border-l sm:border-t-0' : ''} ${index === 2 ? 'sm:border-t sm:border-white/[0.055] lg:border-t-0' : ''}`}>
            {action.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
