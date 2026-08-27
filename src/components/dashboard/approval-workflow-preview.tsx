import Link from 'next/link';
import type { DashboardSummary } from '@/server/queries/dashboard';

type ApprovalWorkflowPreviewProps = {
  summary: DashboardSummary;
  basePath: string;
};

type ReviewInput = {
  label: string;
  count: number;
  description: string;
  href: string;
  tone: 'emerald' | 'amber' | 'rose' | 'neutral';
};

function toneClasses(tone: ReviewInput['tone']) {
  const tones = {
    emerald: 'border-emerald-300/15 bg-emerald-300/[0.055] text-emerald-100/80',
    amber: 'border-amber-300/15 bg-amber-300/[0.055] text-amber-100/80',
    rose: 'border-rose-300/15 bg-rose-300/[0.055] text-rose-100/80',
    neutral: 'border-white/[0.075] bg-white/[0.025] text-white/52',
  };
  return tones[tone];
}

export function ApprovalWorkflowPreview({ summary, basePath }: ApprovalWorkflowPreviewProps) {
  const reviewInputs: ReviewInput[] = [
    {
      label: 'Evidence gaps',
      count: summary.missingDocuments,
      description: 'Missing document or evidence records that should be reviewed before sign-off.',
      href: `${basePath}/documents`,
      tone: summary.missingDocuments > 3 ? 'rose' : summary.missingDocuments > 0 ? 'amber' : 'emerald',
    },
    {
      label: 'Critical risks',
      count: summary.criticalRisks,
      description: 'Critical entries in the current risk register that require explicit treatment.',
      href: `${basePath}/risks`,
      tone: summary.criticalRisks > 0 ? 'rose' : 'emerald',
    },
    {
      label: 'Vendor reviews',
      count: summary.highRiskVendors,
      description: 'High-risk vendor records that should be reviewed by the appropriate workspace owner.',
      href: `${basePath}/vendors`,
      tone: summary.highRiskVendors > 0 ? 'amber' : 'emerald',
    },
    {
      label: 'Open actions',
      count: summary.openTasks,
      description: 'Open remediation and governance tasks that still require execution or closure.',
      href: `${basePath}/tasks`,
      tone: summary.openTasks > 10 ? 'amber' : 'neutral',
    },
  ];

  return (
    <section className="overflow-hidden rounded-xl border border-white/[0.075] bg-[#101715] text-white">
      <div className="flex flex-col gap-2 border-b border-white/[0.055] px-5 py-5 md:flex-row md:items-end md:justify-between md:px-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-100/55">Review inputs</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">Items requiring governance attention</h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-white/38">These are live workspace counts. The dashboard does not infer Draft, Approved or Archived workflow states that are not present in the underlying records.</p>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-4">
        {reviewInputs.map((item, index) => (
          <Link key={item.label} href={item.href} className={`group min-h-44 px-5 py-5 transition hover:bg-white/[0.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-300/35 ${index > 0 ? 'border-t border-white/[0.055] md:border-l md:border-t-0' : ''} ${index === 2 ? 'md:border-t md:border-white/[0.055] xl:border-t-0' : ''}`}>
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-sm font-semibold text-white/78">{item.label}</h3>
              <span className={`rounded-md border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] ${toneClasses(item.tone)}`}>Current</span>
            </div>
            <p className="mt-4 text-3xl font-semibold tracking-[-0.04em]">{item.count}</p>
            <p className="mt-3 text-xs leading-5 text-white/38">{item.description}</p>
            <p className="mt-4 text-[10px] font-semibold text-emerald-100/0 transition group-hover:text-emerald-100/65">Open records →</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
