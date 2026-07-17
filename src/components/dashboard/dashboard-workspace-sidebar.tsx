import Image from 'next/image';
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
    emerald: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200 shadow-emerald-950/30',
    sky: 'border-sky-400/25 bg-sky-400/10 text-sky-200 shadow-sky-950/30',
    violet: 'border-violet-400/25 bg-violet-400/10 text-violet-200 shadow-violet-950/30',
    amber: 'border-amber-400/25 bg-amber-400/10 text-amber-200 shadow-amber-950/30',
    rose: 'border-rose-400/25 bg-rose-400/10 text-rose-200 shadow-rose-950/30',
    slate: 'border-white/10 bg-white/[0.045] text-slate-200 shadow-black/30',
  };

  return accents[accent];
}

function buildGroups(summary: DashboardSummary, basePath: string): NavigationGroup[] {
  return [
    {
      label: 'Command layer',
      items: [
        { label: 'Executive Overview', description: 'Main control room', href: '#overview-view', icon: '⌘', signal: `${summary.complianceScore}%`, accent: summary.complianceScore >= 80 ? 'emerald' : summary.complianceScore >= 60 ? 'amber' : 'rose' },
        { label: 'AI Intelligence', description: 'Copilot, heatmap, graph', href: '#intelligence-view', icon: '✦', signal: 'AI', accent: 'violet' },
        { label: 'Board Room', description: 'C-level decision mode', href: '#board-view', icon: '◈', signal: 'Board', accent: 'emerald' },
        { label: 'Growth Engine', description: 'Frameworks and expansion', href: '#growth-view', icon: '↗', signal: 'Scale', accent: 'sky' },
      ],
    },
    {
      label: 'Operations',
      items: [
        { label: 'Operations View', description: 'Live execution layer', href: '#operations-view', icon: '▥', signal: 'Live', accent: 'slate' },
        { label: 'AI Literacy', description: 'Article 4 training evidence', href: `${basePath}/ai-literacy`, icon: '◎', signal: 'Art. 4', accent: 'violet' },
        { label: 'Tasks', description: 'Execution backlog', href: `${basePath}/tasks`, icon: '✓', signal: summary.openTasks, accent: summary.openTasks > 10 ? 'amber' : 'sky' },
        { label: 'Risks', description: 'Risk register', href: `${basePath}/risks`, icon: '△', signal: summary.openRisks, accent: summary.criticalRisks > 0 ? 'rose' : 'amber' },
        { label: 'Vendors', description: 'Third-party exposure', href: `${basePath}/vendors`, icon: '◇', signal: summary.highRiskVendors, accent: summary.highRiskVendors > 0 ? 'amber' : 'emerald' },
        { label: 'Documents', description: 'Evidence library', href: `${basePath}/documents`, icon: '▣', signal: summary.missingDocuments, accent: summary.missingDocuments > 0 ? 'amber' : 'emerald' },
      ],
    },
    {
      label: 'Executive outputs',
      items: [
        { label: 'Reports', description: 'Executive packages', href: `${basePath}/reports`, icon: '▤', signal: 'Open', accent: 'emerald' },
        { label: 'Printable Pack', description: 'Structured print view', href: `${basePath}/reports/print`, icon: '⤓', signal: 'PDF', accent: 'sky' },
        { label: 'Billing', description: 'Plan and usage', href: `${basePath}/billing`, icon: '€', signal: 'Plan', accent: 'amber' },
      ],
    },
  ];
}

export function DashboardWorkspaceSidebar({ summary, basePath }: DashboardWorkspaceSidebarProps) {
  const groups = buildGroups(summary, basePath);

  return (
    <aside className="premium-motion-enter premium-shell premium-ambient-border sticky top-4 hidden max-h-[calc(100vh-2rem)] overflow-y-auto rounded-[2rem] p-4 text-white shadow-2xl xl:block">
      <div className="premium-ambient-border premium-shimmer relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-4">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/25 blur-2xl" />
        <div className="absolute -bottom-12 left-8 h-28 w-28 rounded-full bg-emerald-400/15 blur-2xl" />
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="animate-pulse-border flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-black shadow-2xl">
              <Image src="/brand/risck-comply-icon.svg" alt="Risck comply" width={44} height={44} className="h-11 w-11 object-contain" />
            </div>
            <div>
              <p className="text-sm font-bold leading-none">Risck comply OS</p>
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
        {groups.map((group, groupIndex) => (
          <div key={group.label} className={groupIndex === 0 ? 'premium-motion-enter-delayed' : ''}>
            <p className="px-2 text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">{group.label}</p>
            <div className="mt-2 space-y-1.5">
              {group.items.map((item) => (
                <Link
                  key={`${group.label}-${item.label}`}
                  href={item.href}
                  className="premium-magnetic premium-pressable group flex items-center gap-3 rounded-2xl border border-transparent px-3 py-2.5 hover:border-white/10 hover:bg-white/[0.055] focus:outline-none focus:ring-2 focus:ring-primary/70"
                >
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-sm font-bold shadow-lg transition group-hover:scale-105 ${accentClasses(item.accent)}`}>{item.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold leading-none text-slate-100">{item.label}</span>
                    <span className="mt-1 block truncate text-xs text-slate-500 transition group-hover:text-slate-300">{item.description}</span>
                  </span>
                  {item.signal !== undefined && (
                    <span className="rounded-full border border-white/10 bg-white/[0.045] px-2 py-1 text-[10px] font-bold text-slate-400 transition group-hover:border-primary/35 group-hover:text-white">{item.signal}</span>
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
