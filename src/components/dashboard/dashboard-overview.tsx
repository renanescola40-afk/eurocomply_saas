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

function formatSnapshotDate(value: string) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(value));
}

export function DashboardOverview({ summary, tasks, trendHistory = [], trendComparison }: DashboardOverviewProps) {
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
    },
    {
      label: 'Open tasks',
      value: summary.openTasks,
      detail: formatDelta(trendComparison?.openTasksDelta),
      tone: getDeltaTone(trendComparison?.openTasksDelta),
    },
    {
      label: 'Open risks',
      value: summary.openRisks,
      detail: formatDelta(trendComparison?.openRisksDelta),
      tone: getDeltaTone(trendComparison?.openRisksDelta),
    },
    {
      label: 'Critical risks',
      value: summary.criticalRisks,
      detail: formatDelta(trendComparison?.criticalRisksDelta),
      tone: getDeltaTone(trendComparison?.criticalRisksDelta),
    },
    {
      label: 'High-risk vendors',
      value: summary.highRiskVendors,
      detail: formatDelta(trendComparison?.highRiskVendorsDelta),
      tone: getDeltaTone(trendComparison?.highRiskVendorsDelta),
    },
    {
      label: 'Missing documents',
      value: summary.missingDocuments,
      detail: formatDelta(trendComparison?.missingDocumentsDelta),
      tone: getDeltaTone(trendComparison?.missingDocumentsDelta),
    },
  ];

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {metricCards.map((metric) => (
          <Card key={metric.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{metric.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{metric.value}</p>
              <p className={`mt-2 text-sm ${metric.tone}`}>{metric.detail} vs previous snapshot</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
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
                <div className="flex items-end gap-2 border-b border-white/10 pb-2">
                  {trendHistory.map((snapshot) => (
                    <div key={snapshot.snapshotDate} className="flex flex-1 flex-col items-center gap-2">
                      <div className="w-full rounded-t bg-primary/70" style={{ height: `${Math.max(snapshot.complianceScore, 4)}px` }} />
                      <span className="text-[10px] text-muted-foreground">{formatSnapshotDate(snapshot.snapshotDate)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Operational recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>Prioritize {summary.criticalRisks} critical risks before adding new compliance work.</li>
              <li>Review {summary.highRiskVendors} high-risk vendors and collect missing DPA/security evidence.</li>
              <li>Close or reassign the oldest open tasks to improve execution velocity.</li>
              <li>Complete {summary.missingDocuments} missing document approvals to improve evidence readiness.</li>
            </ul>
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
                <div key={task.id} className="flex items-center justify-between gap-4 rounded-lg border p-3 text-sm">
                  <div>
                    <p className="font-medium">{task.title ?? 'Untitled task'}</p>
                    <p className="text-muted-foreground">Due {task.due_date ? formatSnapshotDate(task.due_date) : 'not set'}</p>
                  </div>
                  <div className="text-right text-xs uppercase tracking-wide text-muted-foreground">
                    <p>{task.priority ?? 'normal'}</p>
                    <p>{task.status ?? 'open'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
