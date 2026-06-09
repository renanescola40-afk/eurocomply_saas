import Link from 'next/link';
import { DashboardWorkspaceSidebar } from '@/components/dashboard/dashboard-workspace-sidebar';
import { WorkspaceCommandBar } from '@/components/dashboard/workspace-command-bar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DashboardSummary, DashboardTrendComparison, DashboardTrendSnapshot } from '@/server/queries/dashboard';

type DashboardOverviewProps = {
  summary: DashboardSummary;
  tasks: Array<{
    id: string;
    title?: string | null;
    status?: string | null;
    priority?: string | null;
    due_date?: string | null;
  }>;
  trendHistory?: DashboardTrendSnapshot[];
  trendComparison?: DashboardTrendComparison;
  basePath?: string;
  topRisks?: Array<{
    id: string;
    title?: string | null;
    status?: string | null;
    risk_score?: number | string | null;
    category?: string | null;
  }>;
  vendorsRequiringReview?: Array<{
    id: string;
    name?: string | null;
    risk_level?: string | null;
    review_status?: string | null;
    next_review_at?: string | null;
  }>;
  documentsExpiringSoon?: Array<{
    id: string;
    title?: string | null;
    name?: string | null;
    status?: string | null;
    expires_at?: string | null;
    category?: string | null;
  }>;
};

type ModuleCard = {
  label: string;
  description: string;
  href: string;
  metric: string | number;
  tone: 'emerald' | 'sky' | 'violet' | 'amber' | 'rose' | 'slate';
};

type Submenu = {
  label: string;
  eyebrow: string;
  href: string;
  description: string;
};

function toneClasses(tone: ModuleCard['tone']) {
  const tones = {
    emerald: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200',
    sky: 'border-sky-400/25 bg-sky-400/10 text-sky-200',
    violet: 'border-violet-400/25 bg-violet-400/10 text-violet-200',
    amber: 'border-amber-400/25 bg-amber-400/10 text-amber-200',
    rose: 'border-rose-400/25 bg-rose-400/10 text-rose-200',
    slate: 'border-white/10 bg-white/[0.045] text-slate-200',
  };

  return tones[tone];
}

function formatShortDate(value?: string | null) {
  if (!value) return 'Not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not set';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(date);
}

export function DashboardOverview({
  summary,
  tasks,
  trendHistory = [],
  trendComparison,
  basePath = '/dashboard/organizations',
  topRisks = [],
  vendorsRequiringReview = [],
  documentsExpiringSoon = [],
}: DashboardOverviewProps) {
  const openTasks = tasks.filter((task) => task.status !== 'done').slice(0, 4);
  const firstRisk = topRisks[0];
  const firstVendor = vendorsRequiringReview[0];
  const firstDocument = documentsExpiringSoon[0];

  const submenus: Submenu[] = [
    { label: 'Command', eyebrow: 'Home', href: basePath, description: 'Executive summary and posture.' },
    { label: 'Tasks', eyebrow: `${summary.openTasks} open`, href: `${basePath}/tasks`, description: 'Execution backlog and owners.' },
    { label: 'Risks', eyebrow: `${summary.criticalRisks} critical`, href: `${basePath}/risks`, description: 'Risk register and exposure.' },
    { label: 'Vendors', eyebrow: `${summary.highRiskVendors} high-risk`, href: `${basePath}/vendors`, description: 'Supplier and third-party reviews.' },
    { label: 'Documents', eyebrow: `${summary.missingDocuments} gaps`, href: `${basePath}/documents`, description: 'Policies, evidence and expiry.' },
    { label: 'Reports', eyebrow: 'Board', href: `${basePath}/reports`, description: 'Executive reporting center.' },
    { label: 'Audit pack', eyebrow: 'Print', href: `${basePath}/reports/print`, description: 'Printable evidence package.' },
    { label: 'Billing', eyebrow: 'Plan', href: `${basePath}/billing`, description: 'Usage, plan and upgrade.' },
  ];

  const modules: ModuleCard[] = [
    {
      label: 'Tasks',
      description: 'Prioritize remediation work without hunting through the dashboard.',
      href: `${basePath}/tasks`,
      metric: summary.openTasks,
      tone: summary.openTasks > 10 ? 'amber' : 'sky',
    },
    {
      label: 'Risks',
      description: 'Open the dedicated risk workspace with scoring and treatment.',
      href: `${basePath}/risks`,
      metric: summary.openRisks,
      tone: summary.criticalRisks > 0 ? 'rose' : 'amber',
    },
    {
      label: 'Vendors',
      description: 'Review third-party exposure and upcoming supplier reviews.',
      href: `${basePath}/vendors`,
      metric: summary.highRiskVendors,
      tone: summary.highRiskVendors > 0 ? 'amber' : 'emerald',
    },
    {
      label: 'Documents',
      description: 'Manage evidence, policies, expiry dates and missing proof.',
      href: `${basePath}/documents`,
      metric: summary.missingDocuments,
      tone: summary.missingDocuments > 0 ? 'amber' : 'emerald',
    },
    {
      label: 'Reports',
      description: 'Package posture into board-ready summaries and exports.',
      href: `${basePath}/reports`,
      metric: `${summary.complianceScore}%`,
      tone: summary.complianceScore >= 80 ? 'emerald' : summary.complianceScore >= 60 ? 'amber' : 'rose',
    },
    {
      label: 'Billing',
      description: 'Control limits, pricing tier, subscription and usage.',
      href: `${basePath}/billing`,
      metric: 'Plan',
      tone: 'violet',
    },
  ];

  return (
    <div className="min-h-[calc(100vh-2rem)] xl:grid xl:grid-cols-[20rem_minmax(0,1fr)] xl:gap-6">
      <DashboardWorkspaceSidebar summary={summary} basePath={basePath} />

      <main className="premium-motion-enter-delayed premium-shell min-w-0 overflow-hidden rounded-[2rem] p-4 shadow-2xl xl:h-[calc(100vh-2rem)]">
        <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[15rem_minmax(0,1fr)]">
          <aside className="hidden min-h-0 rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-3 xl:block">
            <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-primary/80">Submenus</p>
              <p className="mt-1 text-xs text-slate-500">Escolha uma área. Sem scroll infinito.</p>
            </div>

            <nav className="mt-3 space-y-1.5">
              {submenus.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="premium-magnetic block rounded-2xl border border-transparent px-3 py-3 hover:border-white/10 hover:bg-white/[0.055]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-white">{item.label}</p>
                    <span className="rounded-full border border-white/10 bg-white/[0.045] px-2 py-0.5 text-[10px] font-bold text-slate-400">{item.eyebrow}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{item.description}</p>
                </Link>
              ))}
            </nav>
          </aside>

          <section className="flex min-h-0 flex-col gap-4 overflow-hidden">
            <WorkspaceCommandBar summary={summary} trendComparison={trendComparison} basePath={basePath} />

            <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[1.05fr_0.95fr]">
              <div className="min-h-0 space-y-4 overflow-hidden">
                <section className="premium-card premium-ambient-border rounded-[1.75rem] p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.24em] text-primary/80">Executive command</p>
                      <h1 className="mt-3 text-4xl font-black tracking-tight text-white md:text-5xl">Clean control room.</h1>
                      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
                        Use the side submenus to open each dedicated dashboard. This page now acts as a launchpad, not an endless report.
                      </p>
                    </div>
                    <div className="rounded-3xl border border-white/10 bg-black/20 p-5 text-right">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Compliance</p>
                      <p className="mt-2 text-5xl font-black text-white">{summary.complianceScore}%</p>
                    </div>
                  </div>
                </section>

                <section className="grid gap-3 md:grid-cols-3">
                  <CompactSignal label="Critical risks" value={summary.criticalRisks} tone={summary.criticalRisks > 0 ? 'rose' : 'emerald'} />
                  <CompactSignal label="High-risk vendors" value={summary.highRiskVendors} tone={summary.highRiskVendors > 0 ? 'amber' : 'emerald'} />
                  <CompactSignal label="Evidence gaps" value={summary.missingDocuments} tone={summary.missingDocuments > 0 ? 'amber' : 'emerald'} />
                </section>

                <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {modules.map((module) => (
                    <Link key={module.label} href={module.href} className="premium-magnetic premium-card rounded-[1.5rem] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-lg font-bold text-white">{module.label}</p>
                          <p className="mt-2 text-xs leading-5 text-slate-500">{module.description}</p>
                        </div>
                        <span className={`rounded-full border px-3 py-1 text-xs font-black ${toneClasses(module.tone)}`}>{module.metric}</span>
                      </div>
                    </Link>
                  ))}
                </section>
              </div>

              <aside className="grid min-h-0 gap-4 overflow-hidden">
                <Card className="premium-card overflow-hidden rounded-[1.5rem]">
                  <CardHeader>
                    <CardTitle>Priority queue</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <PriorityItem title={firstRisk?.title ?? 'No critical risk selected'} meta={firstRisk ? `${firstRisk.category ?? 'General'} · score ${Number(firstRisk.risk_score ?? 0)}` : 'Risk register is currently quiet'} href={`${basePath}/risks`} />
                    <PriorityItem title={firstVendor?.name ?? 'No vendor review pending'} meta={firstVendor ? `Review ${formatShortDate(firstVendor.next_review_at)}` : 'Supplier queue is clear'} href={`${basePath}/vendors`} />
                    <PriorityItem title={firstDocument?.title ?? firstDocument?.name ?? 'No evidence expiry pending'} meta={firstDocument ? `Expires ${formatShortDate(firstDocument.expires_at)}` : 'Evidence queue is clear'} href={`${basePath}/documents`} />
                  </CardContent>
                </Card>

                <Card className="premium-card overflow-hidden rounded-[1.5rem]">
                  <CardHeader>
                    <CardTitle>Open work</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {openTasks.length === 0 ? (
                      <p className="text-sm text-slate-500">No open tasks in the executive queue.</p>
                    ) : openTasks.map((task) => (
                      <PriorityItem key={task.id} title={task.title ?? 'Untitled task'} meta={`${task.priority ?? 'normal'} · ${task.status ?? 'open'}`} href={`${basePath}/tasks`} />
                    ))}
                  </CardContent>
                </Card>
              </aside>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function CompactSignal({ label, value, tone }: { label: string; value: string | number; tone: ModuleCard['tone'] }) {
  return (
    <div className="premium-card rounded-[1.5rem] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-black ${tone === 'rose' ? 'text-rose-300' : tone === 'amber' ? 'text-amber-300' : 'text-emerald-300'}`}>{value}</p>
    </div>
  );
}

function PriorityItem({ title, meta, href }: { title: string; meta: string; href: string }) {
  return (
    <Link href={href} className="premium-magnetic block rounded-2xl border border-white/10 bg-black/20 p-3 hover:border-primary/40 hover:bg-white/[0.055]">
      <p className="line-clamp-1 text-sm font-semibold text-white">{title}</p>
      <p className="mt-1 text-xs text-slate-500">{meta}</p>
    </Link>
  );
}
