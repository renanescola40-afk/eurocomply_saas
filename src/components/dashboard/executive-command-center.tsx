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
  tone: 'emerald' | 'amber' | 'rose' | 'neutral';
};

function toneClasses(tone: CommandSignal['tone']) {
  const tones = {
    emerald: 'border-emerald-300/15 bg-emerald-300/[0.055] text-emerald-100/80',
    amber: 'border-amber-300/15 bg-amber-300/[0.055] text-amber-100/80',
    rose: 'border-rose-300/15 bg-rose-300/[0.055] text-rose-100/80',
    neutral: 'border-white/[0.075] bg-white/[0.025] text-white/55',
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

function getRecommendedFocus(summary: DashboardSummary) {
  if (summary.criticalRisks > 0) return 'Resolve critical risks before the next executive report.';
  if (summary.highRiskVendors > 0) return 'Review high-risk vendors and refresh data processing evidence.';
  if (summary.missingDocuments > 0) return 'Close evidence gaps to improve review readiness.';
  return 'Posture is strong. Prepare the current evidence set for external review.';
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
      label: 'Recommended focus',
      value: summary.criticalRisks > 0 || summary.highRiskVendors > 0 || summary.missingDocuments > 0 ? 'Action' : 'Ready',
      detail: getRecommendedFocus(summary),
      href: summary.criticalRisks > 0 ? `${basePath}/risks` : summary.highRiskVendors > 0 ? `${basePath}/vendors` : summary.missingDocuments > 0 ? `${basePath}/documents` : `${basePath}/reports`,
      tone: summary.criticalRisks > 0 ? 'rose' : summary.highRiskVendors > 0 || summary.missingDocuments > 0 ? 'amber' : 'emerald',
    },
  ];

  return (
    <section className="overflow-hidden rounded-xl border border-white/[0.075] bg-[#0d1522] text-white">
      <div className="border-b border-white/[0.055] px-5 py-5 md:px-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-200/55">Executive command center</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em] md:text-3xl">Live governance signals</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">Current health, exposure and evidence signals from the organization workspace.</p>
          </div>
          <dl className="grid grid-cols-3 gap-5 border-t border-white/[0.055] pt-4 text-right xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0">
            <div><dt className="text-[10px] uppercase tracking-[0.14em] text-white/30">Tasks</dt><dd className="mt-1 text-xl font-semibold">{summary.openTasks}</dd></div>
            <div><dt className="text-[10px] uppercase tracking-[0.14em] text-white/30">Risks</dt><dd className="mt-1 text-xl font-semibold">{summary.openRisks}</dd></div>
            <div><dt className="text-[10px] uppercase tracking-[0.14em] text-white/30">Docs</dt><dd className="mt-1 text-xl font-semibold">{summary.totals.documents}</dd></div>
          </dl>
        </div>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-5">
        {signals.map((signal, index) => (
          <Link
            key={signal.label}
            href={signal.href}
            className={`group min-h-44 px-5 py-5 transition hover:bg-white/[0.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400/40 ${index > 0 ? 'border-t border-white/[0.055] md:border-l md:border-t-0' : ''} ${index === 2 || index === 4 ? 'md:border-t md:border-white/[0.055] xl:border-t-0' : ''}`}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/32">{signal.label}</p>
              <span className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${toneClasses(signal.tone)}`}>Live</span>
            </div>
            <p className="mt-5 text-3xl font-semibold tracking-[-0.04em] text-white">{signal.value}</p>
            <p className="mt-3 text-xs leading-5 text-white/40">{signal.detail}</p>
            <p className="mt-4 text-xs font-semibold text-blue-200/0 transition group-hover:text-blue-200/75">Open signal →</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
