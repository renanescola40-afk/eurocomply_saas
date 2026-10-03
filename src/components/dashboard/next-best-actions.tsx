import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { OrganizationWorkflowReadiness } from '@/server/queries/organization-dashboard';
import type { DashboardSummary } from '@/server/queries/dashboard';

type NextBestActionsProps = {
  summary: DashboardSummary;
  basePath: string;
  workflowReadiness?: OrganizationWorkflowReadiness;
  locale?: string;
};

type ActionItem = {
  title: string;
  description: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  impact: string;
  href: string;
};

type Copy = {
  recommendedFocus: string;
  nextBestActions: string;
  subtitle: string;
  stabilizeBlocked: string;
  stabilizeBlockedDescription: string;
  stabilizeBlockedImpact: string;
  resolveBlockers: string;
  resolveBlockersDescription: (count: number) => string;
  resolveBlockersImpact: string;
  captureReadiness: string;
  captureReadinessDescription: string;
  captureReadinessImpact: string;
  reduceCriticalRisk: string;
  reduceCriticalRiskDescription: (count: number) => string;
  reduceCriticalRiskImpact: string;
  reviewHighRiskVendors: string;
  reviewHighRiskVendorsDescription: (count: number) => string;
  reviewHighRiskVendorsImpact: string;
  closeEvidenceGaps: string;
  closeEvidenceGapsDescription: (count: number) => string;
  closeEvidenceGapsImpact: string;
  clearOpenWork: string;
  clearOpenWorkDescription: (count: number) => string;
  clearOpenWorkImpact: string;
  generateExecutiveReport: string;
  generateExecutiveReportDescription: string;
  generateExecutiveReportImpact: string;
  priority: Record<ActionItem['priority'], string>;
};

const copy: Record<'en' | 'pt', Copy> = {
  en: {
    recommendedFocus: 'Recommended focus',
    nextBestActions: 'Next best actions',
    subtitle: 'Prioritized from your current workflow readiness, risk, vendor, document and task posture.',
    stabilizeBlocked: 'Stabilize blocked workflow readiness',
    stabilizeBlockedDescription: 'Your organization workflow readiness is blocked. Review the highest-impact risk, evidence, vendor and task gaps before executive reporting.',
    stabilizeBlockedImpact: 'Restores a clear path to structured governance review.',
    resolveBlockers: 'Resolve workflow readiness blockers',
    resolveBlockersDescription: (count) => `${count} readiness signal${count === 1 ? '' : 's'} need review before the next governance checkpoint.`,
    resolveBlockersImpact: 'Improves operational confidence before leadership review.',
    captureReadiness: 'Capture workflow readiness evidence',
    captureReadinessDescription: 'Your organization workflow readiness looks healthy. Generate an executive pack while the current state is structured.',
    captureReadinessImpact: 'Creates a shareable readiness snapshot.',
    reduceCriticalRisk: 'Reduce critical risk exposure',
    reduceCriticalRiskDescription: (count) => `${count} critical risk${count === 1 ? '' : 's'} need owner review and treatment decisions.`,
    reduceCriticalRiskImpact: 'Improves board confidence and governance readiness.',
    reviewHighRiskVendors: 'Review high-risk vendors',
    reviewHighRiskVendorsDescription: (count) => `${count} vendor${count === 1 ? '' : 's'} require DPA, security or review follow-up.`,
    reviewHighRiskVendorsImpact: 'Reduces third-party and processor exposure.',
    closeEvidenceGaps: 'Close evidence gaps',
    closeEvidenceGapsDescription: (count) => `${count} document${count === 1 ? '' : 's'} are missing or not ready for review.`,
    closeEvidenceGapsImpact: 'Improves evidence completeness for reviews and customer questions.',
    clearOpenWork: 'Clear open governance work',
    clearOpenWorkDescription: (count) => `${count} task${count === 1 ? '' : 's'} are still open across the program.`,
    clearOpenWorkImpact: 'Improves execution velocity and ownership clarity.',
    generateExecutiveReport: 'Generate an executive report',
    generateExecutiveReportDescription: 'Your operational posture looks healthy. Capture the current state for leadership or customer review.',
    generateExecutiveReportImpact: 'Creates a shareable governance snapshot.',
    priority: { Critical: 'Critical', High: 'High', Medium: 'Medium', Low: 'Low' },
  },
  pt: {
    recommendedFocus: 'Foco recomendado',
    nextBestActions: 'Próximas melhores ações',
    subtitle: 'Priorizado com base na prontidão atual dos workflows, riscos, fornecedores, documentos e tarefas.',
    stabilizeBlocked: 'Estabilizar a prontidão bloqueada do workflow',
    stabilizeBlockedDescription: 'A prontidão operacional da organização está bloqueada. Reveja primeiro os gaps de maior impacto em risco, evidências, fornecedores e tarefas.',
    stabilizeBlockedImpact: 'Restaura um caminho claro para uma revisão estruturada de governação.',
    resolveBlockers: 'Resolver bloqueios de prontidão',
    resolveBlockersDescription: (count) => `${count} sinal${count === 1 ? '' : 'is'} de prontidão ${count === 1 ? 'precisa' : 'precisam'} de revisão antes do próximo checkpoint de governação.`,
    resolveBlockersImpact: 'Melhora a confiança operacional antes da revisão pela liderança.',
    captureReadiness: 'Registar evidências de prontidão do workflow',
    captureReadinessDescription: 'A prontidão operacional da organização está saudável. Gere um pacote executivo enquanto o estado atual está estruturado.',
    captureReadinessImpact: 'Cria um snapshot de prontidão partilhável.',
    reduceCriticalRisk: 'Reduzir exposição a riscos críticos',
    reduceCriticalRiskDescription: (count) => `${count} risco${count === 1 ? '' : 's'} crítico${count === 1 ? '' : 's'} ${count === 1 ? 'precisa' : 'precisam'} de revisão e decisão de tratamento.`,
    reduceCriticalRiskImpact: 'Melhora a confiança da liderança e a prontidão de governação.',
    reviewHighRiskVendors: 'Rever fornecedores de alto risco',
    reviewHighRiskVendorsDescription: (count) => `${count} fornecedor${count === 1 ? '' : 'es'} ${count === 1 ? 'requer' : 'requerem'} acompanhamento de DPA, segurança ou revisão.`,
    reviewHighRiskVendorsImpact: 'Reduz a exposição a terceiros e subprocessadores.',
    closeEvidenceGaps: 'Fechar gaps de evidências',
    closeEvidenceGapsDescription: (count) => `${count} documento${count === 1 ? '' : 's'} ${count === 1 ? 'está' : 'estão'} em falta ou ainda não ${count === 1 ? 'está' : 'estão'} pronto${count === 1 ? '' : 's'} para revisão.`,
    closeEvidenceGapsImpact: 'Melhora a completude das evidências para revisões e pedidos de clientes.',
    clearOpenWork: 'Fechar trabalho de governação em aberto',
    clearOpenWorkDescription: (count) => `${count} tarefa${count === 1 ? '' : 's'} ${count === 1 ? 'continua' : 'continuam'} em aberto no programa.`,
    clearOpenWorkImpact: 'Melhora a velocidade de execução e a clareza de ownership.',
    generateExecutiveReport: 'Gerar relatório executivo',
    generateExecutiveReportDescription: 'A postura operacional está saudável. Registe o estado atual para revisão pela liderança ou pelo cliente.',
    generateExecutiveReportImpact: 'Cria um snapshot de governação partilhável.',
    priority: { Critical: 'Crítica', High: 'Alta', Medium: 'Média', Low: 'Baixa' },
  },
};

function getPriorityTone(priority: ActionItem['priority']) {
  switch (priority) {
    case 'Critical':
      return 'border-rose-400/20 bg-rose-400/[0.08] text-rose-100';
    case 'High':
      return 'border-amber-300/20 bg-amber-300/[0.08] text-amber-100';
    case 'Medium':
      return 'border-sky-300/20 bg-sky-300/[0.07] text-sky-100';
    default:
      return 'border-emerald-300/20 bg-emerald-300/[0.07] text-emerald-100';
  }
}

function buildWorkflowReadinessAction(workflowReadiness: OrganizationWorkflowReadiness | undefined, basePath: string, t: Copy): ActionItem | null {
  if (!workflowReadiness) return null;

  if (workflowReadiness.status === 'blocked') {
    return {
      title: t.stabilizeBlocked,
      description: t.stabilizeBlockedDescription,
      priority: 'Critical',
      impact: t.stabilizeBlockedImpact,
      href: `${basePath}/risks`,
    };
  }

  if (workflowReadiness.status === 'attention') {
    return {
      title: t.resolveBlockers,
      description: t.resolveBlockersDescription(workflowReadiness.reasons.length),
      priority: 'High',
      impact: t.resolveBlockersImpact,
      href: `${basePath}/tasks`,
    };
  }

  return {
    title: t.captureReadiness,
    description: t.captureReadinessDescription,
    priority: 'Low',
    impact: t.captureReadinessImpact,
    href: `${basePath}/reports`,
  };
}

function buildActions(summary: DashboardSummary, basePath: string, t: Copy, workflowReadiness?: OrganizationWorkflowReadiness): ActionItem[] {
  const actions: ActionItem[] = [];
  const readinessAction = buildWorkflowReadinessAction(workflowReadiness, basePath, t);

  if (readinessAction && readinessAction.priority !== 'Low') {
    actions.push(readinessAction);
  }

  if (summary.criticalRisks > 0) {
    actions.push({
      title: t.reduceCriticalRisk,
      description: t.reduceCriticalRiskDescription(summary.criticalRisks),
      priority: 'Critical',
      impact: t.reduceCriticalRiskImpact,
      href: `${basePath}/risks`,
    });
  }

  if (summary.highRiskVendors > 0) {
    actions.push({
      title: t.reviewHighRiskVendors,
      description: t.reviewHighRiskVendorsDescription(summary.highRiskVendors),
      priority: summary.criticalRisks > 0 ? 'High' : 'Critical',
      impact: t.reviewHighRiskVendorsImpact,
      href: `${basePath}/vendors`,
    });
  }

  if (summary.missingDocuments > 0) {
    actions.push({
      title: t.closeEvidenceGaps,
      description: t.closeEvidenceGapsDescription(summary.missingDocuments),
      priority: 'High',
      impact: t.closeEvidenceGapsImpact,
      href: `${basePath}/documents`,
    });
  }

  if (summary.openTasks > 0) {
    actions.push({
      title: t.clearOpenWork,
      description: t.clearOpenWorkDescription(summary.openTasks),
      priority: actions.length > 0 ? 'Medium' : 'High',
      impact: t.clearOpenWorkImpact,
      href: `${basePath}/tasks`,
    });
  }

  if (actions.length === 0) {
    actions.push(
      readinessAction ?? {
        title: t.generateExecutiveReport,
        description: t.generateExecutiveReportDescription,
        priority: 'Low',
        impact: t.generateExecutiveReportImpact,
        href: `${basePath}/reports`,
      },
    );
  }

  return actions.slice(0, 4);
}

export function NextBestActions({ summary, basePath, workflowReadiness, locale = 'en' }: NextBestActionsProps) {
  const t = locale === 'pt' ? copy.pt : copy.en;
  const actions = buildActions(summary, basePath, t, workflowReadiness);

  return (
    <section className="overflow-hidden rounded-xl border border-white/[0.075] bg-[#101715] text-white">
      <div className="flex flex-col gap-2 border-b border-white/[0.065] px-5 py-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/34">{t.recommendedFocus}</p>
          <h2 className="mt-1.5 text-lg font-semibold tracking-[-0.02em] text-white/86">{t.nextBestActions}</h2>
        </div>
        <p className="max-w-xl text-xs leading-5 text-white/34">
          {t.subtitle}
        </p>
      </div>

      <div className="divide-y divide-white/[0.055]">
        {actions.map((action) => (
          <Link
            key={`${action.priority}-${action.title}`}
            href={action.href}
            className="group grid gap-3 px-5 py-4 transition-colors duration-200 hover:bg-white/[0.025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-300/60 lg:grid-cols-[110px_minmax(0,1.2fr)_minmax(220px,0.8fr)_36px] lg:items-center"
          >
            <div>
              <span className={`inline-flex rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${getPriorityTone(action.priority)}`}>
                {t.priority[action.priority]}
              </span>
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-white/78">{action.title}</h3>
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/36">{action.description}</p>
            </div>
            <p className="text-xs leading-5 text-white/30">{action.impact}</p>
            <span className="hidden h-8 w-8 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.02] text-white/28 transition group-hover:border-white/[0.1] group-hover:text-white/65 lg:flex" aria-hidden="true">
              <ArrowUpRight className="h-3.5 w-3.5" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
