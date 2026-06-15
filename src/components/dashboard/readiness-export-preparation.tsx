import type { OrganizationWorkflowReadiness } from '@/server/queries/organization-dashboard';
import type { DashboardSummary } from '@/server/queries/dashboard';

type ReadinessExportPreparationProps = {
  summary: DashboardSummary;
  workflowReadiness?: OrganizationWorkflowReadiness;
  basePath?: string;
};

function getExportPreparationState(workflowReadiness: OrganizationWorkflowReadiness | undefined) {
  if (!workflowReadiness) {
    return {
      label: 'Confirm signals',
      description: 'Review readiness signals before preparing an export package.',
    };
  }

  if (workflowReadiness.status === 'blocked') {
    return {
      label: 'Not ready to export',
      description: 'Resolve blocking readiness signals before preparing the export package.',
    };
  }

  if (workflowReadiness.status === 'attention') {
    return {
      label: 'Needs review before export',
      description: 'Use the executive package and follow-up plan to close open readiness signals.',
    };
  }

  return {
    label: 'Ready for export prep',
    description: 'Readiness signals support preparing board review materials from reports.',
  };
}

export function ReadinessExportPreparation({ summary, workflowReadiness, basePath = '/dashboard/organizations' }: ReadinessExportPreparationProps) {
  const state = getExportPreparationState(workflowReadiness);
  const signalCount = workflowReadiness?.reasons.length ?? 0;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-500">Readiness export preparation</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{state.label}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{state.description}</p>
        </div>
        <a href={`${basePath}/reports`} className="inline-flex w-fit justify-center rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-100">
          Prepare from reports
        </a>
      </div>

      <dl className="mt-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Compliance score</dt>
          <dd className="mt-2 text-2xl font-semibold text-slate-950">{summary.complianceScore}%</dd>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Export signals</dt>
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
