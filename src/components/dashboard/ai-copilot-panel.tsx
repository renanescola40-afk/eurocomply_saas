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
  tone: 'emerald' | 'amber' | 'rose' | 'violet' | 'sky';
};

function toneClasses(tone: CopilotAnswer['tone']) {
  const tones = {
    emerald: 'border-emerald-300/30 bg-emerald-300/10 text-emerald-200',
    amber: 'border-amber-300/30 bg-amber-300/10 text-amber-200',
    rose: 'border-rose-300/30 bg-rose-300/10 text-rose-200',
    violet: 'border-violet-300/30 bg-violet-300/10 text-violet-200',
    sky: 'border-sky-300/30 bg-sky-300/10 text-sky-200',
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
      question: 'Generate board summary',
      answer: `Compliance score is ${summary.complianceScore}%. The board narrative should cover ${summary.openRisks} open risks, ${summary.openTasks} open actions, ${summary.highRiskVendors} high-risk vendors and ${summary.missingDocuments} evidence gaps.`,
      action: 'Prepare board report',
      href: `${basePath}/reports`,
      tone: 'violet',
    },
    {
      question: 'Prepare audit package',
      answer: `The audit package can use ${summary.totals.documents} tracked documents, the risk register and vendor review posture. Evidence gaps should be closed before external sharing.`,
      action: 'Open audit pack',
      href: `${basePath}/audit-pack`,
      tone: 'sky',
    },
  ];
}

export function AiCopilotPanel({ summary, trendComparison, basePath }: AiCopilotPanelProps) {
  const answers = buildAnswers(summary, trendComparison, basePath);

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 p-5 text-white shadow-2xl md:p-6">
      <div className="absolute right-0 top-0 h-80 w-80 rounded-full bg-violet-500/15 blur-3xl" />
      <div className="absolute bottom-0 left-8 h-80 w-80 rounded-full bg-sky-500/10 blur-3xl" />

      <div className="relative grid gap-6 xl:grid-cols-[0.7fr_1.3fr]">
        <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-violet-200/80">AI copilot</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight">Ask EuroComply anything about the current posture.</h2>
          <p className="mt-4 text-sm leading-6 text-slate-400">
            V1 is a safe deterministic copilot: it turns live dashboard data into executive answers before enabling full LLM chat.
          </p>

          <div className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Suggested prompt</p>
            <p className="mt-2 text-lg font-semibold">What should we fix before the next board report?</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Start with critical risks, high-risk vendors and missing evidence because these directly weaken external confidence.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {answers.map((item) => (
            <Link key={item.question} href={item.href} className="group rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-5 transition hover:-translate-y-1 hover:border-primary/50 hover:bg-white/[0.075]">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-semibold">{item.question}</h3>
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${toneClasses(item.tone)}`}>AI</span>
              </div>
              <p className="mt-4 min-h-24 text-sm leading-6 text-slate-400">{item.answer}</p>
              <p className="mt-5 text-xs font-semibold text-primary/80 opacity-0 transition group-hover:opacity-100">{item.action} →</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
