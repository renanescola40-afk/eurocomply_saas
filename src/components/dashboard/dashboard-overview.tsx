import Link from 'next/link';
import { ComplianceCalendarPreview } from '@/components/dashboard/compliance-calendar-preview';
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
  if (value === null || value === undefined || value === 0) return 'text-muted-foreground';
  const isGood = lowerIsBetter ? value < 0 : value > 0;
  return isGood ? 'text-emerald-400' : 'text-red-400';
}

function formatShortDate(value?: string | null) {
  if (!value) return 'not set';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(value));
}

function getRiskTone(score?: number | string | null) {
  const value = Number(score ?? 0);
  if (value >= 16) return 'text-red-400';
  if (value >= 9) return 'text-amber-300';
  return 'text-muted-foreground';
}

function getSnapshotValue(snapshot: DashboardTrendSnapshot, metric: keyof DashboardTrendSnapshot) {
  const value = snapshot[metric];
  return typeof value === 'number' ? value : 0;
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
    <div className="flex items-end gap-2 border-b border-white/10 pb-2">
      {history.map((snapshot) => {
        const value = getSnapshotValue(snapshot, metric);
        const height = Math.max(6, Math.round((value / max) * maxHeight));

        return (
          <div key={`${snapshot.snapshotDate}-${String(metric)}`} className="flex flex-1 flex-col items-center gap-2">
            <div className="w-full rounded-t bg-primary/70" style={{ height: `${height}px` }} title={`${value}`} />
            <span className="text-[10px] text-muted-foreground">{formatShortDate(snapshot.snapshotDate)}</span>
          </div>
        );
      })}
    </div>
  );
}

function getDashboardHref(basePath: string, target: 'dashboard' | 'tasks' | 'risks' | 'vendors' | 'documents' | 'reports') {
  if (target === 'dashboard') return basePath;
  return `${basePath}/${target}`;
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
  const openTasks = tasks.filter((task) => task.status !== 'done').slice(0, 5);
  const latestScore = trendHistory.at(-1)?.complianceScore ?? summary.complianceScore;
  const firstScore = trendHistory.at(0)?.complianceScore ?? latestScore;
  const scoreMovement = latestScore - firstScore;

  const metricCards = [
    {
      label: 'Compliance score',
      value: `${summary.complianceScore}%`,
      detail: formatDelta(trendComparison?.complianceScoreDelta, ' pts'),
      tone: getDeltaTone(trendComparison?.complianceScoreDelta, false),
      href: getDashboardHref(basePath, 'reports'),
    },
    {
      label: 'Open tasks',
      value: summary.openTasks,
      detail: formatDelta(trendComparison?.openTasksDelta),
      tone: getDeltaTone(trendComparison?.openTasksDelta),
      href: getDashboardHref(basePath, 'tasks'),
    },
    {
      label: 'Open risks',
      value: summary.openRisks,
      detail: formatDelta(trendComparison?.openRisksDelta),
      tone: getDeltaTone(trendComparison?.openRisksDelta),
      href: getDashboardHref(basePath, 'risks'),
    },
    {
      label: 'Critical risks',
      value: summary.criticalRisks,
      detail: formatDelta(trendComparison?.criticalRisksDelta),
      tone: getDeltaTone(trendComparison?.criticalRisksDelta),
      href: getDashboardHref(basePath, 'risks'),
    },
    {
      label: 'High-risk vendors',
      value: summary.highRiskVendors,
      detail: formatDelta(trendComparison?.highRiskVendorsDelta),
      tone: getDeltaTone(trendComparison?.highRiskVendorsDelta),
      href: getDashboardHref(basePath, 'vendors'),
    },
    {
      label: 'Missing documents',
      value: summary.missingDocuments,
      detail: formatDelta(trendComparison?.missingDocumentsDelta),
      tone: getDeltaTone(trendComparison?.missingDocumentsDelta),
      href: getDashboardHref(basePath, 'documents'),
    },
  ];

  const operationalTrends = [
    { label: 'Open tasks', metric: 'openTasks' as const, delta: trendComparison?.openTasksDelta },
    { label: 'Open risks', metric: 'openRisks' as const, delta: trendComparison?.openRisksDelta },
    { label: 'Critical risks', metric: 'criticalRisks' as const, delta: trendComparison?.criticalRisksDelta },
    { label: 'High-risk vendors', metric: 'highRiskVendors' as const, delta: trendComparison?.highRiskVendorsDelta },
    { label: 'Missing documents', metric: 'missingDocuments' as const, delta: trendComparison?.missingDocumentsDelta },
  ];

  return (
    <div className="space-y-6">
      <ExecutiveDashboardHero summary={summary} trendComparison={trendComparison} reportsHref={getDashboardHref(basePath, 'reports')} />
      <DomainScorecards summary={summary} basePath={basePath} />
      <NextBestActions summary={summary} basePath={basePath} />
      <ComplianceCalendarPreview tasks={openTasks} vendors={vendorsRequiringReview} documents={documentsExpiringSoon} basePath={basePath} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {metricCards.map((metric) => (
          <Link key={metric.label} href={metric.href} className="block rounded-xl focus:outline-none focus:ring-2 focus:ring-primary">
            <Card className="h-full transition hover:border-primary/50 hover:bg-muted/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{metric.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{metric.value}</p>
                <p className={`mt-2 text-sm ${metric.tone}`}>{metric.detail} vs previous snapshot</p>
                <p className="mt-3 text-xs text-muted-foreground">Open details →</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Compliance score trend</CardTitle>
          </CardHeader>
          <CardContent>
            {trendHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground">Trend history starts after the first dashboard snapshot is recorded.</p>
            ) : (
              <div className="space-y-4">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Latest score</p>
                    <p className="text-4xl font-bold">{latestScore}%</p>
                  </div>
                  <p className={getDeltaTone(scoreMovement, false)}>{formatDelta(scoreMovement, ' pts')} across visible history</p>
                </div>
                <TrendBars history={trendHistory} metric="complianceScore" maxHeight={100} />
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {operationalTrends.map((trend) => (
          <Card key={trend.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{trend.label} trend</CardTitle>
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

      <section className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Top risks</CardTitle>
          </CardHeader>
          <CardContent>
            {topRisks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No open risks requiring executive attention.</p>
            ) : (
              <div className="space-y-3">
                {topRisks.map((risk) => (
                  <Link key={risk.id} href={getDashboardHref(basePath, 'risks')} className="block rounded-lg border p-3 text-sm transition hover:border-primary/50 hover:bg-muted/30">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{risk.title ?? 'Untitled risk'}</p>
                        <p className="text-muted-foreground">{risk.category ?? 'General'} · {risk.status ?? 'open'}</p>
                      </div>
                      <p className={`font-semibold ${getRiskTone(risk.risk_score)}`}>{Number(risk.risk_score ?? 0)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vendors requiring review</CardTitle>
          </CardHeader>
          <CardContent>
            {vendorsRequiringReview.length === 0 ? (
              <p className="text-sm text-muted-foreground">No vendor reviews currently require attention.</p>
            ) : (
              <div className="space-y-3">
                {vendorsRequiringReview.map((vendor) => (
                  <Link key={vendor.id} href={getDashboardHref(basePath, 'vendors')} className="block rounded-lg border p-3 text-sm transition hover:border-primary/50 hover:bg-muted/30">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{vendor.name ?? 'Unnamed vendor'}</p>
                        <p className="text-muted-foreground">Review {formatShortDate(vendor.next_review_at)}</p>
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
          <CardHeader>
            <CardTitle>Documents expiring soon</CardTitle>
          </CardHeader>
          <CardContent>
            {documentsExpiringSoon.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming document expirations found.</p>
            ) : (
              <div className="space-y-3">
                {documentsExpiringSoon.map((document) => (
                  <Link key={document.id} href={getDashboardHref(basePath, 'documents')} className="block rounded-lg border p-3 text-sm transition hover:border-primary/50 hover:bg-muted/30">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{document.title ?? document.name ?? 'Untitled document'}</p>
                        <p className="text-muted-foreground">{document.category ?? 'General'} · {document.status ?? 'draft'}</p>
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

      <Card>
        <CardHeader>
          <CardTitle>Open task focus</CardTitle>
        </CardHeader>
        <CardContent>
          {openTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No open compliance tasks. Keep monitoring risks, vendors and evidence freshness.</p>
          ) : (
            <div className="space-y-3">
              {openTasks.map((task) => (
                <Link key={task.id} href={getDashboardHref(basePath, 'tasks')} className="flex items-center justify-between gap-4 rounded-lg border p-3 text-sm transition hover:border-primary/50 hover:bg-muted/30">
                  <div>
                    <p className="font-medium">{task.title ?? 'Untitled task'}</p>
                    <p className="text-muted-foreground">Due {formatShortDate(task.due_date)}</p>
                  </div>
                  <div className="text-right text-xs uppercase tracking-wide text-muted-foreground">
                    <p>{task.priority ?? 'normal'}</p>
                    <p>{task.status ?? 'open'}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
