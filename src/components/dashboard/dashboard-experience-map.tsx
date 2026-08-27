import Link from 'next/link';

type DashboardExperienceMapProps = {
  basePath: string;
};

export function DashboardExperienceMap({ basePath }: DashboardExperienceMapProps) {
  const journey = [
    {
      label: 'Understand posture',
      href: basePath,
      detail: 'Review the current operating grade, health and execution signals.',
    },
    {
      label: 'Prioritize work',
      href: `${basePath}/tasks`,
      detail: 'Move from posture into owned remediation and due dates.',
    },
    {
      label: 'Review exposure',
      href: `${basePath}/evidence-risk`,
      detail: 'Inspect risk, vendor and evidence relationships in the current workspace.',
    },
    {
      label: 'Manage evidence',
      href: `${basePath}/documents`,
      detail: 'Upload, review and maintain the evidence register used by governance workflows.',
    },
    {
      label: 'Prepare reporting',
      href: `${basePath}/reports-governance`,
      detail: 'Package the current posture into governance and executive review outputs.',
    },
    {
      label: 'Manage access',
      href: `${basePath}/team`,
      detail: 'Review workspace roles, invitations and enterprise access operations.',
    },
  ];

  return (
    <section className="overflow-hidden rounded-xl border border-white/[0.075] bg-[#101715] text-white">
      <div className="flex flex-col gap-3 border-b border-white/[0.055] px-5 py-5 md:flex-row md:items-end md:justify-between md:px-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-100/55">Workspace map</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">Move from posture to evidence and reporting</h2>
        </div>
        <Link href={`${basePath}/reports-governance`} className="inline-flex h-10 items-center justify-center rounded-lg border border-white/[0.09] bg-white/[0.025] px-4 text-sm font-semibold text-white/72 transition hover:bg-white/[0.05] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200/40">
          Open reporting
        </Link>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-6">
        {journey.map((step, index) => (
          <Link key={step.label} href={step.href} className={`group min-h-40 px-4 py-4 transition hover:bg-white/[0.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-300/35 ${index > 0 ? 'border-t border-white/[0.055] md:border-l md:border-t-0' : ''} ${index === 2 || index === 4 ? 'md:border-t md:border-white/[0.055] xl:border-t-0' : ''}`}>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-100/50">0{index + 1}</span>
              <span className="text-xs text-white/20 transition group-hover:text-emerald-100/60">→</span>
            </div>
            <h3 className="mt-4 text-sm font-semibold text-white/80">{step.label}</h3>
            <p className="mt-2 text-xs leading-5 text-white/36">{step.detail}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
