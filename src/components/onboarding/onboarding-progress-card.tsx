import { CheckCircle2, Circle, TimerReset } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { OnboardingTelemetry } from '@/components/onboarding/onboarding-telemetry';
import { buildOnboardingSteps, getOnboardingProgress, type OnboardingState } from '@/lib/onboarding/steps';

type OnboardingProgressCardProps = {
  state: OnboardingState;
  compact?: boolean;
  locale?: string;
};

const estimates: Record<string, string> = {
  'create-organization': '2 min',
  'choose-country': '30 sec',
  'company-type': '30 sec',
  sector: '30 sec',
  'ai-usage': '1 min',
  'first-ai-system': '2 min',
  'risk-classification': '1 min',
  'readiness-score': '30 sec',
  'document-suggestions': '1 min',
  'initial-tasks': '1 min',
  'invite-team': '1 min',
  'plan-or-trial': '30 sec',
};

const compactCopy = {
  en: {
    eyebrow: 'Workspace activation',
    title: 'Operational setup progress',
    body: 'A compact view of the milestones that make the workspace useful after onboarding. This is activation progress, not a compliance score.',
    organization: 'Organization',
    aiSystem: 'First AI system',
    risk: 'Risk classification',
    evidence: 'Evidence',
    tasks: 'Initial tasks',
    team: 'Team (optional)',
    complete: 'core milestones complete',
    next: 'Next milestone',
    ready: 'Core workspace activation is complete.',
  },
  pt: {
    eyebrow: 'Ativação do workspace',
    title: 'Progresso da configuração operacional',
    body: 'Uma visão compacta dos marcos que tornam o workspace útil depois do onboarding. É progresso de ativação, não um score de compliance.',
    organization: 'Organização',
    aiSystem: 'Primeiro sistema de IA',
    risk: 'Classificação de risco',
    evidence: 'Evidências',
    tasks: 'Tarefas iniciais',
    team: 'Equipa (opcional)',
    complete: 'marcos essenciais concluídos',
    next: 'Próximo marco',
    ready: 'A ativação principal do workspace está concluída.',
  },
};

function getCompactCopy(locale?: string) {
  return locale === 'pt' ? compactCopy.pt : compactCopy.en;
}

function CompactActivationProgress({ state, locale }: { state: OnboardingState; locale?: string }) {
  const copy = getCompactCopy(locale);
  const milestones = [
    { id: 'organization', label: copy.organization, complete: state.hasOrganization, required: true },
    { id: 'ai-system', label: copy.aiSystem, complete: Boolean(state.hasFirstAiSystem ?? state.hasVendors), required: true },
    { id: 'risk', label: copy.risk, complete: Boolean(state.hasRiskClassification ?? state.hasRisks ?? state.hasComplianceTasks), required: true },
    { id: 'evidence', label: copy.evidence, complete: Boolean(state.hasDocumentSuggestions ?? state.hasDocuments), required: true },
    { id: 'tasks', label: copy.tasks, complete: Boolean(state.hasInitialTasks ?? state.hasComplianceTasks), required: true },
    { id: 'team', label: copy.team, complete: state.hasMembers, required: false },
  ];
  const requiredMilestones = milestones.filter((milestone) => milestone.required);
  const completed = requiredMilestones.filter((milestone) => milestone.complete).length;
  const percentage = Math.round((completed / requiredMilestones.length) * 100);
  const nextMilestone = requiredMilestones.find((milestone) => !milestone.complete);

  return (
    <Card className="overflow-hidden rounded-xl border-white/[0.075] bg-[#101715] text-white shadow-none">
      <OnboardingTelemetry
        progress={percentage}
        hasOrganization={state.hasOrganization}
        hasMembers={state.hasMembers}
        hasDocuments={Boolean(state.hasDocumentSuggestions ?? state.hasDocuments)}
        hasRisks={Boolean(state.hasRiskClassification ?? state.hasRisks ?? state.hasComplianceTasks)}
        hasVendors={Boolean(state.hasFirstAiSystem ?? state.hasVendors)}
        hasDashboardOpened={Boolean(state.hasReadinessScore ?? state.hasDashboardOpened)}
      />
      <CardContent className="p-0">
        <div className="flex flex-col gap-4 border-b border-white/[0.065] px-5 py-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/34">{copy.eyebrow}</p>
            <CardTitle className="mt-1.5 text-lg font-semibold tracking-[-0.02em] text-white/86">{copy.title}</CardTitle>
            <p className="mt-1.5 text-xs leading-5 text-white/34">{copy.body}</p>
          </div>
          <div className="min-w-44 lg:text-right">
            <p className="text-2xl font-semibold tracking-[-0.03em] text-white">{percentage}%</p>
            <p className="mt-0.5 text-xs text-white/30">{completed}/{requiredMilestones.length} {copy.complete}</p>
          </div>
        </div>

        <div className="px-5 py-4">
          <Progress value={percentage} className="h-1 bg-white/[0.07]" />

          <div className="mt-4 grid overflow-hidden rounded-lg border border-white/[0.065] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {milestones.map((milestone, index) => (
              <div
                key={milestone.id}
                className={`flex min-w-0 items-center gap-2.5 px-3 py-3 ${index > 0 ? 'border-t border-white/[0.055] sm:border-l sm:border-t-0' : ''}`}
              >
                {milestone.complete ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" /> : <Circle className="h-4 w-4 shrink-0 text-white/24" />}
                <span className={`truncate text-xs ${milestone.complete ? 'text-white/64' : 'text-white/34'}`}>{milestone.label}</span>
              </div>
            ))}
          </div>

          <p className="mt-3 text-xs text-white/34">
            {nextMilestone ? <>{copy.next}: <span className="font-medium text-white/66">{nextMilestone.label}</span></> : copy.ready}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function OnboardingProgressCard({ state, compact = false, locale }: OnboardingProgressCardProps) {
  if (compact) {
    return <CompactActivationProgress state={state} locale={locale} />;
  }

  const steps = buildOnboardingSteps(state);
  const progress = getOnboardingProgress(steps);
  const nextStep = steps.find((step) => step.status === 'pending');

  return (
    <Card className="border-primary/15 shadow-sm">
      <OnboardingTelemetry
        progress={progress.percentage}
        hasOrganization={state.hasOrganization}
        hasMembers={state.hasMembers}
        hasDocuments={state.hasDocumentSuggestions ?? state.hasDocuments}
        hasRisks={state.hasRiskClassification ?? state.hasRisks ?? state.hasComplianceTasks}
        hasVendors={state.hasFirstAiSystem ?? state.hasVendors}
        hasDashboardOpened={Boolean(state.hasReadinessScore ?? state.hasDashboardOpened)}
      />
      <CardHeader>
        <Badge variant="outline" className="w-fit rounded-full">Activation checklist</Badge>
        <CardTitle>Prepare RISCK COMPLY for review</CardTitle>
        <p className="text-sm leading-6 text-muted-foreground">
          Follow this path to turn signup into structured value: organization, country, company profile, first AI system, risk score, documents, tasks, team and plan.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{progress.completed} of {progress.total} steps complete</span>
            <span>{progress.percentage}%</span>
          </div>
          <Progress value={progress.percentage} />
          {nextStep ? (
            <p className="text-sm text-muted-foreground">
              Next step: <span className="font-medium text-foreground">{nextStep.title}</span>
            </p>
          ) : null}
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          {steps.map((step) => (
            <div key={step.id} className="flex gap-3 rounded-2xl border bg-background p-4">
              {step.status === 'complete' ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-500" />
              ) : (
                <Circle className="mt-0.5 h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{step.title}</p>
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    <TimerReset className="h-3 w-3" /> {estimates[step.id] ?? '2 min'}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
