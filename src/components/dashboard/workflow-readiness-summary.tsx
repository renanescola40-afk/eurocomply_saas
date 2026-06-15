import type { OrganizationWorkflowReadiness } from '@/server/queries/organization-dashboard';

type WorkflowReadinessSummaryProps = {
  workflowReadiness?: OrganizationWorkflowReadiness;
};

function getReadinessCopy(workflowReadiness: OrganizationWorkflowReadiness | undefined) {
  if (!workflowReadiness) {
    return {
      label: 'Readiness unknown',
      description: 'Workflow readiness is not available for this organization yet.',
      tone: 'border-slate-500/20 bg-slate-500/10 text-slate-200',
    };
  }

  if (workflowReadiness.status === 'blocked') {
    return {
      label: 'Readiness blocked',
      description: 'Critical workflow signals need attention before the organization is ready for review.',
      tone: 'border-rose-500/30 bg-rose-500/10 text-rose-200',
    };
  }

  if (workflowReadiness.status === 'attention') {
    return {
      label: 'Readiness needs attention',
      description: 'Some workflow signals should be reviewed before the next reporting checkpoint.',
      tone: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
    };
  }

  return {
    label: 'Readiness healthy',
    description: 'Workflow readiness is currently healthy for read-only reporting.',
    tone: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  };
}

export function WorkflowReadinessSummary({ workflowReadiness }: WorkflowReadinessSummaryProps) {
  const copy = getReadinessCopy(workflowReadiness);
  const reasons = workflowReadiness?.reasons ?? [];

  return (
    <section className="rounded-3xl border border-white/10 bg-slate-950 p-5 text-white shadow-xl md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-primary/80">Workflow readiness</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">Read-only reporting snapshot</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{copy.description}</p>
        </div>
        <span className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${copy.tone}`}>{copy.label}</span>
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Signals</p>
        {reasons.length > 0 ? (
          <ul className="mt-3 grid gap-2 text-sm text-slate-300 md:grid-cols-2">
            {reasons.map((reason) => (
              <li key={reason} className="rounded-2xl border border-white/10 bg-slate-900 px-3 py-2">
                {reason}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-slate-400">No readiness signals are available yet.</p>
        )}
      </div>
    </section>
  );
}
