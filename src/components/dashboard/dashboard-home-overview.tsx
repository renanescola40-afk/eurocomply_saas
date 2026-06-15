import { AuditPackageReview } from '@/components/dashboard/audit-package-review';
import { ComplianceTimeline } from '@/components/dashboard/compliance-timeline';
import { DashboardExperienceIndex } from '@/components/dashboard/dashboard-experience-index';
import { DashboardExperienceMap } from '@/components/dashboard/dashboard-experience-map';
import { ExecutiveDashboardHero } from '@/components/dashboard/executive-dashboard-hero';
import { ExecutiveReportingPackage } from '@/components/dashboard/executive-reporting-package';
import { NextBestActions } from '@/components/dashboard/next-best-actions';
import { ReadinessExportPreparation } from '@/components/dashboard/readiness-export-preparation';
import { ReadinessFollowUpPlan } from '@/components/dashboard/readiness-follow-up-plan';
import { WorkflowReadinessSummary } from '@/components/dashboard/workflow-readiness-summary';
import type { OrganizationWorkflowReadiness } from '@/server/queries/organization-dashboard';
import type { DashboardSummary, DashboardTrendComparison, DashboardTrendSnapshot } from '@/server/queries/dashboard';

type DashboardHomeOverviewProps = {
  summary: DashboardSummary;
  tasks: Array<{ id: string; title?: string | null; status?: string | null; priority?: string | null; due_date?: string | null }>;
  trendHistory?: DashboardTrendSnapshot[];
  trendComparison?: DashboardTrendComparison;
  workflowReadiness?: OrganizationWorkflowReadiness;
  basePath?: string;
  vendorsRequiringReview?: Array<{ id: string; name?: string | null; risk_level?: string | null; review_status?: string | null; next_review_at?: string | null }>;
  documentsExpiringSoon?: Array<{ id: string; title?: string | null; name?: string | null; status?: string | null; expires_at?: string | null; category?: string | null }>;
};

function getDashboardHref(basePath: string, target: 'reports') {
  return `${basePath}/${target}`;
}

export function DashboardHomeOverview({
  summary,
  tasks,
  trendComparison,
  workflowReadiness,
  basePath = '/dashboard/organizations',
  vendorsRequiringReview = [],
  documentsExpiringSoon = [],
}: DashboardHomeOverviewProps) {
  const openTasks = tasks.filter((task) => task.status !== 'done').slice(0, 5);

  return (
    <div className="space-y-6 scroll-smooth">
      <section id="overview" className="scroll-mt-28">
        <ExecutiveDashboardHero summary={summary} trendComparison={trendComparison} reportsHref={getDashboardHref(basePath, 'reports')} />
      </section>
      <section id="executive-reporting-package" className="scroll-mt-28">
        <ExecutiveReportingPackage summary={summary} workflowReadiness={workflowReadiness} basePath={basePath} />
      </section>
      <section id="readiness-export-preparation" className="scroll-mt-28">
        <ReadinessExportPreparation summary={summary} workflowReadiness={workflowReadiness} basePath={basePath} />
      </section>
      <section id="audit-package-review" className="scroll-mt-28">
        <AuditPackageReview summary={summary} workflowReadiness={workflowReadiness} basePath={basePath} />
      </section>
      <section id="experience-map" className="scroll-mt-28">
        <DashboardExperienceMap basePath={basePath} />
      </section>
      <section id="experience-index" className="scroll-mt-28">
        <DashboardExperienceIndex summary={summary} trendComparison={trendComparison} basePath={basePath} />
      </section>
      <section id="workflow-readiness" className="scroll-mt-28">
        <WorkflowReadinessSummary workflowReadiness={workflowReadiness} />
      </section>
      <section id="readiness-follow-up" className="scroll-mt-28">
        <ReadinessFollowUpPlan workflowReadiness={workflowReadiness} basePath={basePath} />
      </section>
      <section id="recommended-focus" className="scroll-mt-28">
        <NextBestActions summary={summary} basePath={basePath} workflowReadiness={workflowReadiness} />
      </section>
      <section id="calendar" className="scroll-mt-28">
        <ComplianceTimeline tasks={openTasks} vendors={vendorsRequiringReview} documents={documentsExpiringSoon} basePath={basePath} />
      </section>
    </div>
  );
}
