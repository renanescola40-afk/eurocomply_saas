import { AlertTriangle } from 'lucide-react';
import { getPlanLimit, getUpgradeReason, getUsagePercentage, isWithinPlanLimit, type UsageMetric } from '@/lib/billing/entitlements';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

type PlanGateProps = {
  planId?: string | null;
  metric: UsageMetric;
  currentUsage: number;
  children: React.ReactNode;
  onUpgradeHref?: string;
};

export function PlanGate({ planId, metric, currentUsage, children, onUpgradeHref = '/dashboard/organizations/billing' }: PlanGateProps) {
  const allowed = isWithinPlanLimit(planId, metric, currentUsage);

  if (allowed) return <>{children}</>;

  const limit = getPlanLimit(planId, metric);
  const percentage = getUsagePercentage(planId, metric, currentUsage);

  return (
    <Card className="border-amber-200 bg-amber-50 text-amber-950">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-4 w-4" /> Upgrade required
        </CardTitle>
        <CardDescription className="text-amber-800">{getUpgradeReason(metric)}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Usage</span>
            <span>
              {currentUsage}/{limit || 0}
            </span>
          </div>
          <Progress value={percentage} />
        </div>
        <Button asChild>
          <a href={onUpgradeHref}>View plans</a>
        </Button>
      </CardContent>
    </Card>
  );
}
