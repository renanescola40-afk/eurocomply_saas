import Link from 'next/link';
import { ArrowRight, CheckCircle2, FileCheck2, Radar, ShieldAlert } from 'lucide-react';

import type { Locale } from '@/lib/i18n/routing';
import type { DashboardSummary } from '@/server/queries/dashboard';
import type { DashboardAiSystemSummary, DashboardAuditEventPreview, OrganizationWorkflowReadiness } from '@/server/queries/organization-dashboard';

type PreviewTask = { id: string; title?: string | null; status?: string | null; priority?: string | null; due_date?: string | null };
type PreviewVendor = { id: string; name?: string | null; risk_level?: string | null; review_status?: string | null; next_review_at?: string | null };
type PreviewDocument = { id: string; title?: string | null; name?: string | null; status?: string | null; expires_at?: string | null; category?: string | null };
type PreviewRisk = { id: string; title?: string | null; status?: string | null; risk_score?: number | string | null; category?: string | null };

type Props = {
  locale: Locale;
  summary: DashboardSummary;
  tasks: PreviewTask[];
  topRisks: PreviewRisk[];
  vendorsRequiringReview: PreviewVendor[];
  documentsExpiringSoon: PreviewDocument[];
  aiSystemSummary: DashboardAiSystemSummary;
  auditEvents: DashboardAuditEventPreview[];
  workflowReadiness?: OrganizationWorkflowReadiness;
  basePath: string;
  tasksPath: string;
  planName: string;
  limitsSummary: string;
  currentUserRole: string;
  canManageWorkspace: boolean;
  canManageBilling: boolean;
};

const copy = {
  en: {
    eyebrow: 'Executive governance workspace', title: 'AI Governance Overview', subtitle: 'Decision-ready visibility across AI inventory, risk, evidence and open governance work.',
    score: 'Governance readiness', systems: 'AI systems', high: 'High attention', actions: 'Open actions', evidence: 'Evidence readiness',
    riskProfile: 'Risk distribution', maturity: 'Governance maturity', pipeline: 'Review pipeline', evidenceCoverage: 'Evidence readiness', recent: 'Recent activity', priority: 'High priority actions',
    riskArea: 'Area', maturityValue: 'Maturity', status: 'Status', item: 'Review item', due: 'Due', level: 'Priority', ready: 'Ready', total: 'Total',
    riskTreatment: 'Risk treatment', aiInventory: 'AI inventory', workExecution: 'Work execution', evidenceControl: 'Evidence control',
    onTrack: 'On track', attention: 'Attention', blocked: 'Blocked', noData: 'No recorded data', viewAll: 'View all',
    operationalNote: 'Operational readiness based on recorded workspace signals — not a legal compliance certification.',
  },
  pt: {
    eyebrow: 'Workspace executivo de governança', title: 'Visão Geral da Governança de IA', subtitle: 'Visibilidade pronta para decisão sobre inventário de IA, risco, evidências e trabalho de governança em aberto.',
    score: 'Prontidão de governança', systems: 'Sistemas de IA', high: 'Alta atenção', actions: 'Ações abertas', evidence: 'Prontidão de evidências',
    riskProfile: 'Distribuição de risco', maturity: 'Maturidade de governança', pipeline: 'Pipeline de revisão', evidenceCoverage: 'Prontidão de evidências', recent: 'Atividade recente', priority: 'Ações prioritárias',
    riskArea: 'Área', maturityValue: 'Maturidade', status: 'Estado', item: 'Item de revisão', due: 'Prazo', level: 'Prioridade', ready: 'Pronto', total: 'Total',
    riskTreatment: 'Tratamento de risco', aiInventory: 'Inventário de IA', workExecution: 'Execução de trabalho', evidenceControl: 'Controlo de evidências',
    onTrack: 'No caminho', attention: 'Atenção', blocked: 'Bloqueado', noData: 'Sem dados registados', viewAll: 'Ver tudo',
    operationalNote: 'Prontidão operacional baseada nos sinais registados no workspace — não é certificação jurídica de compliance.',
  },
};

function percentage(total: number, open: number) {
  if (total <= 0) return null;
  return Math.max(0, Math.min(100, Math.round(((total - open) / total) * 100)));
}

function displayPercent(value: number | null) {
  return value === null ? '—' : `${value}%`;
}

function tone(value: number | null) {
  if (value === null) return 'bg-slate-700';
  if (value >= 80) return 'bg-emerald-400';
  if (value >= 55) return 'bg-amber-400';
  return 'bg-rose-400';
}

function statusText(value: number | null, text: (typeof copy)['en']) {
  if (value === null) return text.noData;
  if (value >= 80) return text.onTrack;
  if (value >= 55) return text.attention;
  return text.blocked;
}

function formatDate(locale: Locale, value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date);
}

function formatAction(value?: string | null) {
  return value?.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim() || 'Recorded event';
}

function priorityTone(priority?: string | null) {
  const normalized = priority?.toLowerCase() ?? '';
  if (normalized.includes('critical') || normalized === 'p0' || normalized === 'high') return 'border-rose-400/20 bg-rose-400/[0.07] text-rose-300';
  if (normalized.includes('medium') || normalized === 'p1') return 'border-amber-400/20 bg-amber-400/[0.07] text-amber-300';
  return 'border-slate-700 bg-slate-900/70 text-slate-400';
}

export function EnterpriseExecutiveOverviewV2({ locale, summary, tasks, topRisks, vendorsRequiringReview, documentsExpiringSoon, aiSystemSummary, auditEvents, workflowReadiness, basePath, tasksPath }: Props) {
  const text = locale === 'pt' ? copy.pt : copy.en;
  const riskCompletion = percentage(summary.totals.risks, summary.openRisks);
  const taskCompletion = percentage(summary.totals.tasks, summary.openTasks);
  const evidenceReadiness = percentage(summary.totals.documents, summary.missingDocuments);
  const inventoryReadiness = aiSystemSummary.total > 0 ? 100 : null;
  const highAttention = aiSystemSummary.high + aiSystemSummary.unacceptable;

  const kpis = [
    { label: text.score, value: `${summary.complianceScore}%`, detail: workflowReadiness?.status === 'ready' ? text.onTrack : workflowReadiness?.status === 'blocked' ? text.blocked : text.attention, href: `${basePath}/reports-governance` },
    { label: text.systems, value: String(aiSystemSummary.total), detail: `${highAttention} ${text.high.toLowerCase()}`, href: `/${locale}/ai-systems` },
    { label: text.high, value: String(highAttention + summary.criticalRisks), detail: `${summary.criticalRisks} critical risk signals`, href: `${basePath}/risks` },
    { label: text.actions, value: String(summary.openTasks), detail: tasks[0]?.title || text.noData, href: tasksPath },
    { label: text.evidence, value: displayPercent(evidenceReadiness), detail: `${summary.missingDocuments} missing / open`, href: `${basePath}/documents` },
  ];

  const riskRows = [
    { label: 'Unacceptable', count: aiSystemSummary.unacceptable, tone: 'bg-rose-500' },
    { label: 'High', count: aiSystemSummary.high, tone: 'bg-orange-400' },
    { label: 'Limited', count: aiSystemSummary.limited, tone: 'bg-amber-300' },
    { label: 'Minimal', count: aiSystemSummary.minimal, tone: 'bg-emerald-400' },
  ];
  const riskTotal = Math.max(aiSystemSummary.total, 1);

  const maturityRows = [
    { label: text.aiInventory, value: inventoryReadiness },
    { label: text.riskTreatment, value: riskCompletion },
    { label: text.evidenceControl, value: evidenceReadiness },
    { label: text.workExecution, value: taskCompletion },
  ];

  const nextReviews = tasks.slice(0, 4);
  const evidenceRows = [
    { label: 'Documents', ready: Math.max(0, summary.totals.documents - summary.missingDocuments), total: summary.totals.documents, value: evidenceReadiness },
    { label: 'Vendor reviews', ready: Math.max(0, summary.totals.vendors - vendorsRequiringReview.length), total: summary.totals.vendors, value: percentage(summary.totals.vendors, vendorsRequiringReview.length) },
    { label: 'Risk treatment', ready: Math.max(0, summary.totals.risks - summary.openRisks), total: summary.totals.risks, value: riskCompletion },
    { label: 'Task execution', ready: Math.max(0, summary.totals.tasks - summary.openTasks), total: summary.totals.tasks, value: taskCompletion },
  ];

  return (
    <section className="min-w-0 space-y-5 text-slate-100" aria-labelledby="ui-v2-dashboard-title">
      <header className="flex flex-col gap-4 border-b border-slate-800/80 pb-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-400">{text.eyebrow}</p>
          <h1 id="ui-v2-dashboard-title" className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-white md:text-[30px]">{text.title}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">{text.subtitle}</p>
        </div>
        <div className="max-w-md rounded-lg border border-slate-800 bg-slate-950/45 px-3 py-2.5 text-xs leading-5 text-slate-500">{text.operationalNote}</div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {kpis.map((item) => (
          <Link key={item.label} href={item.href} className="group rounded-xl border border-slate-800/90 bg-[#0d1420] p-4 transition hover:border-blue-500/30 hover:bg-[#101a29] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70">
            <div className="flex items-start justify-between gap-3"><p className="text-xs font-medium text-slate-400">{item.label}</p><ArrowRight className="h-3.5 w-3.5 text-slate-700 transition group-hover:translate-x-0.5 group-hover:text-blue-400" /></div>
            <p className="mt-4 font-mono text-[28px] font-semibold leading-none tracking-[-0.04em] text-white tabular-nums">{item.value}</p>
            <p className="mt-2 truncate text-[11px] text-slate-500">{item.detail}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-4">
        <article className="rounded-xl border border-slate-800/90 bg-[#0d1420] p-5">
          <div className="flex items-center justify-between"><div><p className="text-sm font-semibold text-white">{text.riskProfile}</p><p className="mt-1 text-xs text-slate-500">Across inventoried AI systems</p></div><Radar className="h-4 w-4 text-blue-400" /></div>
          <div className="mt-5 overflow-hidden rounded-lg border border-slate-800/80">
            <div className="grid grid-cols-[1fr_70px_70px] bg-slate-950/45 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600"><span>Risk level</span><span className="text-right">Systems</span><span className="text-right">% total</span></div>
            {riskRows.map((row) => <div key={row.label} className="grid grid-cols-[1fr_70px_70px] items-center border-t border-slate-800/70 px-3 py-2.5 text-xs"><span className="flex items-center gap-2 text-slate-300"><span className={`h-2 w-2 rounded-sm ${row.tone}`} />{row.label}</span><span className="text-right font-mono text-slate-300 tabular-nums">{row.count}</span><span className="text-right font-mono text-slate-500 tabular-nums">{Math.round((row.count / riskTotal) * 100)}%</span></div>)}
          </div>
          <Link href={`/${locale}/ai-systems`} className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-blue-400 hover:text-blue-300">{text.viewAll}<ArrowRight className="h-3 w-3" /></Link>
        </article>

        <article className="rounded-xl border border-slate-800/90 bg-[#0d1420] p-5">
          <div><p className="text-sm font-semibold text-white">{text.maturity}</p><p className="mt-1 text-xs text-slate-500">Operational control coverage</p></div>
          <div className="mt-5 space-y-4">
            {maturityRows.map((row) => <div key={row.label}><div className="mb-1.5 flex items-center justify-between gap-3 text-xs"><span className="text-slate-400">{row.label}</span><span className="font-mono text-slate-300 tabular-nums">{displayPercent(row.value)}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-800"><div className={`h-full rounded-full ${tone(row.value)}`} style={{ width: `${row.value ?? 0}%` }} /></div><p className="mt-1.5 text-[10px] text-slate-600">{statusText(row.value, text)}</p></div>)}
          </div>
        </article>

        <article className="rounded-xl border border-slate-800/90 bg-[#0d1420] p-5">
          <div><p className="text-sm font-semibold text-white">{text.pipeline}</p><p className="mt-1 text-xs text-slate-500">Upcoming governance work</p></div>
          <div className="mt-4 divide-y divide-slate-800/70">
            {nextReviews.length ? nextReviews.map((task) => <div key={task.id} className="grid grid-cols-[1fr_auto] gap-3 py-3"><div className="min-w-0"><p className="truncate text-xs font-medium text-slate-300">{task.title || 'Governance review'}</p><p className="mt-1 text-[10px] text-slate-600">{formatDate(locale, task.due_date)}</p></div><span className={`self-start rounded-md border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] ${priorityTone(task.priority)}`}>{task.priority || task.status || 'Open'}</span></div>) : <p className="py-8 text-center text-xs text-slate-600">{text.noData}</p>}
          </div>
          <Link href={tasksPath} className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-blue-400 hover:text-blue-300">{text.viewAll}<ArrowRight className="h-3 w-3" /></Link>
        </article>

        <article className="rounded-xl border border-slate-800/90 bg-[#0d1420] p-5">
          <div><p className="text-sm font-semibold text-white">{text.evidenceCoverage}</p><p className="mt-1 text-xs text-slate-500">By operational area</p></div>
          <div className="mt-4 overflow-hidden rounded-lg border border-slate-800/80">
            <div className="grid grid-cols-[1fr_64px_64px] bg-slate-950/45 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-600"><span>Area</span><span className="text-right">Ready</span><span className="text-right">%</span></div>
            {evidenceRows.map((row) => <div key={row.label} className="grid grid-cols-[1fr_64px_64px] items-center border-t border-slate-800/70 px-3 py-2.5 text-xs"><span className="truncate text-slate-400">{row.label}</span><span className="text-right font-mono text-slate-300 tabular-nums">{row.ready}/{row.total}</span><span className="text-right font-mono text-slate-500 tabular-nums">{displayPercent(row.value)}</span></div>)}
          </div>
          <div className="mt-4 flex items-center justify-between text-[10px] text-slate-600"><span>{documentsExpiringSoon.length} documents require review</span><FileCheck2 className="h-4 w-4 text-blue-400" /></div>
        </article>
      </div>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <article className="min-w-0 rounded-xl border border-slate-800/90 bg-[#0d1420] p-5">
          <div className="flex items-center justify-between"><div><p className="text-sm font-semibold text-white">{text.priority}</p><p className="mt-1 text-xs text-slate-500">Highest-impact work currently visible</p></div><ShieldAlert className="h-4 w-4 text-amber-400" /></div>
          <div className="mt-4 max-w-full overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-xs"><thead className="border-y border-slate-800/80 text-[10px] uppercase tracking-[0.1em] text-slate-600"><tr><th className="py-2.5 pr-4 font-semibold">Priority</th><th className="py-2.5 pr-4 font-semibold">Action</th><th className="py-2.5 pr-4 font-semibold">Source</th><th className="py-2.5 pr-4 font-semibold">Due</th><th className="py-2.5 font-semibold">Status</th></tr></thead><tbody className="divide-y divide-slate-800/65">
              {tasks.slice(0, 3).map((task) => <tr key={task.id}><td className="py-3 pr-4"><span className={`rounded-md border px-2 py-1 text-[9px] font-semibold uppercase ${priorityTone(task.priority)}`}>{task.priority || 'Open'}</span></td><td className="max-w-[300px] truncate py-3 pr-4 font-medium text-slate-300">{task.title || 'Governance action'}</td><td className="py-3 pr-4 text-slate-500">Task register</td><td className="py-3 pr-4 font-mono text-slate-500 tabular-nums">{formatDate(locale, task.due_date)}</td><td className="py-3 text-slate-500">{task.status || 'Open'}</td></tr>)}
              {!tasks.length && topRisks.slice(0, 3).map((risk) => <tr key={risk.id}><td className="py-3 pr-4"><span className="rounded-md border border-rose-400/20 bg-rose-400/[0.07] px-2 py-1 text-[9px] font-semibold uppercase text-rose-300">Risk</span></td><td className="max-w-[300px] truncate py-3 pr-4 font-medium text-slate-300">{risk.title || 'Risk review'}</td><td className="py-3 pr-4 text-slate-500">Risk register</td><td className="py-3 pr-4 text-slate-600">—</td><td className="py-3 text-slate-500">{risk.status || 'Open'}</td></tr>)}
            </tbody></table>
          </div>
        </article>

        <article className="rounded-xl border border-slate-800/90 bg-[#0d1420] p-5">
          <div className="flex items-center justify-between"><div><p className="text-sm font-semibold text-white">{text.recent}</p><p className="mt-1 text-xs text-slate-500">Latest audit events</p></div><CheckCircle2 className="h-4 w-4 text-emerald-400" /></div>
          <div className="mt-4 divide-y divide-slate-800/70">
            {auditEvents.slice(0, 5).map((event) => <div key={event.id} className="py-3"><div className="flex items-start gap-3"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" /><div className="min-w-0"><p className="truncate text-xs font-medium capitalize text-slate-300">{formatAction(event.action)}</p><p className="mt-1 text-[10px] text-slate-600">{event.entity_type || 'workspace'} · {formatDate(locale, event.created_at)}</p></div></div></div>)}
            {!auditEvents.length ? <p className="py-8 text-center text-xs text-slate-600">{text.noData}</p> : null}
          </div>
        </article>
      </div>
    </section>
  );
}
