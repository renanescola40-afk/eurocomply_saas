import Link from 'next/link';
import type { DashboardSummary, DashboardTrendComparison } from '@/server/queries/dashboard';

type AuditTimelinePreviewProps = {
  summary: DashboardSummary;
  trendComparison?: DashboardTrendComparison;
  basePath: string;
};

type AuditEvent = {
  title: string;
  actor: string;
  detail: string;
  timestamp: string;
  href: string;
  tone: 'emerald' | 'sky' | 'amber' | 'rose' | 'slate';
};

function toneClasses(tone: AuditEvent['tone']) {
  const tones = {
    emerald: 'border-emerald-300/30 bg-emerald-300/10 text-emerald-200',
    sky: 'border-sky-300/30 bg-sky-300/10 text-sky-200',
    amber: 'border-amber-300/30 bg-amber-300/10 text-amber-200',
    rose: 'border-rose-300/30 bg-rose-300/10 text-rose-200',
    slate: 'border-white/10 bg-white/[0.04] text-slate-200',
  };

  return tones[tone];
}

function getScoreDelta(trendComparison?: DashboardTrendComparison) {
  const delta = trendComparison?.complianceScoreDelta;
  if (delta === undefined || delta === null) return 'Baseline captured';
  if (delta === 0) return 'No score movement';
  return `${delta > 0 ? '+' : ''}${delta} score movement`;
}

export function AuditTimelinePreview({ summary, trendComparison, basePath }: AuditTimelinePreviewProps) {
  const events: AuditEvent[] = [
    {
      title: 'Board report snapshot prepared',
      actor: 'EuroComply system',
      detail: `${summary.complianceScore}% compliance score · ${getScoreDelta(trendComparison)}`,
      timestamp: 'Today · 09:40',
      href: `${basePath}/reports`,
      tone: summary.complianceScore >= 80 ? 'emerald' : 'amber',
    },
    {
      title: 'Evidence gap review queued',
      actor: 'Compliance workflow',
      detail: `${summary.missingDocuments} missing evidence items require validation`,
      timestamp: 'Today · 09:12',
      href: `${basePath}/documents`,
      tone: summary.missingDocuments > 3 ? 'rose' : summary.missingDocuments > 0 ? 'amber' : 'emerald',
    },
    {
      title: 'Vendor exposure reviewed',
      actor: 'Legal workflow',
      detail: `${summary.highRiskVendors} high-risk vendors marked for review`,
      timestamp: 'Yesterday · 16:20',
      href: `${basePath}/vendors`,
      tone: summary.highRiskVendors > 0 ? 'amber' : 'emerald',
    },
    {
      title: 'Risk register updated',
      actor: 'Security workflow',
      detail: `${summary.openRisks} open risks · ${summary.criticalRisks} critical`,
      timestamp: 'Yesterday · 11:05',
      href: `${basePath}/risks`,
      tone: summary.criticalRisks > 0 ? 'rose' : summary.openRisks > 0 ? 'amber' : 'emerald',
    },
    {
      title: 'Audit pack ready for export',
      actor: 'Evidence automation',
      detail: `${summary.totals.documents} tracked documents available for evidence packaging`,
      timestamp: 'This week',
      href: `${basePath}/reports/print`,
      tone: 'sky',
    },
  ];

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 p-5 text-white shadow-2xl md:p-6">
      <div className="absolute right-16 top-0 h-72 w-72 rounded-full bg-sky-500/10 blur-3xl" />
      <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="relative grid gap-6 xl:grid-cols-[0.76fr_1.24fr]">
        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-200/80">Audit timeline</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight">Traceability preview</h2>
          <p className="mt-4 text-sm leading-6 text-slate-400">
            Show leadership, customers and auditors a clear trail of evidence changes, reviews, exports and posture snapshots.
          </p>

          <div className="mt-6 grid gap-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Audit signal</p>
              <p className="mt-2 text-sm text-slate-300">Every material action should become explainable evidence.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Current posture</p>
              <p className="mt-2 text-sm text-slate-300">{summary.openTasks} open tasks, {summary.openRisks} risks and {summary.highRiskVendors} high-risk vendors remain visible.</p>
            </div>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-4">
          <div className="space-y-3">
            {events.map((event, index) => (
              <Link key={`${event.title}-${index}`} href={event.href} className="group block rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:border-primary/50 hover:bg-white/[0.06]">
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-full border text-xs font-bold ${toneClasses(event.tone)}`}>{index + 1}</span>
                    {index < events.length - 1 && <span className="mt-2 h-full min-h-8 w-px bg-white/10" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-semibold">{event.title}</p>
                        <p className="mt-1 text-xs text-slate-500">{event.actor}</p>
                      </div>
                      <p className="text-xs text-slate-500">{event.timestamp}</p>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-400">{event.detail}</p>
                    <p className="mt-3 text-xs font-semibold text-primary/80 opacity-0 transition group-hover:opacity-100">Open evidence trail →</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
