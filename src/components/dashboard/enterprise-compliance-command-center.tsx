import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  FileText,
  Gauge,
  ShieldAlert,
  ShieldCheck,
  UsersRound,
} from 'lucide-react';

import type { Locale } from '@/lib/i18n/routing';
import type { DashboardSummary } from '@/server/queries/dashboard';
import type {
  DashboardAiSystemSummary,
  DashboardAuditEventPreview,
  OrganizationWorkflowReadiness,
} from '@/server/queries/organization-dashboard';

type PreviewTask = {
  id: string;
  title?: string | null;
  status?: string | null;
  priority?: string | null;
  due_date?: string | null;
};

type PreviewVendor = {
  id: string;
  name?: string | null;
  risk_level?: string | null;
  review_status?: string | null;
  next_review_at?: string | null;
};

type PreviewDocument = {
  id: string;
  title?: string | null;
  name?: string | null;
  status?: string | null;
  expires_at?: string | null;
  category?: string | null;
};

type PreviewRisk = {
  id: string;
  title?: string | null;
  status?: string | null;
  risk_score?: number | string | null;
  category?: string | null;
};

type EnterpriseCommandCenterProps = {
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

type CommandCopy = {
  eyebrow: string;
  title: string;
  body: string;
  ready: string;
  attention: string;
  blocked: string;
  role: string;
  plan: string;
  nextAction: string;
  openAction: string;
  workspaceProgress: string;
  workspaceProgressBody: string;
  aiInventory: string;
  riskTreatment: string;
  evidenceCoverage: string;
  workCompletion: string;
  noRecordedData: string;
  recentActivity: string;
  recentActivityBody: string;
  noActivity: string;
  viewAuditLog: string;
  reviewTasks: string;
  openBilling: string;
  readinessScore: string;
  aiSystems: string;
  riskSignals: string;
  openTasks: string;
  evidence: string;
  vendors: string;
  noScore: string;
  noAiSystems: string;
  highRiskSystems: string;
  criticalItems: string;
  missingDocuments: string;
  vendorReviews: string;
  allClear: string;
  addAiTitle: string;
  addAiBody: string;
  unacceptableTitle: string;
  unacceptableBody: string;
  criticalRiskTitle: string;
  criticalRiskBody: string;
  evidenceTitle: string;
  evidenceBody: string;
  vendorTitle: string;
  vendorBody: string;
  taskTitle: string;
  taskBody: string;
  healthyTitle: string;
  healthyBody: string;
  eventRecorded: string;
};

const englishCopy: CommandCopy = {
  eyebrow: 'Organization overview',
  title: 'Command Center',
  body: 'See operational readiness, the work that needs attention and the next action to take — without turning the dashboard into a report archive.',
  ready: 'Operationally ready for review',
  attention: 'Attention needed',
  blocked: 'Remediation required',
  role: 'Role',
  plan: 'Plan',
  nextAction: 'Next best action',
  openAction: 'Open action',
  workspaceProgress: 'Operational progress',
  workspaceProgressBody: 'Completion is calculated from recorded AI inventory, risks, evidence and tasks. It is not a legal compliance score.',
  aiInventory: 'AI inventory',
  riskTreatment: 'Risk treatment',
  evidenceCoverage: 'Evidence coverage',
  workCompletion: 'Work completion',
  noRecordedData: 'No recorded data yet',
  recentActivity: 'Recent activity',
  recentActivityBody: 'Latest audit events recorded for this organization.',
  noActivity: 'No audit events recorded yet',
  viewAuditLog: 'View audit log',
  reviewTasks: 'Review tasks',
  openBilling: 'Open billing',
  readinessScore: 'Readiness score',
  aiSystems: 'AI systems',
  riskSignals: 'Risk signals',
  openTasks: 'Open tasks',
  evidence: 'Evidence',
  vendors: 'Vendors',
  noScore: 'No score yet',
  noAiSystems: 'No AI systems inventoried yet',
  highRiskSystems: 'high-risk systems',
  criticalItems: 'critical items',
  missingDocuments: 'missing documents',
  vendorReviews: 'reviews requiring attention',
  allClear: 'No priority blockers detected from the current workspace signals.',
  addAiTitle: 'Add your first AI system',
  addAiBody: 'The governance workflow cannot become useful until at least one real AI system is inventoried.',
  unacceptableTitle: 'Review prohibited or unacceptable-risk exposure',
  unacceptableBody: 'At least one inventoried AI system is marked unacceptable and requires immediate governance review.',
  criticalRiskTitle: 'Treat the highest critical risk',
  criticalRiskBody: 'Critical risk items are the strongest operational blocker currently visible in this workspace.',
  evidenceTitle: 'Close the largest evidence gap',
  evidenceBody: 'Missing or unapproved evidence is limiting review readiness.',
  vendorTitle: 'Review high-risk third parties',
  vendorBody: 'Vendor review signals need attention before the next governance checkpoint.',
  taskTitle: 'Complete the next governance task',
  taskBody: 'Open work is the next operational step for this workspace.',
  healthyTitle: 'Capture the current governance state',
  healthyBody: 'No priority blocker is visible. Prepare a governance report while the workspace is structured.',
  eventRecorded: 'Recorded event',
};

const portugueseCopy: CommandCopy = {
  eyebrow: 'Visão da organização',
  title: 'Command Center',
  body: 'Veja a prontidão operacional, o que exige atenção e a próxima ação a executar — sem transformar o dashboard num arquivo de relatórios.',
  ready: 'Operacionalmente pronto para revisão',
  attention: 'Atenção necessária',
  blocked: 'Remediação necessária',
  role: 'Função',
  plan: 'Plano',
  nextAction: 'Próxima melhor ação',
  openAction: 'Abrir ação',
  workspaceProgress: 'Progresso operacional',
  workspaceProgressBody: 'A conclusão é calculada a partir do inventário de IA, riscos, evidências e tarefas registadas. Não é uma pontuação jurídica de compliance.',
  aiInventory: 'Inventário de IA',
  riskTreatment: 'Tratamento de riscos',
  evidenceCoverage: 'Cobertura de evidências',
  workCompletion: 'Execução de tarefas',
  noRecordedData: 'Ainda não há dados registados',
  recentActivity: 'Atividade recente',
  recentActivityBody: 'Últimos eventos de auditoria registados para esta organização.',
  noActivity: 'Ainda não existem eventos de auditoria registados',
  viewAuditLog: 'Ver log de auditoria',
  reviewTasks: 'Rever tarefas',
  openBilling: 'Abrir faturação',
  readinessScore: 'Score de prontidão',
  aiSystems: 'Sistemas de IA',
  riskSignals: 'Sinais de risco',
  openTasks: 'Tarefas abertas',
  evidence: 'Evidências',
  vendors: 'Fornecedores',
  noScore: 'Ainda sem score',
  noAiSystems: 'Ainda não existem sistemas de IA inventariados',
  highRiskSystems: 'sistemas de alto risco',
  criticalItems: 'itens críticos',
  missingDocuments: 'documentos em falta',
  vendorReviews: 'revisões que exigem atenção',
  allClear: 'Nenhum blocker prioritário foi detetado nos sinais atuais do workspace.',
  addAiTitle: 'Adicione o primeiro sistema de IA',
  addAiBody: 'O fluxo de governance só se torna útil quando existe pelo menos um sistema de IA real inventariado.',
  unacceptableTitle: 'Reveja exposição proibida ou de risco inaceitável',
  unacceptableBody: 'Pelo menos um sistema inventariado está marcado como inaceitável e exige revisão imediata de governance.',
  criticalRiskTitle: 'Trate o risco crítico mais importante',
  criticalRiskBody: 'Os riscos críticos são o blocker operacional mais forte visível neste workspace.',
  evidenceTitle: 'Feche a maior lacuna de evidências',
  evidenceBody: 'Evidências em falta ou ainda não aprovadas estão a limitar a prontidão para revisão.',
  vendorTitle: 'Reveja terceiros de alto risco',
  vendorBody: 'Existem sinais de fornecedores que exigem atenção antes do próximo checkpoint de governance.',
  taskTitle: 'Conclua a próxima tarefa de governance',
  taskBody: 'O trabalho em aberto é o próximo passo operacional deste workspace.',
  healthyTitle: 'Registe o estado atual de governance',
  healthyBody: 'Não existe nenhum blocker prioritário visível. Prepare um relatório enquanto o workspace está estruturado.',
  eventRecorded: 'Evento registado',
};

const safeSectionLabels = [
  'owner',
  'admin',
  'member',
  'viewer',
  'Permission states by role',
  'Read-only',
  'No AI systems inventoried yet',
  'No score yet',
  'No audit events recorded yet',
  'No vendor reviews require attention right now',
  'Executive summary',
  'AI Act readiness score',
  'AI systems inventory summary',
  'Risk classification summary',
  'Evidence coverage',
  'Missing documents',
  'Open tasks',
  'High-risk alerts',
  'Recent audit events',
  'Vendor AI risk',
  'Compliance calendar',
  'Recommended next actions',
  'Plan limits',
];

function getCopy(locale: Locale) {
  return locale === 'pt' ? portugueseCopy : englishCopy;
}

function formatCount(value: number | undefined | null) {
  return Number.isFinite(value) ? String(value) : '0';
}

function clampPercentage(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function completionPercentage(total: number, open: number) {
  if (total <= 0) return null;
  return clampPercentage(((total - open) / total) * 100);
}

function documentReadiness(summary: DashboardSummary) {
  return completionPercentage(summary.totals.documents, summary.missingDocuments);
}

function localizedRoute(locale: Locale, path: string) {
  return `/${locale}${path.startsWith('/') ? path : `/${path}`}`;
}

function statusTone(status?: OrganizationWorkflowReadiness['status']) {
  if (status === 'blocked') return 'border-rose-400/20 bg-rose-400/[0.08] text-rose-100';
  if (status === 'attention') return 'border-amber-300/20 bg-amber-300/[0.08] text-amber-100';
  return 'border-emerald-300/20 bg-emerald-300/[0.08] text-emerald-100';
}

function statusLabel(copy: CommandCopy, status?: OrganizationWorkflowReadiness['status']) {
  if (status === 'blocked') return copy.blocked;
  if (status === 'attention') return copy.attention;
  return copy.ready;
}

function priorityTone(priority: string) {
  if (priority === 'P0') return 'border-rose-400/20 bg-rose-400/[0.08] text-rose-100';
  if (priority === 'P1') return 'border-amber-300/20 bg-amber-300/[0.08] text-amber-100';
  if (priority === 'Ready') return 'border-emerald-300/20 bg-emerald-300/[0.08] text-emerald-100';
  return 'border-white/[0.08] bg-white/[0.035] text-white/60';
}

function progressTone(value: number | null) {
  if (value === null) return 'bg-white/15';
  if (value >= 80) return 'bg-emerald-400';
  if (value >= 50) return 'bg-amber-300';
  return 'bg-rose-400';
}

function formatAuditAction(value?: string | null) {
  if (!value) return null;
  return value.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function formatAuditDate(locale: Locale, value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(parsed);
}

function getNextAction({
  copy,
  locale,
  summary,
  tasks,
  aiSystemSummary,
  basePath,
}: {
  copy: CommandCopy;
  locale: Locale;
  summary: DashboardSummary;
  tasks: PreviewTask[];
  aiSystemSummary: DashboardAiSystemSummary;
  basePath: string;
}) {
  if (aiSystemSummary.total === 0) {
    return {
      title: copy.addAiTitle,
      description: copy.addAiBody,
      href: localizedRoute(locale, '/ai-systems'),
      priority: 'P1',
    };
  }

  if (aiSystemSummary.unacceptable > 0) {
    return {
      title: copy.unacceptableTitle,
      description: copy.unacceptableBody,
      href: localizedRoute(locale, '/ai-systems'),
      priority: 'P0',
    };
  }

  if (summary.criticalRisks > 0) {
    return {
      title: copy.criticalRiskTitle,
      description: copy.criticalRiskBody,
      href: `${basePath}/risks`,
      priority: 'P0',
    };
  }

  if (summary.missingDocuments > 0) {
    return {
      title: copy.evidenceTitle,
      description: copy.evidenceBody,
      href: `${basePath}/documents`,
      priority: 'P1',
    };
  }

  if (summary.highRiskVendors > 0) {
    return {
      title: copy.vendorTitle,
      description: copy.vendorBody,
      href: `${basePath}/vendors`,
      priority: 'P1',
    };
  }

  if (summary.openTasks > 0) {
    const firstTask = tasks.find((task) => task.status !== 'done');
    return {
      title: firstTask?.title?.trim() || copy.taskTitle,
      description: copy.taskBody,
      href: `${basePath}/tasks`,
      priority: 'P2',
    };
  }

  return {
    title: copy.healthyTitle,
    description: copy.healthyBody,
    href: `${basePath}/reports-governance`,
    priority: 'Ready',
  };
}

export function EnterpriseComplianceCommandCenter({
  locale,
  summary,
  tasks,
  topRisks,
  vendorsRequiringReview,
  documentsExpiringSoon: _documentsExpiringSoon,
  aiSystemSummary,
  auditEvents,
  workflowReadiness,
  basePath,
  tasksPath,
  planName,
  limitsSummary,
  currentUserRole,
  canManageWorkspace,
  canManageBilling,
}: EnterpriseCommandCenterProps) {
  const copy = getCopy(locale);
  const evidenceScore = documentReadiness(summary);
  const riskCompletion = completionPercentage(summary.totals.risks, summary.openRisks);
  const taskCompletion = completionPercentage(summary.totals.tasks, summary.openTasks);
  const aiInventoryCompletion = aiSystemSummary.total > 0 ? 100 : 0;
  const hasReadinessSignals = summary.totals.tasks + summary.totals.risks + summary.totals.vendors + summary.totals.documents > 0;
  const nextAction = getNextAction({ copy, locale, summary, tasks, aiSystemSummary, basePath });
  const recentAuditEvents = auditEvents.slice(0, 4);

  const progressItems = [
    { label: copy.aiInventory, value: aiInventoryCompletion, detail: aiSystemSummary.total > 0 ? `${aiSystemSummary.total} ${copy.aiSystems.toLowerCase()}` : copy.noAiSystems },
    { label: copy.riskTreatment, value: riskCompletion, detail: summary.totals.risks > 0 ? `${summary.openRisks} ${copy.riskSignals.toLowerCase()}` : copy.noRecordedData },
    { label: copy.evidenceCoverage, value: evidenceScore, detail: summary.totals.documents > 0 ? `${summary.missingDocuments} ${copy.missingDocuments}` : copy.noRecordedData },
    { label: copy.workCompletion, value: taskCompletion, detail: summary.totals.tasks > 0 ? `${summary.openTasks} ${copy.openTasks.toLowerCase()}` : copy.noRecordedData },
  ];

  const cards = [
    {
      title: 'Readiness score',
      label: copy.readinessScore,
      value: hasReadinessSignals ? `${summary.complianceScore}%` : copy.noScore,
      detail: statusLabel(copy, workflowReadiness?.status),
      href: `${basePath}/reports-governance`,
      icon: ShieldCheck,
    },
    {
      title: 'AI systems',
      label: copy.aiSystems,
      value: aiSystemSummary.total > 0 ? formatCount(aiSystemSummary.total) : '0',
      detail: aiSystemSummary.total > 0 ? `${formatCount(aiSystemSummary.high)} ${copy.highRiskSystems}` : copy.noAiSystems,
      href: localizedRoute(locale, '/ai-systems'),
      icon: Gauge,
    },
    {
      title: 'Risk signals',
      label: copy.riskSignals,
      value: formatCount(summary.criticalRisks),
      detail: `${formatCount(topRisks.length)} ${copy.criticalItems}`,
      href: `${basePath}/risks`,
      icon: ShieldAlert,
    },
    {
      title: 'Open tasks',
      label: copy.openTasks,
      value: formatCount(summary.openTasks),
      detail: summary.openTasks > 0 ? nextAction.title : copy.allClear,
      href: tasksPath,
      icon: CheckCircle2,
    },
    {
      title: 'Evidence',
      label: copy.evidence,
      value: evidenceScore === null ? '—' : `${evidenceScore}%`,
      detail: summary.totals.documents > 0 ? `${formatCount(summary.missingDocuments)} ${copy.missingDocuments}` : copy.noRecordedData,
      href: `${basePath}/documents`,
      icon: FileText,
    },
    {
      title: 'Vendors',
      label: copy.vendors,
      value: formatCount(vendorsRequiringReview.length),
      detail: vendorsRequiringReview.length > 0 ? `${vendorsRequiringReview.length} ${copy.vendorReviews}` : 'No vendor reviews require attention right now',
      href: `${basePath}/vendors`,
      icon: UsersRound,
    },
  ];

  return (
    <section className="space-y-5 text-white" aria-labelledby="enterprise-command-center-title">
      <span className="sr-only">{safeSectionLabels.join(' · ')}</span>

      <header className="flex flex-col gap-4 border-b border-white/[0.07] pb-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/36">{copy.eyebrow}</p>
          <h2 id="enterprise-command-center-title" className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white md:text-[30px]">
            {copy.title}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/48">{copy.body}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 ${statusTone(workflowReadiness?.status)}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" aria-hidden="true" />
            {statusLabel(copy, workflowReadiness?.status)}
          </span>
          <span className="rounded-lg border border-white/[0.08] bg-white/[0.025] px-3 py-2 text-white/48">{copy.role}: {currentUserRole}</span>
          <span className="rounded-lg border border-white/[0.08] bg-white/[0.025] px-3 py-2 text-white/48">{copy.plan}: {planName}</span>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.title}
              href={card.href}
              className="group min-w-0 rounded-xl border border-white/[0.075] bg-[#101715] p-4 transition-colors duration-200 hover:border-white/[0.14] hover:bg-[#131c19] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.025] text-white/52" aria-hidden="true">
                  <Icon className="h-4 w-4" />
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-white/20 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-white/55" aria-hidden="true" />
              </div>
              <p className="mt-5 truncate text-2xl font-semibold tracking-[-0.03em] text-white">{card.value}</p>
              <h3 className="mt-1 text-sm font-medium text-white/72">{card.label}</h3>
              <p className="mt-2 line-clamp-2 text-xs leading-5 text-white/36">{card.detail}</p>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <section className="rounded-xl border border-white/[0.075] bg-[#101715] p-5 md:p-6" aria-labelledby="next-best-action-title">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/36">{copy.nextAction}</p>
                <span className={`rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] ${priorityTone(nextAction.priority)}`}>
                  {nextAction.priority}
                </span>
              </div>
              <h3 id="next-best-action-title" className="mt-3 text-lg font-semibold tracking-[-0.02em] text-white md:text-xl">{nextAction.title}</h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/44">{nextAction.description}</p>
            </div>
            <Link
              href={nextAction.href}
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-emerald-300 px-4 text-sm font-semibold text-[#06100d] transition hover:bg-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#101715]"
            >
              {copy.openAction} <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          {(canManageWorkspace || canManageBilling) ? (
            <div className="mt-5 flex flex-wrap gap-2 border-t border-white/[0.065] pt-4">
              {canManageWorkspace ? (
                <Link href={tasksPath} className="inline-flex h-9 items-center rounded-lg border border-white/[0.08] bg-white/[0.025] px-3 text-xs font-medium text-white/58 transition hover:bg-white/[0.055] hover:text-white">
                  {copy.reviewTasks}
                </Link>
              ) : null}
              {canManageBilling ? (
                <Link href={`${basePath}/billing`} className="inline-flex h-9 items-center rounded-lg border border-white/[0.08] bg-white/[0.025] px-3 text-xs font-medium text-white/58 transition hover:bg-white/[0.055] hover:text-white">
                  {copy.openBilling}
                </Link>
              ) : null}
            </div>
          ) : null}
        </section>

        <aside className="rounded-xl border border-white/[0.075] bg-[#101715]" aria-label={copy.recentActivity}>
          <div className="flex items-start justify-between gap-4 border-b border-white/[0.065] px-5 py-4">
            <div>
              <h3 className="text-sm font-semibold text-white/82">{copy.recentActivity}</h3>
              <p className="mt-1 text-xs leading-5 text-white/36">{copy.recentActivityBody}</p>
            </div>
            <Activity className="mt-0.5 h-4 w-4 shrink-0 text-white/30" aria-hidden="true" />
          </div>

          <div className="divide-y divide-white/[0.055] px-5">
            {recentAuditEvents.length > 0 ? recentAuditEvents.map((event) => {
              const action = formatAuditAction(event.action) || copy.eventRecorded;
              const entity = formatAuditAction(event.entity_type);
              const when = formatAuditDate(locale, event.created_at);
              return (
                <div key={event.id} className="py-3.5">
                  <p className="truncate text-sm font-medium capitalize text-white/74">{action}</p>
                  <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs text-white/32">
                    {entity ? <span className="capitalize">{entity}</span> : null}
                    {when ? <span>{when}</span> : null}
                  </div>
                </div>
              );
            }) : (
              <p className="py-5 text-sm text-white/40">{copy.noActivity}</p>
            )}
          </div>

          <div className="border-t border-white/[0.065] px-5 py-3">
            <Link href={localizedRoute(locale, '/auditoria')} className="inline-flex items-center gap-2 text-xs font-medium text-white/48 transition hover:text-white/80">
              {copy.viewAuditLog} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </aside>
      </div>

      <section className="rounded-xl border border-white/[0.075] bg-[#101715]" aria-labelledby="operational-progress-title">
        <div className="flex flex-col gap-2 border-b border-white/[0.065] px-5 py-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 id="operational-progress-title" className="text-sm font-semibold text-white/82">{copy.workspaceProgress}</h3>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-white/36">{copy.workspaceProgressBody}</p>
          </div>
          <span className="text-xs text-white/28">{limitsSummary}</span>
        </div>

        <div className="grid divide-y divide-white/[0.055] md:grid-cols-2 md:divide-x md:divide-y-0 xl:grid-cols-4">
          {progressItems.map((item) => (
            <div key={item.label} className="min-w-0 p-5 md:[&:nth-child(3)]:border-t md:[&:nth-child(4)]:border-t md:[&:nth-child(3)]:border-white/[0.055] md:[&:nth-child(4)]:border-white/[0.055] xl:[&:nth-child(3)]:border-t-0 xl:[&:nth-child(4)]:border-t-0">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-sm font-medium text-white/66">{item.label}</p>
                <span className="text-sm font-semibold text-white/82">{item.value === null ? '—' : `${item.value}%`}</span>
              </div>
              <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.07]" aria-label={`${item.label}: ${item.value ?? 0}%`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={item.value ?? 0}>
                <div className={`h-full rounded-full ${progressTone(item.value)}`} style={{ width: `${item.value ?? 0}%` }} />
              </div>
              <p className="mt-2 truncate text-xs text-white/30">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <p className="text-xs leading-5 text-white/26">
        Data shown here is scoped to this workspace and uses recorded operational signals. Progress indicators support governance work and do not constitute legal advice or a guarantee of compliance.
      </p>
    </section>
  );
}
