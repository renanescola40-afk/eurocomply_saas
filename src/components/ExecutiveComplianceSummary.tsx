'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardList, ShieldCheck, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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

type FindingRow = {
  severity?: string | null;
};

function formatAssessmentDate(value?: string | null) {
  if (!value) return 'No saved assessment';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No saved assessment';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function getReadinessTone(value: number) {
  if (value >= 80) return 'text-emerald-300';
  if (value >= 55) return 'text-amber-300';
  return 'text-red-300';
}

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
      setCriticalFindings((work.findings || []).filter((finding: FindingRow) => finding.severity === 'critical').length);
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
  const lastAssessmentLabel = formatAssessmentDate(latestAssessment?.created_at);

  const cards = [
    {
      label: 'Compliance score',
      value: loading ? '...' : `${score}%`,
      description: `Latest Gap Analysis: ${lastAssessmentLabel}`,
      icon: ShieldCheck,
      tone: 'from-blue-500/20 to-cyan-500/5 text-blue-200',
      progress: score,
    },
    {
      label: 'Critical findings',
      value: loading ? '...' : criticalFindings,
      description: criticalFindings > 0 ? 'Open gaps requiring executive attention' : 'No critical findings currently open',
      icon: AlertTriangle,
      tone: 'from-red-500/20 to-rose-500/5 text-red-200',
    },
    {
      label: 'Open tasks',
      value: loading ? '...' : openTasks,
      description: openTasks > 0 ? 'Remediation work still in progress' : 'No remediation tasks currently open',
      icon: ClipboardList,
      tone: 'from-amber-500/20 to-orange-500/5 text-amber-200',
    },
    {
      label: 'Audit readiness',
      value: loading ? '...' : `${auditReadiness}%`,
      description: 'Score adjusted by critical findings and open work',
      icon: CheckCircle2,
      tone: 'from-emerald-500/20 to-teal-500/5 text-emerald-200',
      progress: auditReadiness,
    },
  ];

  return (
    <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.label} className={`group overflow-hidden border-white/10 bg-gradient-to-br ${card.tone} text-white transition hover:-translate-y-0.5 hover:border-blue-300/35 hover:shadow-2xl hover:shadow-blue-950/20`}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/45">{card.label}</p>
                  <p className={`mt-4 text-3xl font-semibold tracking-tight ${card.label === 'Audit readiness' ? getReadinessTone(auditReadiness) : 'text-white'}`}>{card.value}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 p-2.5">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              {typeof card.progress === 'number' && <Progress value={card.progress} className="mt-4 h-2" />}
              <div className="mt-4 flex items-start gap-2 text-xs text-white/52">
                <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{card.description}</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
}
