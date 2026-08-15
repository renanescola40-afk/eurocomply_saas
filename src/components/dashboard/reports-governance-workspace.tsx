import { AuditPackageReview } from '@/components/dashboard/audit-package-review';
import { EvidenceHandoffReview } from '@/components/dashboard/evidence-handoff-review';
import { ExecutiveDashboardHero } from '@/components/dashboard/executive-dashboard-hero';
import { ExecutiveReportingPackage } from '@/components/dashboard/executive-reporting-package';
import { ReadinessExportPreparation } from '@/components/dashboard/readiness-export-preparation';
import { ReadinessFollowUpPlan } from '@/components/dashboard/readiness-follow-up-plan';
import { ReportsGovernancePage } from '@/components/dashboard/dashboard-overview';
import { WorkflowReadinessSummary } from '@/components/dashboard/workflow-readiness-summary';
import type {
  OrganizationWorkflowReadiness,
} from '@/server/queries/organization-dashboard';
import type {
  DashboardSummary,
  DashboardTrendComparison,
  DashboardTrendSnapshot,
} from '@/server/queries/dashboard';

type ReportsGovernanceWorkspaceProps = {
  summary: DashboardSummary;
  tasks: Array<{ id: string; title?: string | null; status?: string | null; priority?: string | null; due_date?: string | null }>;
  trendHistory?: DashboardTrendSnapshot[];
  trendComparison?: DashboardTrendComparison;
  workflowReadiness?: OrganizationWorkflowReadiness;
  basePath: string;
  topRisks?: Array<{ id: string; title?: string | null; status?: string | null; risk_score?: number | string | null; category?: string | null }>;
  vendorsRequiringReview?: Array<{ id: string; name?: string | null; risk_level?: string | null; review_status?: string | null; next_review_at?: string | null }>;
  documentsExpiringSoon?: Array<{ id: string; title?: string | null; name?: string | null; status?: string | null; expires_at?: string | null; category?: string | null }>;
};

/**
 * Dedicated reporting and governance workspace.
 *
 * These surfaces used to be stacked into the organization Overview. Keeping
 * them here preserves the reporting workflow while the main dashboard remains
 * an operational command center rather than a one-page application.
 */
export function ReportsGovernanceWorkspace({
  summary,
  tasks,
  trendHistory,
  trendComparison,
  workflowReadiness,
  basePath,
  topRisks = [],
  vendorsRequiringReview = [],
  documentsExpiringSoon = [],
}: ReportsGovernanceWorkspaceProps) {
  const reportsHref = `${basePath}/reports-governance`;

  return (
    <div className="space-y-6 scroll-smooth">
      <section id="executive-summary" className="scroll-mt-28">
        <ExecutiveDashboardHero
          summary={summary}
          trendComparison={trendComparison}
          reportsHref={reportsHref}
        />
      </section>

      <section id="workflow-readiness" className="scroll-mt-28">
        <WorkflowReadinessSummary workflowReadiness={workflowReadiness} />
      </section>

      <section id="readiness-follow-up" className="scroll-mt-28">
        <ReadinessFollowUpPlan workflowReadiness={workflowReadiness} basePath={basePath} />
      </section>

      <section id="executive-reporting-package" className="scroll-mt-28">
        <ExecutiveReportingPackage
          summary={summary}
          workflowReadiness={workflowReadiness}
          basePath={basePath}
        />
      </section>

      <section id="readiness-export-preparation" className="scroll-mt-28">
        <ReadinessExportPreparation
          summary={summary}
          workflowReadiness={workflowReadiness}
          basePath={basePath}
        />
      </section>

      <section id="audit-package-review" className="scroll-mt-28">
        <AuditPackageReview
          summary={summary}
          workflowReadiness={workflowReadiness}
          basePath={basePath}
        />
      </section>

      <section id="evidence-handoff-review" className="scroll-mt-28">
        <EvidenceHandoffReview
          summary={summary}
          workflowReadiness={workflowReadiness}
          basePath={basePath}
        />
      </section>

      <section id="governance-analysis" className="scroll-mt-28">
        <ReportsGovernancePage
          summary={summary}
          tasks={tasks}
          trendHistory={trendHistory}
          trendComparison={trendComparison}
          basePath={basePath}
          topRisks={topRisks}
          vendorsRequiringReview={vendorsRequiringReview}
          documentsExpiringSoon={documentsExpiringSoon}
        />
      </section>
    </div>
  );
}
