const trustLayers = [
  {
    label: 'Tenant isolation',
    title: 'Organization-scoped operations',
    description: 'Every task, document, vendor, risk and report is designed around organization boundaries and workspace ownership.',
    signal: 'Multi-tenant core',
  },
  {
    label: 'Evidence integrity',
    title: 'Private evidence with controlled access',
    description: 'Evidence workflows support private storage, signed downloads, expiry awareness and metadata-driven review readiness.',
    signal: 'Signed access',
  },
  {
    label: 'Executive confidence',
    title: 'Leadership review reporting layer',
    description: 'Compliance score, maturity, trends, top risks and next best actions are packaged into executive-ready views.',
    signal: 'Report-ready',
  },
  {
    label: 'Operational resilience',
    title: 'Activity history and observability foundation',
    description: 'Critical actions, exports, billing and workspace changes are structured for traceability and production review.',
    signal: 'Traceable ops',
  },
];

const controlSignals = [
  ['GDPR evidence', 'Policies, DPIAs, reviews and ownership in one place.'],
  ['Vendor exposure', 'Track data access, DPA status and risk concentration.'],
  ['Risk treatment', 'Prioritize critical remediation and assign accountability.'],
  ['Executive exports', 'Printable reports and CSV evidence for reviews.'],
];

export function TrustArchitecture() {
  return (
    <section className="relative overflow-hidden border-y border-white/10 bg-[#070b15] py-20">
      <div className="absolute left-0 top-0 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="relative mx-auto grid max-w-7xl gap-10 px-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
        <div className="lg:sticky lg:top-28">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-200/80">Trust architecture</p>
          <h2 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">
            Built to feel like infrastructure, not another compliance spreadsheet.
          </h2>
          <p className="mt-5 text-base leading-7 text-white/55">
            RISCK COMPLY presents the operational signals B2B buyers care about: tenant boundaries, evidence control, activity traceability and executive reporting clarity.
          </p>

          <div className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-white/35">Control graph</p>
            <div className="mt-5 grid gap-3">
              {controlSignals.map(([label, description]) => (
                <div key={label} className="flex gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">
                  <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-300" />
                  <div>
                    <p className="font-semibold">{label}</p>
                    <p className="mt-1 text-sm leading-6 text-white/45">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {trustLayers.map((layer, index) => (
            <article
              key={layer.label}
              className="group relative min-h-72 overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 shadow-2xl transition hover:-translate-y-1 hover:border-white/25"
            >
              <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-white/5 blur-2xl transition group-hover:bg-blue-400/10" />
              <div className="relative">
                <div className="flex items-start justify-between gap-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/35">{layer.label}</p>
                  <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-white/50">0{index + 1}</span>
                </div>
                <h3 className="mt-8 text-2xl font-semibold tracking-tight">{layer.title}</h3>
                <p className="mt-4 text-sm leading-7 text-white/52">{layer.description}</p>
                <div className="mt-8 inline-flex rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                  {layer.signal}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
