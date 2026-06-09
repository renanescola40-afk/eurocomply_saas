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
    emerald: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200',
    sky: 'border-sky-400/25 bg-sky-400/10 text-sky-200',
    violet: 'border-violet-400/25 bg-violet-400/10 text-violet-200',
    amber: 'border-amber-400/25 bg-amber-400/10 text-amber-200',
    rose: 'border-rose-400/25 bg-rose-400/10 text-rose-200',
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
    <section className="premium-motion-enter-delayed premium-ambient-border relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950 p-3 text-white shadow-2xl">
      <div className="absolute left-1/4 top-0 h-36 w-36 rounded-full bg-primary/20 blur-3xl" />
      <div className="absolute right-0 top-0 h-36 w-36 rounded-full bg-emerald-400/10 blur-3xl" />

      <div className="relative grid gap-3 xl:grid-cols-[0.9fr_1.1fr] xl:items-center">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">Posture</p>
            <p className="mt-2 text-lg font-bold tracking-tight">{posture}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">Score</p>
            <p className="mt-2 text-lg font-bold tracking-tight">{summary.complianceScore}%</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">Trend</p>
            <p className="mt-2 text-lg font-bold tracking-tight">{getDelta(trendComparison)}</p>
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-4">
          {actions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="premium-magnetic group rounded-2xl border border-white/10 bg-white/[0.045] p-4 hover:bg-white/[0.075]"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-bold leading-none">{action.label}</p>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${toneClasses(action.tone)}`}>{action.shortcut}</span>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500 transition group-hover:text-slate-300">{action.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
