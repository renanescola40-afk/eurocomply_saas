import Link from 'next/link';
import type { DashboardSummary, DashboardTrendComparison } from '@/server/queries/dashboard';

type AiExecutiveLayerProps = {
  summary: DashboardSummary;
  trendComparison?: DashboardTrendComparison;
  basePath: string;
};

type PromptCard = {
  question: string;
  answer: string;
  href: string;
  tone: 'emerald' | 'amber' | 'rose' | 'sky';
};

function toneClasses(tone: PromptCard['tone']) {
  const tones = {
    emerald: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
    amber: 'border-amber-300/30 bg-amber-300/10 text-amber-200',
    rose: 'border-rose-400/30 bg-rose-400/10 text-rose-200',
    sky: 'border-sky-300/30 bg-sky-300/10 text-sky-200',
  };

  return tones[tone];
}

function scorePosture(score: number) {
  if (score >= 85) return 'ready for customer, leadership and investor review';
  if (score >= 70) return 'operationally active with a few important gaps to close';
  if (score >= 50) return 'not yet ready for leadership review and should be treated as an executive workstream';
  return 'high risk and needs immediate leadership focus';
}

function getPrimaryExposure(summary: DashboardSummary) {
  const exposures = [
    { label: 'vendor risk', value: summary.highRiskVendors, href: 'vendors', detail: `${summary.highRiskVendors} high-risk vendors` },
    { label: 'critical risk backlog', value: summary.criticalRisks, href: 'risks', detail: `${summary.criticalRisks} critical risks` },
    { label: 'evidence gap', value: summary.missingDocuments, href: 'documents', detail: `${summary.missingDocuments} missing documents` },
    { label: 'execution backlog', value: summary.openTasks, href: 'tasks', detail: `${summary.openTasks} open tasks` },
  ].sort((a, b) => b.value - a.value);

  return exposures[0];
}

function buildPrompts(summary: DashboardSummary, basePath: string): PromptCard[] {
  const exposure = getPrimaryExposure(summary);

  return [
    {
      question: 'Generate leadership summary',
      answer: `Compliance score is ${summary.complianceScore}%, which is ${scorePosture(summary.complianceScore)}. Primary exposure: ${exposure.detail}.`,
      href: `${basePath}/reports`,
      tone: summary.complianceScore >= 80 ? 'emerald' : summary.complianceScore >= 60 ? 'amber' : 'rose',
    },
    {
      question: 'Show missing evidence',
      answer: `${summary.missingDocuments} evidence items are missing across ${summary.totals.documents} tracked documents. Close this before external review.`,
      href: `${basePath}/documents`,
      tone: summary.missingDocuments > 3 ? 'rose' : summary.missingDocuments > 0 ? 'amber' : 'emerald',
    },
    {
      question: 'Which vendors are high risk?',
      answer: `${summary.highRiskVendors} vendors are currently high risk out of ${summary.totals.vendors} tracked vendors. Review DPA, data access and next assessment dates.`,
      href: `${basePath}/vendors`,
      tone: summary.highRiskVendors > 3 ? 'rose' : summary.highRiskVendors > 0 ? 'amber' : 'emerald',
    },
    {
      question: 'Prepare GDPR package',
      answer: `Use documents, vendors, risks and reports to assemble the current GDPR evidence package. Score readiness: ${summary.complianceScore}%.`,
      href: `${basePath}/reports`,
      tone: 'sky',
    },
  ];
}

function getTrendNarrative(trendComparison?: DashboardTrendComparison) {
  const delta = trendComparison?.complianceScoreDelta;
  if (delta === undefined || delta === null) return 'No previous trend snapshot is available yet. Start capturing daily posture to build a leadership trend line.';
  if (delta > 0) return `Compliance posture improved by ${delta} points since the previous snapshot.`;
  if (delta < 0) return `Compliance posture declined by ${Math.abs(delta)} points since the previous snapshot.`;
  return 'Compliance posture is stable compared with the previous snapshot.';
}

export function AiExecutiveLayer({ summary, trendComparison, basePath }: AiExecutiveLayerProps) {
  const prompts = buildPrompts(summary, basePath);
  const exposure = getPrimaryExposure(summary);

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 p-5 text-white shadow-2xl md:p-6">
      <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />
      <div className="absolute bottom-0 left-12 h-72 w-72 rounded-full bg-sky-500/10 blur-3xl" />

      <div className="relative grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-200/80">AI executive layer</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight">Leadership answers, generated from live posture</h2>
          <p className="mt-4 text-sm leading-6 text-slate-400">
            This v1 layer is deterministic and safe: it converts dashboard metrics into executive-ready answers before connecting a full AI copilot.
          </p>

          <div className="mt-6 space-y-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Top exposure</p>
              <p className="mt-2 text-xl font-semibold">{exposure.detail}</p>
              <p className="mt-2 text-sm text-slate-400">Focus area: {exposure.label}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Trend readout</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">{getTrendNarrative(trendComparison)}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {prompts.map((prompt) => (
            <Link key={prompt.question} href={prompt.href} className="group rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-5 transition hover:-translate-y-1 hover:border-primary/50 hover:bg-white/[0.075]">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-semibold">{prompt.question}</h3>
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${toneClasses(prompt.tone)}`}>Answer</span>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-400">{prompt.answer}</p>
              <p className="mt-5 text-xs font-semibold text-primary/80 opacity-0 transition group-hover:opacity-100">Open related workstream →</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
