import Link from 'next/link';
import type { DashboardSummary } from '@/server/queries/dashboard';

type RelationshipGraphProps = {
  summary: DashboardSummary;
  basePath: string;
};

type RelationshipNode = {
  id: string;
  label: string;
  value: string | number;
  subtitle: string;
  href: string;
  tone: 'emerald' | 'amber' | 'rose' | 'neutral';
};

const connectors = [
  'Supplier data flows',
  'Control evidence',
  'Exposure register',
  'Remediation work',
  'Executive output',
];

function toneClasses(tone: RelationshipNode['tone']) {
  const tones = {
    emerald: 'border-emerald-300/15 bg-emerald-300/[0.045] text-emerald-100/80',
    amber: 'border-amber-300/15 bg-amber-300/[0.045] text-amber-100/80',
    rose: 'border-rose-300/15 bg-rose-300/[0.045] text-rose-100/80',
    neutral: 'border-white/[0.075] bg-white/[0.02] text-white/64',
  };
  return tones[tone];
}

export function RelationshipGraph({ summary, basePath }: RelationshipGraphProps) {
  const controlledDocuments = Math.max(0, summary.totals.documents - summary.missingDocuments);
  const nodes: RelationshipNode[] = [
    {
      id: 'vendors',
      label: 'Vendors',
      value: summary.totals.vendors,
      subtitle: `${summary.highRiskVendors} high risk`,
      href: `${basePath}/vendors`,
      tone: summary.highRiskVendors > 0 ? 'amber' : 'emerald',
    },
    {
      id: 'controls',
      label: 'Controls',
      value: controlledDocuments,
      subtitle: 'Tracked proof',
      href: `${basePath}/documents`,
      tone: summary.missingDocuments > 3 ? 'amber' : 'emerald',
    },
    {
      id: 'evidence',
      label: 'Evidence',
      value: summary.totals.documents,
      subtitle: `${summary.missingDocuments} missing`,
      href: `${basePath}/documents`,
      tone: summary.missingDocuments > 3 ? 'rose' : summary.missingDocuments > 0 ? 'amber' : 'emerald',
    },
    {
      id: 'risks',
      label: 'Risks',
      value: summary.openRisks,
      subtitle: `${summary.criticalRisks} critical`,
      href: `${basePath}/risks`,
      tone: summary.criticalRisks > 0 ? 'rose' : summary.openRisks > 0 ? 'amber' : 'emerald',
    },
    {
      id: 'tasks',
      label: 'Tasks',
      value: summary.openTasks,
      subtitle: 'Remediation',
      href: `${basePath}/tasks`,
      tone: summary.openTasks > 10 ? 'amber' : 'neutral',
    },
    {
      id: 'reports',
      label: 'Reports',
      value: `${summary.complianceScore}%`,
      subtitle: 'Current score',
      href: `${basePath}/reports`,
      tone: summary.complianceScore >= 80 ? 'emerald' : summary.complianceScore >= 60 ? 'amber' : 'rose',
    },
  ];

  return (
    <section className="overflow-hidden rounded-xl border border-white/[0.075] bg-[#0d1522] text-white">
      <div className="flex flex-col gap-2 border-b border-white/[0.055] px-5 py-5 md:flex-row md:items-end md:justify-between md:px-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-200/55">Traceability chain</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">From suppliers to executive output</h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-white/38">Follow the live workspace path from vendor exposure through evidence, risk and remediation.</p>
      </div>

      <div className="overflow-x-auto px-4 py-5 md:px-5">
        <div className="flex min-w-[1040px] items-stretch">
          {nodes.map((node, index) => (
            <div key={node.id} className="flex min-w-0 flex-1 items-center">
              <Link href={node.href} className={`group flex min-h-32 min-w-36 flex-1 flex-col justify-between rounded-lg border p-4 transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/40 ${toneClasses(node.tone)}`}>
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.14em] opacity-55">{node.label}</p>
                  <p className="mt-2 text-3xl font-semibold tracking-[-0.04em]">{node.value}</p>
                </div>
                <div>
                  <p className="text-xs opacity-65">{node.subtitle}</p>
                  <p className="mt-2 text-[10px] font-semibold text-blue-200/0 transition group-hover:text-blue-200/70">Open →</p>
                </div>
              </Link>

              {index < nodes.length - 1 ? (
                <div className="flex w-20 shrink-0 flex-col items-center justify-center gap-2 px-2 text-center">
                  <div className="flex w-full items-center"><span className="h-px flex-1 bg-white/[0.09]" /><span className="px-1 text-xs text-white/28">→</span><span className="h-px flex-1 bg-white/[0.09]" /></div>
                  <p className="text-[8px] uppercase tracking-[0.11em] text-white/24">{connectors[index]}</p>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div className="grid border-t border-white/[0.055] md:grid-cols-2 md:divide-x md:divide-white/[0.055]">
        <div className="px-5 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/28">Traceability</p>
          <p className="mt-2 text-sm leading-6 text-white/45">Executive output can be traced back to the current vendor, evidence, risk and task registers shown above.</p>
        </div>
        <div className="border-t border-white/[0.055] px-5 py-4 md:border-t-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/28">Current state</p>
          <p className="mt-2 text-sm leading-6 text-white/45">The chain uses existing workspace counts and status signals; it does not add synthetic dependency data.</p>
        </div>
      </div>
    </section>
  );
}
