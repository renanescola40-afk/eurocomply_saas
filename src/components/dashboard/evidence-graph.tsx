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
  tone: 'emerald' | 'amber' | 'rose' | 'sky' | 'slate';
};

function getToneClasses(tone: GraphNode['tone']) {
  const tones = {
    emerald: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
    amber: 'border-amber-300/30 bg-amber-300/10 text-amber-200',
    rose: 'border-rose-400/30 bg-rose-400/10 text-rose-200',
    sky: 'border-sky-300/30 bg-sky-300/10 text-sky-200',
    slate: 'border-white/10 bg-white/[0.04] text-slate-200',
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
      description: `${summary.highRiskVendors} high-risk vendors linked to review workflows`,
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
      description: `${summary.criticalRisks} critical risks require executive attention`,
      href: `${basePath}/risks`,
      tone: summary.criticalRisks > 0 ? 'rose' : summary.openRisks > 0 ? 'amber' : 'emerald',
    },
    {
      id: 'tasks',
      label: 'Tasks',
      value: summary.openTasks,
      description: `${summary.openTasks} open actions carrying the operating plan`,
      href: `${basePath}/tasks`,
      tone: summary.openTasks > 10 ? 'amber' : 'sky',
    },
    {
      id: 'reports',
      label: 'Board report',
      value: `${summary.complianceScore}%`,
      description: 'Executive narrative generated from evidence, risk and vendor posture',
      href: `${basePath}/reports`,
      tone: summary.complianceScore >= 80 ? 'emerald' : summary.complianceScore >= 60 ? 'amber' : 'rose',
    },
  ];

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 p-5 text-white shadow-2xl md:p-6">
      <div className="absolute left-1/3 top-0 h-72 w-72 rounded-full bg-sky-500/10 blur-3xl" />
      <div className="absolute bottom-0 right-10 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="relative flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">Evidence graph</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">How compliance evidence connects</h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-slate-400">
          A board-friendly map of how vendors, evidence, risks and execution roll up into executive reporting.
        </p>
      </div>

      <div className="relative mt-7 overflow-x-auto pb-2">
        <div className="flex min-w-[920px] items-stretch gap-3">
          {nodes.map((node, index) => (
            <div key={node.id} className="flex flex-1 items-center gap-3">
              <Link href={node.href} className="group block h-full flex-1 rounded-3xl border border-white/10 bg-white/[0.045] p-4 transition hover:-translate-y-1 hover:border-primary/50 hover:bg-white/[0.075]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{node.label}</p>
                    <p className="mt-3 text-3xl font-bold tracking-tight">{node.value}</p>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getToneClasses(node.tone)}`}>
                    {node.id === 'reports' ? 'Output' : 'Source'}
                  </span>
                </div>
                <p className="mt-4 min-h-12 text-sm leading-6 text-slate-400">{node.description}</p>
                <p className="mt-4 text-xs font-semibold text-primary/80 opacity-0 transition group-hover:opacity-100">Open {node.label.toLowerCase()} →</p>
              </Link>

              {index < nodes.length - 1 && (
                <div className="flex w-10 shrink-0 items-center justify-center text-slate-500">
                  <span className="h-px w-full bg-white/20" />
                  <span className="ml-[-2px] text-lg">›</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="relative mt-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Signal</p>
          <p className="mt-2 text-sm text-slate-300">Vendor and evidence gaps create risk exposure.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Execution</p>
          <p className="mt-2 text-sm text-slate-300">Tasks convert exposure into accountable remediation.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Output</p>
          <p className="mt-2 text-sm text-slate-300">Reports package the current posture for leadership and customer reviews.</p>
        </div>
      </div>
    </section>
  );
}
