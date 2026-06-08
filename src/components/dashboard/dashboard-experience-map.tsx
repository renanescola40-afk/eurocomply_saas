import Link from 'next/link';

type DashboardExperienceMapProps = {
  basePath: string;
};

const journey = [
  {
    label: 'Understand posture',
    anchor: '#experience-index',
    detail: 'Start with operating grade, health, evidence, exposure and execution.',
  },
  {
    label: 'Prioritize work',
    anchor: '#executive-cockpit',
    detail: 'Use cockpit, radar and operational feed to find the biggest exposure.',
  },
  {
    label: 'Connect proof',
    anchor: '#evidence-graph',
    detail: 'Trace vendors, evidence, risks, tasks and reports as one operating chain.',
  },
  {
    label: 'Package confidence',
    anchor: '#board-report-center',
    detail: 'Turn the current posture into executive reports, audit packs and branded outputs.',
  },
  {
    label: 'Scale governance',
    anchor: '#enterprise-governance',
    detail: 'Add approval workflows, department ownership and audit timeline discipline.',
  },
  {
    label: 'Expand revenue',
    anchor: '#marketplace-expansion',
    detail: 'Map the same evidence foundation into GDPR, DORA, NIS2, ISO, SOC2 and AI Act.',
  },
];

export function DashboardExperienceMap({ basePath }: DashboardExperienceMapProps) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-slate-950 p-5 text-white shadow-2xl md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">Experience map</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">From posture to enterprise expansion</h2>
        </div>
        <Link href={`${basePath}/reports`} className="rounded-2xl bg-white px-4 py-3 text-center text-sm font-bold text-slate-950 transition hover:bg-slate-100">
          Open board report
        </Link>
      </div>

      <div className="mt-6 grid gap-3 lg:grid-cols-6">
        {journey.map((step, index) => (
          <a key={step.label} href={step.anchor} className="group relative rounded-3xl border border-white/10 bg-white/[0.045] p-4 transition hover:-translate-y-1 hover:border-primary/50 hover:bg-white/[0.075]">
            <div className="flex items-center justify-between gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/20 text-xs font-bold text-primary">{index + 1}</span>
              {index < journey.length - 1 && <span className="hidden h-px flex-1 bg-white/10 lg:block" />}
            </div>
            <h3 className="mt-4 text-sm font-semibold">{step.label}</h3>
            <p className="mt-2 text-xs leading-5 text-slate-400">{step.detail}</p>
            <p className="mt-4 text-xs font-semibold text-primary/80 opacity-0 transition group-hover:opacity-100">Jump to section →</p>
          </a>
        ))}
      </div>
    </section>
  );
}
