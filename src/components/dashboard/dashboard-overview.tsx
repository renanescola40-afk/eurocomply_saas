import Link from 'next/link';
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

type NavItem = {
  label: string;
  href: string;
  badge?: string | number;
};

type KpiCard = {
  label: string;
  value: string | number;
  change: string;
  href: string;
  tone: 'purple' | 'green' | 'orange' | 'blue';
  sparkline: string;
};

function getDelta(trendComparison?: DashboardTrendComparison) {
  const delta = trendComparison?.complianceScoreDelta;
  if (delta === undefined || delta === null) return '+ baseline';
  if (delta === 0) return 'stable';
  return `${delta > 0 ? '+' : ''}${delta}%`;
}

function formatShortDate(value?: string | null) {
  if (!value) return 'Not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not set';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(date);
}

function kpiToneClasses(tone: KpiCard['tone']) {
  const tones = {
    purple: 'from-violet-500 to-indigo-500 bg-violet-50 text-violet-600',
    green: 'from-emerald-500 to-teal-500 bg-emerald-50 text-emerald-600',
    orange: 'from-orange-500 to-amber-500 bg-orange-50 text-orange-600',
    blue: 'from-blue-500 to-sky-500 bg-blue-50 text-blue-600',
  };

  return tones[tone];
}

function riskTone(score?: number | string | null) {
  const value = Number(score ?? 0);
  if (value >= 16) return 'bg-red-100 text-red-700';
  if (value >= 9) return 'bg-orange-100 text-orange-700';
  return 'bg-emerald-100 text-emerald-700';
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
  const goal = Math.max(12, Math.min(100, summary.complianceScore));

  const navItems: NavItem[] = [
    { label: 'Dashboard', href: basePath },
    { label: 'Risks', href: `${basePath}/risks`, badge: summary.criticalRisks || undefined },
    { label: 'Vendors', href: `${basePath}/vendors`, badge: summary.highRiskVendors || undefined },
    { label: 'Evidence', href: `${basePath}/documents`, badge: summary.missingDocuments || undefined },
    { label: 'Reports', href: `${basePath}/reports` },
    { label: 'Tasks', href: `${basePath}/tasks`, badge: summary.openTasks || undefined },
    { label: 'Billing', href: `${basePath}/billing` },
  ];

  const kpis: KpiCard[] = [
    { label: 'Overall Score', value: `${summary.complianceScore}/100`, change: `${getDelta(trendComparison)} vs last snapshot`, href: `${basePath}/reports`, tone: 'purple', sparkline: 'M0 54 C35 42 54 22 92 34 C126 45 145 14 190 20 C230 25 248 4 290 0' },
    { label: 'Compliance', value: `${summary.complianceScore}%`, change: `${summary.totals.documents - summary.missingDocuments} evidence ready`, href: `${basePath}/documents`, tone: 'green', sparkline: 'M0 45 C24 58 48 22 72 28 C108 37 120 18 154 24 C190 28 204 8 290 0' },
    { label: 'High Risks', value: summary.criticalRisks, change: `${summary.openRisks} total open risks`, href: `${basePath}/risks`, tone: 'orange', sparkline: 'M0 28 C38 5 60 52 92 30 C128 5 154 42 186 32 C222 18 236 52 290 42' },
    { label: 'Open Tasks', value: summary.openTasks, change: `${openTasks.length} in executive queue`, href: `${basePath}/tasks`, tone: 'blue', sparkline: 'M0 52 C28 34 55 44 88 28 C122 14 152 38 185 22 C225 2 250 16 290 4' },
  ];

  return (
    <div className="min-h-[calc(100vh-2rem)] overflow-hidden rounded-[2rem] bg-[#f8f9ff] text-slate-950 shadow-2xl">
      <div className="grid min-h-[calc(100vh-2rem)] lg:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="hidden border-r border-slate-200/80 bg-white/90 p-5 lg:flex lg:flex-col">
          <Link href={basePath} className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-500 text-lg font-black text-white shadow-lg shadow-violet-500/20">E</div>
            <div>
              <p className="text-lg font-black leading-none tracking-tight">EuroComply</p>
              <p className="mt-1 text-xs font-medium text-slate-500">GRC Platform</p>
            </div>
          </Link>

          <nav className="mt-9 space-y-1.5">
            {navItems.map((item, index) => (
              <Link
                key={item.label}
                href={item.href}
                className={`group flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-bold transition hover:bg-violet-50 hover:text-violet-700 ${index === 0 ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20' : 'text-slate-600'}`}
              >
                <span>{item.label}</span>
                {item.badge !== undefined && <span className={`rounded-full px-2 py-0.5 text-xs ${index === 0 ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-violet-100 group-hover:text-violet-700'}`}>{item.badge}</span>}
              </Link>
            ))}
          </nav>

          <div className="mt-auto rounded-3xl bg-slate-950 p-4 text-white">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Audit pack</p>
            <p className="mt-2 text-sm font-semibold">Printable board evidence package</p>
            <Link href={`${basePath}/reports/print`} className="mt-4 inline-flex rounded-2xl bg-white px-4 py-2 text-xs font-bold text-slate-950">Open pack</Link>
          </div>
        </aside>

        <main className="min-w-0 overflow-y-auto p-5 lg:h-[calc(100vh-2rem)] lg:p-8">
          <header className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-950">Welcome back 👋</h1>
              <p className="mt-2 text-sm text-slate-500">Security, privacy and compliance posture for your workspace.</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="hidden min-w-72 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-400 shadow-sm md:flex">
                <span>⌕</span>
                <span>Search risks, vendors, evidence...</span>
                <span className="ml-auto rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500">⌘K</span>
              </div>
              <Link href={`${basePath}/reports/print`} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:border-violet-200 hover:text-violet-700">Export</Link>
              <Link href={`${basePath}/tasks`} className="rounded-2xl bg-violet-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-violet-500/20 transition hover:bg-violet-700">+ New action</Link>
            </div>
          </header>

          <section className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {kpis.map((kpi) => {
              const tone = kpiToneClasses(kpi.tone);
              const [gradientFrom, gradientTo, iconBg, iconText] = tone.split(' ');

              return (
                <Link key={kpi.label} href={kpi.href} className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-violet-100/70">
                  <div className="flex items-start justify-between gap-3">
                    <div className={`flex h-14 w-14 items-center justify-center rounded-3xl ${iconBg} ${iconText}`}>
                      <span className="text-xl">{kpi.label === 'Overall Score' ? '♢' : kpi.label === 'Compliance' ? '✓' : kpi.label === 'High Risks' ? '!' : '□'}</span>
                    </div>
                    <span className="text-xl text-slate-300">⋮</span>
                  </div>
                  <p className="mt-5 text-3xl font-black tracking-tight text-slate-950">{kpi.value}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-700">{kpi.label}</p>
                  <p className="mt-3 text-xs font-medium text-emerald-600">{kpi.change}</p>
                  <svg viewBox="0 0 290 64" className="mt-4 h-16 w-full overflow-visible">
                    <path d={kpi.sparkline} fill="none" stroke="url(#grad)" strokeWidth="4" strokeLinecap="round" />
                    <defs>
                      <linearGradient id="grad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" className={gradientFrom.replace('from-', 'text-')} stopColor="currentColor" />
                        <stop offset="100%" className={gradientTo.replace('to-', 'text-')} stopColor="currentColor" />
                      </linearGradient>
                    </defs>
                  </svg>
                </Link>
              );
            })}
          </section>

          <section className="mt-4 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black tracking-tight">Posture Trend</h2>
                  <p className="mt-1 text-sm text-slate-500">Your compliance posture over time</p>
                </div>
                <Link href={`${basePath}/reports`} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-violet-200 hover:text-violet-700">Open reports</Link>
              </div>

              <div className="mt-8 grid gap-6 lg:grid-cols-[10rem_minmax(0,1fr)]">
                <div className="space-y-6">
                  <div>
                    <p className="text-sm text-slate-500">This Month</p>
                    <p className="mt-2 text-3xl font-black text-violet-600">{summary.complianceScore}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Open Risks</p>
                    <p className="mt-2 text-3xl font-black text-slate-400">{summary.openRisks}</p>
                  </div>
                </div>

                <div className="relative h-72 rounded-3xl bg-gradient-to-b from-violet-50 to-white p-4">
                  <div className="absolute inset-x-8 top-8 h-px bg-slate-200" />
                  <div className="absolute inset-x-8 top-20 h-px bg-slate-200" />
                  <div className="absolute inset-x-8 top-32 h-px bg-slate-200" />
                  <div className="absolute inset-x-8 top-44 h-px bg-slate-200" />
                  <svg viewBox="0 0 620 220" className="relative z-10 h-full w-full overflow-visible">
                    <path d="M12 170 C72 175 96 112 148 126 C202 142 220 58 286 82 C340 102 348 152 404 134 C462 112 478 60 532 74 C570 84 590 38 608 28" fill="none" stroke="#6d4aff" strokeWidth="5" strokeLinecap="round" />
                    <path d="M12 190 C80 178 94 150 150 158 C210 166 218 120 286 134 C350 148 356 184 410 160 C468 132 486 122 540 136 C576 146 590 104 608 94" fill="none" stroke="#94a3b8" strokeWidth="3" strokeDasharray="10 10" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black tracking-tight">Risk Heatmap</h2>
                  <p className="mt-1 text-sm text-slate-500">Impact × likelihood</p>
                </div>
                <Link href={`${basePath}/risks`} className="rounded-2xl bg-violet-50 px-4 py-2 text-sm font-bold text-violet-700">View risks</Link>
              </div>

              <div className="mt-7 grid grid-cols-5 gap-1.5">
                {Array.from({ length: 25 }).map((_, index) => {
                  const row = Math.floor(index / 5);
                  const col = index % 5;
                  const danger = row + col;
                  const count = index === 4 ? summary.criticalRisks : index === 18 ? summary.highRiskVendors : index === 6 ? summary.missingDocuments : 0;
                  const color = danger > 6 ? 'bg-red-400' : danger > 4 ? 'bg-orange-300' : danger > 2 ? 'bg-yellow-200' : 'bg-emerald-200';

                  return (
                    <div key={index} className={`flex h-16 items-center justify-center rounded-xl ${color}`}>
                      {count > 0 && <span className="rounded-full bg-slate-950 px-2 py-1 text-xs font-black text-white">{count}</span>}
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex justify-between text-xs font-semibold text-slate-400">
                <span>Low likelihood</span>
                <span>High likelihood</span>
              </div>
            </div>
          </section>

          <section className="mt-4 grid gap-4 xl:grid-cols-3">
            <Panel title="Top Risks" href={`${basePath}/risks`} cta="View all">
              {topRisks.length === 0 ? <p className="text-sm text-slate-500">No open risks requiring executive attention.</p> : topRisks.slice(0, 5).map((risk) => (
                <Link key={risk.id} href={`${basePath}/risks`} className="flex items-center justify-between gap-3 rounded-2xl px-2 py-2 transition hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-orange-400" />
                    <p className="line-clamp-1 text-sm font-semibold text-slate-700">{risk.title ?? 'Untitled risk'}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${riskTone(risk.risk_score)}`}>{Number(risk.risk_score ?? 0)}</span>
                </Link>
              ))}
            </Panel>

            <Panel title="Recent Activities" href={`${basePath}/reports`} cta="Open reports">
              <ActivityItem icon="✓" title="Compliance posture updated" meta={`${summary.complianceScore}% current score`} />
              <ActivityItem icon="□" title="Evidence queue refreshed" meta={`${summary.missingDocuments} missing documents`} />
              <ActivityItem icon="!" title="Risk register reviewed" meta={`${summary.openRisks} open risks`} />
              <ActivityItem icon="◇" title="Vendor exposure checked" meta={`${summary.highRiskVendors} high-risk vendors`} />
            </Panel>

            <Panel title="Upcoming Tasks" href={`${basePath}/tasks`} cta="View all">
              {openTasks.length === 0 ? <p className="text-sm text-slate-500">No open tasks in the executive queue.</p> : openTasks.map((task) => (
                <Link key={task.id} href={`${basePath}/tasks`} className="flex items-start gap-3 rounded-2xl px-2 py-2 transition hover:bg-slate-50">
                  <span className="mt-1 h-4 w-4 rounded-full border border-slate-300" />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-semibold text-slate-700">{task.title ?? 'Untitled task'}</p>
                    <p className="text-xs text-slate-400">{task.priority ?? 'normal'} · {task.status ?? 'open'}</p>
                  </div>
                </Link>
              ))}
            </Panel>
          </section>
        </main>
      </div>
    </div>
  );
}

function Panel({ title, href, cta, children }: { title: string; href: string; cta: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-lg font-black tracking-tight text-slate-950">{title}</h3>
        <Link href={href} className="rounded-2xl bg-violet-50 px-3 py-2 text-xs font-bold text-violet-700">{cta}</Link>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function ActivityItem({ icon, title, meta }: { icon: string; title: string; meta: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl px-2 py-2">
      <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-violet-50 text-sm font-black text-violet-600">{icon}</span>
      <div>
        <p className="text-sm font-semibold text-slate-700">{title}</p>
        <p className="text-xs text-slate-400">{meta}</p>
      </div>
    </div>
  );
}
