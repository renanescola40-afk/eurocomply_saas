'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Download, FileArchive, FileText, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { auditPackToText, buildAuditPackData, type AuditPackData } from '@/lib/audit-pack/generator';

const copy = {
  en: {
    back: 'Back to dashboard',
    badge: 'Audit Pack Generator',
    title: 'Generate your EU AI Act audit pack',
    subtitle: 'Consolidate your latest Gap Analysis, findings, tasks and evidence into an audit-ready package.',
    generate: 'Generate Audit Pack',
    export: 'Export TXT',
    score: 'Compliance Score',
    readiness: 'Audit Readiness',
    findings: 'Critical Findings',
    tasks: 'Open Tasks',
    evidence: 'Evidence Coverage',
    register: 'Evidence Register',
    openFindings: 'Open Findings',
    openTasks: 'Open Tasks',
    empty: 'No data yet. Run the Gap Analysis and add evidence first.',
  },
  pt: {
    back: 'Voltar ao dashboard',
    badge: 'Gerador de Audit Pack',
    title: 'Gere seu pacote de auditoria EU AI Act',
    subtitle: 'Consolide o último Gap Analysis, findings, tarefas e evidências em um pacote pronto para auditoria.',
    generate: 'Gerar Audit Pack',
    export: 'Exportar TXT',
    score: 'Score de Compliance',
    readiness: 'Prontidão de Auditoria',
    findings: 'Findings Críticos',
    tasks: 'Tarefas Abertas',
    evidence: 'Cobertura de Evidências',
    register: 'Registro de Evidências',
    openFindings: 'Findings Abertos',
    openTasks: 'Tarefas Abertas',
    empty: 'Ainda não há dados. Execute o Gap Analysis e adicione evidências primeiro.',
  },
  es: {
    back: 'Volver al dashboard',
    badge: 'Generador de Audit Pack',
    title: 'Genera tu paquete de auditoría EU AI Act',
    subtitle: 'Consolida Gap Analysis, hallazgos, tareas y evidencias en un paquete listo para auditoría.',
    generate: 'Generar Audit Pack',
    export: 'Exportar TXT',
    score: 'Puntuación de cumplimiento',
    readiness: 'Preparación de auditoría',
    findings: 'Hallazgos críticos',
    tasks: 'Tareas abiertas',
    evidence: 'Cobertura de evidencias',
    register: 'Registro de evidencias',
    openFindings: 'Hallazgos abiertos',
    openTasks: 'Tareas abiertas',
    empty: 'Aún no hay datos. Ejecuta Gap Analysis y agrega evidencias primero.',
  },
  fr: {
    back: 'Retour au dashboard',
    badge: 'Générateur Audit Pack',
    title: 'Générez votre pack d’audit EU AI Act',
    subtitle: 'Consolidez Gap Analysis, écarts, tâches et preuves dans un pack prêt pour audit.',
    generate: 'Générer Audit Pack',
    export: 'Exporter TXT',
    score: 'Score conformité',
    readiness: 'Préparation audit',
    findings: 'Écarts critiques',
    tasks: 'Tâches ouvertes',
    evidence: 'Couverture preuves',
    register: 'Registre des preuves',
    openFindings: 'Écarts ouverts',
    openTasks: 'Tâches ouvertes',
    empty: 'Aucune donnée. Lancez le Gap Analysis et ajoutez des preuves d’abord.',
  },
  it: {
    back: 'Torna alla dashboard',
    badge: 'Generatore Audit Pack',
    title: 'Genera il tuo audit pack EU AI Act',
    subtitle: 'Consolida Gap Analysis, finding, task ed evidenze in un pacchetto pronto per audit.',
    generate: 'Genera Audit Pack',
    export: 'Esporta TXT',
    score: 'Punteggio compliance',
    readiness: 'Audit Readiness',
    findings: 'Finding critici',
    tasks: 'Task aperti',
    evidence: 'Copertura evidenze',
    register: 'Registro evidenze',
    openFindings: 'Finding aperti',
    openTasks: 'Task aperti',
    empty: 'Nessun dato. Esegui Gap Analysis e aggiungi evidenze prima.',
  },
  de: {
    back: 'Zurück zum Dashboard',
    badge: 'Audit Pack Generator',
    title: 'EU-AI-Act-Audit-Pack erstellen',
    subtitle: 'Konsolidieren Sie Gap Analysis, Findings, Aufgaben und Nachweise zu einem auditfähigen Paket.',
    generate: 'Audit Pack erstellen',
    export: 'TXT exportieren',
    score: 'Compliance Score',
    readiness: 'Audit Readiness',
    findings: 'Kritische Findings',
    tasks: 'Offene Aufgaben',
    evidence: 'Nachweisabdeckung',
    register: 'Nachweisregister',
    openFindings: 'Offene Findings',
    openTasks: 'Offene Aufgaben',
    empty: 'Noch keine Daten. Starten Sie Gap Analysis und fügen Sie Nachweise hinzu.',
  },
} as const;

type Locale = keyof typeof copy;

export default function AuditPackPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const locale = ((params.locale as string) in copy ? params.locale : 'pt') as Locale;
  const t = copy[locale];
  const [data, setData] = useState<AuditPackData | null>(null);
  const [loading, setLoading] = useState(false);

  async function generatePack() {
    if (!user?.id) return;
    setLoading(true);
    const pack = await buildAuditPackData({ userId: user.id });
    setData(pack);
    setLoading(false);
  }

  useEffect(() => {
    generatePack();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  function exportPack() {
    if (!data) return;
    const blob = new Blob([auditPackToText(data)], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'eurocomply-audit-pack.txt';
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
              <Button onClick={generatePack} disabled={loading} className="bg-white text-black hover:bg-white/90 disabled:opacity-60">
                <FileArchive className="mr-2 h-4 w-4" /> {loading ? '...' : t.generate}
              </Button>
              <Button onClick={exportPack} disabled={!data} variant="outline" className="border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08] hover:text-white disabled:opacity-60">
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
            <div className="grid gap-4 md:grid-cols-5">
              <MetricCard label={t.score} value={`${data.complianceScore}%`} icon={<ShieldCheck className="h-4 w-4" />} progress={data.complianceScore} />
              <MetricCard label={t.readiness} value={`${data.auditReadiness}%`} icon={<ShieldCheck className="h-4 w-4" />} progress={data.auditReadiness} />
              <MetricCard label={t.findings} value={data.criticalFindings} icon={<FileText className="h-4 w-4" />} />
              <MetricCard label={t.tasks} value={data.openTasks} icon={<FileText className="h-4 w-4" />} />
              <MetricCard label={t.evidence} value={`${data.evidenceCoverage}%`} icon={<FileText className="h-4 w-4" />} progress={data.evidenceCoverage} />
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <AuditList title={t.openFindings} items={data.findings.map((finding) => `${finding.article} • ${finding.severity} • ${finding.title}`)} />
              <AuditList title={t.openTasks} items={data.tasks.map((task) => `${task.priority} • ${task.status} • ${task.title}`)} />
            </div>

            <Card className="mt-6 border-white/10 bg-white/[0.045] text-white">
              <CardHeader>
                <CardTitle>{t.register}</CardTitle>
                <CardDescription className="text-white/48">{data.evidenceTotal} evidence items • {data.evidenceValid} valid</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.evidence.length === 0 ? (
                  <p className="py-6 text-center text-sm text-white/48">{t.empty}</p>
                ) : data.evidence.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">{item.title}</p>
                        <p className="mt-1 text-xs text-white/45">{item.owner_name || '-'} • {item.evidence_type}</p>
                      </div>
                      <Badge className="border-blue-400/20 bg-blue-500/10 text-blue-200">{item.status}</Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(item.article_refs || []).map((article) => (
                        <Badge key={article} className="border-white/10 bg-white/[0.06] text-white/60">{article}</Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </main>
  );
}

function MetricCard({ label, value, icon, progress }: { label: string; value: string | number; icon: React.ReactNode; progress?: number }) {
  return (
    <Card className="border-white/10 bg-white/[0.045] text-white">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-white/48">{label}</CardTitle>
        <span className="text-blue-200">{icon}</span>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {typeof progress === 'number' && <Progress value={progress} className="mt-3 h-2" />}
      </CardContent>
    </Card>
  );
}

function AuditList({ title, items }: { title: string; items: string[] }) {
  return (
    <Card className="border-white/10 bg-white/[0.045] text-white">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-white/48">None</p>
        ) : (
          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={`${item}-${index}`} className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white/70">{item}</div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
