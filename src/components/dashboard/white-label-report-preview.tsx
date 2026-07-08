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
  if (score >= 80) return 'text-emerald-300';
  if (score >= 60) return 'text-amber-300';
  return 'text-rose-300';
}

export function WhiteLabelReportPreview({ summary, trendComparison, basePath }: WhiteLabelReportPreviewProps) {
  const reportMonth = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(new Date());
  const tone = getReportTone(summary.complianceScore);

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 p-5 text-white shadow-2xl md:p-6">
      <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute bottom-0 left-8 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">White-label reports</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight">Client-branded executive reporting</h2>
          <p className="mt-4 text-sm leading-6 text-slate-400">
            Preview how a leadership review report can look when packaged as a premium, client-facing compliance artifact.
          </p>

          <div className="mt-6 grid gap-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Branding</p>
              <p className="mt-2 text-sm text-slate-300">Logo, accent color and executive summary-ready layout.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Audience</p>
              <p className="mt-2 text-sm text-slate-300">Leadership, investors, enterprise customers and procurement teams.</p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Link href={`${basePath}/reports`} className="rounded-2xl bg-white px-4 py-3 text-center text-sm font-bold text-slate-950 transition hover:bg-slate-100">
              Customize report
            </Link>
            <Link href={`${basePath}/reports/print`} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center text-sm font-bold transition hover:border-primary/50 hover:bg-white/[0.08]">
              Export evidence
            </Link>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-white/10 bg-white p-5 text-slate-950 shadow-2xl">
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-sm font-bold text-white">RC</div>
                <div>
                  <p className="text-sm font-bold">RISCK COMPLY Report</p>
                  <p className="text-xs text-slate-500">White-label preview</p>
                </div>
              </div>
              <h3 className="mt-6 max-w-xl text-3xl font-bold tracking-tight">Monthly Compliance Leadership Memo</h3>
              <p className="mt-2 text-sm text-slate-500">{reportMonth} · Confidential executive package</p>
            </div>
            <div className="rounded-2xl border border-slate-200 px-4 py-3 text-right">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Score</p>
              <p className={`mt-1 text-3xl font-bold ${tone}`}>{summary.complianceScore}%</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <ReportMetric label="Trend" value={getDelta(trendComparison)} />
            <ReportMetric label="Open risks" value={String(summary.openRisks)} />
            <ReportMetric label="High-risk vendors" value={String(summary.highRiskVendors)} />
            <ReportMetric label="Missing evidence" value={String(summary.missingDocuments)} />
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-[1fr_0.75fr]">
            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Executive summary</p>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                The organization is operating at {summary.complianceScore}% compliance readiness. Current report focus areas include {summary.openRisks} open risks, {summary.highRiskVendors} high-risk vendors and {summary.missingDocuments} evidence gaps.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Next leadership question</p>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Which evidence gaps or third-party risks could delay an enterprise customer review?
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {['GDPR evidence', 'Vendor exposure', 'Risk treatment', 'Review pack'].map((tag) => (
              <span key={tag} className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500">{tag}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ReportMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
    </div>
  );
}
