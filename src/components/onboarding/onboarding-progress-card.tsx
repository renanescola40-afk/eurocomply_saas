import { CheckCircle2, Circle } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { buildOnboardingSteps, getOnboardingProgress, type OnboardingState } from '@/lib/onboarding/steps';

type OnboardingProgressCardProps = {
  state: OnboardingState;
};

export function OnboardingProgressCard({ state }: OnboardingProgressCardProps) {
  const steps = buildOnboardingSteps(state);
  const progress = getOnboardingProgress(steps);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Get EuroComply audit-ready</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{progress.completed} of {progress.total} steps complete</span>
            <span>{progress.percentage}%</span>
          </div>
          <Progress value={progress.percentage} />
        </div>

        <div className="space-y-3">
          {steps.map((step) => (
            <div key={step.id} className="flex gap-3 rounded-lg border p-3">
              {step.completed ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5" />
              ) : (
                <Circle className="mt-0.5 h-5 w-5" />
              )}
              <div>
                <p className="font-medium">{step.title}</p>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
