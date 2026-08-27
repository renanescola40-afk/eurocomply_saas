import Link from 'next/link';
import type { DashboardSummary, DashboardTrendComparison } from '@/server/queries/dashboard';

type AuditTimelinePreviewProps = {
  summary: DashboardSummary;
  trendComparison?: DashboardTrendComparison;
  basePath: string;
};

type AuditEntryPoint = {
  title: string;
  detail: string;
  href: string;
  tone: 'emerald' | 'amber' | 'rose' | 'neutral';
};

function toneClasses(tone: AuditEntryPoint['tone']) {
  const tones = {
    emerald: 'border-emerald-300/15 bg-emerald-300/[0.055] text-emerald-100/80',
    amber: 'border-amber-300/15 bg-amber-300/[0.055] text-amber-100/80',
    rose: 'border-rose-300/15 bg-rose-300/[0.055] text-rose-100/80',
    neutral: 'border-white/[0.075] bg-white/[0.025] text-white/52',
  };
  return tones[tone];
}

function getScoreDelta(trendComparison?: DashboardTrendComparison) {
  const delta = trendComparison?.complianceScoreDelta;
  if (delta === undefined || delta === null) return 'No prior snapshot';
  if (delta === 0) return 'No score movement';
  return `${delta > 0 ? '+' : ''}${delta} score movement`;
}

export function AuditTimelinePreview({ summary, trendComparison, basePath }: AuditTimelinePreviewProps) {
  const entryPoints: AuditEntryPoint[] = [
    {
      title: 'Posture snapshots',
      detail: `${summary.complianceScore}% compliance score · ${getScoreDelta(trendComparison)}`,
      href: `${basePath}/reports`,
      tone: summary.complianceScore >= 80 ? 'emerald' : summary.complianceScore >= 60 ? 'amber' : 'rose',
    },
    {
      title: 'Evidence register',
      detail: `${summary.totals.documents} tracked documents · ${summary.missingDocuments} missing evidence items`,
      href: `${basePath}/documents`,
      tone: summary.missingDocuments > 3 ? 'rose' : summary.missingDocuments > 0 ? 'amber' : 'emerald',
    },
    {
      title: 'Vendor review records',
      detail: `${summary.totals.vendors} tracked vendors · ${summary.highRiskVendors} high-risk vendors`,
      href: `${basePath}/vendors`,
      tone: summary.highRiskVendors > 0 ? 'amber' : 'emerald',
    },
    {
      title: 'Risk register',
      detail: `${summary.openRisks} open risks · ${summary.criticalRisks} critical`,
      href: `${basePath}/risks`,
      tone: summary.criticalRisks > 0 ? 'rose' : summary.openRisks > 0 ? 'amber' : 'emerald',
    },
    {
      title: 'Remediation actions',
      detail: `${summary.openTasks} open tasks in the current governance queue`,
      href: `${basePath}/tasks`,
      tone: summary.openTasks > 10 ? 'amber' : 'neutral',
    },
  ];

  return (
    <section className="overflow-hidden rounded-xl border border-white/[0.075] bg-[#101715] text-white">
      <div className="grid xl:grid-cols-[300px_minmax(0,1fr)]">
        <div className="border-b border-white/[0.055] px-5 py-5 xl:border-b-0 xl:border-r">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-100/55">Audit trail entry points</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">Open the records that contain real traceability</h2>
          <p className="mt-3 text-sm leading-6 text-white/42">This summary does not fabricate actors, event timestamps or completed exports. Use the underlying registers and audit logs for durable evidence.</p>
          <div className="mt-6 border-y border-white/[0.055] py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/28">Current posture</p>
            <p className="mt-2 text-sm leading-6 text-white/52">{summary.openTasks} open tasks, {summary.openRisks} open risks and {summary.highRiskVendors} high-risk vendors are currently visible.</p>
          </div>
        </div>

        <div className="divide-y divide-white/[0.055]">
          {entryPoints.map((entry) => (
            <Link key={entry.title} href={entry.href} className="group block px-5 py-4 transition hover:bg-white/[0.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-300/35 md:px-6">
              <div className="grid gap-3 md:grid-cols-[210px_minmax(0,1fr)_auto] md:items-start">
                <div className="flex items-start gap-2.5"><span className={`mt-0.5 rounded-md border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] ${toneClasses(entry.tone)}`}>Register</span><h3 className="text-sm font-semibold leading-5 text-white/82">{entry.title}</h3></div>
                <p className="text-sm leading-6 text-white/42">{entry.detail}</p>
                <span className="text-xs font-semibold text-emerald-100/55 transition group-hover:text-emerald-100">Open →</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
