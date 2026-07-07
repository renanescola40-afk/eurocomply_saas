import { CheckCircle2, Circle, TimerReset } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { OnboardingTelemetry } from '@/components/onboarding/onboarding-telemetry';
import { buildOnboardingSteps, getOnboardingProgress, type OnboardingState } from '@/lib/onboarding/steps';

type OnboardingProgressCardProps = {
  state: OnboardingState;
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

export function OnboardingProgressCard({ state }: OnboardingProgressCardProps) {
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
