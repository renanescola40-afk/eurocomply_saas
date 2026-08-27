'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Download, Printer, ShieldCheck, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { boardReportToText, buildBoardReportData, type BoardReportData } from '@/lib/board-report/generator';
import { downloadTextReport, printableReportStyles, printCurrentPage } from '@/lib/reports/print';

const copy = {
  en: { back: 'Back to dashboard', badge: 'Leadership Report', title: 'Executive AI compliance report', subtitle: 'Leadership review summary of risk, readiness and recommended actions.', generate: 'Refresh report', txt: 'Export TXT', pdf: 'Export PDF', status: 'Review Status', score: 'Compliance Score', readiness: 'Review Readiness', evidence: 'Evidence Coverage', findings: 'Critical Findings', tasks: 'Open Tasks', summary: 'Executive Summary', risks: 'Key Risks', actions: 'Recommended Next Actions', empty: 'No leadership data yet. Run Gap Analysis and add evidence first.' },
  pt: { back: 'Voltar ao dashboard', badge: 'Leadership Report', title: 'Relatório executivo de compliance de IA', subtitle: 'Resumo para liderança sobre risco, prontidão e ações recomendadas.', generate: 'Atualizar relatório', txt: 'Exportar TXT', pdf: 'Exportar PDF', status: 'Status para Liderança', score: 'Score de Compliance', readiness: 'Prontidão de Revisão', evidence: 'Cobertura de Evidências', findings: 'Findings Críticos', tasks: 'Tarefas Abertas', summary: 'Resumo Executivo', risks: 'Riscos Principais', actions: 'Próximas Ações Recomendadas', empty: 'Ainda não há dados executivos. Execute o Gap Analysis e adicione evidências primeiro.' },
  es: { back: 'Volver al dashboard', badge: 'Leadership Report', title: 'Informe ejecutivo de compliance de IA', subtitle: 'Resumen para dirección sobre riesgo, preparación y acciones.', generate: 'Actualizar informe', txt: 'Exportar TXT', pdf: 'Exportar PDF', status: 'Estado para dirección', score: 'Puntuación de compliance', readiness: 'Preparación de revisión', evidence: 'Cobertura de evidencias', findings: 'Hallazgos críticos', tasks: 'Tareas abiertas', summary: 'Resumen ejecutivo', risks: 'Riesgos principales', actions: 'Acciones recomendadas', empty: 'Aún no hay datos. Ejecuta Gap Analysis y agrega evidencias primero.' },
  fr: { back: 'Retour au dashboard', badge: 'Leadership Report', title: 'Rapport exécutif conformité IA', subtitle: 'Synthèse pour comité : risque, préparation et actions.', generate: 'Actualiser le rapport', txt: 'Exporter TXT', pdf: 'Exporter PDF', status: 'Statut comité', score: 'Score conformité', readiness: 'Préparation revue', evidence: 'Couverture preuves', findings: 'Écarts critiques', tasks: 'Tâches ouvertes', summary: 'Résumé exécutif', risks: 'Risques clés', actions: 'Actions recommandées', empty: 'Aucune donnée. Lancez Gap Analysis et ajoutez des preuves d’abord.' },
  it: { back: 'Torna alla dashboard', badge: 'Leadership Report', title: 'Report executive compliance IA', subtitle: 'Sintesi leadership su rischio, readiness e azioni.', generate: 'Aggiorna report', txt: 'Esporta TXT', pdf: 'Esporta PDF', status: 'Stato Review', score: 'Punteggio compliance', readiness: 'Review Readiness', evidence: 'Copertura evidenze', findings: 'Finding critici', tasks: 'Task aperti', summary: 'Executive Summary', risks: 'Rischi principali', actions: 'Azioni raccomandate', empty: 'Nessun dato. Esegui Gap Analysis e aggiungi evidenze prima.' },
  de: { back: 'Zurück zum Dashboard', badge: 'Leadership Report', title: 'Executive AI Compliance Report', subtitle: 'Executive-Zusammenfassung zu Risiko, Readiness und Maßnahmen.', generate: 'Report aktualisieren', txt: 'TXT exportieren', pdf: 'PDF exportieren', status: 'Review Status', score: 'Compliance Score', readiness: 'Review Readiness', evidence: 'Nachweisabdeckung', findings: 'Kritische Findings', tasks: 'Offene Aufgaben', summary: 'Executive Summary', risks: 'Wesentliche Risiken', actions: 'Empfohlene Maßnahmen', empty: 'Noch keine Daten. Starten Sie Gap Analysis und fügen Sie Nachweise hinzu.' },
} as const;

type Locale = keyof typeof copy;

function statusTone(status: BoardReportData['boardStatus']) {
  if (status === 'strong') return 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200';
  if (status === 'watch') return 'border-amber-400/20 bg-amber-500/10 text-amber-200';
  return 'border-red-400/20 bg-red-500/10 text-red-200';
}

export default function BoardReportPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const locale = ((params.locale as string) in copy ? params.locale : 'pt') as Locale;
  const t = copy[locale];
  const [data, setData] = useState<BoardReportData | null>(null);
  const [loading, setLoading] = useState(false);

  async function generateReport() {
    if (!user?.id) return;
    setLoading(true);
    const report = await buildBoardReportData({ userId: user.id });
    setData(report);
    setLoading(false);
  }

  useEffect(() => {
    generateReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  function exportTxt() {
    if (!data) return;
    downloadTextReport({ filename: 'risck-comply-leadership-report.txt', content: boardReportToText(data) });
  }

  return (
    <main className="space-y-6 text-white">
      <style>{printableReportStyles}</style>
      <div data-print-root className="space-y-6">
        <Button data-print-hide variant="ghost" onClick={() => router.push(`/${locale}/dashboard`)} className="h-9 px-2 text-white/50 hover:bg-white/[0.05] hover:text-white">
          <ArrowLeft className="mr-2 h-4 w-4" /> {t.back}
        </Button>

        <header data-print-card className="border-b border-white/[0.07] pb-6">
          <Badge className="mb-3 rounded-lg border-emerald-300/15 bg-emerald-300/[0.08] text-emerald-200">{t.badge}</Badge>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="max-w-4xl text-3xl font-semibold tracking-tight md:text-4xl">{t.title}</h1>
              <p data-print-muted className="mt-3 max-w-2xl text-sm leading-6 text-white/48 md:text-base">{t.subtitle}</p>
              {data && <p data-print-muted className="mt-2 text-[11px] text-white/30">Generated: {new Date(data.generatedAt).toLocaleString()}</p>}
            </div>
            <div data-print-hide className="flex flex-wrap gap-2">
              <Button onClick={generateReport} disabled={loading} className="bg-emerald-300 text-[#06100d] hover:bg-emerald-200 disabled:opacity-60"><TrendingUp className="mr-2 h-4 w-4" /> {loading ? '...' : t.generate}</Button>
              <Button onClick={exportTxt} disabled={!data} variant="outline" className="border-white/[0.09] bg-white/[0.025] text-white/70 hover:bg-white/[0.06] hover:text-white disabled:opacity-60"><Download className="mr-2 h-4 w-4" /> {t.txt}</Button>
              <Button onClick={printCurrentPage} disabled={!data} variant="outline" className="border-white/[0.09] bg-white/[0.025] text-white/70 hover:bg-white/[0.06] hover:text-white disabled:opacity-60"><Printer className="mr-2 h-4 w-4" /> {t.pdf}</Button>
            </div>
          </div>
        </header>

        {!data ? (
          <Card data-print-card className="rounded-xl border-white/[0.08] bg-white/[0.025] text-white"><CardContent className="py-12 text-center text-white/45">{t.empty}</CardContent></Card>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
              <MetricCard label={t.status} value={data.boardStatus.toUpperCase()} badgeClass={statusTone(data.boardStatus)} />
              <MetricCard label={t.score} value={`${data.complianceScore}%`} progress={data.complianceScore} />
              <MetricCard label={t.readiness} value={`${data.auditReadiness}%`} progress={data.auditReadiness} />
              <MetricCard label={t.evidence} value={`${data.evidenceCoverage}%`} progress={data.evidenceCoverage} />
              <MetricCard label={t.findings} value={data.criticalFindings} />
              <MetricCard label={t.tasks} value={data.openTasks} />
            </div>
            <Card data-print-card className="rounded-xl border-white/[0.08] bg-white/[0.025] text-white"><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4 text-emerald-300" />{t.summary}</CardTitle></CardHeader><CardContent><p data-print-muted className="text-sm leading-7 text-white/58">{data.executiveSummary}</p></CardContent></Card>
            <div className="grid gap-4 lg:grid-cols-2"><ListCard title={t.risks} items={data.keyRisks} /><ListCard title={t.actions} items={data.nextActions} /></div>
          </>
        )}
      </div>
    </main>
  );
}

function MetricCard({ label, value, progress, badgeClass }: { label: string; value: string | number; progress?: number; badgeClass?: string }) {
  return <Card data-print-card className="rounded-xl border-white/[0.08] bg-white/[0.025] text-white"><CardHeader className="pb-2"><CardTitle className="text-[11px] font-medium uppercase tracking-[0.12em] text-white/35">{label}</CardTitle></CardHeader><CardContent>{badgeClass ? <Badge className={`border ${badgeClass}`}>{value}</Badge> : <div className="text-2xl font-semibold text-white/88">{value}</div>}{typeof progress === 'number' && <Progress value={progress} className="mt-3 h-1.5" />}</CardContent></Card>;
}

function ListCard({ title, items }: { title: string; items: string[] }) {
  return <Card data-print-card className="rounded-xl border-white/[0.08] bg-white/[0.025] text-white"><CardHeader className="pb-3"><CardTitle className="text-base">{title}</CardTitle><CardDescription className="text-white/38">Leadership-level summary</CardDescription></CardHeader><CardContent className="divide-y divide-white/[0.06] border-y border-white/[0.06] px-6">{items.map((item, index) => <div key={`${item}-${index}`} className="py-3 text-sm leading-6 text-white/58">{item}</div>)}</CardContent></Card>;
}
