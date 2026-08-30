import type { OrganizationWorkflowReadiness } from '@/server/queries/organization-dashboard';

type WorkflowReadinessSummaryProps = {
  workflowReadiness?: OrganizationWorkflowReadiness;
};

function getReadinessCopy(workflowReadiness: OrganizationWorkflowReadiness | undefined) {
  if (!workflowReadiness) return { label: 'Unknown', description: 'Workflow readiness is not available for this organization yet.', tone: 'border-white/[0.075] bg-white/[0.025] text-white/52' };
  if (workflowReadiness.status === 'blocked') return { label: 'Blocked', description: 'Critical workflow signals need attention before the next reporting checkpoint.', tone: 'border-rose-300/15 bg-rose-300/[0.055] text-rose-100/80' };
  if (workflowReadiness.status === 'attention') return { label: 'Attention', description: 'Some workflow signals should be reviewed before the next reporting checkpoint.', tone: 'border-amber-300/15 bg-amber-300/[0.055] text-amber-100/80' };
  return { label: 'Healthy', description: 'Current workflow signals are healthy for the read-only reporting flow.', tone: 'border-emerald-300/15 bg-emerald-300/[0.055] text-emerald-100/80' };
}

export function WorkflowReadinessSummary({ workflowReadiness }: WorkflowReadinessSummaryProps) {
  const copy = getReadinessCopy(workflowReadiness);
  const reasons = workflowReadiness?.reasons ?? [];

  return (
    <section className="overflow-hidden rounded-xl border border-white/[0.075] bg-[#0d1522] text-white">
      <div className="flex flex-col gap-3 border-b border-white/[0.055] px-5 py-5 md:flex-row md:items-start md:justify-between md:px-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-200/65">Workflow readiness</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">Read-only reporting snapshot</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/42">{copy.description}</p>
        </div>
        <span className={`w-fit rounded-md border px-2.5 py-1 text-xs font-semibold ${copy.tone}`}>{copy.label}</span>
      </div>

      <div className="grid md:grid-cols-[180px_minmax(0,1fr)]">
        <div className="border-b border-white/[0.055] px-5 py-4 md:border-b-0 md:border-r">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/28">Signals</p>
          <p className="mt-2 text-3xl font-semibold tracking-[-0.04em]">{reasons.length}</p>
        </div>
        <div className="px-5 py-4">
          {reasons.length > 0 ? (
            <ul className="divide-y divide-white/[0.055] border-y border-white/[0.055]">
              {reasons.map((reason) => <li key={reason} className="py-3 text-sm leading-6 text-white/46">{reason}</li>)}
            </ul>
          ) : (
            <p className="text-sm leading-6 text-white/38">No readiness signals are available for follow-up.</p>
          )}
        </div>
      </div>
    </section>
  );
}
