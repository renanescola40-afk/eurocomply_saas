import Link from 'next/link';
import type { DashboardSummary, DashboardTrendComparison } from '@/server/queries/dashboard';

type ExecutiveCommandCenterProps = {
  summary: DashboardSummary;
  trendComparison?: DashboardTrendComparison;
  basePath: string;
};

type CommandSignal = {
  label: string;
  value: string;
  detail: string;
  href: string;
  tone: 'emerald' | 'amber' | 'rose' | 'sky' | 'violet';
};

function toneClasses(tone: CommandSignal['tone']) {
  const tones = {
    emerald: 'border-emerald-300/30 bg-emerald-300/10 text-emerald-200',
    amber: 'border-amber-300/30 bg-amber-300/10 text-amber-200',
    rose: 'border-rose-300/30 bg-rose-300/10 text-rose-200',
    sky: 'border-sky-300/30 bg-sky-300/10 text-sky-200',
    violet: 'border-violet-300/30 bg-violet-300/10 text-violet-200',
  };

  return tones[tone];
}

function getDeltaText(trendComparison?: DashboardTrendComparison) {
  const delta = trendComparison?.complianceScoreDelta;
  if (delta === undefined || delta === null) return 'baseline';
  if (delta === 0) return 'stable';
  return `${delta > 0 ? '+' : ''}${delta} pts`;
}

function getRiskPosture(summary: DashboardSummary) {
  const exposure = summary.criticalRisks * 2 + summary.highRiskVendors + Math.ceil(summary.missingDocuments / 2);
  if (exposure >= 10) return { label: 'Critical', tone: 'rose' as const, detail: 'Executive remediation required' };
  if (exposure >= 5) return { label: 'Elevated', tone: 'amber' as const, detail: 'Focused remediation recommended' };
  return { label: 'Controlled', tone: 'emerald' as const, detail: 'No material exposure spike detected' };
}

function getAiRecommendation(summary: DashboardSummary) {
  if (summary.criticalRisks > 0) return 'Resolve critical risks before the next executive report.';
  if (summary.highRiskVendors > 0) return 'Review high-risk vendors and refresh data processing evidence.';
  if (summary.missingDocuments > 0) return 'Close evidence gaps to improve board and customer confidence.';
  return 'Posture is strong. Prepare a customer-ready compliance package.';
}

export function ExecutiveCommandCenter({ summary, trendComparison, basePath }: ExecutiveCommandCenterProps) {
  const riskPosture = getRiskPosture(summary);
  const evidenceCoverage = summary.totals.documents === 0
    ? 0
    : Math.round(((summary.totals.documents - summary.missingDocuments) / summary.totals.documents) * 100);

  const signals: CommandSignal[] = [
    {
      label: 'Compliance health',
      value: `${summary.complianceScore}%`,
      detail: `${getDeltaText(trendComparison)} since previous snapshot`,
      href: `${basePath}/reports`,
      tone: summary.complianceScore >= 80 ? 'emerald' : summary.complianceScore >= 60 ? 'amber' : 'rose',
    },
    {
      label: 'Risk exposure',
      value: riskPosture.label,
      detail: riskPosture.detail,
      href: `${basePath}/risks`,
      tone: riskPosture.tone,
    },
    {
      label: 'Vendor exposure',
      value: String(summary.highRiskVendors),
      detail: 'High-risk vendors requiring review',
      href: `${basePath}/vendors`,
      tone: summary.highRiskVendors > 3 ? 'rose' : summary.highRiskVendors > 0 ? 'amber' : 'emerald',
    },
    {
      label: 'Evidence coverage',
      value: `${evidenceCoverage}%`,
      detail: `${summary.missingDocuments} missing evidence items`,
      href: `${basePath}/documents`,
      tone: evidenceCoverage >= 90 ? 'emerald' : evidenceCoverage >= 70 ? 'amber' : 'rose',
    },
    {
      label: 'AI recommendation',
      value: 'Ready',
      detail: getAiRecommendation(summary),
      href: '#ai-executive-layer',
      tone: 'violet',
    },
  ];

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 p-5 text-white shadow-2xl md:p-7">
      <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
      <div className="absolute bottom-0 left-0 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500/10 blur-3xl" />

      <div className="relative grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
        <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/80">Executive command center</p>
          <h2 className="mt-4 max-w-xl text-4xl font-semibold tracking-tight md:text-5xl">Control room for European compliance operations.</h2>
          <p className="mt-5 text-sm leading-6 text-slate-400">
            A command-grade view of health, exposure, evidence and executive recommendations — designed for leadership, audits and enterprise customer reviews.
          </p>

          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Open tasks</p>
              <p className="mt-2 text-3xl font-bold">{summary.openTasks}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Open risks</p>
              <p className="mt-2 text-3xl font-bold">{summary.openRisks}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Documents</p>
              <p className="mt-2 text-3xl font-bold">{summary.totals.documents}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {signals.map((signal) => (
            <Link key={signal.label} href={signal.href} className="group rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-5 transition hover:-translate-y-1 hover:border-primary/50 hover:bg-white/[0.075]">
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{signal.label}</p>
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${toneClasses(signal.tone)}`}>Live</span>
              </div>
              <p className="mt-5 text-4xl font-bold tracking-tight">{signal.value}</p>
              <p className="mt-4 min-h-12 text-sm leading-6 text-slate-400">{signal.detail}</p>
              <p className="mt-5 text-xs font-semibold text-primary/80 opacity-0 transition group-hover:opacity-100">Open command signal →</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
