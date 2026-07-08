import Link from 'next/link';
import type { DashboardSummary } from '@/server/queries/dashboard';

type EnterpriseValueLadderProps = {
  summary: DashboardSummary;
  basePath: string;
};

type ValueStep = {
  name: string;
  priceSignal: string;
  readiness: number;
  description: string;
  unlocks: string[];
  href: string;
  tone: 'emerald' | 'sky' | 'violet' | 'amber';
};

function toneClasses(tone: ValueStep['tone']) {
  const tones = {
    emerald: 'border-emerald-300/30 bg-emerald-300/10 text-emerald-200',
    sky: 'border-sky-300/30 bg-sky-300/10 text-sky-200',
    violet: 'border-violet-300/30 bg-violet-300/10 text-violet-200',
    amber: 'border-amber-300/30 bg-amber-300/10 text-amber-200',
  };

  return tones[tone];
}

function clamp(value: number) {
  return Math.max(10, Math.min(100, Math.round(value)));
}

export function EnterpriseValueLadder({ summary, basePath }: EnterpriseValueLadderProps) {
  const evidenceReadiness = summary.totals.documents === 0
    ? 10
    : ((summary.totals.documents - summary.missingDocuments) / summary.totals.documents) * 100;

  const steps: ValueStep[] = [
    {
      name: 'Compliance OS',
      priceSignal: 'Entry wedge',
      readiness: clamp(summary.complianceScore),
      description: 'The core workspace for tasks, vendors, risks, documents and executive visibility.',
      unlocks: ['Executive cockpit', 'Risk radar', 'Evidence graph'],
      href: basePath,
      tone: 'emerald',
    },
    {
      name: 'Leadership Reporting',
      priceSignal: 'Premium tier',
      readiness: clamp(summary.complianceScore - summary.missingDocuments),
      description: 'Client-facing reports, white-label previews and leadership review compliance narratives.',
      unlocks: ['Leadership memo', 'White-label preview', 'Review pack'],
      href: `${basePath}/reports`,
      tone: 'sky',
    },
    {
      name: 'Enterprise Governance',
      priceSignal: 'Enterprise tier',
      readiness: clamp(evidenceReadiness - summary.criticalRisks * 3),
      description: 'Approvals, department ownership, activity timeline and accountability workflows.',
      unlocks: ['Approvals', 'Departments', 'Activity timeline'],
      href: `${basePath}/tasks`,
      tone: 'violet',
    },
    {
      name: 'Framework Marketplace',
      priceSignal: 'Expansion revenue',
      readiness: clamp((summary.complianceScore + evidenceReadiness) / 2),
      description: 'Package the same compliance foundation into GDPR, DORA, NIS2, ISO, SOC2 and AI Act modules.',
      unlocks: ['GDPR', 'DORA/NIS2', 'ISO/SOC2/AI Act'],
      href: `${basePath}/reports/print`,
      tone: 'amber',
    },
  ];

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 p-5 text-white shadow-2xl md:p-6">
      <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="absolute bottom-0 left-8 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl" />

      <div className="relative flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200/80">Enterprise value ladder</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">A pricing story buyers can understand</h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-slate-400">
          Convert the product from a single compliance tool into a clear expansion path: operating system, reporting, governance and multi-framework modules.
        </p>
      </div>

      <div className="relative mt-7 grid gap-4 xl:grid-cols-4">
        {steps.map((step, index) => (
          <Link key={step.name} href={step.href} className="group rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-5 transition hover:-translate-y-1 hover:border-primary/50 hover:bg-white/[0.075]">
            <div className="flex items-start justify-between gap-3">
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${toneClasses(step.tone)}`}>{step.priceSignal}</span>
              <span className="text-xs text-slate-500">0{index + 1}</span>
            </div>

            <h3 className="mt-5 text-xl font-semibold tracking-tight">{step.name}</h3>
            <p className="mt-3 min-h-20 text-sm leading-6 text-slate-400">{step.description}</p>

            <div className="mt-5">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Readiness signal</span>
                <span>{step.readiness}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-primary" style={{ width: `${step.readiness}%` }} />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {step.unlocks.map((unlock) => (
                <span key={unlock} className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-xs text-slate-400">{unlock}</span>
              ))}
            </div>

            <p className="mt-5 text-xs font-semibold text-primary/80 opacity-0 transition group-hover:opacity-100">Open value stream →</p>
          </Link>
        ))}
      </div>

      <div className="relative mt-5 rounded-3xl border border-white/10 bg-black/20 p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Commercial positioning</p>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Start with GDPR operations, then expand into leadership reporting, governance controls and paid framework modules. This creates a stronger pricing ladder than a flat checklist product.
        </p>
      </div>
    </section>
  );
}
