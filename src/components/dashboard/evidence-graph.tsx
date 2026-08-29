import Link from 'next/link';
import type { DashboardSummary } from '@/server/queries/dashboard';

type EvidenceGraphProps = {
  summary: DashboardSummary;
  basePath: string;
};

type GraphNode = {
  id: string;
  label: string;
  value: string | number;
  description: string;
  href: string;
  tone: 'emerald' | 'amber' | 'rose' | 'neutral';
};

function getToneClasses(tone: GraphNode['tone']) {
  const tones = {
    emerald: 'border-emerald-300/15 bg-emerald-300/[0.045] text-emerald-100/80',
    amber: 'border-amber-300/15 bg-amber-300/[0.045] text-amber-100/80',
    rose: 'border-rose-300/15 bg-rose-300/[0.045] text-rose-100/80',
    neutral: 'border-white/[0.075] bg-white/[0.02] text-white/62',
  };
  return tones[tone];
}

function getEvidenceHealth(summary: DashboardSummary) {
  if (summary.missingDocuments === 0) return 'Evidence complete';
  if (summary.missingDocuments <= 3) return 'Small evidence gap';
  return 'Evidence gap requires review';
}

export function EvidenceGraph({ summary, basePath }: EvidenceGraphProps) {
  const nodes: GraphNode[] = [
    {
      id: 'vendors',
      label: 'Vendors',
      value: summary.totals.vendors,
      description: `${summary.highRiskVendors} high-risk vendors in the current review posture`,
      href: `${basePath}/vendors`,
      tone: summary.highRiskVendors > 0 ? 'amber' : 'emerald',
    },
    {
      id: 'documents',
      label: 'Evidence',
      value: summary.totals.documents,
      description: `${summary.missingDocuments} missing documents · ${getEvidenceHealth(summary)}`,
      href: `${basePath}/documents`,
      tone: summary.missingDocuments > 3 ? 'rose' : summary.missingDocuments > 0 ? 'amber' : 'emerald',
    },
    {
      id: 'risks',
      label: 'Risks',
      value: summary.openRisks,
      description: `${summary.criticalRisks} critical risks in the current register`,
      href: `${basePath}/risks`,
      tone: summary.criticalRisks > 0 ? 'rose' : summary.openRisks > 0 ? 'amber' : 'emerald',
    },
    {
      id: 'tasks',
      label: 'Tasks',
      value: summary.openTasks,
      description: `${summary.openTasks} open actions carrying the remediation plan`,
      href: `${basePath}/tasks`,
      tone: summary.openTasks > 10 ? 'amber' : 'neutral',
    },
    {
      id: 'reports',
      label: 'Reporting',
      value: `${summary.complianceScore}%`,
      description: 'Current compliance score derived from the tracked workspace posture',
      href: `${basePath}/reports`,
      tone: summary.complianceScore >= 80 ? 'emerald' : summary.complianceScore >= 60 ? 'amber' : 'rose',
    },
  ];

  return (
    <section className="overflow-hidden rounded-xl border border-white/[0.075] bg-[#0d1522] text-white">
      <div className="flex flex-col gap-2 border-b border-white/[0.055] px-5 py-5 md:flex-row md:items-end md:justify-between md:px-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-200/55">Evidence flow</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">How governance evidence connects</h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-white/38">Current workspace counts linked into a review path from vendors and evidence through risk, remediation and reporting.</p>
      </div>

      <div className="overflow-x-auto px-4 py-5 md:px-5">
        <div className="flex min-w-[900px] items-stretch">
          {nodes.map((node, index) => (
            <div key={node.id} className="flex min-w-0 flex-1 items-center">
              <Link href={node.href} className={`group flex min-h-36 flex-1 flex-col justify-between rounded-lg border p-4 transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/40 ${getToneClasses(node.tone)}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-[0.14em] opacity-55">{node.label}</p>
                    <p className="mt-2 text-3xl font-semibold tracking-[-0.04em]">{node.value}</p>
                  </div>
                  <span className="rounded-md border border-current/15 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] opacity-55">{node.id === 'reports' ? 'Output' : 'Source'}</span>
                </div>
                <div>
                  <p className="text-xs leading-5 opacity-65">{node.description}</p>
                  <p className="mt-2 text-[10px] font-semibold text-blue-200/0 transition group-hover:text-blue-200/70">Open {node.label.toLowerCase()} →</p>
                </div>
              </Link>

              {index < nodes.length - 1 ? (
                <div className="flex w-10 shrink-0 items-center px-2 text-white/22"><span className="h-px flex-1 bg-white/[0.08]" /><span className="pl-1 text-sm">›</span></div>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div className="grid border-t border-white/[0.055] md:grid-cols-3 md:divide-x md:divide-white/[0.055]">
        <div className="px-5 py-4"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/28">Signal</p><p className="mt-2 text-sm leading-6 text-white/43">Vendor and evidence gaps feed the current risk posture.</p></div>
        <div className="border-t border-white/[0.055] px-5 py-4 md:border-t-0"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/28">Execution</p><p className="mt-2 text-sm leading-6 text-white/43">Open tasks carry remediation work tied to the live registers.</p></div>
        <div className="border-t border-white/[0.055] px-5 py-4 md:border-t-0"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/28">Output</p><p className="mt-2 text-sm leading-6 text-white/43">Reporting reflects the current tracked posture rather than placeholder metrics.</p></div>
      </div>
    </section>
  );
}
