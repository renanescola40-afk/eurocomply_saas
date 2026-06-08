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
  tone: 'emerald' | 'amber' | 'rose' | 'sky' | 'violet' | 'slate';
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
    emerald: 'border-emerald-300/30 bg-emerald-300/10 text-emerald-100',
    amber: 'border-amber-300/30 bg-amber-300/10 text-amber-100',
    rose: 'border-rose-300/30 bg-rose-300/10 text-rose-100',
    sky: 'border-sky-300/30 bg-sky-300/10 text-sky-100',
    violet: 'border-violet-300/30 bg-violet-300/10 text-violet-100',
    slate: 'border-white/10 bg-white/[0.045] text-slate-100',
  };

  return tones[tone];
}

function nodeSize(value: number) {
  if (value >= 20) return 'h-32 w-32';
  if (value >= 10) return 'h-28 w-28';
  return 'h-24 w-24';
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
      subtitle: 'Mapped proof',
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
      tone: summary.openTasks > 10 ? 'amber' : 'sky',
    },
    {
      id: 'reports',
      label: 'Reports',
      value: `${summary.complianceScore}%`,
      subtitle: 'Board signal',
      href: `${basePath}/reports`,
      tone: summary.complianceScore >= 80 ? 'emerald' : summary.complianceScore >= 60 ? 'amber' : 'rose',
    },
  ];

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 p-5 text-white shadow-2xl md:p-6">
      <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-sky-500/10 blur-3xl" />
      <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl" />

      <div className="relative flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-200/80">Relationship graph</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">How exposure travels through the operating system</h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-slate-400">
          Visualize how supplier risk, control evidence, remediation and executive reports connect as one compliance graph.
        </p>
      </div>

      <div className="relative mt-8 overflow-x-auto pb-3">
        <div className="flex min-w-[1080px] items-center gap-4">
          {nodes.map((node, index) => {
            const numericValue = typeof node.value === 'number' ? node.value : summary.complianceScore;
            return (
              <div key={node.id} className="flex flex-1 items-center gap-4">
                <Link href={node.href} className="group flex flex-col items-center text-center">
                  <div className={`flex ${nodeSize(numericValue)} items-center justify-center rounded-full border shadow-2xl transition group-hover:-translate-y-1 group-hover:border-primary/60 ${toneClasses(node.tone)}`}>
                    <div>
                      <p className="text-3xl font-bold tracking-tight">{node.value}</p>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] opacity-75">{node.label}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm font-semibold">{node.subtitle}</p>
                  <p className="mt-1 text-xs text-primary/80 opacity-0 transition group-hover:opacity-100">Open node →</p>
                </Link>

                {index < nodes.length - 1 && (
                  <div className="flex min-w-28 flex-col items-center gap-2 text-center">
                    <div className="flex w-full items-center gap-2">
                      <span className="h-px flex-1 bg-white/15" />
                      <span className="rounded-full border border-white/10 bg-white/[0.045] px-2 py-1 text-xs text-slate-400">→</span>
                      <span className="h-px flex-1 bg-white/15" />
                    </div>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">{connectors[index]}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="relative mt-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Traceability</p>
          <p className="mt-2 text-sm text-slate-300">Every executive report should be traceable back to vendors, evidence, risks and tasks.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Board value</p>
          <p className="mt-2 text-sm text-slate-300">Leadership sees not just numbers, but the chain of causes behind posture changes.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Product moat</p>
          <p className="mt-2 text-sm text-slate-300">This graph prepares the foundation for future interactive dependency mapping.</p>
        </div>
      </div>
    </section>
  );
}
