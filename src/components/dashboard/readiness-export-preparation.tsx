import Link from 'next/link';
import type { OrganizationWorkflowReadiness } from '@/server/queries/organization-dashboard';
import type { DashboardSummary } from '@/server/queries/dashboard';

type ReadinessExportPreparationProps = {
  summary: DashboardSummary;
  workflowReadiness?: OrganizationWorkflowReadiness;
  basePath?: string;
};

function getExportPreparationState(workflowReadiness: OrganizationWorkflowReadiness | undefined) {
  if (!workflowReadiness) return { label: 'Confirm signals', description: 'Review readiness signals before preparing an export package.', tone: 'border-white/[0.075] bg-white/[0.025] text-white/52' };
  if (workflowReadiness.status === 'blocked') return { label: 'Blocked', description: 'Resolve blocking readiness signals before preparing the export package.', tone: 'border-rose-300/15 bg-rose-300/[0.055] text-rose-100/80' };
  if (workflowReadiness.status === 'attention') return { label: 'Review first', description: 'Use the reporting package and follow-up plan to close open readiness signals.', tone: 'border-amber-300/15 bg-amber-300/[0.055] text-amber-100/80' };
  return { label: 'Inputs healthy', description: 'Current readiness signals support preparing review materials from reports.', tone: 'border-emerald-300/15 bg-emerald-300/[0.055] text-emerald-100/80' };
}

export function ReadinessExportPreparation({ summary, workflowReadiness, basePath = '/dashboard/organizations' }: ReadinessExportPreparationProps) {
  const state = getExportPreparationState(workflowReadiness);
  const signalCount = workflowReadiness?.reasons.length ?? 0;
  const metrics = [['Compliance score', `${summary.complianceScore}%`], ['Export signals', String(signalCount)], ['Open tasks', String(summary.openTasks)]];

  return (
    <section className="overflow-hidden rounded-xl border border-white/[0.075] bg-[#101715] text-white">
      <div className="grid xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="px-5 py-5 md:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-100/55">Export preparation</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">{state.label}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/42">{state.description}</p>
            </div>
            <span className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${state.tone}`}>{state.label}</span>
          </div>
          <Link href={`${basePath}/reports`} className="mt-5 inline-flex h-10 items-center justify-center rounded-lg border border-white/[0.09] bg-white/[0.025] px-4 text-sm font-semibold text-white/70 transition hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200/40">Prepare from reports</Link>
        </div>
        <dl className="grid border-t border-white/[0.055] sm:grid-cols-3 xl:border-l xl:border-t-0 xl:grid-cols-1">
          {metrics.map(([label, value], index) => <div key={label} className={`px-5 py-4 ${index > 0 ? 'border-t border-white/[0.055] sm:border-l sm:border-t-0 xl:border-l-0 xl:border-t' : ''}`}><dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/28">{label}</dt><dd className="mt-1.5 text-2xl font-semibold tracking-[-0.03em]">{value}</dd></div>)}
        </dl>
      </div>
    </section>
  );
}
