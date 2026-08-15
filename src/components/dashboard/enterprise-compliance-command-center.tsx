import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  FileText,
  Gauge,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  if (status === 'blocked') return 'border-rose-400/25 bg-rose-400/10 text-rose-100';
  if (status === 'attention') return 'border-amber-300/25 bg-amber-300/10 text-amber-100';
  return 'border-emerald-300/25 bg-emerald-300/10 text-emerald-100';
}

function statusLabel(copy: CommandCopy, status?: OrganizationWorkflowReadiness['status']) {
  if (status === 'blocked') return copy.blocked;
  if (status === 'attention') return copy.attention;
  return copy.ready;
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
  documentsExpiringSoon,
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
    <section className="premium-card rounded-[2rem] p-5 text-white md:p-8" aria-labelledby="enterprise-command-center-title">
      <span className="sr-only">{safeSectionLabels.join(' · ')}</span>

      <div className="grid gap-5 xl:grid-cols-[1.18fr_0.82fr]">
        <div className="rounded-[1.75rem] border border-white/10 bg-black/20 p-5 md:p-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="max-w-3xl">
              <Badge variant="outline" className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em] ${statusTone(workflowReadiness?.status)}`}>
                {statusLabel(copy, workflowReadiness?.status)}
              </Badge>
              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.24em] text-white/42">{copy.eyebrow}</p>
              <h2 id="enterprise-command-center-title" className="mt-2 text-3xl font-semibold tracking-[-0.045em] text-white md:text-5xl">
                {copy.title}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/58 md:text-base">{copy.body}</p>
            </div>

            <div className="flex flex-wrap gap-2 text-xs text-white/52">
              <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1">{copy.role}: {currentUserRole}</span>
              <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1">{copy.plan}: {planName}</span>
            </div>
          </div>

          <div className="mt-7 rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-5">
            <div className="flex items-start gap-3">
              <span className="rounded-2xl border border-primary/20 bg-primary/10 p-2.5 text-primary" aria-hidden="true">
                <Sparkles className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/42">{copy.nextAction}</p>
                  <span className="rounded-full border border-white/10 bg-black/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white/60">{nextAction.priority}</span>
                </div>
                <h3 className="mt-2 text-xl font-semibold tracking-tight text-white md:text-2xl">{nextAction.title}</h3>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/54">{nextAction.description}</p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button asChild className="rounded-full bg-white text-black hover:bg-white/90">
                <Link href={nextAction.href}>{copy.openAction} <ArrowRight className="h-4 w-4" /></Link>
              </Button>
              {canManageWorkspace ? (
                <Button asChild variant="outline" className="rounded-full border-white/15 bg-white/[0.04] text-white hover:bg-white/10">
                  <Link href={tasksPath}>{copy.reviewTasks}</Link>
                </Button>
              ) : null}
              {canManageBilling ? (
                <Button asChild variant="outline" className="rounded-full border-white/15 bg-white/[0.04] text-white hover:bg-white/10">
                  <Link href={`${basePath}/billing`}>{copy.openBilling}</Link>
                </Button>
              ) : null}
            </div>
          </div>
        </div>

        <aside className="rounded-[1.75rem] border border-white/10 bg-white/[0.025] p-5 md:p-6" aria-label={copy.recentActivity}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/42">{copy.recentActivity}</p>
              <p className="mt-2 text-sm leading-6 text-white/50">{copy.recentActivityBody}</p>
            </div>
            <Activity className="h-5 w-5 text-white/35" aria-hidden="true" />
          </div>

          <div className="mt-5 space-y-2">
            {recentAuditEvents.length > 0 ? recentAuditEvents.map((event) => {
              const action = formatAuditAction(event.action) || copy.eventRecorded;
              const entity = formatAuditAction(event.entity_type);
              const when = formatAuditDate(locale, event.created_at);
              return (
                <div key={event.id} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                  <p className="text-sm font-medium capitalize text-white/84">{action}</p>
                  <div className="mt-1 flex flex-wrap gap-x-2 text-xs text-white/38">
                    {entity ? <span className="capitalize">{entity}</span> : null}
                    {when ? <span>{when}</span> : null}
                  </div>
                </div>
              );
            }) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/15 p-5 text-sm text-white/45">
                {copy.noActivity}
              </div>
            )}
          </div>

          <Link href={localizedRoute(locale, '/auditoria')} className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-white/58 transition hover:text-white">
            {copy.viewAuditLog} <ArrowRight className="h-4 w-4" />
          </Link>
        </aside>
      </div>

      <div className="mt-5 rounded-[1.75rem] border border-white/10 bg-white/[0.025] p-5 md:p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/42">{copy.workspaceProgress}</p>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/50">{copy.workspaceProgressBody}</p>
          </div>
          <span className="text-xs text-white/32">{limitsSummary}</span>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {progressItems.map((item) => (
            <div key={item.label} className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-white/72">{item.label}</p>
                <span className="text-sm font-semibold text-white">{item.value === null ? '—' : `${item.value}%`}</span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10" aria-label={`${item.label}: ${item.value ?? 0}%`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={item.value ?? 0}>
                <div className={`h-full rounded-full ${progressTone(item.value)}`} style={{ width: `${item.value ?? 0}%` }} />
              </div>
              <p className="mt-2 text-xs leading-5 text-white/38">{item.detail}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.title} href={card.href} className="group rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-white/20 hover:bg-white/[0.055] focus:outline-none focus:ring-2 focus:ring-primary/70">
              <div className="flex items-start justify-between gap-3">
                <span className="rounded-xl bg-white/[0.07] p-2 text-white/70" aria-hidden="true"><Icon className="h-4 w-4" /></span>
                <ArrowRight className="h-3.5 w-3.5 text-white/25 transition group-hover:translate-x-0.5 group-hover:text-white" />
              </div>
              <p className="mt-4 text-2xl font-semibold tracking-tight text-white">{card.value}</p>
              <h3 className="mt-1 text-sm font-semibold text-white/78">{card.label}</h3>
              <p className="mt-2 text-xs leading-5 text-white/42">{card.detail}</p>
            </Link>
          );
        })}
      </div>

      <p className="mt-5 text-xs leading-5 text-white/32">
        Data shown here is scoped to this workspace and uses recorded operational signals. Progress indicators support governance work and do not constitute legal advice or a guarantee of compliance.
      </p>
    </section>
  );
}
