import Link from 'next/link';
import type { DashboardSummary } from '@/server/queries/dashboard';

type ScenarioSimulatorProps = {
  summary: DashboardSummary;
  basePath: string;
};

type Scenario = {
  title: string;
  currentScore: number;
  projectedScore: number;
  lift: number;
  description: string;
  actions: string[];
  href: string;
  tone: 'emerald' | 'amber' | 'rose' | 'sky' | 'violet';
};

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function toneClasses(tone: Scenario['tone']) {
  const tones = {
    emerald: 'border-emerald-300/30 bg-emerald-300/10 text-emerald-100',
    amber: 'border-amber-300/30 bg-amber-300/10 text-amber-100',
    rose: 'border-rose-300/30 bg-rose-300/10 text-rose-100',
    sky: 'border-sky-300/30 bg-sky-300/10 text-sky-100',
    violet: 'border-violet-300/30 bg-violet-300/10 text-violet-100',
  };

  return tones[tone];
}

function buildScenario(summary: DashboardSummary, basePath: string): Scenario[] {
  const closeCriticalLift = Math.min(14, summary.criticalRisks * 5);
  const vendorLift = Math.min(12, summary.highRiskVendors * 3);
  const evidenceLift = Math.min(16, summary.missingDocuments * 2);
  const taskLift = Math.min(10, Math.ceil(summary.openTasks / 2));

  return [
    {
      title: 'Close critical risks',
      currentScore: summary.complianceScore,
      projectedScore: clampScore(summary.complianceScore + closeCriticalLift),
      lift: closeCriticalLift,
      description: 'Model the score impact of closing the most severe risk items first.',
      actions: [`Resolve ${summary.criticalRisks} critical risks`, 'Attach remediation evidence', 'Update board narrative'],
      href: `${basePath}/risks`,
      tone: summary.criticalRisks > 0 ? 'rose' : 'emerald',
    },
    {
      title: 'Review high-risk vendors',
      currentScore: summary.complianceScore,
      projectedScore: clampScore(summary.complianceScore + vendorLift),
      lift: vendorLift,
      description: 'Estimate posture improvement after refreshing supplier reviews and data processing proof.',
      actions: [`Review ${summary.highRiskVendors} high-risk vendors`, 'Refresh DPA status', 'Confirm next review dates'],
      href: `${basePath}/vendors`,
      tone: summary.highRiskVendors > 0 ? 'amber' : 'emerald',
    },
    {
      title: 'Complete missing evidence',
      currentScore: summary.complianceScore,
      projectedScore: clampScore(summary.complianceScore + evidenceLift),
      lift: evidenceLift,
      description: 'Show the likely impact of closing document and evidence gaps before external review.',
      actions: [`Upload ${summary.missingDocuments} missing evidence items`, 'Link evidence to controls', 'Prepare audit appendix'],
      href: `${basePath}/documents`,
      tone: summary.missingDocuments > 3 ? 'rose' : summary.missingDocuments > 0 ? 'amber' : 'emerald',
    },
    {
      title: 'Execute remediation sprint',
      currentScore: summary.complianceScore,
      projectedScore: clampScore(summary.complianceScore + taskLift),
      lift: taskLift,
      description: 'Estimate the board-readiness lift from completing open actions and reducing execution drag.',
      actions: [`Close ${summary.openTasks} open tasks`, 'Assign owners', 'Export progress report'],
      href: `${basePath}/tasks`,
      tone: summary.openTasks > 10 ? 'amber' : 'sky',
    },
  ];
}

export function ScenarioSimulator({ summary, basePath }: ScenarioSimulatorProps) {
  const scenarios = buildScenario(summary, basePath);
  const bestScenario = [...scenarios].sort((a, b) => b.lift - a.lift)[0];
  const combinedLift = Math.min(28, scenarios.reduce((sum, scenario) => sum + scenario.lift, 0));
  const combinedScore = clampScore(summary.complianceScore + combinedLift);

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 p-5 text-white shadow-2xl md:p-6">
      <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl" />

      <div className="relative grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
        <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-200/80">Scenario simulator</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">What happens if we fix the right things first?</h2>
          <p className="mt-4 text-sm leading-6 text-slate-400">
            A board-friendly projection model that estimates compliance score lift from closing risks, vendors, evidence and execution gaps.
          </p>

          <div className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Best next move</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">{bestScenario.title}</p>
            <div className="mt-5 flex items-end gap-4">
              <div>
                <p className="text-xs text-slate-500">Current</p>
                <p className="text-4xl font-bold">{summary.complianceScore}%</p>
              </div>
              <p className="pb-2 text-2xl text-slate-500">→</p>
              <div>
                <p className="text-xs text-slate-500">Projected</p>
                <p className="text-4xl font-bold text-emerald-200">{bestScenario.projectedScore}%</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-slate-400">Potential lift: +{bestScenario.lift} points.</p>
          </div>

          <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.045] p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Combined sprint</p>
            <p className="mt-2 text-sm text-slate-300">If all major gaps are reduced together, projected posture could reach <span className="font-bold text-emerald-200">{combinedScore}%</span>.</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {scenarios.map((scenario) => (
            <Link key={scenario.title} href={scenario.href} className="group rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-5 transition hover:-translate-y-1 hover:border-primary/50 hover:bg-white/[0.075]">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-semibold">{scenario.title}</h3>
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${toneClasses(scenario.tone)}`}>+{scenario.lift}</span>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-400">{scenario.description}</p>

              <div className="mt-5 flex items-end gap-3">
                <p className="text-3xl font-bold">{scenario.currentScore}%</p>
                <p className="pb-1 text-slate-500">→</p>
                <p className="text-3xl font-bold text-emerald-200">{scenario.projectedScore}%</p>
              </div>

              <div className="mt-5 space-y-2">
                {scenario.actions.map((action) => (
                  <p key={action} className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-slate-400">{action}</p>
                ))}
              </div>

              <p className="mt-5 text-xs font-semibold text-primary/80 opacity-0 transition group-hover:opacity-100">Open scenario workstream →</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
