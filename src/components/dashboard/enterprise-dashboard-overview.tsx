import Link from 'next/link';
import { ArrowRight, CheckCircle2, CircleAlert, FileText, Gauge, LockKeyhole, ReceiptText, ShieldCheck, UsersRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DashboardCopy } from '@/lib/i18n/dashboard-copy';
import type { DashboardSummary } from '@/server/queries/dashboard';

type PreviewTask = { id: string; title?: string | null; status?: string | null; priority?: string | null; due_date?: string | null };
type PreviewVendor = { id: string; name?: string | null; risk_level?: string | null; review_status?: string | null; next_review_at?: string | null };
type PreviewDocument = { id: string; title?: string | null; name?: string | null; status?: string | null; expires_at?: string | null; category?: string | null };

type EnterpriseDashboardOverviewProps = {
  copy: DashboardCopy['enterprise'];
  summary: DashboardSummary;
  tasks: PreviewTask[];
  vendorsRequiringReview: PreviewVendor[];
  documentsExpiringSoon: PreviewDocument[];
  basePath: string;
  tasksPath: string;
  planName: string;
  limitsSummary: string;
};

const stateKeys = ['loading', 'empty', 'error', 'denied', 'success', 'offline'] as const;
type StateKey = (typeof stateKeys)[number];

function stateRole(state: StateKey) {
  return state === 'error' || state === 'denied' || state === 'offline' ? 'alert' : 'status';
}

function formatCount(value: number, fallback = '0') {
  return Number.isFinite(value) ? String(value) : fallback;
}

export function EnterpriseDashboardOverview({ copy, summary, tasks, vendorsRequiringReview, documentsExpiringSoon, basePath, tasksPath, planName, limitsSummary }: EnterpriseDashboardOverviewProps) {
  const openTasks = tasks.filter((task) => task.status !== 'done');
  const operatingSignals = Math.max(openTasks.length + vendorsRequiringReview.length + documentsExpiringSoon.length, 1);
  const localizedRoot = basePath.includes('/dashboard') ? basePath.split('/dashboard')[0] : '';
  const panelItems = [
    { key: 'compliance', icon: ShieldCheck, title: copy.panels.compliance.title, body: copy.panels.compliance.body, metric: `${summary.complianceScore}%`, tone: 'Readiness review', href: `${basePath}/reports-governance` },
    { key: 'risk', icon: CircleAlert, title: copy.panels.risk.title, body: copy.panels.risk.body, metric: `${formatCount(summary.criticalRisks)} critical`, tone: 'Risk register', href: `${basePath}/risks` },
    { key: 'tasks', icon: CheckCircle2, title: copy.panels.tasks.title, body: copy.panels.tasks.body, metric: `${formatCount(openTasks.length)} open`, tone: 'Approval queue', href: tasksPath },
    { key: 'documents', icon: FileText, title: copy.panels.documents.title, body: copy.panels.documents.body, metric: `${formatCount(summary.missingDocuments)} gaps`, tone: 'Evidence pack', href: `${basePath}/documents` },
    { key: 'vendors', icon: UsersRound, title: copy.panels.vendors.title, body: copy.panels.vendors.body, metric: `${formatCount(summary.highRiskVendors)} high`, tone: 'Vendor review', href: `${localizedRoot}/vendor-assurance` },
    { key: 'audit', icon: Gauge, title: copy.panels.audit.title, body: copy.panels.audit.body, metric: `${operatingSignals} signals`, tone: 'Traceable events', href: `${basePath}/reports-governance` },
    { key: 'billing', icon: ReceiptText, title: copy.panels.billing.title, body: copy.panels.billing.body, metric: planName, tone: 'Plan controls', href: `${basePath}/billing` },
  ];

  return (
    <section id="enterprise-compliance-overview" aria-labelledby="enterprise-compliance-overview-title" className="scroll-mt-28 rounded-xl border border-slate-800 bg-[#0b121e] p-5 md:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">{copy.eyebrow}</p>
          <div>
            <h2 id="enterprise-compliance-overview-title" className="text-3xl font-semibold tracking-tight text-white">{copy.title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400 md:text-base">{copy.subtitle}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-400">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-800 bg-[#0d1624] px-3 py-1"><ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> readiness review</span>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-800 bg-[#0d1624] px-3 py-1"><LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" /> tenant isolated</span>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-800 bg-[#0d1624] px-3 py-1"><UsersRound className="h-3.5 w-3.5" aria-hidden="true" /> role-based access</span>
          </div>
          <p className="text-sm text-slate-500">{limitsSummary}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button asChild className="h-10 rounded-lg bg-blue-600 px-4 text-white hover:bg-blue-700"><Link href={basePath}>{copy.openOrganizations} <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></Button>
          <Button asChild variant="outline" className="h-10 rounded-lg border-slate-700 bg-[#0d1624] px-4 text-slate-100 hover:bg-slate-800 hover:text-white"><Link href={`${basePath}/documents`}>{copy.viewDocuments}</Link></Button>
          <Button asChild variant="outline" className="h-10 rounded-lg border-slate-700 bg-[#0d1624] px-4 text-slate-100 hover:bg-slate-800 hover:text-white"><Link href={tasksPath}>{copy.viewTasks}</Link></Button>
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {panelItems.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.key} className="group rounded-xl border border-slate-800 bg-[#0d1624] p-5 transition hover:border-slate-700">
              <div className="flex items-start justify-between gap-3">
                <span className="rounded-lg bg-slate-800 p-2 text-blue-300" aria-hidden="true"><Icon className="h-5 w-5" /></span>
                <span className="rounded-md border border-slate-700 bg-[#0b121e] px-2.5 py-1 text-xs font-semibold text-slate-300">{item.metric}</span>
              </div>
              <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{item.tone}</p>
              <h3 className="mt-2 text-lg font-semibold leading-6 text-white">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">{item.body}</p>
              <Link href={item.href} className="mt-4 inline-flex items-center gap-2 rounded-md text-sm font-semibold text-blue-300 transition hover:text-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">Review <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden="true" /></Link>
            </article>
          );
        })}
      </div>

      <div className="mt-6 rounded-xl border border-slate-800 bg-[#0d1624] p-4 md:p-5">
        <h3 className="text-xl font-semibold tracking-tight text-white">{copy.statesTitle}</h3>
        <p className="mt-1 text-sm text-slate-400">{copy.statesSubtitle}</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {stateKeys.map((state) => {
            const item = copy.states[state];
            const role = stateRole(state);
            return (
              <div key={state} role={role} aria-live={role === 'alert' ? 'assertive' : 'polite'} className="rounded-lg border border-slate-800 bg-[#0b121e] p-4 text-white focus-within:ring-2 focus-within:ring-blue-400" tabIndex={0}>
                <div className="flex items-start justify-between gap-3"><p className="font-semibold leading-6">{item.title}</p><span className="rounded-md border border-slate-700 px-2.5 py-1 text-[11px] font-medium text-slate-400">{item.tone}</span></div>
                <p className="mt-2 text-sm leading-6 text-slate-400">{item.body}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
