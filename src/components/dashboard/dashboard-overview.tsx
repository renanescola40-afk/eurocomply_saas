import Link from 'next/link';
import type { ReactNode } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, ClipboardList, FileWarning, Gauge, ShieldCheck, Sparkles, TrendingUp, UsersRound } from 'lucide-react';
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

function formatDelta(value: number | null | undefined, suffix = '') {
  if (value === null || value === undefined) return 'No baseline yet';
  if (value === 0) return `Stable${suffix}`;
  return `${value > 0 ? '+' : ''}${value}${suffix}`;
}

function getDeltaTone(value: number | null | undefined, lowerIsBetter = true) {
  if (value === null || value === undefined || value === 0) return 'text-muted-foreground';
  const isGood = lowerIsBetter ? value < 0 : value > 0;
  return isGood ? 'text-emerald-400' : 'text-red-400';
}

function formatShortDate(value?: string | null) {
  if (!value) return 'not scheduled';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'not scheduled';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(date);
}

function getDashboardHref(basePath: string, target: 'dashboard' | 'tasks' | 'risks' | 'vendors' | 'documents' | 'reports') {
  if (target === 'dashboard') return basePath;
  return `${basePath}/${target}`;
}

function getRiskTone(score?: number | string | null) {
  const value = Number(score ?? 0);
  if (value >= 16) return 'border-red-500/30 bg-red-500/10 text-red-200';
  if (value >= 9) return 'border-amber-500/30 bg-amber-500/10 text-amber-100';
  return 'border-white/10 bg-white/5 text-muted-foreground';
}

function getPriorityTone(priority?: string | null) {
  const normalized = priority?.toLowerCase();
  if (normalized === 'critical' || normalized === 'high') return 'border-red-500/30 bg-red-500/10 text-red-200';
  if (normalized === 'medium') return 'border-amber-500/30 bg-amber-500/10 text-amber-100';
  return 'border-white/10 bg-white/5 text-muted-foreground';
}

function getSnapshotValue(snapshot: DashboardTrendSnapshot, metric: keyof DashboardTrendSnapshot) {
  const value = snapshot[metric];
  return typeof value === 'number' ? value : 0;
}

function TrendBars({ history, metric, maxHeight = 72 }: { history: DashboardTrendSnapshot[]; metric: keyof DashboardTrendSnapshot; maxHeight?: number }) {
  const values = history.map((snapshot) => getSnapshotValue(snapshot, metric));
  const max = Math.max(...values, 1);

  return (
    <div className="flex items-end gap-2 border-b border-white/10 pb-2">
      {history.map((snapshot) => {
        const value = getSnapshotValue(snapshot, metric);
        const height = Math.max(8, Math.round((value / max) * maxHeight));

        return (
          <div key={`${snapshot.snapshotDate}-${String(metric)}`} className="flex flex-1 flex-col items-center gap-2">
            <div className="w-full rounded-t-lg bg-primary/70 shadow-[0_0_24px_rgba(59,130,246,0.28)]" style={{ height: `${height}px` }} title={`${value}`} />
            <span className="text-[10px] text-muted-foreground">{formatShortDate(snapshot.snapshotDate)}</span>
          </div>
        );
      })}
    </div>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm text-muted-foreground">{children}</p>;
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
  const openTasks = tasks.filter((task) => task.status !== 'done').slice(0, 6);
  const latestScore = trendHistory.at(-1)?.complianceScore ?? summary.complianceScore;
  const firstScore = trendHistory.at(0)?.complianceScore ?? latestScore;
  const scoreMovement = latestScore - firstScore;

  const executiveMetrics = [
    {
      label: 'Compliance posture',
      value: `${summary.complianceScore}%`,
      detail: `${formatDelta(trendComparison?.complianceScoreDelta, ' pts')} vs previous snapshot`,
      tone: getDeltaTone(trendComparison?.complianceScoreDelta, false),
      href: getDashboardHref(basePath, 'reports'),
      icon: ShieldCheck,
    },
    {
      label: 'Open work queue',
      value: summary.openTasks,
      detail: `${formatDelta(trendComparison?.openTasksDelta)} task movement`,
      tone: getDeltaTone(trendComparison?.openTasksDelta),
      href: getDashboardHref(basePath, 'tasks'),
      icon: ClipboardList,
    },
    {
      label: 'Risk exposure',
      value: summary.openRisks,
      detail: `${summary.criticalRisks} critical items`,
      tone: summary.criticalRisks > 0 ? 'text-red-400' : 'text-emerald-400',
      href: getDashboardHref(basePath, 'risks'),
      icon: AlertTriangle,
    },
    {
      label: 'Evidence gaps',
      value: summary.missingDocuments,
      detail: `${formatDelta(trendComparison?.missingDocumentsDelta)} missing documents`,
      tone: getDeltaTone(trendComparison?.missingDocumentsDelta),
      href: getDashboardHref(basePath, 'documents'),
      icon: FileWarning,
    },
  ];

  const operationalTrends = [
    { label: 'Tasks', metric: 'openTasks' as const, delta: trendComparison?.openTasksDelta },
    { label: 'Risks', metric: 'openRisks' as const, delta: trendComparison?.openRisksDelta },
    { label: 'Critical', metric: 'criticalRisks' as const, delta: trendComparison?.criticalRisksDelta },
    { label: 'Vendors', metric: 'highRiskVendors' as const, delta: trendComparison?.highRiskVendorsDelta },
    { label: 'Evidence', metric: 'missingDocuments' as const, delta: trendComparison?.missingDocumentsDelta },
  ];

  return (
    <div className="space-y-8">
      <section className="grid gap-4 lg:grid-cols-4">
        {executiveMetrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Link key={metric.label} href={metric.href} className="group block rounded-3xl focus:outline-none focus:ring-2 focus:ring-primary">
              <Card className="h-full overflow-hidden border-white/10 bg-gradient-to-br from-white/[0.08] via-white/[0.035] to-transparent transition duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/10">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">{metric.label}</p>
                    <span className="rounded-2xl border border-white/10 bg-white/5 p-2 text-muted-foreground transition group-hover:border-primary/40 group-hover:text-primary">
                      <Icon className="h-4 w-4" />
                    </span>
                  </div>
                  <p className="mt-5 text-4xl font-semibold tracking-tight">{metric.value}</p>
                  <p className={`mt-3 text-sm ${metric.tone}`}>{metric.detail}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Card className="overflow-hidden border-white/10 bg-gradient-to-br from-slate-950 via-slate-950 to-primary/10">
          <CardHeader className="flex flex-col gap-3 border-b border-white/10 pb-6 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.28em] text-primary/80"><TrendingUp className="h-4 w-4" /> Executive signal</p>
              <CardTitle className="mt-2 text-2xl">Compliance trajectory</CardTitle>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Track whether the organisation is getting audit-ready or accumulating operational debt across tasks, risks, vendors and evidence.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-right">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Latest score</p>
              <p className="text-3xl font-semibold">{latestScore}%</p>
              <p className={getDeltaTone(scoreMovement, false)}>{formatDelta(scoreMovement, ' pts')}</p>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {trendHistory.length === 0 ? <EmptyState>Trend history starts after the first dashboard snapshot is recorded.</EmptyState> : <TrendBars history={trendHistory} metric="complianceScore" maxHeight={118} />}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/[0.03]">
          <CardHeader>
            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground"><Sparkles className="h-4 w-4" /> Next command</p>
            <CardTitle>Recommended focus</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary.criticalRisks > 0 ? (
              <Link href={getDashboardHref(basePath, 'risks')} className="block rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm transition hover:border-red-400/50">
                <p className="font-medium text-red-100">Resolve critical risk exposure</p>
                <p className="mt-1 text-red-100/70">{summary.criticalRisks} critical risks need executive attention before the next audit checkpoint.</p>
              </Link>
            ) : summary.missingDocuments > 0 ? (
              <Link href={getDashboardHref(basePath, 'documents')} className="block rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm transition hover:border-amber-400/50">
                <p className="font-medium text-amber-100">Close evidence gaps</p>
                <p className="mt-1 text-amber-100/70">{summary.missingDocuments} evidence items are missing or incomplete.</p>
              </Link>
            ) : (
              <Link href={getDashboardHref(basePath, 'reports')} className="block rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm transition hover:border-emerald-400/50">
                <p className="font-medium text-emerald-100">Prepare the audit pack</p>
                <p className="mt-1 text-emerald-100/70">Your active posture is stable. Package evidence and export reporting.</p>
              </Link>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <Link href={getDashboardHref(basePath, 'tasks')} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4 text-sm transition hover:border-primary/40">Review tasks <ArrowRight className="h-4 w-4" /></Link>
              <Link href={getDashboardHref(basePath, 'reports')} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4 text-sm transition hover:border-primary/40">Generate report <ArrowRight className="h-4 w-4" /></Link>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <Card className="border-white/10 bg-white/[0.03]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Gauge className="h-5 w-5 text-primary" /> Risk radar</CardTitle>
          </CardHeader>
          <CardContent>
            {topRisks.length === 0 ? (
              <EmptyState>No open risks requiring executive attention.</EmptyState>
            ) : (
              <div className="space-y-3">
                {topRisks.slice(0, 5).map((risk) => (
                  <Link key={risk.id} href={getDashboardHref(basePath, 'risks')} className={`block rounded-2xl border p-4 text-sm transition hover:border-primary/50 ${getRiskTone(risk.risk_score)}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">{risk.title ?? 'Untitled risk'}</p>
                        <p className="mt-1 text-muted-foreground">{risk.category ?? 'General'} · {risk.status ?? 'open'}</p>
                      </div>
                      <p className="text-lg font-semibold">{Number(risk.risk_score ?? 0)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/[0.03]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><UsersRound className="h-5 w-5 text-primary" /> Vendor watchlist</CardTitle>
          </CardHeader>
          <CardContent>
            {vendorsRequiringReview.length === 0 ? (
              <EmptyState>No vendor reviews currently require attention.</EmptyState>
            ) : (
              <div className="space-y-3">
                {vendorsRequiringReview.slice(0, 5).map((vendor) => (
                  <Link key={vendor.id} href={getDashboardHref(basePath, 'vendors')} className="block rounded-2xl border border-white/10 bg-white/5 p-4 text-sm transition hover:border-primary/50">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{vendor.name ?? 'Unnamed vendor'}</p>
                        <p className="mt-1 text-muted-foreground">Review {formatShortDate(vendor.next_review_at)}</p>
                      </div>
                      <div className="text-right text-xs uppercase tracking-wide text-muted-foreground">
                        <p>{vendor.risk_level ?? 'unknown'}</p>
                        <p>{vendor.review_status ?? 'pending'}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/[0.03]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-primary" /> Evidence clock</CardTitle>
          </CardHeader>
          <CardContent>
            {documentsExpiringSoon.length === 0 ? (
              <EmptyState>No upcoming document expirations found.</EmptyState>
            ) : (
              <div className="space-y-3">
                {documentsExpiringSoon.slice(0, 5).map((document) => (
                  <Link key={document.id} href={getDashboardHref(basePath, 'documents')} className="block rounded-2xl border border-white/10 bg-white/5 p-4 text-sm transition hover:border-primary/50">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{document.title ?? document.name ?? 'Untitled document'}</p>
                        <p className="mt-1 text-muted-foreground">{document.category ?? 'General'} · {document.status ?? 'draft'}</p>
                      </div>
                      <p className="text-right text-xs font-semibold uppercase tracking-wide text-amber-300">{formatShortDate(document.expires_at)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1.4fr]">
        <Card className="border-white/10 bg-white/[0.03]">
          <CardHeader>
            <CardTitle>Operational pulse</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            {operationalTrends.map((trend) => (
              <div key={trend.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">{trend.label}</p>
                  <p className={`text-xs ${getDeltaTone(trend.delta)}`}>{formatDelta(trend.delta)}</p>
                </div>
                {trendHistory.length === 0 ? <p className="text-xs text-muted-foreground">No trend history yet.</p> : <TrendBars history={trendHistory} metric={trend.metric} maxHeight={42} />}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/[0.03]">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Priority work queue</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">The work most likely to block readiness, audit evidence or executive reporting.</p>
            </div>
            <Link href={getDashboardHref(basePath, 'tasks')} className="text-sm text-primary hover:underline">View all</Link>
          </CardHeader>
          <CardContent>
            {openTasks.length === 0 ? (
              <EmptyState>No open compliance tasks. Keep monitoring risks, vendors and evidence freshness.</EmptyState>
            ) : (
              <div className="space-y-3">
                {openTasks.map((task) => (
                  <Link key={task.id} href={getDashboardHref(basePath, 'tasks')} className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm transition hover:border-primary/50">
                    <div>
                      <p className="font-medium">{task.title ?? 'Untitled task'}</p>
                      <p className="mt-1 text-muted-foreground">Due {formatShortDate(task.due_date)} · {task.status ?? 'open'}</p>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-wide ${getPriorityTone(task.priority)}`}>{task.priority ?? 'normal'}</span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
