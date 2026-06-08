import Link from 'next/link';
import type { DashboardSummary } from '@/server/queries/dashboard';

type DepartmentOwnershipPreviewProps = {
  summary: DashboardSummary;
  basePath: string;
};

type Department = {
  name: string;
  owner: string;
  load: number;
  focus: string;
  href: string;
  tone: 'blue' | 'emerald' | 'amber' | 'violet';
};

function toneClasses(tone: Department['tone']) {
  const tones = {
    blue: 'border-blue-300/30 bg-blue-300/10 text-blue-200',
    emerald: 'border-emerald-300/30 bg-emerald-300/10 text-emerald-200',
    amber: 'border-amber-300/30 bg-amber-300/10 text-amber-200',
    violet: 'border-violet-300/30 bg-violet-300/10 text-violet-200',
  };

  return tones[tone];
}

function loadLabel(load: number) {
  if (load >= 8) return 'Heavy';
  if (load >= 4) return 'Active';
  if (load > 0) return 'Light';
  return 'Clear';
}

function loadWidth(load: number) {
  return `${Math.min(100, Math.max(12, load * 10))}%`;
}

export function DepartmentOwnershipPreview({ summary, basePath }: DepartmentOwnershipPreviewProps) {
  const departments: Department[] = [
    {
      name: 'Compliance',
      owner: 'Compliance Lead',
      load: summary.openRisks + summary.missingDocuments,
      focus: `${summary.openRisks} risks and ${summary.missingDocuments} evidence gaps`,
      href: `${basePath}/risks`,
      tone: 'blue',
    },
    {
      name: 'Legal',
      owner: 'Legal Counsel',
      load: summary.highRiskVendors + summary.criticalRisks,
      focus: `${summary.highRiskVendors} vendor reviews and ${summary.criticalRisks} critical risks`,
      href: `${basePath}/vendors`,
      tone: 'violet',
    },
    {
      name: 'Security',
      owner: 'Security Owner',
      load: summary.missingDocuments + summary.openTasks,
      focus: `${summary.missingDocuments} evidence gaps and ${summary.openTasks} open tasks`,
      href: `${basePath}/documents`,
      tone: 'emerald',
    },
    {
      name: 'Finance',
      owner: 'Finance Ops',
      load: summary.highRiskVendors,
      focus: `${summary.highRiskVendors} suppliers may need procurement review`,
      href: `${basePath}/vendors`,
      tone: 'amber',
    },
  ];

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 p-5 text-white shadow-2xl md:p-6">
      <div className="absolute left-20 top-0 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />

      <div className="relative flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-200/80">Department ownership</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">Cross-functional compliance operating model</h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-slate-400">
          Map risks, vendors, evidence and tasks to the teams that actually move compliance forward.
        </p>
      </div>

      <div className="relative mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {departments.map((department) => (
          <Link key={department.name} href={department.href} className="group rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-5 transition hover:-translate-y-1 hover:border-primary/50 hover:bg-white/[0.075]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${toneClasses(department.tone)}`}>{department.name}</span>
                <p className="mt-4 text-sm text-slate-400">{department.owner}</p>
              </div>
              <p className="text-3xl font-bold tracking-tight">{department.load}</p>
            </div>

            <p className="mt-5 min-h-12 text-sm leading-6 text-slate-400">{department.focus}</p>

            <div className="mt-5">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Workload</span>
                <span>{loadLabel(department.load)}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-primary" style={{ width: loadWidth(department.load) }} />
              </div>
            </div>

            <p className="mt-5 text-xs font-semibold text-primary/80 opacity-0 transition group-hover:opacity-100">Open team workstream →</p>
          </Link>
        ))}
      </div>

      <div className="relative mt-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">RBAC-ready</p>
          <p className="mt-2 text-sm text-slate-300">Prepared for future department-level permissions and reviewer queues.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Accountability</p>
          <p className="mt-2 text-sm text-slate-300">Workstreams become clear enough for weekly compliance operating meetings.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Enterprise buyer signal</p>
          <p className="mt-2 text-sm text-slate-300">Legal, Security, Finance and Compliance can all see their role in the same system.</p>
        </div>
      </div>
    </section>
  );
}
