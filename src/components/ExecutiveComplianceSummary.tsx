'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardList, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { tryLoadLatestGapAssessment } from '@/lib/gap-analysis/storage';
import { tryLoadOpenComplianceWork } from '@/lib/compliance/remediation';

type Props = {
  userId?: string | null;
  fallbackScore?: number;
};

type LatestAssessment = {
  score?: number | null;
  created_at?: string | null;
} | null;

export default function ExecutiveComplianceSummary({ userId, fallbackScore = 0 }: Props) {
  const [latestAssessment, setLatestAssessment] = useState<LatestAssessment>(null);
  const [criticalFindings, setCriticalFindings] = useState(0);
  const [openTasks, setOpenTasks] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!userId) return;
      setLoading(true);

      const [assessment, work] = await Promise.all([
        tryLoadLatestGapAssessment({ userId }),
        tryLoadOpenComplianceWork({ userId }),
      ]);

      if (!mounted) return;

      setLatestAssessment(assessment as LatestAssessment);
      setCriticalFindings((work.findings || []).filter((finding: any) => finding.severity === 'critical').length);
      setOpenTasks((work.tasks || []).length);
      setLoading(false);
    }

    load();

    return () => {
      mounted = false;
    };
  }, [userId]);

  const score = typeof latestAssessment?.score === 'number' ? latestAssessment.score : fallbackScore;
  const auditReadiness = Math.max(0, Math.min(100, Math.round(score - criticalFindings * 8 - openTasks * 2)));
  const lastAssessmentLabel = latestAssessment?.created_at
    ? new Date(latestAssessment.created_at).toLocaleDateString('pt-BR')
    : 'Sem avaliação salva';

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="premium-card premium-card-hover border-white/10 bg-white/[0.035] text-white">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-white/48">Compliance Score</CardTitle>
          <ShieldCheck className="h-4 w-4 text-[#2563EB]" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{loading ? '...' : `${score}%`}</div>
          <Progress value={score} className="mt-2 h-2" />
          <p className="mt-1 text-xs text-white/48">Último Gap Analysis: {lastAssessmentLabel}</p>
        </CardContent>
      </Card>

      <Card className="premium-card premium-card-hover border-white/10 bg-white/[0.035] text-white">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-white/48">Critical Findings</CardTitle>
          <AlertTriangle className="h-4 w-4 text-red-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{loading ? '...' : criticalFindings}</div>
          <p className="mt-1 text-xs text-white/48">Lacunas críticas abertas</p>
        </CardContent>
      </Card>

      <Card className="premium-card premium-card-hover border-white/10 bg-white/[0.035] text-white">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-white/48">Open Tasks</CardTitle>
          <ClipboardList className="h-4 w-4 text-amber-300" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{loading ? '...' : openTasks}</div>
          <p className="mt-1 text-xs text-white/48">Tarefas de remediação</p>
        </CardContent>
      </Card>

      <Card className="premium-card premium-card-hover border-white/10 bg-white/[0.035] text-white">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-white/48">Audit Readiness</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-emerald-300" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{loading ? '...' : `${auditReadiness}%`}</div>
          <Progress value={auditReadiness} className="mt-2 h-2" />
          <p className="mt-1 text-xs text-white/48">Score ajustado por pendências</p>
        </CardContent>
      </Card>
    </div>
  );
}
