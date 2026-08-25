import { ComplianceTimeline } from '@/components/dashboard/compliance-timeline';
import { NextBestActions } from '@/components/dashboard/next-best-actions';
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

export function DashboardHomeOverview({
  summary,
  tasks,
  workflowReadiness,
  basePath = '/dashboard/organizations',
  vendorsRequiringReview = [],
  documentsExpiringSoon = [],
}: DashboardHomeOverviewProps) {
  const openTasks = tasks.filter((task) => task.status !== 'done').slice(0, 5);

  return (
    <div className="space-y-4 scroll-smooth md:space-y-5">
      <section id="recommended-focus" className="scroll-mt-28">
        <NextBestActions summary={summary} basePath={basePath} workflowReadiness={workflowReadiness} />
      </section>
      <section id="calendar" className="scroll-mt-28">
        <ComplianceTimeline
          tasks={openTasks}
          vendors={vendorsRequiringReview}
          documents={documentsExpiringSoon}
          basePath={basePath}
        />
      </section>
    </div>
  );
}
