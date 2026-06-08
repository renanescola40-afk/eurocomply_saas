import Link from 'next/link';
import { AiExecutiveLayer } from '@/components/dashboard/ai-executive-layer';
import { ApprovalWorkflowPreview } from '@/components/dashboard/approval-workflow-preview';
import { BoardReportCenter } from '@/components/dashboard/board-report-center';
import { ComplianceTimeline } from '@/components/dashboard/compliance-timeline';
import { DomainScorecards } from '@/components/dashboard/domain-scorecards';
import { EvidenceGraph } from '@/components/dashboard/evidence-graph';
import { ExecutiveCockpit } from '@/components/dashboard/executive-cockpit';
import { ExecutiveDashboardHero } from '@/components/dashboard/executive-dashboard-hero';
import { NextBestActions } from '@/components/dashboard/next-best-actions';
import { OperationalActivityFeed } from '@/components/dashboard/operational-activity-feed';
import { WhiteLabelReportPreview } from '@/components/dashboard/white-label-report-preview';
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

function formatShortDate(value?: string | null) {
  if (!value) return 'not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'not set';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(date);
}

function getDashboardHref(basePath: string, target: 'dashboard' | 'tasks' | 'risks' | 'vendors' | 'documents' | 'reports') {
  if (target === 'dashboard') return basePath;
  return `${basePath}/${target}`;
}

function getRiskTone(score?: number | string | null) {
  const value = Number(score ?? 0);
  if (value >= 16) return 'text-red-400';
  if (value >= 9) return 'text-amber-300';
  return 'text-muted-foreground';
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

  const metricCards = [
    { label: 'Open tasks', value: summary.openTasks, href: getDashboardHref(basePath, 'tasks') },
    { label: 'Open risks', value: summary.openRisks, href: getDashboardHref(basePath, 'risks') },
    { label: 'Critical risks', value: summary.criticalRisks, href: getDashboardHref(basePath, 'risks') },
    { label: 'High-risk vendors', value: summary.highRiskVendors, href: getDashboardHref(basePath, 'vendors') },
    { label: 'Missing documents', value: summary.missingDocuments, href: getDashboardHref(basePath, 'documents') },
    { label: 'Compliance score', value: `${summary.complianceScore}%`, href: getDashboardHref(basePath, 'reports') },
  ];

  return (
    <div className="space-y-6">
      <ExecutiveDashboardHero summary={summary} trendComparison={trendComparison} reportsHref={getDashboardHref(basePath, 'reports')} />
      <ExecutiveCockpit summary={summary} trendComparison={trendComparison} basePath={basePath} />
      <OperationalActivityFeed tasks={openTasks} topRisks={topRisks} vendors={vendorsRequiringReview} documents={documentsExpiringSoon} basePath={basePath} />
      <EvidenceGraph summary={summary} basePath={basePath} />
      <AiExecutiveLayer summary={summary} trendComparison={trendComparison} basePath={basePath} />
      <BoardReportCenter summary={summary} trendComparison={trendComparison} basePath={basePath} />
      <WhiteLabelReportPreview summary={summary} trendComparison={trendComparison} basePath={basePath} />
      <ApprovalWorkflowPreview summary={summary} basePath={basePath} />
      <DomainScorecards summary={summary} basePath={basePath} />
      <NextBestActions summary={summary} basePath={basePath} />
      <ComplianceTimeline tasks={openTasks} vendors={vendorsRequiringReview} documents={documentsExpiringSoon} basePath={basePath} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {metricCards.map((metric) => (
          <Link key={metric.label} href={metric.href} className="block rounded-xl focus:outline-none focus:ring-2 focus:ring-primary">
            <Card className="h-full transition hover:border-primary/50 hover:bg-muted/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{metric.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{metric.value}</p>
                <p className="mt-3 text-xs text-muted-foreground">Open details</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Top risks</CardTitle></CardHeader>
          <CardContent>
            {topRisks.length === 0 ? <p className="text-sm text-muted-foreground">No open risks requiring executive attention.</p> : (
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
          <CardHeader><CardTitle>Vendors requiring review</CardTitle></CardHeader>
          <CardContent>
            {vendorsRequiringReview.length === 0 ? <p className="text-sm text-muted-foreground">No vendor reviews currently require attention.</p> : (
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
          <CardHeader><CardTitle>Documents expiring soon</CardTitle></CardHeader>
          <CardContent>
            {documentsExpiringSoon.length === 0 ? <p className="text-sm text-muted-foreground">No upcoming document expirations found.</p> : (
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
    </div>
  );
}
