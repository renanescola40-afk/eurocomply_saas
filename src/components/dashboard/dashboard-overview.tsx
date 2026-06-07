import Link from 'next/link';
import { AlertTriangle, ArrowRight, Building2, CheckCircle2, ClipboardList, FileWarning, Gauge, ShieldCheck, Sparkles, TrendingUp, UsersRound } from 'lucide-react';
import { ComplianceTimeline } from '@/components/dashboard/compliance-timeline';
import { DomainScorecards } from '@/components/dashboard/domain-scorecards';
import { ExecutiveDashboardHero } from '@/components/dashboard/executive-dashboard-hero';
import { NextBestActions } from '@/components/dashboard/next-best-actions';
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
  if (value === null || value === undefined) return 'No prior data';
  if (value === 0) return `No change${suffix}`;
  return `${value > 0 ? '+' : ''}${value}${suffix}`;
}

function getDeltaTone(value: number | null | undefined, lowerIsBetter = true) {
  if (value === null || value === undefined || value === 0) return 'text-slate-500 dark:text-slate-400';
  const isGood = lowerIsBetter ? value < 0 : value > 0;
  return isGood ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400';
}

function formatShortDate(value?: string | null) {
  if (!value) return 'not scheduled';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(value));
}

function getDashboardHref(basePath: string, target: 'dashboard' | 'tasks' | 'risks' | 'vendors' | 'documents' | 'reports') {
  if (target === 'dashboard') return basePath;
  return `${basePath}/${target}`;
}

function getSnapshotValue(snapshot: DashboardTrendSnapshot, metric: keyof DashboardTrendSnapshot) {
  const value = snapshot[metric];
  return typeof value === 'number' ? value : 0;
}

function getRiskTone(score?: number | string | null) {
  const value = Number(score ?? 0);
  if (value >= 16) return 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300';
  if (value >= 9) return 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300';
  return 'border-slate-200 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300';
}

function getPriorityTone(priority?: string | null) {
  const normalized = priority?.toLowerCase();
  if (normalized === 'critical' || normalized === 'high') return 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300';
  if (normalized === 'medium') return 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300';
  return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
}

function TrendBars({
  history,
  metric,
  maxHeight = 72,
}: {
  history: DashboardTrendSnapshot[];
  metric: keyof DashboardTrendSnapshot;
  maxHeight?: number;
}) {
  const values = history.map((snapshot) => getSnapshotValue(snapshot, metric));
  const max = Math.max(...values, 1);

  return (
    <div className="flex items-end gap-2 rounded-2xl border border-slate-200/70 bg-slate-50/80 px-3 pb-3 pt-5 dark:border-white/10 dark:bg-white/[0.03]">
      {history.map((snapshot) => {
        const value = getSnapshotValue(snapshot, metric);
        const height = Math.max(8, Math.round((value / max) * maxHeight));

        return (
          <div key={`${snapshot.snapshotDate}-${String(metric)}`} className="flex flex-1 flex-col items-center gap-2">
            <div
              className="w-full rounded-t-xl bg-gradient-to-t from-primary/60 to-primary shadow-sm shadow-primary/20"
              style={{ height: `${height}px` }}
              title={`${value}`}
            />
            <span className="text-[10px] text-muted-foreground">{formatShortDate(snapshot.snapshotDate)}</span>
          </div>
        );
      })}
    </div>
  );
}

function Pill({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${className}`}>{children}</span>;
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-5 text-sm dark:border-white/10 dark:bg-white/[0.03]">
      <p className="font-medium text-foreground">{title}</p>
      <p className="mt-1 text-muted-foreground">{description}</p>
    </div>
  );
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
  const totalAttentionItems = summary.openTasks + summary.openRisks + summary.missingDocuments + summary.highRiskVendors;

  const commandMetrics = [
    {
      label: 'Compliance posture',
      value: `${summary.complianceScore}%`,
      detail: `${formatDelta(trendComparison?.complianceScoreDelta, ' pts')} vs last snapshot`,
      tone: getDeltaTone(trendComparison?.complianceScoreDelta, false),
      href: getDashboardHref(basePath, 'reports'),
      icon: Gauge,
    },
    {
      label: 'Open workload',
      value: summary.openTasks,
      detail: `${formatDelta(trendComparison?.openTasksDelta)} unresolved tasks`,
      tone: getDeltaTone(trendComparison?.openTasksDelta),
      href: getDashboardHref(basePath, 'tasks'),
      icon: ClipboardList,
    },
    {
      label: 'Risk exposure',
      value: summary.openRisks,
      detail: `${summary.criticalRisks} critical risks`,
      tone: summary.criticalRisks > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400',
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
      <ExecutiveDashboardHero summary={summary} trendComparison={trendComparison} reportsHref={getDashboardHref(basePath, 'reports')} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {commandMetrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Link key={metric.label} href={metric.href} className="group block rounded-3xl focus:outline-none focus:ring-2 focus:ring-primary">
              <Card className="h-full overflow-hidden border-slate-200/80 bg-white/80 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg dark:border-white/10 dark:bg-white/[0.04]">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="rounded-2xl border border-primary/15 bg-primary/10 p-3 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition group-hover:translate-x-1 group-hover:opacity-100" />
                  </div>
                  <p className="mt-5 text-sm font-medium text-muted-foreground">{metric.label}</p>
                  <div className="mt-2 flex items-end justify-between gap-3">
                    <p className="text-3xl font-semibold tracking-tight">{metric.value}</p>
                    <p className={`text-right text-xs font-medium ${metric.tone}`}>{metric.detail}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <Card className="overflow-hidden border-primary/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white shadow-xl shadow-slate-950/10">
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl space-y-4">
                <Pill className="border-white/15 bg-white/10 text-white">
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Executive command layer
                </Pill>
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Board-ready compliance intelligence, without the spreadsheet fog.</h2>
                  <p className="mt-3 text-sm leading-6 text-slate-300">
                    EuroComply is tracking {totalAttentionItems} operational signals across risk, vendors, evidence and remediation. Use this view to decide what needs action before the next audit window.
                  </p>
                </div>
              </div>
              <div className="grid min-w-[240px] grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                  <p className="text-slate-300">High-risk vendors</p>
                  <p className="mt-2 text-3xl font-semibold">{summary.highRiskVendors}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                  <p className="text-slate-300">Critical risks</p>
                  <p className="mt-2 text-3xl font-semibold">{summary.criticalRisks}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-5 w-5 text-emerald-500" /> Readiness signal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Current score</span>
                <span className="font-semibold">{latestScore}%</span>
              </div>
              <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-primary" style={{ width: `${Math.max(0, Math.min(100, latestScore))}%` }} />
              </div>
            </div>
            <p className={`text-sm font-medium ${getDeltaTone(scoreMovement, false)}`}>{formatDelta(scoreMovement, ' pts')} across visible history</p>
            <Link href={getDashboardHref(basePath, 'reports')} className="inline-flex items-center text-sm font-medium text-primary">
              Open reporting workspace <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </CardContent>
        </Card>
      </section>

      <DomainScorecards summary={summary} basePath={basePath} />
      <NextBestActions summary={summary} basePath={basePath} />
      <ComplianceTimeline tasks={openTasks} vendors={vendorsRequiringReview} documents={documentsExpiringSoon} basePath={basePath} />

      <section className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Priority remediation queue</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">The next items your team should close to reduce audit and regulatory exposure.</p>
            </div>
            <Link href={getDashboardHref(basePath, 'tasks')} className="text-sm font-medium text-primary">View all</Link>
          </CardHeader>
          <CardContent>
            {openTasks.length === 0 ? (
              <EmptyState title="No open compliance tasks" description="Keep monitoring vendors, risks and evidence freshness. New action items will appear here as assessments run." />
            ) : (
              <div className="space-y-3">
                {openTasks.map((task, index) => (
                  <Link key={task.id} href={getDashboardHref(basePath, 'tasks')} className="group flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-sm transition hover:border-primary/50 hover:shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
                    <div className="flex min-w-0 items-start gap-4">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border bg-slate-50 text-xs font-semibold dark:border-white/10 dark:bg-white/5">{index + 1}</div>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{task.title ?? 'Untitled task'}</p>
                        <p className="mt-1 text-muted-foreground">Due {formatShortDate(task.due_date)} · {task.status ?? 'open'}</p>
                      </div>
                    </div>
                    <Pill className={getPriorityTone(task.priority)}>{task.priority ?? 'normal'}</Pill>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Compliance score trend</CardTitle>
            <p className="text-sm text-muted-foreground">Snapshot movement across the visible reporting period.</p>
          </CardHeader>
          <CardContent>
            {trendHistory.length === 0 ? (
              <EmptyState title="No snapshots yet" description="Trend history starts after the first dashboard snapshot is recorded." />
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Latest score</p>
                  <p className="text-4xl font-semibold tracking-tight">{latestScore}%</p>
                </div>
                <TrendBars history={trendHistory} metric="complianceScore" maxHeight={96} />
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-500" /> Top risks</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Highest exposure items to review.</p>
            </div>
            <Link href={getDashboardHref(basePath, 'risks')} className="text-sm font-medium text-primary">Open</Link>
          </CardHeader>
          <CardContent>
            {topRisks.length === 0 ? (
              <EmptyState title="No executive risks" description="No open risks currently require executive attention." />
            ) : (
              <div className="space-y-3">
                {topRisks.map((risk) => (
                  <Link key={risk.id} href={getDashboardHref(basePath, 'risks')} className="block rounded-2xl border border-slate-200 p-4 text-sm transition hover:border-primary/50 hover:bg-muted/30 dark:border-white/10">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{risk.title ?? 'Untitled risk'}</p>
                        <p className="mt-1 text-muted-foreground">{risk.category ?? 'General'} · {risk.status ?? 'open'}</p>
                      </div>
                      <Pill className={getRiskTone(risk.risk_score)}>Score {Number(risk.risk_score ?? 0)}</Pill>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" /> Vendor reviews</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Third-party risk that needs a fresh decision.</p>
            </div>
            <Link href={getDashboardHref(basePath, 'vendors')} className="text-sm font-medium text-primary">Open</Link>
          </CardHeader>
          <CardContent>
            {vendorsRequiringReview.length === 0 ? (
              <EmptyState title="Vendor posture is clean" description="No vendor reviews currently require attention." />
            ) : (
              <div className="space-y-3">
                {vendorsRequiringReview.map((vendor) => (
                  <Link key={vendor.id} href={getDashboardHref(basePath, 'vendors')} className="block rounded-2xl border border-slate-200 p-4 text-sm transition hover:border-primary/50 hover:bg-muted/30 dark:border-white/10">
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

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2"><FileWarning className="h-5 w-5 text-amber-500" /> Evidence watchlist</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Documents expiring or needing refresh.</p>
            </div>
            <Link href={getDashboardHref(basePath, 'documents')} className="text-sm font-medium text-primary">Open</Link>
          </CardHeader>
          <CardContent>
            {documentsExpiringSoon.length === 0 ? (
              <EmptyState title="Evidence is current" description="No upcoming document expirations found." />
            ) : (
              <div className="space-y-3">
                {documentsExpiringSoon.map((document) => (
                  <Link key={document.id} href={getDashboardHref(basePath, 'documents')} className="block rounded-2xl border border-slate-200 p-4 text-sm transition hover:border-primary/50 hover:bg-muted/30 dark:border-white/10">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{document.title ?? document.name ?? 'Untitled document'}</p>
                        <p className="mt-1 text-muted-foreground">{document.category ?? 'General'} · {document.status ?? 'draft'}</p>
                      </div>
                      <Pill className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300">{formatShortDate(document.expires_at)}</Pill>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {operationalTrends.map((trend) => (
          <Card key={trend.label} className="bg-white/70 dark:bg-white/[0.03]">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <TrendingUp className="h-4 w-4" /> {trend.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {trendHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">No trend history yet.</p>
              ) : (
                <TrendBars history={trendHistory} metric={trend.metric} maxHeight={52} />
              )}
              <p className={`text-xs ${getDeltaTone(trend.delta)}`}>{formatDelta(trend.delta)} vs previous snapshot</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card className="border-primary/15 bg-gradient-to-r from-primary/10 via-background to-background">
        <CardContent className="flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl border border-primary/20 bg-primary/10 p-3 text-primary">
              <UsersRound className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">Turn this dashboard into an operating rhythm.</p>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Assign owners, close missing evidence and export the next audit pack from the same workspace. This is the command layer your compliance team should open every morning.
              </p>
            </div>
          </div>
          <Link href={getDashboardHref(basePath, 'reports')} className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90">
            Prepare audit pack <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
