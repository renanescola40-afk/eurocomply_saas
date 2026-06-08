import Link from 'next/link';
import type { DashboardSummary } from '@/server/queries/dashboard';

type FrameworkCoveragePreviewProps = {
  summary: DashboardSummary;
  basePath: string;
};

type Framework = {
  name: string;
  category: string;
  coverage: number;
  status: 'active' | 'planned' | 'ready';
  description: string;
  href: string;
};

function statusClasses(status: Framework['status']) {
  const tones = {
    active: 'border-emerald-300/30 bg-emerald-300/10 text-emerald-200',
    ready: 'border-sky-300/30 bg-sky-300/10 text-sky-200',
    planned: 'border-amber-300/30 bg-amber-300/10 text-amber-200',
  };

  return tones[status];
}

function statusLabel(status: Framework['status']) {
  if (status === 'active') return 'Active';
  if (status === 'ready') return 'Ready';
  return 'Planned';
}

function clampCoverage(value: number) {
  return Math.max(12, Math.min(100, Math.round(value)));
}

export function FrameworkCoveragePreview({ summary, basePath }: FrameworkCoveragePreviewProps) {
  const evidenceCoverage = summary.totals.documents === 0
    ? 0
    : ((summary.totals.documents - summary.missingDocuments) / summary.totals.documents) * 100;

  const frameworks: Framework[] = [
    {
      name: 'GDPR',
      category: 'Privacy operations',
      coverage: clampCoverage(summary.complianceScore),
      status: 'active',
      description: 'Core privacy evidence, vendor reviews, risk treatment and board reporting.',
      href: `${basePath}/reports`,
    },
    {
      name: 'DORA',
      category: 'Financial resilience',
      coverage: clampCoverage((summary.complianceScore + evidenceCoverage) / 2 - summary.highRiskVendors * 2),
      status: 'ready',
      description: 'Operational resilience, ICT third-party risk and executive oversight foundation.',
      href: `${basePath}/vendors`,
    },
    {
      name: 'NIS2',
      category: 'Cyber governance',
      coverage: clampCoverage(summary.complianceScore - summary.criticalRisks * 4),
      status: 'ready',
      description: 'Security ownership, incident readiness, supplier governance and risk visibility.',
      href: `${basePath}/risks`,
    },
    {
      name: 'ISO 27001',
      category: 'Security management',
      coverage: clampCoverage(evidenceCoverage - summary.openRisks),
      status: 'planned',
      description: 'Control evidence, policy lifecycle, risk register and continuous improvement.',
      href: `${basePath}/documents`,
    },
    {
      name: 'SOC 2',
      category: 'Trust services',
      coverage: clampCoverage(evidenceCoverage - summary.missingDocuments),
      status: 'planned',
      description: 'Evidence packaging, audit trails, vendor risk and management assertions.',
      href: `${basePath}/reports/print`,
    },
    {
      name: 'AI Act',
      category: 'AI governance',
      coverage: clampCoverage(summary.complianceScore - 18),
      status: 'planned',
      description: 'Future governance layer for AI inventory, risk classification and accountability.',
      href: `${basePath}/reports`,
    },
  ];

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 p-5 text-white shadow-2xl md:p-6">
      <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="absolute bottom-0 left-8 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />

      <div className="relative flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-200/80">Framework coverage</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">Marketplace-ready compliance map</h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-slate-400">
          Show how the same evidence, vendor, risk and report foundation can expand from GDPR into the wider European compliance stack.
        </p>
      </div>

      <div className="relative mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {frameworks.map((framework) => (
          <Link key={framework.name} href={framework.href} className="group rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-5 transition hover:-translate-y-1 hover:border-primary/50 hover:bg-white/[0.075]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold">{framework.name}</h3>
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{framework.category}</p>
              </div>
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses(framework.status)}`}>
                {statusLabel(framework.status)}
              </span>
            </div>

            <p className="mt-4 min-h-14 text-sm leading-6 text-slate-400">{framework.description}</p>

            <div className="mt-5">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Coverage signal</span>
                <span>{framework.coverage}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-primary" style={{ width: `${framework.coverage}%` }} />
              </div>
            </div>

            <p className="mt-5 text-xs font-semibold text-primary/80 opacity-0 transition group-hover:opacity-100">Open mapped workstream →</p>
          </Link>
        ))}
      </div>

      <div className="relative mt-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Reusable evidence</p>
          <p className="mt-2 text-sm text-slate-300">The same documents and controls can support multiple compliance frameworks.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Expansion path</p>
          <p className="mt-2 text-sm text-slate-300">GDPR can become the entry wedge for DORA, NIS2, ISO 27001, SOC 2 and AI Act modules.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Commercial signal</p>
          <p className="mt-2 text-sm text-slate-300">Framework modules create a future marketplace and stronger enterprise pricing ladder.</p>
        </div>
      </div>
    </section>
  );
}
