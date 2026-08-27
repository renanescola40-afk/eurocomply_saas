import Link from 'next/link';
import type { DashboardSummary } from '@/server/queries/dashboard';

type ScenarioSimulatorProps = {
  summary: DashboardSummary;
  basePath: string;
};

type RemediationLane = {
  title: string;
  count: number;
  description: string;
  actions: string[];
  href: string;
  priority: 'critical' | 'high' | 'normal';
};

function priorityTone(priority: RemediationLane['priority']) {
  if (priority === 'critical') return 'border-rose-300/15 bg-rose-300/[0.055] text-rose-100/80';
  if (priority === 'high') return 'border-amber-300/15 bg-amber-300/[0.055] text-amber-100/80';
  return 'border-white/[0.075] bg-white/[0.025] text-white/52';
}

function buildLanes(summary: DashboardSummary, basePath: string): RemediationLane[] {
  return [
    {
      title: 'Critical risk treatment',
      count: summary.criticalRisks,
      description: 'Resolve the highest-severity entries in the current risk register and attach treatment evidence.',
      actions: ['Review critical risk owners', 'Record remediation evidence', 'Update risk status after treatment'],
      href: `${basePath}/risks`,
      priority: summary.criticalRisks > 0 ? 'critical' : 'normal',
    },
    {
      title: 'High-risk vendor review',
      count: summary.highRiskVendors,
      description: 'Refresh due diligence for vendors currently flagged as high risk in the workspace.',
      actions: ['Review vendor records', 'Refresh processing evidence', 'Confirm review status and next review date'],
      href: `${basePath}/vendors`,
      priority: summary.highRiskVendors > 0 ? 'high' : 'normal',
    },
    {
      title: 'Evidence completion',
      count: summary.missingDocuments,
      description: 'Close open evidence gaps before relying on the current register for external review.',
      actions: ['Identify missing evidence', 'Upload or replace documents', 'Verify document status and ownership'],
      href: `${basePath}/documents`,
      priority: summary.missingDocuments > 3 ? 'critical' : summary.missingDocuments > 0 ? 'high' : 'normal',
    },
    {
      title: 'Execution backlog',
      count: summary.openTasks,
      description: 'Work through the open compliance tasks that carry the current remediation plan.',
      actions: ['Confirm task owners', 'Review due dates and priority', 'Close completed actions with evidence'],
      href: `${basePath}/tasks`,
      priority: summary.openTasks > 10 ? 'high' : 'normal',
    },
  ];
}

function priorityRank(priority: RemediationLane['priority']) {
  if (priority === 'critical') return 3;
  if (priority === 'high') return 2;
  return 1;
}

export function ScenarioSimulator({ summary, basePath }: ScenarioSimulatorProps) {
  const lanes = buildLanes(summary, basePath);
  const orderedLanes = [...lanes].sort((a, b) => priorityRank(b.priority) - priorityRank(a.priority) || b.count - a.count);
  const firstPriority = orderedLanes.find((lane) => lane.count > 0) ?? orderedLanes[0];
  const openSignals = lanes.reduce((total, lane) => total + lane.count, 0);

  return (
    <section className="overflow-hidden rounded-xl border border-white/[0.075] bg-[#101715] text-white">
      <div className="grid xl:grid-cols-[300px_minmax(0,1fr)]">
        <div className="border-b border-white/[0.055] px-5 py-5 xl:border-b-0 xl:border-r">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-100/55">Remediation planner</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">Prioritize the work that is actually open</h2>
          <p className="mt-3 text-sm leading-6 text-white/42">
            This view ranks current workspace gaps. It does not predict future compliance scores or invent projected uplift.
          </p>

          <dl className="mt-6 divide-y divide-white/[0.055] border-y border-white/[0.055]">
            <div className="py-3.5">
              <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/28">Current score</dt>
              <dd className="mt-1.5 text-3xl font-semibold tracking-[-0.04em]">{summary.complianceScore}%</dd>
            </div>
            <div className="py-3.5">
              <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/28">Open remediation signals</dt>
              <dd className="mt-1.5 text-2xl font-semibold tracking-[-0.03em]">{openSignals}</dd>
            </div>
            <div className="py-3.5">
              <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/28">First priority</dt>
              <dd className="mt-1.5 text-sm font-semibold leading-5 text-white/72">{firstPriority.title}</dd>
            </div>
          </dl>
        </div>

        <div className="divide-y divide-white/[0.055]">
          {orderedLanes.map((lane) => (
            <Link key={lane.title} href={lane.href} className="group block px-5 py-4 transition hover:bg-white/[0.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-300/35 md:px-6">
              <div className="grid gap-4 lg:grid-cols-[220px_90px_minmax(0,1fr)_auto] lg:items-start">
                <div>
                  <span className={`rounded-md border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] ${priorityTone(lane.priority)}`}>{lane.priority}</span>
                  <h3 className="mt-2 text-sm font-semibold text-white/82">{lane.title}</h3>
                </div>
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.13em] text-white/28">Open</p>
                  <p className="mt-1 text-2xl font-semibold tracking-[-0.03em]">{lane.count}</p>
                </div>
                <div>
                  <p className="text-sm leading-6 text-white/42">{lane.description}</p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                    {lane.actions.map((action) => <span key={action} className="text-[10px] text-white/30">• {action}</span>)}
                  </div>
                </div>
                <span className="text-xs font-semibold text-emerald-100/55 transition group-hover:text-emerald-100">Open →</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
