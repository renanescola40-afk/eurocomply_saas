import Link from 'next/link';
import type { DashboardSummary, DashboardTrendComparison } from '@/server/queries/dashboard';

type WorkspaceCommandBarProps = {
  summary: DashboardSummary;
  trendComparison?: DashboardTrendComparison;
  basePath: string;
};

type CommandAction = {
  label: string;
  description: string;
  href: string;
  shortcut: string;
  tone: 'emerald' | 'sky' | 'violet' | 'amber' | 'rose';
};

function getDelta(trendComparison?: DashboardTrendComparison) {
  const delta = trendComparison?.complianceScoreDelta;
  if (delta === undefined || delta === null) return 'Baseline';
  if (delta === 0) return 'Stable';
  return `${delta > 0 ? '+' : ''}${delta} pts`;
}

function getPosture(summary: DashboardSummary) {
  if (summary.criticalRisks > 0) return 'Executive attention';
  if (summary.highRiskVendors > 0 || summary.missingDocuments > 3) return 'Active remediation';
  if (summary.complianceScore >= 85) return 'Enterprise ready';
  return 'Controlled growth';
}

function toneClasses(tone: CommandAction['tone']) {
  const tones = {
    emerald: 'border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-200',
    sky: 'border-sky-400/25 bg-sky-400/[0.08] text-sky-200',
    violet: 'border-violet-400/25 bg-violet-400/[0.08] text-violet-200',
    amber: 'border-amber-400/25 bg-amber-400/[0.08] text-amber-200',
    rose: 'border-rose-400/25 bg-rose-400/[0.08] text-rose-200',
  };

  return tones[tone];
}

export function WorkspaceCommandBar({ summary, trendComparison, basePath }: WorkspaceCommandBarProps) {
  const posture = getPosture(summary);
  const actions: CommandAction[] = [
    {
      label: 'Ask AI',
      description: 'Explain posture and next move',
      href: '#intelligence-view',
      shortcut: '⌘ AI',
      tone: 'violet',
    },
    {
      label: 'Prepare board',
      description: 'Open executive reporting layer',
      href: '#board-view',
      shortcut: 'BRD',
      tone: 'sky',
    },
    {
      label: 'Fix exposure',
      description: 'Jump to operations workstreams',
      href: '#operations-view',
      shortcut: 'OPS',
      tone: summary.criticalRisks > 0 ? 'rose' : 'amber',
    },
    {
      label: 'Export pack',
      description: 'Printable audit package',
      href: `${basePath}/reports/print`,
      shortcut: 'PDF',
      tone: 'emerald',
    },
  ];

  return (
    <section className="premium-motion-enter-delayed relative overflow-hidden rounded-xl border border-slate-800 bg-[#0b121e] p-3 text-white">
      <div className="relative grid gap-3 xl:grid-cols-[0.9fr_1.1fr] xl:items-center">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-800 bg-[#0d1624] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">Posture</p>
            <p className="mt-2 text-sm font-semibold text-slate-100">{posture}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-[#0d1624] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">Score</p>
            <p className="mt-2 font-mono text-lg font-semibold tabular-nums text-slate-100">{summary.complianceScore}%</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-[#0d1624] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">Trend</p>
            <p className="mt-2 font-mono text-lg font-semibold tabular-nums text-slate-100">{getDelta(trendComparison)}</p>
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-4">
          {actions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="group rounded-lg border border-slate-800 bg-[#0d1624] p-4 transition hover:border-blue-500/40 hover:bg-slate-800/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold leading-none text-slate-100">{action.label}</p>
                <span className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${toneClasses(action.tone)}`}>{action.shortcut}</span>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-600 transition group-hover:text-slate-400">{action.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
