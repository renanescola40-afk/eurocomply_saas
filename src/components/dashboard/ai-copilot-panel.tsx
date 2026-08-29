import Link from 'next/link';
import type { DashboardSummary, DashboardTrendComparison } from '@/server/queries/dashboard';

type AiCopilotPanelProps = {
  summary: DashboardSummary;
  trendComparison?: DashboardTrendComparison;
  basePath: string;
};

type CopilotAnswer = {
  question: string;
  answer: string;
  action: string;
  href: string;
  tone: 'emerald' | 'amber' | 'rose' | 'neutral';
};

function toneClasses(tone: CopilotAnswer['tone']) {
  const tones = {
    emerald: 'border-emerald-300/15 bg-emerald-300/[0.055] text-emerald-100/80',
    amber: 'border-amber-300/15 bg-amber-300/[0.055] text-amber-100/80',
    rose: 'border-rose-300/15 bg-rose-300/[0.055] text-rose-100/80',
    neutral: 'border-white/[0.075] bg-white/[0.025] text-white/52',
  };
  return tones[tone];
}

function getDeltaText(trendComparison?: DashboardTrendComparison) {
  const delta = trendComparison?.complianceScoreDelta;
  if (delta === undefined || delta === null) return 'There is no previous score snapshot yet, so this is the current baseline.';
  if (delta === 0) return 'The score is stable compared with the previous snapshot.';
  if (delta > 0) return `The score improved by ${delta} points compared with the previous snapshot.`;
  return `The score dropped by ${Math.abs(delta)} points compared with the previous snapshot.`;
}

function buildAnswers(summary: DashboardSummary, trendComparison: DashboardTrendComparison | undefined, basePath: string): CopilotAnswer[] {
  const scoreDropped = (trendComparison?.complianceScoreDelta ?? 0) < 0;
  const topExposure = summary.criticalRisks > 0
    ? `${summary.criticalRisks} critical risks`
    : summary.highRiskVendors > 0
      ? `${summary.highRiskVendors} high-risk vendors`
      : summary.missingDocuments > 0
        ? `${summary.missingDocuments} missing evidence items`
        : 'no material exposure spike';

  return [
    {
      question: 'Why did the score change?',
      answer: `${getDeltaText(trendComparison)} Current drivers: ${summary.openRisks} open risks, ${summary.highRiskVendors} high-risk vendors and ${summary.missingDocuments} missing evidence items.`,
      action: 'Open reports',
      href: `${basePath}/reports`,
      tone: scoreDropped ? 'rose' : 'emerald',
    },
    {
      question: 'What is the biggest exposure?',
      answer: `The strongest current exposure signal is ${topExposure}. Prioritize this before the next board report or customer security review.`,
      action: summary.criticalRisks > 0 ? 'Open risks' : summary.highRiskVendors > 0 ? 'Review vendors' : 'Review evidence',
      href: summary.criticalRisks > 0 ? `${basePath}/risks` : summary.highRiskVendors > 0 ? `${basePath}/vendors` : `${basePath}/documents`,
      tone: summary.criticalRisks > 0 ? 'rose' : summary.highRiskVendors > 0 || summary.missingDocuments > 0 ? 'amber' : 'emerald',
    },
    {
      question: 'What belongs in the board summary?',
      answer: `Compliance score is ${summary.complianceScore}%. The board narrative should cover ${summary.openRisks} open risks, ${summary.openTasks} open actions, ${summary.highRiskVendors} high-risk vendors and ${summary.missingDocuments} evidence gaps.`,
      action: 'Prepare board report',
      href: `${basePath}/reports`,
      tone: 'neutral',
    },
    {
      question: 'Is the evidence set ready to share?',
      answer: `The workspace tracks ${summary.totals.documents} documents. Review missing evidence and open risk or vendor work before external sharing.`,
      action: 'Review report package',
      href: `${basePath}/reports/print`,
      tone: summary.missingDocuments > 0 ? 'amber' : 'emerald',
    },
  ];
}

export function AiCopilotPanel({ summary, trendComparison, basePath }: AiCopilotPanelProps) {
  const answers = buildAnswers(summary, trendComparison, basePath);

  return (
    <section className="overflow-hidden rounded-xl border border-white/[0.075] bg-[#0d1522] text-white">
      <div className="grid xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="border-b border-white/[0.055] px-5 py-5 xl:border-b-0 xl:border-r">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-200/65">Governance assistant</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">Explain the current posture</h2>
          <p className="mt-3 text-sm leading-6 text-white/43">
            Deterministic guidance derived from live RISCK COMPLY workspace data. No invented metrics and no free-form claims are added here.
          </p>
          <div className="mt-6 border-y border-white/[0.055] py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/28">Suggested question</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-white/78">What should we fix before the next board report?</p>
            <p className="mt-2 text-xs leading-5 text-white/38">Start with critical risks, high-risk vendors and missing evidence shown by the current workspace.</p>
          </div>
        </div>

        <div className="divide-y divide-white/[0.055]">
          {answers.map((item) => (
            <Link key={item.question} href={item.href} className="group block px-5 py-4 transition hover:bg-white/[0.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-400/40 md:px-6">
              <div className="grid gap-3 md:grid-cols-[minmax(0,220px)_minmax(0,1fr)_auto] md:items-start">
                <div className="flex items-start gap-2.5">
                  <span className={`mt-0.5 rounded-md border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] ${toneClasses(item.tone)}`}>Signal</span>
                  <h3 className="text-sm font-semibold leading-5 text-white/82">{item.question}</h3>
                </div>
                <p className="text-sm leading-6 text-white/42">{item.answer}</p>
                <p className="text-xs font-semibold text-violet-200/65 transition group-hover:text-violet-100 md:pt-1">{item.action} →</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
