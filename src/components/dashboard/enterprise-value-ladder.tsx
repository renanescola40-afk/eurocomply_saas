import Link from 'next/link';
import type { DashboardSummary } from '@/server/queries/dashboard';

type EnterpriseValueLadderProps = {
  summary: DashboardSummary;
  basePath: string;
};

type Workstream = {
  name: string;
  status: string;
  description: string;
  signals: string[];
  href: string;
  tone: 'emerald' | 'amber' | 'rose' | 'neutral';
};

function toneClasses(tone: Workstream['tone']) {
  const tones = {
    emerald: 'border-emerald-300/15 bg-emerald-300/[0.055] text-emerald-100/80',
    amber: 'border-amber-300/15 bg-amber-300/[0.055] text-amber-100/80',
    rose: 'border-rose-300/15 bg-rose-300/[0.055] text-rose-100/80',
    neutral: 'border-white/[0.075] bg-white/[0.025] text-white/52',
  };
  return tones[tone];
}

export function EnterpriseValueLadder({ summary, basePath }: EnterpriseValueLadderProps) {
  const trackedEvidence = Math.max(0, summary.totals.documents - summary.missingDocuments);
  const workstreams: Workstream[] = [
    {
      name: 'Core governance',
      status: summary.criticalRisks > 0 ? 'Attention' : 'Active',
      description: 'The operating workspace for risk, evidence, vendor and remediation records.',
      signals: [`${summary.openRisks} open risks`, `${summary.openTasks} open tasks`],
      href: basePath,
      tone: summary.criticalRisks > 0 ? 'rose' : 'emerald',
    },
    {
      name: 'Reporting',
      status: summary.missingDocuments > 0 ? 'Review inputs' : 'Inputs tracked',
      description: 'Executive and governance reporting based on the current tracked workspace posture.',
      signals: [`${summary.complianceScore}% current score`, `${summary.missingDocuments} evidence gaps`],
      href: `${basePath}/reports-governance`,
      tone: summary.missingDocuments > 0 ? 'amber' : 'emerald',
    },
    {
      name: 'Access governance',
      status: 'Operational',
      description: 'Workspace membership, role administration and access-operation evidence.',
      signals: ['Role-based access', 'Team operations'],
      href: `${basePath}/team`,
      tone: 'neutral',
    },
    {
      name: 'Evidence operations',
      status: summary.missingDocuments > 3 ? 'Attention' : 'Active',
      description: 'Document and evidence records used by governance, review and audit workflows.',
      signals: [`${trackedEvidence} tracked evidence items`, `${summary.totals.documents} total documents`],
      href: `${basePath}/documents`,
      tone: summary.missingDocuments > 3 ? 'rose' : summary.missingDocuments > 0 ? 'amber' : 'emerald',
    },
  ];

  return (
    <section className="overflow-hidden rounded-xl border border-white/[0.075] bg-[#0d1522] text-white">
      <div className="flex flex-col gap-2 border-b border-white/[0.055] px-5 py-5 md:flex-row md:items-end md:justify-between md:px-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-200/65">Governance workstreams</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">Operational areas in the current workspace</h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-white/38">Product administration stays focused on the work the organization can perform now, not internal pricing strategy or future revenue concepts.</p>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-4">
        {workstreams.map((workstream, index) => (
          <Link key={workstream.name} href={workstream.href} className={`group min-h-52 px-5 py-5 transition hover:bg-white/[0.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400/35 ${index > 0 ? 'border-t border-white/[0.055] md:border-l md:border-t-0' : ''} ${index === 2 ? 'md:border-t md:border-white/[0.055] xl:border-t-0' : ''}`}>
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-base font-semibold text-white/84">{workstream.name}</h3>
              <span className={`rounded-md border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] ${toneClasses(workstream.tone)}`}>{workstream.status}</span>
            </div>
            <p className="mt-4 text-sm leading-6 text-white/42">{workstream.description}</p>
            <div className="mt-5 space-y-2 border-t border-white/[0.055] pt-3">
              {workstream.signals.map((signal) => <p key={signal} className="text-xs text-white/38">• {signal}</p>)}
            </div>
            <p className="mt-4 text-[10px] font-semibold text-blue-200/0 transition group-hover:text-blue-100/70">Open workstream →</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
