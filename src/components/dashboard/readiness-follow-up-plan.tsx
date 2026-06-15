import type { OrganizationWorkflowReadiness } from '@/server/queries/organization-dashboard';

type ReadinessFollowUpPlanProps = {
  workflowReadiness?: OrganizationWorkflowReadiness;
  basePath?: string;
};

function getFollowUpPlan(workflowReadiness: OrganizationWorkflowReadiness | undefined, basePath: string) {
  if (!workflowReadiness) {
    return {
      title: 'Confirm readiness signals',
      description: 'Review organization data before planning the next readiness follow-up.',
      href: `${basePath}/reports`,
      priority: 'Monitor',
    };
  }

  if (workflowReadiness.status === 'blocked') {
    return {
      title: 'Stabilize blocked readiness',
      description: 'Review high-risk signals and unblock critical follow-up work before reporting.',
      href: `${basePath}/risks`,
      priority: 'Critical',
    };
  }

  if (workflowReadiness.status === 'attention') {
    return {
      title: 'Resolve readiness follow-ups',
      description: 'Review open tasks, vendor reviews, and evidence signals before the next checkpoint.',
      href: `${basePath}/tasks`,
      priority: 'High',
    };
  }

  return {
    title: 'Prepare readiness review notes',
    description: 'Capture the current healthy readiness state and prepare review notes for stakeholders.',
    href: `${basePath}/reports`,
    priority: 'Standard',
  };
}

export function ReadinessFollowUpPlan({ workflowReadiness, basePath = '/dashboard/organizations' }: ReadinessFollowUpPlanProps) {
  const plan = getFollowUpPlan(workflowReadiness, basePath);
  const signals = workflowReadiness?.reasons ?? [];

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 text-white shadow-xl md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-primary/80">Follow-up planning</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">{plan.title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{plan.description}</p>
        </div>
        <span className="w-fit rounded-full border border-white/10 bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-200">{plan.priority}</span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
        <div className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Review signals</p>
          <p className="mt-2 text-sm text-slate-300">
            {signals.length > 0 ? `${signals.length} readiness signal${signals.length === 1 ? '' : 's'} require follow-up.` : 'No readiness signals require follow-up right now.'}
          </p>
        </div>
        <a href={plan.href} className="inline-flex justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90">
          Open follow-up area
        </a>
      </div>
    </section>
  );
}
