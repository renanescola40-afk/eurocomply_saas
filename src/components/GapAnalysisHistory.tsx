'use client';

import { useEffect, useState } from 'react';
import { Clock, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { tryLoadGapAssessmentHistory } from '@/lib/gap-analysis/storage';

type HistoryItem = {
  id: string;
  score: number;
  status: string;
  locale: string;
  created_at: string;
  summary?: Record<string, unknown> | null;
};

const copy = {
  en: { title: 'Assessment History', subtitle: 'Recent EU AI Act readiness snapshots', empty: 'No saved assessments yet.', completed: 'completed' },
  pt: { title: 'Histórico de Avaliações', subtitle: 'Snapshots recentes de prontidão EU AI Act', empty: 'Nenhuma avaliação salva ainda.', completed: 'concluído' },
  es: { title: 'Historial de Evaluaciones', subtitle: 'Snapshots recientes de preparación EU AI Act', empty: 'Aún no hay evaluaciones guardadas.', completed: 'completado' },
  fr: { title: 'Historique des évaluations', subtitle: 'Aperçus récents de préparation EU AI Act', empty: 'Aucune évaluation enregistrée pour le moment.', completed: 'terminé' },
  it: { title: 'Storico valutazioni', subtitle: 'Snapshot recenti di prontezza EU AI Act', empty: 'Nessuna valutazione salvata ancora.', completed: 'completato' },
  de: { title: 'Bewertungshistorie', subtitle: 'Aktuelle EU-AI-Act-Bereitschaftssnapshots', empty: 'Noch keine gespeicherten Bewertungen.', completed: 'abgeschlossen' },
} as const;

function scoreTone(score: number) {
  if (score >= 80) return 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200';
  if (score >= 50) return 'border-amber-400/20 bg-amber-500/10 text-amber-200';
  return 'border-red-400/20 bg-red-500/10 text-red-200';
}

export default function GapAnalysisHistory({ workspaceId, locale }: { workspaceId?: string | null; locale: string }) {
  const t = copy[(locale as keyof typeof copy) || 'en'] ?? copy.en;
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadHistory() {
      if (!workspaceId) return;
      setLoading(true);
      const data = await tryLoadGapAssessmentHistory({ workspaceId, limit: 5 });
      if (mounted) {
        setItems(data as HistoryItem[]);
        setLoading(false);
      }
    }

    loadHistory();

    return () => {
      mounted = false;
    };
  }, [workspaceId]);

  if (!workspaceId) return null;

  return (
    <Card className="border-white/10 bg-white/[0.045] text-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          {t.title}
        </CardTitle>
        <CardDescription className="text-white/48">{t.subtitle}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading && <p className="text-sm text-white/45">...</p>}
        {!loading && items.length === 0 && <p className="text-sm text-white/45">{t.empty}</p>}
        {items.map((item) => (
          <div key={item.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-white/60">
                <Clock className="h-4 w-4" />
                {new Date(item.created_at).toLocaleDateString(locale)}
              </div>
              <Badge className={`border ${scoreTone(item.score)}`}>{item.score}%</Badge>
            </div>
            <Progress value={item.score} className="h-2" />
            <p className="mt-2 text-xs text-white/38">{t.completed}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
