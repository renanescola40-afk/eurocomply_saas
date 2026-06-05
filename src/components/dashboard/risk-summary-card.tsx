import { AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export type RiskSummaryCardProps = {
  openRisks: number;
  criticalRisks: number;
};

export function RiskSummaryCard({ openRisks, criticalRisks }: RiskSummaryCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" /> Risk Register
        </CardTitle>
        <CardDescription>Operational risk exposure across the organization.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-3xl font-semibold">{openRisks}</p>
          <p className="text-sm text-muted-foreground">Open risks</p>
        </div>
        <div>
          <p className="text-3xl font-semibold">{criticalRisks}</p>
          <p className="text-sm text-muted-foreground">Critical risks</p>
        </div>
      </CardContent>
    </Card>
  );
}
