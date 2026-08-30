import Link from 'next/link';
import type { OrganizationWorkflowReadiness } from '@/server/queries/organization-dashboard';

type ReadinessFollowUpPlanProps = {
  workflowReadiness?: OrganizationWorkflowReadiness;
  basePath?: string;
};

function getFollowUpPlan(workflowReadiness: OrganizationWorkflowReadiness | undefined, basePath: string) {
  if (!workflowReadiness) return { title: 'Confirm readiness signals', description: 'Review organization data before planning the next readiness follow-up.', href: `${basePath}/reports`, priority: 'Monitor', tone: 'border-white/[0.075] bg-white/[0.025] text-white/52' };
  if (workflowReadiness.status === 'blocked') return { title: 'Resolve blocking signals', description: 'Review high-risk signals and unblock critical follow-up work before reporting.', href: `${basePath}/risks`, priority: 'Critical', tone: 'border-rose-300/15 bg-rose-300/[0.055] text-rose-100/80' };
  if (workflowReadiness.status === 'attention') return { title: 'Resolve readiness follow-ups', description: 'Review open tasks, vendor reviews and evidence signals before the next checkpoint.', href: `${basePath}/tasks`, priority: 'High', tone: 'border-amber-300/15 bg-amber-300/[0.055] text-amber-100/80' };
  return { title: 'Prepare review notes', description: 'Capture the current workflow state and prepare notes for the next reporting checkpoint.', href: `${basePath}/reports`, priority: 'Standard', tone: 'border-emerald-300/15 bg-emerald-300/[0.055] text-emerald-100/80' };
}

export function ReadinessFollowUpPlan({ workflowReadiness, basePath = '/dashboard/organizations' }: ReadinessFollowUpPlanProps) {
  const plan = getFollowUpPlan(workflowReadiness, basePath);
  const signals = workflowReadiness?.reasons ?? [];

  return (
    <section className="overflow-hidden rounded-xl border border-white/[0.075] bg-[#0d1522] text-white">
      <div className="grid md:grid-cols-[minmax(0,1fr)_220px]">
        <div className="px-5 py-5 md:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-200/65">Follow-up planning</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">{plan.title}</h2>
            </div>
            <span className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${plan.tone}`}>{plan.priority}</span>
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/42">{plan.description}</p>
          <div className="mt-5 border-t border-white/[0.055] pt-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/28">Review signals</p>
            <p className="mt-2 text-sm text-white/48">{signals.length > 0 ? `${signals.length} readiness signal${signals.length === 1 ? '' : 's'} require follow-up.` : 'No readiness signals require follow-up right now.'}</p>
          </div>
        </div>
        <div className="flex items-center border-t border-white/[0.055] px-5 py-5 md:border-l md:border-t-0">
          <Link href={plan.href} className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60">Open follow-up area</Link>
        </div>
      </div>
    </section>
  );
}
