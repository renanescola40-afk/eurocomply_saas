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
  if (value === null || value === undefined || value === 0) return 'text-white/42';
  const isGood = lowerIsBetter ? value < 0 : value > 0;
  return isGood ? 'text-emerald-200' : 'text-rose-200';
}

function ExecutiveMetric({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="border-l border-white/[0.07] pl-4 first:border-l-0 first:pl-0 sm:first:border-l sm:first:pl-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/34">{label}</p>
      <p className={`mt-1.5 text-2xl font-semibold tracking-[-0.03em] ${tone ?? 'text-white'}`}>{value}</p>
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
    <section className="overflow-hidden rounded-xl border border-white/[0.075] bg-[#101715] text-white">
      <div className="grid lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="px-5 py-6 md:px-7 md:py-7">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-100/55">Executive overview</p>
          <h2 className="mt-2 max-w-3xl text-3xl font-semibold tracking-[-0.04em] md:text-4xl">
            {readiness} compliance posture
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/48">
            {getReadinessNarrative(score)}
          </p>

          <div className="mt-7 grid gap-5 border-y border-white/[0.055] py-5 sm:grid-cols-3">
            <ExecutiveMetric label="Risk attention" value={riskAttention} tone={riskAttention > 0 ? 'text-amber-200' : 'text-emerald-200'} />
            <ExecutiveMetric label="Evidence gap" value={evidenceGap} tone={evidenceGap > 0 ? 'text-amber-200' : 'text-emerald-200'} />
            <ExecutiveMetric label="Vendor exposure" value={vendorExposure} tone={vendorExposure > 0 ? 'text-amber-200' : 'text-emerald-200'} />
          </div>

          <div className="mt-5 flex flex-wrap gap-2.5">
            <Link href={reportsHref} className="inline-flex h-10 items-center justify-center rounded-lg bg-emerald-300 px-4 text-sm font-semibold text-[#07110d] transition hover:bg-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200/60">
              Open executive report
            </Link>
            <Link href={reportsHref.replace('/reports', '/tasks')} className="inline-flex h-10 items-center justify-center rounded-lg border border-white/[0.09] bg-white/[0.025] px-4 text-sm font-semibold text-white/72 transition hover:bg-white/[0.05] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200/40">
              Review open actions
            </Link>
          </div>
        </div>

        <div className="border-t border-white/[0.055] bg-black/[0.12] px-5 py-6 lg:border-l lg:border-t-0 lg:px-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/34">Compliance score</p>
              <p className="mt-1 text-sm font-medium text-white/68">{readiness}</p>
            </div>
            <span className="rounded-md border border-emerald-300/15 bg-emerald-300/[0.055] px-2.5 py-1 text-xs font-semibold text-emerald-100/80">Live</span>
          </div>

          <div className="mx-auto mt-6 flex h-44 w-44 items-center justify-center rounded-full" style={{ background: `conic-gradient(rgb(110 231 183) ${score * 3.6}deg, rgba(255,255,255,0.08) 0deg)` }} aria-label={`Compliance score ${score}%`}>
            <div className="flex h-32 w-32 flex-col items-center justify-center rounded-full border border-white/[0.06] bg-[#0a0f0d]">
              <p className="text-4xl font-semibold tracking-[-0.045em]">{score}%</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.15em] text-white/32">Current</p>
            </div>
          </div>

          <dl className="mt-6 divide-y divide-white/[0.055] border-t border-white/[0.055] text-xs">
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-white/36">Score movement</dt>
              <dd className={`font-semibold ${getDeltaTone(trendComparison?.complianceScoreDelta, false)}`}>{formatDelta(trendComparison?.complianceScoreDelta, ' pts')}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-white/36">Open tasks</dt>
              <dd className={`font-semibold ${getDeltaTone(trendComparison?.openTasksDelta)}`}>{formatDelta(trendComparison?.openTasksDelta)}</dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}
