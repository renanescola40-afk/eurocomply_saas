import Link from 'next/link';
import type { DashboardSummary, DashboardTrendComparison } from '@/server/queries/dashboard';

type AiExecutiveLayerProps = {
  summary: DashboardSummary;
  trendComparison?: DashboardTrendComparison;
  basePath: string;
};

type LeadershipNote = {
  question: string;
  answer: string;
  href: string;
  tone: 'emerald' | 'amber' | 'rose' | 'neutral';
};

function toneClasses(tone: LeadershipNote['tone']) {
  const tones = {
    emerald: 'border-emerald-300/15 bg-emerald-300/[0.055] text-emerald-100/80',
    amber: 'border-amber-300/15 bg-amber-300/[0.055] text-amber-100/80',
    rose: 'border-rose-300/15 bg-rose-300/[0.055] text-rose-100/80',
    neutral: 'border-white/[0.075] bg-white/[0.025] text-white/52',
  };
  return tones[tone];
}

function getPrimaryExposure(summary: DashboardSummary) {
  const exposures = [
    { label: 'vendor risk', value: summary.highRiskVendors, href: 'vendors', detail: `${summary.highRiskVendors} high-risk vendors` },
    { label: 'critical risk backlog', value: summary.criticalRisks, href: 'risks', detail: `${summary.criticalRisks} critical risks` },
    { label: 'evidence gap', value: summary.missingDocuments, href: 'documents', detail: `${summary.missingDocuments} missing documents` },
    { label: 'execution backlog', value: summary.openTasks, href: 'tasks', detail: `${summary.openTasks} open tasks` },
  ].sort((a, b) => b.value - a.value);
  return exposures[0];
}

function buildNotes(summary: DashboardSummary, basePath: string): LeadershipNote[] {
  const exposure = getPrimaryExposure(summary);
  return [
    {
      question: 'What should leadership review first?',
      answer: `The largest current workspace signal is ${exposure.detail}. Open that register before preparing the next governance summary.`,
      href: `${basePath}/${exposure.href}`,
      tone: summary.criticalRisks > 0 ? 'rose' : exposure.value > 0 ? 'amber' : 'emerald',
    },
    {
      question: 'What evidence is missing?',
      answer: `${summary.missingDocuments} evidence items are missing across ${summary.totals.documents} tracked documents.`,
      href: `${basePath}/documents`,
      tone: summary.missingDocuments > 3 ? 'rose' : summary.missingDocuments > 0 ? 'amber' : 'emerald',
    },
    {
      question: 'What is the vendor posture?',
      answer: `${summary.highRiskVendors} high-risk vendors are currently flagged out of ${summary.totals.vendors} tracked vendors.`,
      href: `${basePath}/vendors`,
      tone: summary.highRiskVendors > 3 ? 'rose' : summary.highRiskVendors > 0 ? 'amber' : 'emerald',
    },
    {
      question: 'What belongs in the current report?',
      answer: `Use the ${summary.complianceScore}% compliance score together with ${summary.openRisks} open risks, ${summary.openTasks} open actions and the current evidence and vendor registers.`,
      href: `${basePath}/reports`,
      tone: 'neutral',
    },
  ];
}

function getTrendNarrative(trendComparison?: DashboardTrendComparison) {
  const delta = trendComparison?.complianceScoreDelta;
  if (delta === undefined || delta === null) return 'No previous trend snapshot is available yet.';
  if (delta > 0) return `Compliance score improved by ${delta} points since the previous snapshot.`;
  if (delta < 0) return `Compliance score declined by ${Math.abs(delta)} points since the previous snapshot.`;
  return 'Compliance score is stable compared with the previous snapshot.';
}

export function AiExecutiveLayer({ summary, trendComparison, basePath }: AiExecutiveLayerProps) {
  const notes = buildNotes(summary, basePath);
  const exposure = getPrimaryExposure(summary);

  return (
    <section className="overflow-hidden rounded-xl border border-white/[0.075] bg-[#101715] text-white">
      <div className="grid xl:grid-cols-[300px_minmax(0,1fr)]">
        <div className="border-b border-white/[0.055] px-5 py-5 xl:border-b-0 xl:border-r">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-100/55">Leadership notes</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">Current posture in plain language</h2>
          <p className="mt-3 text-sm leading-6 text-white/42">Deterministic notes derived from the current dashboard summary. This surface does not generate free-form AI claims.</p>

          <dl className="mt-6 divide-y divide-white/[0.055] border-y border-white/[0.055]">
            <div className="py-3.5"><dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/28">Largest signal</dt><dd className="mt-1.5 text-lg font-semibold text-white/76">{exposure.detail}</dd></div>
            <div className="py-3.5"><dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/28">Trend</dt><dd className="mt-1.5 text-sm leading-6 text-white/52">{getTrendNarrative(trendComparison)}</dd></div>
          </dl>
        </div>

        <div className="divide-y divide-white/[0.055]">
          {notes.map((note) => (
            <Link key={note.question} href={note.href} className="group block px-5 py-4 transition hover:bg-white/[0.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-300/35 md:px-6">
              <div className="grid gap-3 md:grid-cols-[240px_minmax(0,1fr)_auto] md:items-start">
                <div className="flex items-start gap-2.5">
                  <span className={`mt-0.5 rounded-md border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] ${toneClasses(note.tone)}`}>Current</span>
                  <h3 className="text-sm font-semibold leading-5 text-white/82">{note.question}</h3>
                </div>
                <p className="text-sm leading-6 text-white/42">{note.answer}</p>
                <span className="text-xs font-semibold text-emerald-100/55 transition group-hover:text-emerald-100">Open →</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
