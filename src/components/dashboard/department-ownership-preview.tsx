import Link from 'next/link';
import type { DashboardSummary } from '@/server/queries/dashboard';

type DepartmentOwnershipPreviewProps = {
  summary: DashboardSummary;
  basePath: string;
};

type WorkstreamOwnerHint = {
  workstream: string;
  signal: string;
  count: number;
  href: string;
  tone: 'emerald' | 'amber' | 'rose' | 'neutral';
};

function toneClasses(tone: WorkstreamOwnerHint['tone']) {
  const tones = {
    emerald: 'border-emerald-300/15 bg-emerald-300/[0.055] text-emerald-100/80',
    amber: 'border-amber-300/15 bg-amber-300/[0.055] text-amber-100/80',
    rose: 'border-rose-300/15 bg-rose-300/[0.055] text-rose-100/80',
    neutral: 'border-white/[0.075] bg-white/[0.025] text-white/52',
  };
  return tones[tone];
}

export function DepartmentOwnershipPreview({ summary, basePath }: DepartmentOwnershipPreviewProps) {
  const workstreams: WorkstreamOwnerHint[] = [
    {
      workstream: 'Risk treatment',
      signal: 'Assign to an accountable workspace owner based on your organization model.',
      count: summary.openRisks,
      href: `${basePath}/risks`,
      tone: summary.criticalRisks > 0 ? 'rose' : summary.openRisks > 0 ? 'amber' : 'emerald',
    },
    {
      workstream: 'Vendor review',
      signal: 'Route vendor review to the team responsible for procurement, privacy or supplier governance.',
      count: summary.highRiskVendors,
      href: `${basePath}/vendors`,
      tone: summary.highRiskVendors > 0 ? 'amber' : 'emerald',
    },
    {
      workstream: 'Evidence maintenance',
      signal: 'Assign evidence gaps to the role that owns the underlying policy, control or record.',
      count: summary.missingDocuments,
      href: `${basePath}/documents`,
      tone: summary.missingDocuments > 3 ? 'rose' : summary.missingDocuments > 0 ? 'amber' : 'emerald',
    },
    {
      workstream: 'Remediation execution',
      signal: 'Use task ownership and due dates rather than assuming a department from summary data.',
      count: summary.openTasks,
      href: `${basePath}/tasks`,
      tone: summary.openTasks > 10 ? 'amber' : 'neutral',
    },
  ];

  return (
    <section className="overflow-hidden rounded-xl border border-white/[0.075] bg-[#101715] text-white">
      <div className="flex flex-col gap-2 border-b border-white/[0.055] px-5 py-5 md:flex-row md:items-end md:justify-between md:px-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-100/55">Ownership routing</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">Assign work without inventing departments</h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-white/38">RISCK COMPLY shows live workstream counts here. Actual owners and departments must come from workspace membership or task data, not assumptions.</p>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-4">
        {workstreams.map((workstream, index) => (
          <Link key={workstream.workstream} href={workstream.href} className={`group min-h-48 px-5 py-5 transition hover:bg-white/[0.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-300/35 ${index > 0 ? 'border-t border-white/[0.055] md:border-l md:border-t-0' : ''} ${index === 2 ? 'md:border-t md:border-white/[0.055] xl:border-t-0' : ''}`}>
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-sm font-semibold text-white/78">{workstream.workstream}</h3>
              <span className={`rounded-md border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] ${toneClasses(workstream.tone)}`}>Current</span>
            </div>
            <p className="mt-4 text-3xl font-semibold tracking-[-0.04em]">{workstream.count}</p>
            <p className="mt-3 text-xs leading-5 text-white/38">{workstream.signal}</p>
            <p className="mt-4 text-[10px] font-semibold text-emerald-100/0 transition group-hover:text-emerald-100/65">Open workstream →</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
