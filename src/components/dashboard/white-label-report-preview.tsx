import Image from 'next/image';
import Link from 'next/link';
import type { DashboardSummary, DashboardTrendComparison } from '@/server/queries/dashboard';

type WhiteLabelReportPreviewProps = {
  summary: DashboardSummary;
  trendComparison?: DashboardTrendComparison;
  basePath: string;
};

function getDelta(trendComparison?: DashboardTrendComparison) {
  const delta = trendComparison?.complianceScoreDelta;
  if (delta === undefined || delta === null) return 'Baseline';
  if (delta === 0) return 'Stable';
  return `${delta > 0 ? '+' : ''}${delta} pts`;
}

function getReportTone(score: number) {
  if (score >= 80) return 'text-emerald-700';
  if (score >= 60) return 'text-amber-700';
  return 'text-rose-700';
}

export function WhiteLabelReportPreview({ summary, trendComparison, basePath }: WhiteLabelReportPreviewProps) {
  const reportMonth = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(new Date());
  const tone = getReportTone(summary.complianceScore);

  return (
    <section className="overflow-hidden rounded-xl border border-white/[0.075] bg-[#0d1522] text-white">
      <div className="grid xl:grid-cols-[300px_minmax(0,1fr)]">
        <div className="border-b border-white/[0.055] px-5 py-5 xl:border-b-0 xl:border-r">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-200/65">Report preview</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">Executive reporting layout</h2>
          <p className="mt-3 text-sm leading-6 text-white/42">Preview the current workspace metrics in a clean report format before opening the report or printable package.</p>

          <dl className="mt-6 divide-y divide-white/[0.055] border-y border-white/[0.055]">
            <div className="py-3.5"><dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/28">Audience</dt><dd className="mt-1.5 text-sm font-semibold text-white/62">Leadership and authorized external review</dd></div>
            <div className="py-3.5"><dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/28">Source</dt><dd className="mt-1.5 text-sm leading-6 text-white/48">Current score, risk, vendor and evidence registers</dd></div>
          </dl>

          <div className="mt-5 flex flex-wrap gap-2.5">
            <Link href={`${basePath}/reports`} className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60">Open report</Link>
            <Link href={`${basePath}/reports/print`} className="inline-flex h-10 items-center justify-center rounded-lg border border-white/[0.09] bg-white/[0.025] px-4 text-sm font-semibold text-white/70 transition hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/40">Printable package</Link>
          </div>
        </div>

        <div className="bg-[#f7f7f5] p-4 text-[#171a18] md:p-6">
          <div className="mx-auto max-w-4xl rounded-lg border border-black/10 bg-white p-5 md:p-6">
            <div className="flex flex-col gap-4 border-b border-black/10 pb-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div>
                  <Image src="/brand/risck-comply-wordmark.svg" alt="RISCK COMPLY" width={148} height={36} className="h-7 w-auto brightness-0" />
                  <p className="mt-1 text-xs text-black/45">Governance report preview</p>
                </div>
                <h3 className="mt-5 text-2xl font-semibold tracking-[-0.03em]">Monthly Governance Summary</h3>
                <p className="mt-1.5 text-xs text-black/45">{reportMonth} · Generated from current workspace data</p>
              </div>
              <div className="rounded-md border border-black/10 px-4 py-3 text-left sm:text-right">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/35">Compliance score</p>
                <p className={`mt-1 text-3xl font-semibold tracking-[-0.04em] ${tone}`}>{summary.complianceScore}%</p>
              </div>
            </div>

            <div className="grid border-b border-black/10 md:grid-cols-4 md:divide-x md:divide-black/10">
              <ReportMetric label="Trend" value={getDelta(trendComparison)} />
              <ReportMetric label="Open risks" value={String(summary.openRisks)} />
              <ReportMetric label="High-risk vendors" value={String(summary.highRiskVendors)} />
              <ReportMetric label="Missing evidence" value={String(summary.missingDocuments)} />
            </div>

            <div className="grid gap-5 py-5 md:grid-cols-[1fr_0.75fr]">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/35">Current summary</p>
                <p className="mt-2 text-sm leading-6 text-black/62">The workspace currently reports a {summary.complianceScore}% compliance score, {summary.openRisks} open risks, {summary.highRiskVendors} high-risk vendors and {summary.missingDocuments} missing evidence items.</p>
              </div>
              <div className="border-t border-black/10 pt-4 md:border-l md:border-t-0 md:pl-5 md:pt-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/35">Review focus</p>
                <p className="mt-2 text-sm leading-6 text-black/62">Verify open risks, vendor status and evidence gaps before sharing the package externally.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ReportMetric({ label, value }: { label: string; value: string }) {
  return <div className="px-4 py-4"><p className="text-[9px] font-semibold uppercase tracking-[0.13em] text-black/35">{label}</p><p className="mt-1.5 text-xl font-semibold tracking-[-0.025em]">{value}</p></div>;
}
