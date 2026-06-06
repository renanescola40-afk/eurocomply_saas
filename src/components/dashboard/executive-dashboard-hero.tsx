import Link from 'next/link';
import type { DashboardSummary, DashboardTrendComparison } from '@/server/queries/dashboard';

type ExecutiveDashboardHeroProps = {
  summary: DashboardSummary;
  trendComparison?: DashboardTrendComparison;
  reportsHref: string;
};

function getReadinessLabel(score: number) {
  if (score >= 85) return 'Board ready';
  if (score >= 70) return 'Operationally controlled';
  if (score >= 50) return 'Needs focus';
  return 'High exposure';
}

function getReadinessNarrative(score: number) {
  if (score >= 85) return 'Evidence, risk and vendor operations are in a strong position for executive review.';
  if (score >= 70) return 'The program is functioning, with targeted work needed to reduce remaining exposure.';
  if (score >= 50) return 'Core controls exist, but open risks, missing evidence or vendor gaps need leadership focus.';
  return 'Immediate execution is needed to reduce compliance exposure before external review.';
}

function formatDelta(value?: number | null, suffix = '') {
  if (value === null || value === undefined) return 'No prior snapshot';
  if (value === 0) return `No change${suffix}`;
  return `${value > 0 ? '+' : ''}${value}${suffix}`;
}

function getDeltaTone(value?: number | null, lowerIsBetter = true) {
  if (value === null || value === undefined || value === 0) return 'text-slate-400';
  const isGood = lowerIsBetter ? value < 0 : value > 0;
  return isGood ? 'text-emerald-300' : 'text-rose-300';
}

function ExecutivePill({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-sm backdrop-blur">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${tone ?? 'text-white'}`}>{value}</p>
    </div>
  );
}

export function ExecutiveDashboardHero({ summary, trendComparison, reportsHref }: ExecutiveDashboardHeroProps) {
  const score = Math.max(0, Math.min(100, summary.complianceScore));
  const readiness = getReadinessLabel(score);
  const riskAttention = summary.criticalRisks + summary.openRisks;
  const evidenceGap = summary.missingDocuments;
  const vendorExposure = summary.highRiskVendors;

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 p-6 text-white shadow-2xl md:p-8">
      <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
      <div className="absolute bottom-0 left-10 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="relative grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="space-y-6">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.28em] text-primary/80">Executive command center</p>
            <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight md:text-5xl">
              {readiness} compliance posture
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
              {getReadinessNarrative(score)} Focus today on the highest exposure areas before generating the board report.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <ExecutivePill label="Risk attention" value={riskAttention} tone={riskAttention > 0 ? 'text-amber-200' : 'text-emerald-200'} />
            <ExecutivePill label="Evidence gap" value={evidenceGap} tone={evidenceGap > 0 ? 'text-amber-200' : 'text-emerald-200'} />
            <ExecutivePill label="Vendor exposure" value={vendorExposure} tone={vendorExposure > 0 ? 'text-amber-200' : 'text-emerald-200'} />
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href={reportsHref} className="inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100">
              Open executive report
            </Link>
            <Link href={reportsHref.replace('/reports', '/tasks')} className="inline-flex h-11 items-center justify-center rounded-full border border-white/15 px-5 text-sm font-semibold text-white transition hover:bg-white/10">
              Review open actions
            </Link>
          </div>
        </div>

        <div className="relative mx-auto flex w-full max-w-sm flex-col items-center rounded-[2rem] border border-white/10 bg-white/[0.05] p-6 text-center shadow-xl backdrop-blur">
          <div
            className="flex h-56 w-56 items-center justify-center rounded-full"
            style={{ background: `conic-gradient(rgb(16 185 129) ${score * 3.6}deg, rgba(255,255,255,0.10) 0deg)` }}
            aria-label={`Compliance score ${score}%`}
          >
            <div className="flex h-40 w-40 flex-col items-center justify-center rounded-full bg-slate-950 shadow-inner">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Score</p>
              <p className="mt-1 text-5xl font-bold tracking-tight">{score}%</p>
              <p className="mt-2 text-xs text-slate-400">{readiness}</p>
            </div>
          </div>

          <div className="mt-5 grid w-full grid-cols-2 gap-3 text-left text-xs">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
              <p className="text-slate-400">Score movement</p>
              <p className={getDeltaTone(trendComparison?.complianceScoreDelta, false)}>
                {formatDelta(trendComparison?.complianceScoreDelta, ' pts')}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
              <p className="text-slate-400">Open tasks</p>
              <p className={getDeltaTone(trendComparison?.openTasksDelta)}>{formatDelta(trendComparison?.openTasksDelta)}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
