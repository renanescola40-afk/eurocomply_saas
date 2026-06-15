import type { OrganizationWorkflowReadiness } from '@/server/queries/organization-dashboard';
import type { DashboardSummary } from '@/server/queries/dashboard';

type AuditPackageReviewProps = {
  summary: DashboardSummary;
  workflowReadiness?: OrganizationWorkflowReadiness;
  basePath?: string;
};

function getAuditReviewState(workflowReadiness: OrganizationWorkflowReadiness | undefined) {
  if (!workflowReadiness) {
    return {
      label: 'Review readiness inputs',
      description: 'Confirm readiness signals before starting audit package review.',
    };
  }

  if (workflowReadiness.status === 'blocked') {
    return {
      label: 'Audit review blocked',
      description: 'Resolve blocking readiness signals before reviewing the audit package.',
    };
  }

  if (workflowReadiness.status === 'attention') {
    return {
      label: 'Audit review needs attention',
      description: 'Review open readiness signals before confirming the audit package.',
    };
  }

  return {
    label: 'Audit review ready',
    description: 'Readiness signals support a read-only audit package review from reports.',
  };
}

export function AuditPackageReview({ summary, workflowReadiness, basePath = '/dashboard/organizations' }: AuditPackageReviewProps) {
  const state = getAuditReviewState(workflowReadiness);
  const signalCount = workflowReadiness?.reasons.length ?? 0;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-500">Audit package review</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{state.label}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{state.description}</p>
        </div>
        <a href={`${basePath}/reports`} className="inline-flex w-fit justify-center rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-100">
          Review reports
        </a>
      </div>

      <dl className="mt-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Compliance score</dt>
          <dd className="mt-2 text-2xl font-semibold text-slate-950">{summary.complianceScore}%</dd>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Review signals</dt>
          <dd className="mt-2 text-2xl font-semibold text-slate-950">{signalCount}</dd>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Open tasks</dt>
          <dd className="mt-2 text-2xl font-semibold text-slate-950">{summary.openTasks}</dd>
        </div>
      </dl>
    </section>
  );
}
