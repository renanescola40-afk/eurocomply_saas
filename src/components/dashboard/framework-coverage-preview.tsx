import Link from 'next/link';
import type { DashboardSummary } from '@/server/queries/dashboard';

type FrameworkCoveragePreviewProps = {
  summary: DashboardSummary;
  basePath: string;
};

type FrameworkReference = {
  name: string;
  category: string;
  description: string;
  workspaceSignal: string;
  href: string;
};

export function FrameworkCoveragePreview({ summary, basePath }: FrameworkCoveragePreviewProps) {
  const trackedEvidence = Math.max(0, summary.totals.documents - summary.missingDocuments);
  const frameworks: FrameworkReference[] = [
    {
      name: 'EU AI Act',
      category: 'AI governance',
      description: 'AI inventory, risk, evidence and governance workflows are the primary product context.',
      workspaceSignal: `${summary.openRisks} open risks · ${summary.openTasks} open actions`,
      href: `${basePath}/reports`,
    },
    {
      name: 'GDPR',
      category: 'Privacy reference',
      description: 'Vendor, document and risk records may support privacy review where the underlying evidence is applicable.',
      workspaceSignal: `${trackedEvidence} tracked evidence items · ${summary.highRiskVendors} high-risk vendors`,
      href: `${basePath}/documents`,
    },
    {
      name: 'DORA',
      category: 'Resilience reference',
      description: 'Third-party and risk records can be reviewed as inputs where DORA obligations apply to the organization.',
      workspaceSignal: `${summary.totals.vendors} vendors · ${summary.highRiskVendors} high risk`,
      href: `${basePath}/vendors`,
    },
    {
      name: 'NIS2',
      category: 'Security governance reference',
      description: 'Risk and accountability records can support a NIS2 review without implying framework compliance.',
      workspaceSignal: `${summary.openRisks} open risks · ${summary.criticalRisks} critical`,
      href: `${basePath}/risks`,
    },
    {
      name: 'ISO 27001',
      category: 'Control-system reference',
      description: 'Evidence and risk registers can be reused as review inputs when mapped to an organization-specific ISMS.',
      workspaceSignal: `${summary.totals.documents} documents · ${summary.missingDocuments} missing`,
      href: `${basePath}/documents`,
    },
    {
      name: 'SOC 2',
      category: 'Assurance reference',
      description: 'Current evidence and audit records may support preparation, but no SOC 2 coverage or attestation is inferred.',
      workspaceSignal: `${trackedEvidence} tracked evidence items`,
      href: `${basePath}/reports/print`,
    },
  ];

  return (
    <section className="overflow-hidden rounded-xl border border-white/[0.075] bg-[#101715] text-white">
      <div className="flex flex-col gap-2 border-b border-white/[0.055] px-5 py-5 md:flex-row md:items-end md:justify-between md:px-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-100/55">Framework references</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">Reuse current workspace evidence carefully</h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-white/38">Reference links show where existing records may be relevant. They are not framework coverage scores, certifications or legal conclusions.</p>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3">
        {frameworks.map((framework, index) => (
          <Link key={framework.name} href={framework.href} className={`group min-h-48 px-5 py-5 transition hover:bg-white/[0.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-300/35 ${index > 0 ? 'border-t border-white/[0.055] md:border-l md:border-t-0' : ''} ${index >= 3 ? 'xl:border-t xl:border-white/[0.055]' : index === 2 ? 'md:border-t md:border-white/[0.055] xl:border-t-0' : ''}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-white/84">{framework.name}</h3>
                <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/28">{framework.category}</p>
              </div>
              <span className="rounded-md border border-white/[0.075] bg-white/[0.025] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-white/42">Reference</span>
            </div>
            <p className="mt-4 text-sm leading-6 text-white/42">{framework.description}</p>
            <div className="mt-4 border-t border-white/[0.055] pt-3">
              <p className="text-[9px] font-semibold uppercase tracking-[0.13em] text-white/26">Current workspace signal</p>
              <p className="mt-1.5 text-xs text-white/48">{framework.workspaceSignal}</p>
            </div>
            <p className="mt-4 text-[10px] font-semibold text-emerald-100/0 transition group-hover:text-emerald-100/65">Open related records →</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
