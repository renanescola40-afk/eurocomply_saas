import Link from 'next/link';
import type { DashboardSummary } from '@/server/queries/dashboard';

type RiskHeatmapProps = {
  summary: DashboardSummary;
  basePath: string;
};

type HeatmapCell = {
  impact: 'Low' | 'Medium' | 'High' | 'Critical';
  probability: 'Low' | 'Medium' | 'High';
  count: number;
  label: string;
  detail: string;
  href: string;
};

const impactRows: HeatmapCell['impact'][] = ['Critical', 'High', 'Medium', 'Low'];
const probabilityColumns: HeatmapCell['probability'][] = ['Low', 'Medium', 'High'];

function cellTone(count: number, impact: HeatmapCell['impact']) {
  if (count <= 0) return 'border-white/10 bg-white/[0.035] text-slate-500';
  if (impact === 'Critical') return 'border-rose-300/40 bg-rose-400/20 text-rose-100';
  if (impact === 'High') return 'border-amber-300/40 bg-amber-300/20 text-amber-100';
  if (impact === 'Medium') return 'border-sky-300/35 bg-sky-300/15 text-sky-100';
  return 'border-emerald-300/30 bg-emerald-300/10 text-emerald-100';
}

function buildCells(summary: DashboardSummary, basePath: string): HeatmapCell[] {
  const cells: HeatmapCell[] = [];

  for (const impact of impactRows) {
    for (const probability of probabilityColumns) {
      cells.push({
        impact,
        probability,
        count: 0,
        label: 'No active exposure',
        detail: 'No material signal in this cluster.',
        href: `${basePath}/risks`,
      });
    }
  }

  const setCell = (
    impact: HeatmapCell['impact'],
    probability: HeatmapCell['probability'],
    patch: Pick<HeatmapCell, 'count' | 'label' | 'detail' | 'href'>,
  ) => {
    const index = cells.findIndex((cell) => cell.impact === impact && cell.probability === probability);
    if (index >= 0) cells[index] = { ...cells[index], ...patch };
  };

  setCell('Critical', 'High', {
    count: summary.criticalRisks,
    label: 'Critical risk cluster',
    detail: `${summary.criticalRisks} critical risks require executive treatment.`,
    href: `${basePath}/risks`,
  });

  setCell('High', 'High', {
    count: summary.highRiskVendors,
    label: 'Vendor exposure',
    detail: `${summary.highRiskVendors} high-risk vendors may affect GDPR/DORA/NIS2 readiness.`,
    href: `${basePath}/vendors`,
  });

  setCell('High', 'Medium', {
    count: Math.max(0, summary.openRisks - summary.criticalRisks),
    label: 'Open risk backlog',
    detail: `${Math.max(0, summary.openRisks - summary.criticalRisks)} non-critical risks need prioritization.`,
    href: `${basePath}/risks`,
  });

  setCell('Medium', 'High', {
    count: summary.missingDocuments,
    label: 'Evidence gap',
    detail: `${summary.missingDocuments} missing evidence items weaken customer confidence.`,
    href: `${basePath}/documents`,
  });

  setCell('Medium', 'Medium', {
    count: summary.openTasks,
    label: 'Execution backlog',
    detail: `${summary.openTasks} open tasks carry remediation execution.`,
    href: `${basePath}/tasks`,
  });

  setCell('Low', 'Low', {
    count: Math.max(0, summary.totals.documents - summary.missingDocuments),
    label: 'Controlled evidence',
    detail: `${Math.max(0, summary.totals.documents - summary.missingDocuments)} evidence items are currently tracked.`,
    href: `${basePath}/documents`,
  });

  return cells;
}

function getCell(cells: HeatmapCell[], impact: HeatmapCell['impact'], probability: HeatmapCell['probability']) {
  return cells.find((cell) => cell.impact === impact && cell.probability === probability)!;
}

export function RiskHeatmap({ summary, basePath }: RiskHeatmapProps) {
  const cells = buildCells(summary, basePath);
  const totalExposure = summary.criticalRisks + summary.highRiskVendors + summary.missingDocuments + summary.openTasks;
  const posture = summary.criticalRisks > 0 || summary.highRiskVendors > 3 ? 'Executive attention' : totalExposure > 8 ? 'Active monitoring' : 'Controlled';

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 p-5 text-white shadow-2xl md:p-6">
      <div className="absolute right-0 top-0 h-80 w-80 rounded-full bg-rose-500/10 blur-3xl" />
      <div className="absolute bottom-0 left-8 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" />

      <div className="relative grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
        <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-rose-200/80">Risk heatmap</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight">Impact × probability exposure map</h2>
          <p className="mt-4 text-sm leading-6 text-slate-400">
            A board-friendly heatmap that clusters operational risk signals into visible exposure zones.
          </p>

          <div className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Current posture</p>
            <p className="mt-2 text-3xl font-bold tracking-tight">{posture}</p>
            <p className="mt-2 text-sm text-slate-400">{totalExposure} total exposure signals across risks, vendors, evidence and execution.</p>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-4">
          <div className="grid grid-cols-[92px_repeat(3,minmax(0,1fr))] gap-3">
            <div />
            {probabilityColumns.map((probability) => (
              <div key={probability} className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                {probability} probability
              </div>
            ))}

            {impactRows.map((impact) => (
              <>
                <div key={`${impact}-label`} className="flex items-center justify-end pr-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {impact}
                </div>
                {probabilityColumns.map((probability) => {
                  const cell = getCell(cells, impact, probability);
                  return (
                    <Link key={`${impact}-${probability}`} href={cell.href} className={`group min-h-36 rounded-3xl border p-4 transition hover:-translate-y-1 hover:border-primary/50 ${cellTone(cell.count, impact)}`}>
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-70">{cell.label}</p>
                        <p className="text-3xl font-bold">{cell.count}</p>
                      </div>
                      <p className="mt-4 text-xs leading-5 opacity-80">{cell.detail}</p>
                      <p className="mt-4 text-xs font-semibold text-primary/90 opacity-0 transition group-hover:opacity-100">Open cluster →</p>
                    </Link>
                  );
                })}
              </>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
