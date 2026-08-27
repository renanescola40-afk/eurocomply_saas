import { Fragment } from 'react';
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
  if (count <= 0) return 'border-white/[0.055] bg-black/[0.08] text-white/32';
  if (impact === 'Critical') return 'border-rose-300/15 bg-rose-300/[0.055] text-rose-100/82';
  if (impact === 'High') return 'border-amber-300/15 bg-amber-300/[0.055] text-amber-100/82';
  if (impact === 'Medium') return 'border-white/[0.075] bg-white/[0.025] text-white/68';
  return 'border-emerald-300/15 bg-emerald-300/[0.045] text-emerald-100/78';
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
    detail: `${summary.criticalRisks} critical risks require treatment.`,
    href: `${basePath}/risks`,
  });

  setCell('High', 'High', {
    count: summary.highRiskVendors,
    label: 'Vendor exposure',
    detail: `${summary.highRiskVendors} high-risk vendors require review.`,
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
    detail: `${summary.missingDocuments} missing evidence items remain open.`,
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
    label: 'Tracked evidence',
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
    <section className="overflow-hidden rounded-xl border border-white/[0.075] bg-[#101715] text-white">
      <div className="grid xl:grid-cols-[300px_minmax(0,1fr)]">
        <div className="border-b border-white/[0.055] px-5 py-5 xl:border-b-0 xl:border-r">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-100/55">Risk matrix</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">Impact × probability</h2>
          <p className="mt-3 text-sm leading-6 text-white/42">Workspace exposure grouped from current risk, vendor, evidence and execution signals.</p>

          <dl className="mt-6 divide-y divide-white/[0.055] border-y border-white/[0.055]">
            <div className="py-3.5"><dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/28">Current posture</dt><dd className="mt-1.5 text-lg font-semibold text-white/80">{posture}</dd></div>
            <div className="py-3.5"><dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/28">Exposure signals</dt><dd className="mt-1.5 text-2xl font-semibold tracking-[-0.03em]">{totalExposure}</dd></div>
          </dl>
        </div>

        <div className="overflow-x-auto p-4 md:p-5">
          <div className="grid min-w-[760px] grid-cols-[90px_repeat(3,minmax(0,1fr))] gap-2">
            <div />
            {probabilityColumns.map((probability) => (
              <div key={probability} className="px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30">
                {probability} probability
              </div>
            ))}

            {impactRows.map((impact) => (
              <Fragment key={impact}>
                <div className="flex items-center justify-end pr-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30">
                  {impact}
                </div>
                {probabilityColumns.map((probability) => {
                  const cell = getCell(cells, impact, probability);
                  return (
                    <Link key={`${impact}-${probability}`} href={cell.href} className={`group min-h-28 rounded-lg border px-4 py-3 transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/35 ${cellTone(cell.count, impact)}`}>
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-[9px] font-semibold uppercase tracking-[0.13em] opacity-65">{cell.label}</p>
                        <p className="text-2xl font-semibold tracking-[-0.03em]">{cell.count}</p>
                      </div>
                      <p className="mt-3 text-xs leading-5 opacity-70">{cell.detail}</p>
                      <p className="mt-2 text-[10px] font-semibold text-emerald-100/0 transition group-hover:text-emerald-100/65">Open cluster →</p>
                    </Link>
                  );
                })}
              </Fragment>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
