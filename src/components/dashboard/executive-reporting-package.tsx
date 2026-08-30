import Link from 'next/link';
import type { OrganizationWorkflowReadiness } from '@/server/queries/organization-dashboard';
import type { DashboardSummary } from '@/server/queries/dashboard';

type ExecutiveReportingPackageProps = {
  summary: DashboardSummary;
  workflowReadiness?: OrganizationWorkflowReadiness;
  basePath?: string;
};

function getPackageState(workflowReadiness: OrganizationWorkflowReadiness | undefined) {
  if (!workflowReadiness) return { label: 'Needs review', description: 'Confirm readiness signals before preparing the executive reporting package.', tone: 'border-white/[0.075] bg-white/[0.025] text-white/52' };
  if (workflowReadiness.status === 'blocked') return { label: 'Blocked', description: 'Resolve blocking readiness signals before sharing the executive package.', tone: 'border-rose-300/15 bg-rose-300/[0.055] text-rose-100/80' };
  if (workflowReadiness.status === 'attention') return { label: 'Needs follow-up', description: 'Review open readiness signals and follow-up actions before executive review.', tone: 'border-amber-300/15 bg-amber-300/[0.055] text-amber-100/80' };
  return { label: 'Healthy inputs', description: 'Current workflow signals support preparing executive review notes.', tone: 'border-emerald-300/15 bg-emerald-300/[0.055] text-emerald-100/80' };
}

export function ExecutiveReportingPackage({ summary, workflowReadiness, basePath = '/dashboard/organizations' }: ExecutiveReportingPackageProps) {
  const packageState = getPackageState(workflowReadiness);
  const signalCount = workflowReadiness?.reasons.length ?? 0;
  const metrics = [
    ['Compliance score', `${summary.complianceScore}%`],
    ['Readiness signals', String(signalCount)],
    ['Open tasks', String(summary.openTasks)],
  ];

  return (
    <section className="overflow-hidden rounded-xl border border-white/[0.075] bg-[#0d1522] text-white">
      <div className="grid xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="px-5 py-5 md:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-200/65">Executive reporting package</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">{packageState.label}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/42">{packageState.description}</p>
            </div>
            <span className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${packageState.tone}`}>{packageState.label}</span>
          </div>
          <Link href={`${basePath}/reports`} className="mt-5 inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60">Open reports</Link>
        </div>

        <dl className="grid border-t border-white/[0.055] sm:grid-cols-3 xl:border-l xl:border-t-0 xl:grid-cols-1">
          {metrics.map(([label, value], index) => (
            <div key={label} className={`px-5 py-4 ${index > 0 ? 'border-t border-white/[0.055] sm:border-l sm:border-t-0 xl:border-l-0 xl:border-t' : ''}`}>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/28">{label}</dt>
              <dd className="mt-1.5 text-2xl font-semibold tracking-[-0.03em]">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
