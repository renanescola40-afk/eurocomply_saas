'use client';

import { AlertTriangle, CheckCircle2, ListTodo, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buildGapActionCenter, getTopGapActions, type GapAction } from '@/lib/gap-analysis/action-center';

type Locale = 'en' | 'pt' | 'es' | 'fr' | 'it' | 'de';

const copy: Record<Locale, {
  title: string;
  subtitle: string;
  criticalGaps: string;
  mediumRisks: string;
  openActions: string;
  ready: string;
  attention: string;
  critical: string;
  topActions: string;
  noActions: string;
}> = {
  en: { title: 'Action Center', subtitle: 'Executive view of your open compliance gaps.', criticalGaps: 'Critical gaps', mediumRisks: 'Medium risks', openActions: 'Open actions', ready: 'Ready', attention: 'Needs attention', critical: 'Critical', topActions: 'Top actions', noActions: 'No open actions yet.' },
  pt: { title: 'Action Center', subtitle: 'Visão executiva das lacunas de compliance abertas.', criticalGaps: 'Lacunas críticas', mediumRisks: 'Riscos médios', openActions: 'Ações abertas', ready: 'Pronto', attention: 'Precisa atenção', critical: 'Crítico', topActions: 'Principais ações', noActions: 'Nenhuma ação aberta ainda.' },
  es: { title: 'Action Center', subtitle: 'Vista ejecutiva de tus brechas de cumplimiento abiertas.', criticalGaps: 'Brechas críticas', mediumRisks: 'Riesgos medios', openActions: 'Acciones abiertas', ready: 'Listo', attention: 'Requiere atención', critical: 'Crítico', topActions: 'Acciones principales', noActions: 'Aún no hay acciones abiertas.' },
  fr: { title: 'Action Center', subtitle: 'Vue exécutive de vos écarts de conformité ouverts.', criticalGaps: 'Écarts critiques', mediumRisks: 'Risques moyens', openActions: 'Actions ouvertes', ready: 'Prêt', attention: 'À surveiller', critical: 'Critique', topActions: 'Actions prioritaires', noActions: 'Aucune action ouverte pour le moment.' },
  it: { title: 'Action Center', subtitle: 'Vista executive dei gap di compliance aperti.', criticalGaps: 'Gap critici', mediumRisks: 'Rischi medi', openActions: 'Azioni aperte', ready: 'Pronto', attention: 'Richiede attenzione', critical: 'Critico', topActions: 'Azioni principali', noActions: 'Nessuna azione aperta.' },
  de: { title: 'Action Center', subtitle: 'Management-Ansicht Ihrer offenen Compliance-Lücken.', criticalGaps: 'Kritische Lücken', mediumRisks: 'Mittlere Risiken', openActions: 'Offene Aktionen', ready: 'Bereit', attention: 'Aufmerksamkeit nötig', critical: 'Kritisch', topActions: 'Wichtigste Aktionen', noActions: 'Noch keine offenen Aktionen.' },
};

function readinessTone(readiness: 'ready' | 'attention' | 'critical') {
  if (readiness === 'ready') return 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200';
  if (readiness === 'attention') return 'border-amber-400/20 bg-amber-500/10 text-amber-200';
  return 'border-red-400/20 bg-red-500/10 text-red-200';
}

export default function GapActionCenter({ actions, score, locale }: { actions: GapAction[]; score: number; locale: string }) {
  const t = copy[(locale as Locale) || 'en'] ?? copy.en;
  const summary = buildGapActionCenter(actions, score);
  const topActions = getTopGapActions(actions, 4);
  const readinessLabel = summary.readinessLabel === 'ready' ? t.ready : summary.readinessLabel === 'attention' ? t.attention : t.critical;

  return (
    <Card className="border-white/10 bg-white/[0.045] text-white">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2"><ListTodo className="h-5 w-5" />{t.title}</CardTitle>
            <CardDescription className="mt-1 text-white/48">{t.subtitle}</CardDescription>
          </div>
          <Badge className={`border ${readinessTone(summary.readinessLabel)}`}>{readinessLabel}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-red-400/15 bg-red-500/10 p-3">
            <XCircle className="mb-2 h-4 w-4 text-red-200" />
            <p className="text-2xl font-semibold">{summary.criticalGaps}</p>
            <p className="text-[11px] text-red-100/70">{t.criticalGaps}</p>
          </div>
          <div className="rounded-xl border border-amber-400/15 bg-amber-500/10 p-3">
            <AlertTriangle className="mb-2 h-4 w-4 text-amber-200" />
            <p className="text-2xl font-semibold">{summary.mediumRisks}</p>
            <p className="text-[11px] text-amber-100/70">{t.mediumRisks}</p>
          </div>
          <div className="rounded-xl border border-blue-400/15 bg-blue-500/10 p-3">
            <CheckCircle2 className="mb-2 h-4 w-4 text-blue-200" />
            <p className="text-2xl font-semibold">{summary.openActions}</p>
            <p className="text-[11px] text-blue-100/70">{t.openActions}</p>
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-white/70">{t.topActions}</p>
          {topActions.length === 0 ? (
            <p className="text-sm text-white/45">{t.noActions}</p>
          ) : (
            <div className="space-y-2">
              {topActions.map((action, index) => (
                <div key={`${action.article}-${index}`} className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm">
                  <Badge className={action.severity === 'critical' ? 'mb-2 border-red-400/20 bg-red-500/10 text-red-200' : 'mb-2 border-amber-400/20 bg-amber-500/10 text-amber-200'}>
                    {action.article}
                  </Badge>
                  <p className="text-white/68">{action.recommendation}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
