import Link from 'next/link';
import type { DashboardSummary } from '@/server/queries/dashboard';

type DashboardWorkspaceSidebarProps = {
  summary: DashboardSummary;
  basePath: string;
};

type NavigationItem = {
  label: string;
  description: string;
  href: string;
  icon: string;
  signal?: string | number;
  accent: 'emerald' | 'sky' | 'violet' | 'amber' | 'rose' | 'slate';
};

type NavigationGroup = {
  label: string;
  items: NavigationItem[];
};

function accentClasses(accent: NavigationItem['accent']) {
  const accents = {
    emerald: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200',
    sky: 'border-sky-400/25 bg-sky-400/10 text-sky-200',
    violet: 'border-violet-400/25 bg-violet-400/10 text-violet-200',
    amber: 'border-amber-400/25 bg-amber-400/10 text-amber-200',
    rose: 'border-rose-400/25 bg-rose-400/10 text-rose-200',
    slate: 'border-white/10 bg-white/[0.045] text-slate-200',
  };

  return accents[accent];
}

function buildGroups(summary: DashboardSummary, basePath: string): NavigationGroup[] {
  return [
    {
      label: 'Command layer',
      items: [
        { label: 'Executive Overview', description: 'Main control room', href: basePath, icon: '⌘', signal: `${summary.complianceScore}%`, accent: summary.complianceScore >= 80 ? 'emerald' : summary.complianceScore >= 60 ? 'amber' : 'rose' },
        { label: 'AI Copilot', description: 'Ask posture questions', href: '#ai-copilot', icon: '✦', signal: 'AI', accent: 'violet' },
        { label: 'Board Mode', description: 'C-level decision view', href: '#board-mode', icon: '◈', signal: 'Board', accent: 'emerald' },
        { label: 'Scenario Simulator', description: 'Score lift planning', href: '#scenario-simulator', icon: '↗', signal: 'Plan', accent: 'sky' },
      ],
    },
    {
      label: 'Operations',
      items: [
        { label: 'Tasks', description: 'Execution backlog', href: `${basePath}/tasks`, icon: '✓', signal: summary.openTasks, accent: summary.openTasks > 10 ? 'amber' : 'sky' },
        { label: 'Risks', description: 'Risk register', href: `${basePath}/risks`, icon: '△', signal: summary.openRisks, accent: summary.criticalRisks > 0 ? 'rose' : 'amber' },
        { label: 'Vendors', description: 'Third-party exposure', href: `${basePath}/vendors`, icon: '◇', signal: summary.highRiskVendors, accent: summary.highRiskVendors > 0 ? 'amber' : 'emerald' },
        { label: 'Documents', description: 'Evidence library', href: `${basePath}/documents`, icon: '▣', signal: summary.missingDocuments, accent: summary.missingDocuments > 0 ? 'amber' : 'emerald' },
      ],
    },
    {
      label: 'Intelligence',
      items: [
        { label: 'Risk Heatmap', description: 'Impact × probability', href: '#risk-heatmap', icon: '▦', signal: 'Map', accent: 'rose' },
        { label: 'Relationship Graph', description: 'Dependencies', href: '#relationship-graph', icon: '⛓', signal: 'Graph', accent: 'sky' },
        { label: 'Evidence Graph', description: 'Connected proof', href: '#evidence-graph', icon: '◎', signal: 'Trace', accent: 'violet' },
        { label: 'Activity Feed', description: 'Work in motion', href: '#operational-feed', icon: '↺', signal: 'Live', accent: 'slate' },
      ],
    },
    {
      label: 'Executive outputs',
      items: [
        { label: 'Reports', description: 'Executive packages', href: `${basePath}/reports`, icon: '▤', signal: 'Open', accent: 'emerald' },
        { label: 'Printable Pack', description: 'Audit-ready print view', href: `${basePath}/reports/print`, icon: '⤓', signal: 'PDF', accent: 'sky' },
        { label: 'Frameworks', description: 'GDPR, DORA, NIS2, ISO', href: '#marketplace-expansion', icon: '✺', signal: 'EU', accent: 'violet' },
        { label: 'Billing', description: 'Plan and usage', href: `${basePath}/billing`, icon: '€', signal: 'Plan', accent: 'amber' },
      ],
    },
  ];
}

export function DashboardWorkspaceSidebar({ summary, basePath }: DashboardWorkspaceSidebarProps) {
  const groups = buildGroups(summary, basePath);

  return (
    <aside className="sticky top-4 hidden max-h-[calc(100vh-2rem)] overflow-y-auto rounded-[2rem] border border-white/10 bg-slate-950 p-4 text-white shadow-2xl xl:block">
      <div className="relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-4">
        <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-primary/20 blur-2xl" />
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-sm font-black text-slate-950">EC</div>
            <div>
              <p className="text-sm font-bold leading-none">EuroComply OS</p>
              <p className="mt-1 text-xs text-slate-500">Premium B2B workspace</p>
            </div>
          </div>
          <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">Live score</p>
            <div className="mt-2 flex items-end justify-between gap-3">
              <p className="text-4xl font-black tracking-tight">{summary.complianceScore}%</p>
              <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-200">Active</span>
            </div>
          </div>
        </div>
      </div>

      <nav className="mt-4 space-y-5">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="px-2 text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">{group.label}</p>
            <div className="mt-2 space-y-1.5">
              {group.items.map((item) => (
                <Link
                  key={`${group.label}-${item.label}`}
                  href={item.href}
                  className="group flex items-center gap-3 rounded-2xl border border-transparent px-3 py-2.5 transition hover:-translate-y-0.5 hover:border-white/10 hover:bg-white/[0.055]"
                >
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-sm font-bold ${accentClasses(item.accent)}`}>{item.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold leading-none text-slate-100">{item.label}</span>
                    <span className="mt-1 block truncate text-xs text-slate-500 transition group-hover:text-slate-400">{item.description}</span>
                  </span>
                  {item.signal !== undefined && (
                    <span className="rounded-full border border-white/10 bg-white/[0.045] px-2 py-1 text-[10px] font-bold text-slate-400">{item.signal}</span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
