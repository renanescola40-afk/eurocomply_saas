import Link from 'next/link';
import type { DashboardSummary } from '@/server/queries/dashboard';

type ApprovalWorkflowPreviewProps = {
  summary: DashboardSummary;
  basePath: string;
};

type WorkflowStage = {
  label: string;
  count: number;
  description: string;
  href: string;
  tone: 'slate' | 'sky' | 'amber' | 'emerald';
};

function toneClasses(tone: WorkflowStage['tone']) {
  const tones = {
    slate: 'border-white/10 bg-white/[0.04] text-slate-200',
    sky: 'border-sky-300/30 bg-sky-300/10 text-sky-200',
    amber: 'border-amber-300/30 bg-amber-300/10 text-amber-200',
    emerald: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
  };

  return tones[tone];
}

export function ApprovalWorkflowPreview({ summary, basePath }: ApprovalWorkflowPreviewProps) {
  const draftCount = Math.max(0, summary.missingDocuments);
  const reviewCount = Math.max(0, summary.highRiskVendors + summary.criticalRisks);
  const approvedCount = Math.max(0, summary.totals.documents - summary.missingDocuments);
  const archivedCount = Math.max(0, Math.round(summary.totals.documents * 0.12));

  const stages: WorkflowStage[] = [
    {
      label: 'Draft',
      count: draftCount,
      description: 'Evidence or policy items that still need owner input before review.',
      href: `${basePath}/documents`,
      tone: 'slate',
    },
    {
      label: 'Review',
      count: reviewCount,
      description: 'High-priority vendors and critical risks waiting for compliance/legal review.',
      href: `${basePath}/risks`,
      tone: reviewCount > 0 ? 'amber' : 'sky',
    },
    {
      label: 'Approved',
      count: approvedCount,
      description: 'Evidence and controls ready for board, customer and audit workflows.',
      href: `${basePath}/reports`,
      tone: 'emerald',
    },
    {
      label: 'Archived',
      count: archivedCount,
      description: 'Historical artifacts kept for traceability and future evidence packages.',
      href: `${basePath}/documents`,
      tone: 'sky',
    },
  ];

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 p-5 text-white shadow-2xl md:p-6">
      <div className="absolute left-0 top-0 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl" />
      <div className="absolute bottom-0 right-10 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="relative flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-200/80">Enterprise workflow</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">Approval workflow preview</h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-slate-400">
          A governance layer for documents, evidence and remediation: Draft → Review → Approved → Archived.
        </p>
      </div>

      <div className="relative mt-7 grid gap-4 lg:grid-cols-4">
        {stages.map((stage, index) => (
          <div key={stage.label} className="relative">
            {index > 0 && <div className="absolute -left-4 top-1/2 hidden h-px w-4 bg-white/15 lg:block" />}
            <Link href={stage.href} className="group block h-full rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-5 transition hover:-translate-y-1 hover:border-primary/50 hover:bg-white/[0.075]">
              <div className="flex items-start justify-between gap-3">
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${toneClasses(stage.tone)}`}>{stage.label}</span>
                <span className="text-3xl font-bold tracking-tight">{stage.count}</span>
              </div>
              <p className="mt-5 text-sm leading-6 text-slate-400">{stage.description}</p>
              <p className="mt-5 text-xs font-semibold text-primary/80 opacity-0 transition group-hover:opacity-100">Open workflow →</p>
            </Link>
          </div>
        ))}
      </div>

      <div className="relative mt-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Ownership</p>
          <p className="mt-2 text-sm text-slate-300">Every stage can map to accountable Legal, Compliance, Security or Finance owners.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Auditability</p>
          <p className="mt-2 text-sm text-slate-300">Workflow movement becomes evidence for future customer and board reviews.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Enterprise path</p>
          <p className="mt-2 text-sm text-slate-300">This preview prepares the product for formal approvals, RBAC and departmental queues.</p>
        </div>
      </div>
    </section>
  );
}
