'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Download, FileText, ShieldCheck, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { boardReportToText, buildBoardReportData, type BoardReportData } from '@/lib/board-report/generator';

const copy = {
  en: {
    back: 'Back to dashboard',
    badge: 'Board Report',
    title: 'Executive AI compliance report',
    subtitle: 'Translate operational compliance data into a board-ready summary of risk, readiness and recommended actions.',
    generate: 'Generate Board Report',
    export: 'Export TXT',
    status: 'Board Status',
    score: 'Compliance Score',
    readiness: 'Audit Readiness',
    evidence: 'Evidence Coverage',
    findings: 'Critical Findings',
    tasks: 'Open Tasks',
    summary: 'Executive Summary',
    risks: 'Key Risks',
    actions: 'Recommended Next Actions',
    empty: 'No board data yet. Run Gap Analysis and add evidence first.',
  },
  pt: {
    back: 'Voltar ao dashboard',
    badge: 'Board Report',
    title: 'Relatório executivo de compliance de IA',
    subtitle: 'Transforme dados operacionais de compliance em um resumo executivo de risco, prontidão e ações recomendadas.',
    generate: 'Gerar Board Report',
    export: 'Exportar TXT',
    status: 'Status para Diretoria',
    score: 'Score de Compliance',
    readiness: 'Prontidão de Auditoria',
    evidence: 'Cobertura de Evidências',
    findings: 'Findings Críticos',
    tasks: 'Tarefas Abertas',
    summary: 'Resumo Executivo',
    risks: 'Riscos Principais',
    actions: 'Próximas Ações Recomendadas',
    empty: 'Ainda não há dados executivos. Execute o Gap Analysis e adicione evidências primeiro.',
  },
  es: {
    back: 'Volver al dashboard',
    badge: 'Board Report',
    title: 'Informe ejecutivo de compliance de IA',
    subtitle: 'Convierte datos operativos en un resumen ejecutivo de riesgo, preparación y acciones.',
    generate: 'Generar Board Report',
    export: 'Exportar TXT',
    status: 'Estado para dirección',
    score: 'Puntuación de compliance',
    readiness: 'Preparación de auditoría',
    evidence: 'Cobertura de evidencias',
    findings: 'Hallazgos críticos',
    tasks: 'Tareas abiertas',
    summary: 'Resumen ejecutivo',
    risks: 'Riesgos principales',
    actions: 'Acciones recomendadas',
    empty: 'Aún no hay datos. Ejecuta Gap Analysis y agrega evidencias primero.',
  },
  fr: {
    back: 'Retour au dashboard',
    badge: 'Board Report',
    title: 'Rapport exécutif conformité IA',
    subtitle: 'Transformez les données opérationnelles en synthèse de risque, préparation et actions.',
    generate: 'Générer Board Report',
    export: 'Exporter TXT',
    status: 'Statut comité',
    score: 'Score conformité',
    readiness: 'Préparation audit',
    evidence: 'Couverture preuves',
    findings: 'Écarts critiques',
    tasks: 'Tâches ouvertes',
    summary: 'Résumé exécutif',
    risks: 'Risques clés',
    actions: 'Actions recommandées',
    empty: 'Aucune donnée. Lancez Gap Analysis et ajoutez des preuves d’abord.',
  },
  it: {
    back: 'Torna alla dashboard',
    badge: 'Board Report',
    title: 'Report executive compliance IA',
    subtitle: 'Trasforma i dati operativi in sintesi per board su rischio, readiness e azioni.',
    generate: 'Genera Board Report',
    export: 'Esporta TXT',
    status: 'Stato Board',
    score: 'Punteggio compliance',
    readiness: 'Audit Readiness',
    evidence: 'Copertura evidenze',
    findings: 'Finding critici',
    tasks: 'Task aperti',
    summary: 'Executive Summary',
    risks: 'Rischi principali',
    actions: 'Azioni raccomandate',
    empty: 'Nessun dato. Esegui Gap Analysis e aggiungi evidenze prima.',
  },
  de: {
    back: 'Zurück zum Dashboard',
    badge: 'Board Report',
    title: 'Executive AI Compliance Report',
    subtitle: 'Übersetzen Sie operative Compliance-Daten in Risiko, Readiness und Maßnahmen für das Board.',
    generate: 'Board Report erstellen',
    export: 'TXT exportieren',
    status: 'Board Status',
    score: 'Compliance Score',
    readiness: 'Audit Readiness',
    evidence: 'Nachweisabdeckung',
    findings: 'Kritische Findings',
    tasks: 'Offene Aufgaben',
    summary: 'Executive Summary',
    risks: 'Wesentliche Risiken',
    actions: 'Empfohlene Maßnahmen',
    empty: 'Noch keine Daten. Starten Sie Gap Analysis und fügen Sie Nachweise hinzu.',
  },
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

  function exportReport() {
    if (!data) return;
    const blob = new Blob([boardReportToText(data)], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'eurocomply-board-report.txt';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(37,99,235,0.24),transparent_34rem)]" />
      <div className="relative mx-auto max-w-7xl px-5 py-8 lg:px-8">
        <Button variant="ghost" onClick={() => router.push(`/${locale}/dashboard`)} className="mb-6 text-white/70 hover:text-white">
          <ArrowLeft className="mr-2 h-4 w-4" /> {t.back}
        </Button>

        <section className="mb-8 rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-7 shadow-2xl shadow-blue-950/20">
          <Badge className="mb-4 border-white/10 bg-white/[0.06] text-white/70">{t.badge}</Badge>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="max-w-4xl text-4xl font-semibold tracking-tight md:text-6xl">{t.title}</h1>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-white/58">{t.subtitle}</p>
            </div>
            <div className="flex gap-3">
              <Button onClick={generateReport} disabled={loading} className="bg-white text-black hover:bg-white/90 disabled:opacity-60">
                <TrendingUp className="mr-2 h-4 w-4" /> {loading ? '...' : t.generate}
              </Button>
              <Button onClick={exportReport} disabled={!data} variant="outline" className="border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08] hover:text-white disabled:opacity-60">
                <Download className="mr-2 h-4 w-4" /> {t.export}
              </Button>
            </div>
          </div>
        </section>

        {!data ? (
          <Card className="border-white/10 bg-white/[0.045] text-white">
            <CardContent className="py-12 text-center text-white/48">{t.empty}</CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
              <MetricCard label={t.status} value={data.boardStatus.toUpperCase()} badgeClass={statusTone(data.boardStatus)} />
              <MetricCard label={t.score} value={`${data.complianceScore}%`} progress={data.complianceScore} />
              <MetricCard label={t.readiness} value={`${data.auditReadiness}%`} progress={data.auditReadiness} />
              <MetricCard label={t.evidence} value={`${data.evidenceCoverage}%`} progress={data.evidenceCoverage} />
              <MetricCard label={t.findings} value={data.criticalFindings} />
              <MetricCard label={t.tasks} value={data.openTasks} />
            </div>

            <Card className="mt-6 border-white/10 bg-white/[0.045] text-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" />{t.summary}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-7 text-white/65">{data.executiveSummary}</p>
              </CardContent>
            </Card>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <ListCard title={t.risks} items={data.keyRisks} icon={<FileText className="h-5 w-5" />} />
              <ListCard title={t.actions} items={data.nextActions} icon={<ShieldCheck className="h-5 w-5" />} />
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function MetricCard({ label, value, progress, badgeClass }: { label: string; value: string | number; progress?: number; badgeClass?: string }) {
  return (
    <Card className="border-white/10 bg-white/[0.045] text-white">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-white/48">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        {badgeClass ? <Badge className={`border ${badgeClass}`}>{value}</Badge> : <div className="text-2xl font-bold">{value}</div>}
        {typeof progress === 'number' && <Progress value={progress} className="mt-3 h-2" />}
      </CardContent>
    </Card>
  );
}

function ListCard({ title, items, icon }: { title: string; items: string[]; icon: React.ReactNode }) {
  return (
    <Card className="border-white/10 bg-white/[0.045] text-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">{icon}{title}</CardTitle>
        <CardDescription className="text-white/48">Board-level summary</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item, index) => (
          <div key={`${item}-${index}`} className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white/70">{item}</div>
        ))}
      </CardContent>
    </Card>
  );
}
