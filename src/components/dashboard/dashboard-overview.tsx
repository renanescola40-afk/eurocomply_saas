import Link from 'next/link';
import { AiCopilotPanel } from '@/components/dashboard/ai-copilot-panel';
import { ApprovalWorkflowPreview } from '@/components/dashboard/approval-workflow-preview';
import { AuditTimelinePreview } from '@/components/dashboard/audit-timeline-preview';
import { BoardModePreview } from '@/components/dashboard/board-mode-preview';
import { BoardReportCenter } from '@/components/dashboard/board-report-center';
import { DashboardExperienceIndex } from '@/components/dashboard/dashboard-experience-index';
import { DashboardExperienceMap } from '@/components/dashboard/dashboard-experience-map';
import { DashboardWorkspaceSidebar } from '@/components/dashboard/dashboard-workspace-sidebar';
import { DepartmentOwnershipPreview } from '@/components/dashboard/department-ownership-preview';
import { EnterpriseValueLadder } from '@/components/dashboard/enterprise-value-ladder';
import { EvidenceGraph } from '@/components/dashboard/evidence-graph';
import { ExecutiveCommandCenter } from '@/components/dashboard/executive-command-center';
import { ExecutiveDashboardHero } from '@/components/dashboard/executive-dashboard-hero';
import { FrameworkCoveragePreview } from '@/components/dashboard/framework-coverage-preview';
import { OperationalActivityFeed } from '@/components/dashboard/operational-activity-feed';
import { RelationshipGraph } from '@/components/dashboard/relationship-graph';
import { RiskHeatmap } from '@/components/dashboard/risk-heatmap';
import { ScenarioSimulator } from '@/components/dashboard/scenario-simulator';
import { StickyExecutiveKpiBar } from '@/components/dashboard/sticky-executive-kpi-bar';
import { WhiteLabelReportPreview } from '@/components/dashboard/white-label-report-preview';
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

type WorkspaceView = {
  id: string;
  label: string;
  description: string;
  href: string;
  accent: 'emerald' | 'sky' | 'violet' | 'amber' | 'rose';
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

function viewClasses(accent: WorkspaceView['accent']) {
  const accents = {
    emerald: 'hover:border-emerald-400/50 hover:bg-emerald-400/10',
    sky: 'hover:border-sky-400/50 hover:bg-sky-400/10',
    violet: 'hover:border-violet-400/50 hover:bg-violet-400/10',
    amber: 'hover:border-amber-400/50 hover:bg-amber-400/10',
    rose: 'hover:border-rose-400/50 hover:bg-rose-400/10',
  };

  return accents[accent];
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
  const views: WorkspaceView[] = [
    { id: 'overview-view', label: 'Overview', description: 'Executive command', href: '#overview-view', accent: 'emerald' },
    { id: 'intelligence-view', label: 'Intelligence', description: 'AI, heatmap, graph', href: '#intelligence-view', accent: 'violet' },
    { id: 'board-view', label: 'Board', description: 'Decisions and reports', href: '#board-view', accent: 'sky' },
    { id: 'operations-view', label: 'Operations', description: 'Tasks, risks, vendors', href: '#operations-view', accent: 'amber' },
    { id: 'growth-view', label: 'Growth', description: 'Frameworks and pricing', href: '#growth-view', accent: 'rose' },
  ];

  const metricCards = [
    { label: 'Open tasks', value: summary.openTasks, href: getDashboardHref(basePath, 'tasks') },
    { label: 'Open risks', value: summary.openRisks, href: getDashboardHref(basePath, 'risks') },
    { label: 'Critical risks', value: summary.criticalRisks, href: getDashboardHref(basePath, 'risks') },
    { label: 'High-risk vendors', value: summary.highRiskVendors, href: getDashboardHref(basePath, 'vendors') },
    { label: 'Missing documents', value: summary.missingDocuments, href: getDashboardHref(basePath, 'documents') },
    { label: 'Compliance score', value: `${summary.complianceScore}%`, href: getDashboardHref(basePath, 'reports') },
  ];

  return (
    <div className="min-h-[calc(100vh-2rem)] xl:grid xl:grid-cols-[20rem_minmax(0,1fr)] xl:gap-6">
      <DashboardWorkspaceSidebar summary={summary} basePath={basePath} />

      <div className="premium-motion-enter-delayed premium-shell premium-ambient-border premium-ambient-grid min-w-0 overflow-hidden rounded-[2rem] shadow-2xl xl:h-[calc(100vh-2rem)] xl:overflow-hidden">
        <div className="relative z-10 border-b border-white/10 bg-slate-950/80 p-3 backdrop-blur-xl">
          <div className="flex items-center gap-3 overflow-x-auto">
            <div className="hidden shrink-0 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 lg:block">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-primary/80">Workspace views</p>
              <p className="mt-1 text-xs text-slate-500">Choose one operating layer</p>
            </div>
            {views.map((view, index) => (
              <a
                key={view.id}
                href={view.href}
                className={`premium-magnetic premium-pressable min-w-44 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 transition ${index === 0 ? 'premium-tab-active' : ''} ${viewClasses(view.accent)} focus:outline-none focus:ring-2 focus:ring-primary`}
              >
                <p className="text-sm font-bold leading-none text-white">{view.label}</p>
                <p className="mt-1 text-xs text-slate-500">{view.description}</p>
              </a>
            ))}
          </div>
        </div>

        <div className="relative z-10 h-[calc(100vh-8.5rem)] snap-y snap-mandatory overflow-y-auto scroll-smooth p-4 xl:p-5">
          <div className="mb-4">
            <WorkspaceCommandBar summary={summary} trendComparison={trendComparison} basePath={basePath} />
          </div>
          <section id="overview-view" className="premium-motion-enter min-h-full snap-start scroll-mt-4 space-y-4">
            <ExecutiveDashboardHero summary={summary} trendComparison={trendComparison} reportsHref={getDashboardHref(basePath, 'reports')} />
            <StickyExecutiveKpiBar summary={summary} trendComparison={trendComparison} basePath={basePath} />
            <div className="grid gap-4 2xl:grid-cols-[1.1fr_0.9fr]">
              <ExecutiveCommandCenter summary={summary} trendComparison={trendComparison} basePath={basePath} />
              <DashboardExperienceIndex summary={summary} trendComparison={trendComparison} basePath={basePath} />
            </div>
            <DashboardExperienceMap basePath={basePath} />
          </section>

          <section id="intelligence-view" className="min-h-full snap-start scroll-mt-4 space-y-4 pt-4">
            <div className="grid gap-4 2xl:grid-cols-2">
              <AiCopilotPanel summary={summary} trendComparison={trendComparison} basePath={basePath} />
              <RiskHeatmap summary={summary} basePath={basePath} />
            </div>
            <div className="grid gap-4 2xl:grid-cols-2">
              <RelationshipGraph summary={summary} basePath={basePath} />
              <EvidenceGraph summary={summary} basePath={basePath} />
            </div>
          </section>

          <section id="board-view" className="min-h-full snap-start scroll-mt-4 space-y-4 pt-4">
            <div className="grid gap-4 2xl:grid-cols-2">
              <BoardModePreview summary={summary} trendComparison={trendComparison} basePath={basePath} />
              <ScenarioSimulator summary={summary} basePath={basePath} />
            </div>
            <div className="grid gap-4 2xl:grid-cols-2">
              <BoardReportCenter summary={summary} trendComparison={trendComparison} basePath={basePath} />
              <WhiteLabelReportPreview summary={summary} trendComparison={trendComparison} basePath={basePath} />
            </div>
          </section>

          <section id="operations-view" className="min-h-full snap-start scroll-mt-4 space-y-4 pt-4">
            <OperationalActivityFeed tasks={openTasks} topRisks={topRisks} vendors={vendorsRequiringReview} documents={documentsExpiringSoon} basePath={basePath} />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {metricCards.map((metric) => (
                <Link key={metric.label} href={metric.href} className="premium-magnetic block rounded-xl focus:outline-none focus:ring-2 focus:ring-primary">
                  <Card className="h-full transition hover:border-primary/50 hover:bg-muted/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">{metric.label}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold">{metric.value}</p>
                      <p className="mt-3 text-xs text-muted-foreground">Open dedicated dashboard</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              <Card>
                <CardHeader><CardTitle>Top risks</CardTitle></CardHeader>
                <CardContent>
                  {topRisks.length === 0 ? <p className="text-sm text-muted-foreground">No open risks requiring executive attention.</p> : (
                    <div className="space-y-3">
                      {topRisks.slice(0, 4).map((risk) => (
                        <Link key={risk.id} href={getDashboardHref(basePath, 'risks')} className="premium-magnetic block rounded-lg border p-3 text-sm transition hover:border-primary/50 hover:bg-muted/30">
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
                      {vendorsRequiringReview.slice(0, 4).map((vendor) => (
                        <Link key={vendor.id} href={getDashboardHref(basePath, 'vendors')} className="premium-magnetic block rounded-lg border p-3 text-sm transition hover:border-primary/50 hover:bg-muted/30">
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
                      {documentsExpiringSoon.slice(0, 4).map((document) => (
                        <Link key={document.id} href={getDashboardHref(basePath, 'documents')} className="premium-magnetic block rounded-lg border p-3 text-sm transition hover:border-primary/50 hover:bg-muted/30">
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
            </div>
          </section>

          <section id="growth-view" className="min-h-full snap-start scroll-mt-4 space-y-4 pt-4">
            <div className="grid gap-4 2xl:grid-cols-2">
              <FrameworkCoveragePreview summary={summary} basePath={basePath} />
              <EnterpriseValueLadder summary={summary} basePath={basePath} />
            </div>
            <div className="grid gap-4 2xl:grid-cols-2">
              <ApprovalWorkflowPreview summary={summary} basePath={basePath} />
              <DepartmentOwnershipPreview summary={summary} basePath={basePath} />
            </div>
            <AuditTimelinePreview summary={summary} trendComparison={trendComparison} basePath={basePath} />
          </section>
        </div>
      </div>
    </div>
  );
}
