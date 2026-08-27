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
  if (value >= 16) return 'text-rose-200';
  if (value >= 9) return 'text-amber-200';
  return 'text-white/55';
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
    <section id="risk-radar" className="scroll-mt-28 overflow-hidden rounded-xl border border-white/[0.075] bg-[#101715]">
      <div className="grid md:grid-cols-2 xl:grid-cols-3">
        {metricCards.map((metric, index) => (
          <Link
            key={metric.label}
            href={metric.href}
            className={`group px-5 py-5 transition hover:bg-white/[0.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-300/35 ${index % 3 !== 0 ? 'xl:border-l xl:border-white/[0.055]' : ''} ${index >= 3 ? 'border-t border-white/[0.055]' : index >= 2 ? 'md:border-t md:border-white/[0.055] xl:border-t-0' : ''}`}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/38">{metric.label}</p>
            <p className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-white">{metric.value}</p>
            <p className="mt-3 text-xs text-white/35 transition group-hover:text-emerald-100/70">Open details →</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function ExposureSection({
  id,
  title,
  empty,
  children,
}: {
  id: string;
  title: string;
  empty?: string;
  children?: React.ReactNode;
}) {
  return (
    <article id={id} className="scroll-mt-28 overflow-hidden rounded-xl border border-white/[0.075] bg-[#101715]">
      <div className="border-b border-white/[0.055] px-5 py-4">
        <h3 className="text-sm font-semibold text-white/88">{title}</h3>
      </div>
      {children ? <div className="divide-y divide-white/[0.055]">{children}</div> : <p className="px-5 py-6 text-sm leading-6 text-white/42">{empty}</p>}
    </article>
  );
}

function ExposureLists({ basePath, topRisks, vendorsRequiringReview, documentsExpiringSoon }: Pick<DashboardOverviewProps, 'basePath' | 'topRisks' | 'vendorsRequiringReview' | 'documentsExpiringSoon'>) {
  const safeBasePath = basePath ?? '/dashboard/organizations';
  const risks = topRisks ?? [];
  const vendors = vendorsRequiringReview ?? [];
  const documents = documentsExpiringSoon ?? [];

  return (
    <section className="grid gap-4 xl:grid-cols-3">
      <ExposureSection id="risks" title="Top risks" empty="No open risks requiring executive attention.">
        {risks.length > 0 ? risks.map((risk) => (
          <Link key={risk.id} href={getDashboardHref(safeBasePath, 'risks')} className="block px-5 py-4 text-sm transition hover:bg-white/[0.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-300/35">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate font-medium text-white/88">{risk.title ?? 'Untitled risk'}</p>
                <p className="mt-1 text-xs text-white/38">{risk.category ?? 'General'} · {risk.status ?? 'open'}</p>
              </div>
              <p className={`shrink-0 text-sm font-semibold ${getRiskTone(risk.risk_score)}`}>{Number(risk.risk_score ?? 0)}</p>
            </div>
          </Link>
        )) : undefined}
      </ExposureSection>

      <ExposureSection id="vendors" title="Vendors requiring review" empty="No vendor reviews currently require attention.">
        {vendors.length > 0 ? vendors.map((vendor) => (
          <Link key={vendor.id} href={getDashboardHref(safeBasePath, 'vendors')} className="block px-5 py-4 text-sm transition hover:bg-white/[0.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-300/35">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate font-medium text-white/88">{vendor.name ?? 'Unnamed vendor'}</p>
                <p className="mt-1 text-xs text-white/38">Review {formatShortDate(vendor.next_review_at)}</p>
              </div>
              <div className="shrink-0 text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-white/38">
                <p>{vendor.risk_level ?? 'unknown'}</p>
                <p className="mt-1">{vendor.review_status ?? 'pending'}</p>
              </div>
            </div>
          </Link>
        )) : undefined}
      </ExposureSection>

      <ExposureSection id="documents" title="Documents expiring soon" empty="No upcoming document expirations found.">
        {documents.length > 0 ? documents.map((document) => (
          <Link key={document.id} href={getDashboardHref(safeBasePath, 'documents')} className="block px-5 py-4 text-sm transition hover:bg-white/[0.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-300/35">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate font-medium text-white/88">{document.title ?? document.name ?? 'Untitled document'}</p>
                <p className="mt-1 text-xs text-white/38">{document.category ?? 'General'} · {document.status ?? 'draft'}</p>
              </div>
              <p className="shrink-0 text-right text-xs font-semibold text-amber-200">{formatShortDate(document.expires_at)}</p>
            </div>
          </Link>
        )) : undefined}
      </ExposureSection>
    </section>
  );
}

export function HomeDashboardPage({ summary, tasks, trendComparison, basePath = '/dashboard/organizations', topRisks = [], vendorsRequiringReview = [], documentsExpiringSoon = [] }: DashboardOverviewProps) {
  const openTasks = tasks.filter((task) => task.status !== 'done').slice(0, 5);
  return <div className="space-y-6 scroll-smooth"><section id="overview" className="scroll-mt-28"><ExecutiveDashboardHero summary={summary} trendComparison={trendComparison} reportsHref={getDashboardHref(basePath, 'reports')} /></section><section id="experience-map" className="scroll-mt-28"><DashboardExperienceMap basePath={basePath} /></section><section id="experience-index" className="scroll-mt-28"><DashboardExperienceIndex summary={summary} trendComparison={trendComparison} basePath={basePath} /></section><section id="recommended-focus" className="scroll-mt-28"><NextBestActions summary={summary} basePath={basePath} /></section><section id="calendar" className="scroll-mt-28"><ComplianceTimeline tasks={openTasks} vendors={vendorsRequiringReview} documents={documentsExpiringSoon} basePath={basePath} /></section></div>;
}

export function CommandCenterPage({ summary, tasks, trendComparison, basePath = '/dashboard/organizations', topRisks = [], vendorsRequiringReview = [], documentsExpiringSoon = [] }: DashboardOverviewProps) {
  const openTasks = tasks.filter((task) => task.status !== 'done').slice(0, 5);
  return <div className="space-y-6 scroll-smooth"><section id="executive-summary" className="scroll-mt-28"><ExecutiveCommandCenter summary={summary} trendComparison={trendComparison} basePath={basePath} /></section><section id="kpi-strip" className="scroll-mt-28"><StickyExecutiveKpiBar summary={summary} trendComparison={trendComparison} basePath={basePath} /></section><section id="health-center" className="scroll-mt-28"><ExecutiveCockpit summary={summary} trendComparison={trendComparison} basePath={basePath} /></section><section id="ai-copilot" className="scroll-mt-28"><AiCopilotPanel summary={summary} trendComparison={trendComparison} basePath={basePath} /></section><section id="operational-feed" className="scroll-mt-28"><OperationalActivityFeed tasks={openTasks} topRisks={topRisks} vendors={vendorsRequiringReview} documents={documentsExpiringSoon} basePath={basePath} /></section></div>;
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
