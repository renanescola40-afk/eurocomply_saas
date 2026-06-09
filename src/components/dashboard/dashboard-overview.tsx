import Link from 'next/link';
import { AiCopilotPanel } from '@/components/dashboard/ai-copilot-panel';
import { AiExecutiveLayer } from '@/components/dashboard/ai-executive-layer';
import { ApprovalWorkflowPreview } from '@/components/dashboard/approval-workflow-preview';
import { AuditTimelinePreview } from '@/components/dashboard/audit-timeline-preview';
import { BoardModePreview } from '@/components/dashboard/board-mode-preview';
import { BoardReportCenter } from '@/components/dashboard/board-report-center';
import { ComplianceTimeline } from '@/components/dashboard/compliance-timeline';
import { DashboardExperienceIndex } from '@/components/dashboard/dashboard-experience-index';
import { DashboardExperienceMap } from '@/components/dashboard/dashboard-experience-map';
import { DepartmentOwnershipPreview } from '@/components/dashboard/department-ownership-preview';
import { DomainScorecards } from '@/components/dashboard/domain-scorecards';
import { EnterpriseValueLadder } from '@/components/dashboard/enterprise-value-ladder';
import { EvidenceGraph } from '@/components/dashboard/evidence-graph';
import { ExecutiveCockpit } from '@/components/dashboard/executive-cockpit';
import { ExecutiveCommandCenter } from '@/components/dashboard/executive-command-center';
import { ExecutiveDashboardHero } from '@/components/dashboard/executive-dashboard-hero';
import { FrameworkCoveragePreview } from '@/components/dashboard/framework-coverage-preview';
import { NextBestActions } from '@/components/dashboard/next-best-actions';
import { OperationalActivityFeed } from '@/components/dashboard/operational-activity-feed';
import { RelationshipGraph } from '@/components/dashboard/relationship-graph';
import { RiskHeatmap } from '@/components/dashboard/risk-heatmap';
import { ScenarioSimulator } from '@/components/dashboard/scenario-simulator';
import { StickyExecutiveKpiBar } from '@/components/dashboard/sticky-executive-kpi-bar';
import { WhiteLabelReportPreview } from '@/components/dashboard/white-label-report-preview';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DashboardSummary, DashboardTrendComparison, DashboardTrendSnapshot } from '@/server/queries/dashboard';

type DashboardOverviewProps = {
  summary: DashboardSummary;
  tasks: Array<{ id: string; title?: string | null; status?: string | null; priority?: string | null; due_date?: string | null }>;
  trendHistory?: DashboardTrendSnapshot[];
  trendComparison?: DashboardTrendComparison;
  basePath?: string;
  topRisks?: Array<{ id: string; title?: string | null; status?: string | null; risk_score?: number | string | null; category?: string | null }>;
  vendorsRequiringReview?: Array<{ id: string; name?: string | null; risk_level?: string | null; review_status?: string | null; next_review_at?: string | null }>;
  documentsExpiringSoon?: Array<{ id: string; title?: string | null; name?: string | null; status?: string | null; expires_at?: string | null; category?: string | null }>;
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

function EnterpriseMetricsPreview({ summary }: { summary: DashboardSummary }) {
  const metrics = [
    { label: 'Cross-country readiness', value: `${Math.min(100, summary.complianceScore + 12)}%` },
    { label: 'Team collaboration index', value: summary.openTasks > 0 ? 'Active' : 'Ready' },
    { label: 'Priority support signal', value: 'Preview' },
  ];
  return (
    <section id="enterprise-preview" className="scroll-mt-28 rounded-[2rem] border border-amber-300/60 bg-gradient-to-br from-amber-50 to-background p-6 shadow-lg shadow-amber-500/10 dark:from-amber-950/30">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-300">Enterprise only preview</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">Métricas Avançadas (Preview)</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Widget visual aspiracional para clientes Enterprise. Mostra status e prioridade sem liberar funcionalidades gratuitas fora do plano.</p>
        </div>
        <span className="rounded-full bg-amber-400 px-3 py-1 text-xs font-semibold text-black">◆ Enterprise Diamond</span>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-2xl border bg-background/70 p-4">
            <p className="text-sm text-muted-foreground">{metric.label}</p>
            <p className="mt-2 text-2xl font-semibold">{metric.value}</p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-amber-100"><div className="h-full w-2/3 animate-pulse rounded-full bg-amber-400" /></div>
          </div>
        ))}
      </div>
    </section>
  );
}

function DashboardMetricsGrid({ summary, basePath }: { summary: DashboardSummary; basePath: string }) {
  const metricCards = [
    { label: 'Open tasks', value: summary.openTasks, href: getDashboardHref(basePath, 'tasks') },
    { label: 'Open risks', value: summary.openRisks, href: getDashboardHref(basePath, 'risks') },
    { label: 'Critical risks', value: summary.criticalRisks, href: getDashboardHref(basePath, 'risks') },
    { label: 'High-risk vendors', value: summary.highRiskVendors, href: getDashboardHref(basePath, 'vendors') },
    { label: 'Missing documents', value: summary.missingDocuments, href: getDashboardHref(basePath, 'documents') },
    { label: 'Compliance score', value: `${summary.complianceScore}%`, href: getDashboardHref(basePath, 'reports') },
  ];

  return (
    <section id="risk-radar" className="grid scroll-mt-28 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {metricCards.map((metric) => (
        <Link key={metric.label} href={metric.href} className="block rounded-xl focus:outline-none focus:ring-2 focus:ring-primary">
          <Card className="h-full transition hover:border-primary/50 hover:bg-muted/30">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{metric.label}</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold">{metric.value}</p><p className="mt-3 text-xs text-muted-foreground">Open details</p></CardContent>
          </Card>
        </Link>
      ))}
    </section>
  );
}

function ExposureLists({ basePath, topRisks, vendorsRequiringReview, documentsExpiringSoon }: Pick<DashboardOverviewProps, 'basePath' | 'topRisks' | 'vendorsRequiringReview' | 'documentsExpiringSoon'>) {
  const safeBasePath = basePath ?? '/dashboard/organizations';
  return (
    <section className="grid gap-6 xl:grid-cols-3">
      <Card id="risks" className="scroll-mt-28"><CardHeader><CardTitle>Top risks</CardTitle></CardHeader><CardContent>{(topRisks ?? []).length === 0 ? <p className="text-sm text-muted-foreground">No open risks requiring executive attention.</p> : <div className="space-y-3">{(topRisks ?? []).map((risk) => <Link key={risk.id} href={getDashboardHref(safeBasePath, 'risks')} className="block rounded-lg border p-3 text-sm transition hover:border-primary/50 hover:bg-muted/30"><div className="flex items-start justify-between gap-3"><div><p className="font-medium">{risk.title ?? 'Untitled risk'}</p><p className="text-muted-foreground">{risk.category ?? 'General'} · {risk.status ?? 'open'}</p></div><p className={`font-semibold ${getRiskTone(risk.risk_score)}`}>{Number(risk.risk_score ?? 0)}</p></div></Link>)}</div>}</CardContent></Card>
      <Card id="vendors" className="scroll-mt-28"><CardHeader><CardTitle>Vendors requiring review</CardTitle></CardHeader><CardContent>{(vendorsRequiringReview ?? []).length === 0 ? <p className="text-sm text-muted-foreground">No vendor reviews currently require attention.</p> : <div className="space-y-3">{(vendorsRequiringReview ?? []).map((vendor) => <Link key={vendor.id} href={getDashboardHref(safeBasePath, 'vendors')} className="block rounded-lg border p-3 text-sm transition hover:border-primary/50 hover:bg-muted/30"><div className="flex items-start justify-between gap-3"><div><p className="font-medium">{vendor.name ?? 'Unnamed vendor'}</p><p className="text-muted-foreground">Review {formatShortDate(vendor.next_review_at)}</p></div><div className="text-right text-xs uppercase tracking-wide text-muted-foreground"><p>{vendor.risk_level ?? 'unknown'}</p><p>{vendor.review_status ?? 'pending'}</p></div></div></Link>)}</div>}</CardContent></Card>
      <Card id="documents" className="scroll-mt-28"><CardHeader><CardTitle>Documents expiring soon</CardTitle></CardHeader><CardContent>{(documentsExpiringSoon ?? []).length === 0 ? <p className="text-sm text-muted-foreground">No upcoming document expirations found.</p> : <div className="space-y-3">{(documentsExpiringSoon ?? []).map((document) => <Link key={document.id} href={getDashboardHref(safeBasePath, 'documents')} className="block rounded-lg border p-3 text-sm transition hover:border-primary/50 hover:bg-muted/30"><div className="flex items-start justify-between gap-3"><div><p className="font-medium">{document.title ?? document.name ?? 'Untitled document'}</p><p className="text-muted-foreground">{document.category ?? 'General'} · {document.status ?? 'draft'}</p></div><p className="text-right text-xs font-semibold uppercase tracking-wide text-amber-300">{formatShortDate(document.expires_at)}</p></div></Link>)}</div>}</CardContent></Card>
    </section>
  );
}

export function HomeDashboardPage({ summary, tasks, trendComparison, basePath = '/dashboard/organizations', topRisks = [], vendorsRequiringReview = [], documentsExpiringSoon = [] }: DashboardOverviewProps) {
  const openTasks = tasks.filter((task) => task.status !== 'done').slice(0, 5);
  return <div className="space-y-6 scroll-smooth"><section id="overview" className="scroll-mt-28"><ExecutiveDashboardHero summary={summary} trendComparison={trendComparison} reportsHref={getDashboardHref(basePath, 'reports')} /></section><section id="experience-map" className="scroll-mt-28"><DashboardExperienceMap basePath={basePath} /></section><section id="experience-index" className="scroll-mt-28"><DashboardExperienceIndex summary={summary} trendComparison={trendComparison} basePath={basePath} /></section><section id="recommended-focus" className="scroll-mt-28"><NextBestActions summary={summary} basePath={basePath} /></section><section id="calendar" className="scroll-mt-28"><ComplianceTimeline tasks={openTasks} vendors={vendorsRequiringReview} documents={documentsExpiringSoon} basePath={basePath} /></section></div>;
}

export function CommandCenterPage({ summary, tasks, trendComparison, basePath = '/dashboard/organizations', topRisks = [], vendorsRequiringReview = [], documentsExpiringSoon = [] }: DashboardOverviewProps) {
  const openTasks = tasks.filter((task) => task.status !== 'done').slice(0, 5);
  return <div className="space-y-6 scroll-smooth"><section id="executive-summary" className="scroll-mt-28"><ExecutiveCommandCenter summary={summary} trendComparison={trendComparison} basePath={basePath} /></section><section id="kpi-strip" className="scroll-mt-28"><StickyExecutiveKpiBar summary={summary} trendComparison={trendComparison} basePath={basePath} /></section><section id="health-center" className="scroll-mt-28"><ExecutiveCockpit summary={summary} trendComparison={trendComparison} basePath={basePath} /></section><EnterpriseMetricsPreview summary={summary} /><section id="ai-copilot" className="scroll-mt-28"><AiCopilotPanel summary={summary} trendComparison={trendComparison} basePath={basePath} /></section><section id="operational-feed" className="scroll-mt-28"><OperationalActivityFeed tasks={openTasks} topRisks={topRisks} vendors={vendorsRequiringReview} documents={documentsExpiringSoon} basePath={basePath} /></section></div>;
}

export function EvidenceRiskPage({ summary, basePath = '/dashboard/organizations', topRisks = [], vendorsRequiringReview = [], documentsExpiringSoon = [] }: DashboardOverviewProps) {
  return <div className="space-y-6 scroll-smooth"><section id="risk-heatmap" className="scroll-mt-28"><RiskHeatmap summary={summary} basePath={basePath} /></section><section id="relationship-graph" className="scroll-mt-28"><RelationshipGraph summary={summary} basePath={basePath} /></section><section id="evidence-graph" className="scroll-mt-28"><EvidenceGraph summary={summary} basePath={basePath} /></section><DashboardMetricsGrid summary={summary} basePath={basePath} /><section id="tasks" className="scroll-mt-28"><DomainScorecards summary={summary} basePath={basePath} /></section><ExposureLists basePath={basePath} topRisks={topRisks} vendorsRequiringReview={vendorsRequiringReview} documentsExpiringSoon={documentsExpiringSoon} /></div>;
}

export function ReportsGovernancePage({ summary, trendComparison, basePath = '/dashboard/organizations' }: DashboardOverviewProps) {
  return <div className="space-y-6 scroll-smooth"><section id="board-mode" className="scroll-mt-28"><BoardModePreview summary={summary} trendComparison={trendComparison} basePath={basePath} /></section><section id="scenario-simulator" className="scroll-mt-28"><ScenarioSimulator summary={summary} basePath={basePath} /></section><section id="board-report-center" className="scroll-mt-28"><BoardReportCenter summary={summary} trendComparison={trendComparison} basePath={basePath} /></section><section id="white-label-reports" className="scroll-mt-28"><WhiteLabelReportPreview summary={summary} trendComparison={trendComparison} basePath={basePath} /></section><section id="approval-workflow" className="scroll-mt-28"><ApprovalWorkflowPreview summary={summary} basePath={basePath} /></section><section id="department-ownership" className="scroll-mt-28"><DepartmentOwnershipPreview summary={summary} basePath={basePath} /></section><section id="audit-timeline" className="scroll-mt-28"><AuditTimelinePreview summary={summary} trendComparison={trendComparison} basePath={basePath} /></section><section id="framework-coverage" className="scroll-mt-28"><FrameworkCoveragePreview summary={summary} basePath={basePath} /></section><section id="value-ladder" className="scroll-mt-28"><EnterpriseValueLadder summary={summary} basePath={basePath} /></section><section id="ai-executive-layer" className="scroll-mt-28"><AiExecutiveLayer summary={summary} trendComparison={trendComparison} basePath={basePath} /></section></div>;
}

export function DashboardOverview(props: DashboardOverviewProps) {
  return <HomeDashboardPage {...props} />;
}
