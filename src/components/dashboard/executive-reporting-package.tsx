import type { OrganizationWorkflowReadiness } from '@/server/queries/organization-dashboard';
import type { DashboardSummary } from '@/server/queries/dashboard';

type ExecutiveReportingPackageProps = {
  summary: DashboardSummary;
  workflowReadiness?: OrganizationWorkflowReadiness;
  basePath?: string;
};

function getPackageState(workflowReadiness: OrganizationWorkflowReadiness | undefined) {
  if (!workflowReadiness) {
    return {
      label: 'Needs review',
      description: 'Confirm readiness signals before preparing the executive reporting package.',
    };
  }

  if (workflowReadiness.status === 'blocked') {
    return {
      label: 'Blocked',
      description: 'Resolve blocking readiness signals before sharing the executive package.',
    };
  }

  if (workflowReadiness.status === 'attention') {
    return {
      label: 'Needs follow-up',
      description: 'Review open readiness signals and follow-up actions before executive review.',
    };
  }

  return {
    label: 'Ready',
    description: 'Readiness is healthy enough to prepare executive review notes.',
  };
}

export function ExecutiveReportingPackage({ summary, workflowReadiness, basePath = '/dashboard/organizations' }: ExecutiveReportingPackageProps) {
  const packageState = getPackageState(workflowReadiness);
  const signalCount = workflowReadiness?.reasons.length ?? 0;

  return (
    <section className="rounded-3xl border border-white/10 bg-slate-950 p-5 text-white shadow-xl md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-primary/80">Executive reporting package</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">{packageState.label}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{packageState.description}</p>
        </div>
        <a href={`${basePath}/reports`} className="inline-flex w-fit justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90">
          Open reports
        </a>
      </div>

      <dl className="mt-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Compliance score</dt>
          <dd className="mt-2 text-2xl font-semibold">{summary.complianceScore}%</dd>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Readiness signals</dt>
          <dd className="mt-2 text-2xl font-semibold">{signalCount}</dd>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Open tasks</dt>
          <dd className="mt-2 text-2xl font-semibold">{summary.openTasks}</dd>
        </div>
      </dl>
    </section>
  );
}
