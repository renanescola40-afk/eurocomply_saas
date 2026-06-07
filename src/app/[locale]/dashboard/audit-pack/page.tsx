'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Download, FileArchive, FileCheck2, FileText, PackageCheck, ShieldCheck, Sparkles } from 'lucide-react';
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
    <main className="min-h-screen overflow-hidden bg-[#050505] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(37,99,235,0.28),transparent_34rem),radial-gradient(circle_at_90%_15%,rgba(16,185,129,0.12),transparent_24rem)]" />
      <div className="relative mx-auto max-w-7xl px-5 py-8 lg:px-8">
        <Button variant="ghost" onClick={() => router.push(`/${locale}/dashboard`)} className="mb-6 text-white/70 hover:bg-white/5 hover:text-white">
          <ArrowLeft className="mr-2 h-4 w-4" /> {t.back}
        </Button>

        <section className="mb-8 overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.045] shadow-2xl shadow-blue-950/20 backdrop-blur">
          <div className="grid gap-8 p-7 lg:grid-cols-[1.2fr_0.8fr] lg:p-9">
            <div>
              <Badge className="mb-5 border-white/10 bg-white/[0.06] text-white/70">
                <Sparkles className="mr-1.5 h-3.5 w-3.5" /> {t.badge}
              </Badge>
              <h1 className="max-w-4xl text-4xl font-semibold tracking-tight md:text-6xl">{t.title}</h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-white/58">{t.subtitle}</p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Button onClick={generatePack} disabled={loading} className="bg-white text-black hover:bg-white/90 disabled:opacity-60">
                  <FileArchive className="mr-2 h-4 w-4" /> {loading ? '...' : t.generate}
                </Button>
                <Button onClick={exportPack} disabled={!data} variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white disabled:opacity-60">
                  <Download className="mr-2 h-4 w-4" /> {t.export}
                </Button>
              </div>
            </div>

            <Card className="border-white/10 bg-black/20 text-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl"><PackageCheck className="h-5 w-5 text-blue-200" /> Audit packet status</CardTitle>
                <CardDescription className="text-white/50">Board-ready export assembled from live compliance evidence.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-3">
                <MiniSignal label={t.score} value={data ? `${data.complianceScore}%` : '--'} />
                <MiniSignal label={t.readiness} value={data ? `${data.auditReadiness}%` : '--'} />
                <MiniSignal label={t.evidence} value={data ? `${data.evidenceCoverage}%` : '--'} />
              </CardContent>
            </Card>
          </div>
        </section>

        {!data ? (
          <Card className="border-white/10 bg-white/[0.045] text-white">
            <CardContent className="py-14 text-center">
              <FileArchive className="mx-auto h-10 w-10 text-white/35" />
              <p className="mt-4 text-white/55">{t.empty}</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-5">
              <MetricCard label={t.score} value={`${data.complianceScore}%`} icon={<ShieldCheck className="h-4 w-4" />} progress={data.complianceScore} tone="blue" />
              <MetricCard label={t.readiness} value={`${data.auditReadiness}%`} icon={<PackageCheck className="h-4 w-4" />} progress={data.auditReadiness} tone="emerald" />
              <MetricCard label={t.findings} value={data.criticalFindings} icon={<FileText className="h-4 w-4" />} tone="red" />
              <MetricCard label={t.tasks} value={data.openTasks} icon={<FileCheck2 className="h-4 w-4" />} tone="amber" />
              <MetricCard label={t.evidence} value={`${data.evidenceCoverage}%`} icon={<ShieldCheck className="h-4 w-4" />} progress={data.evidenceCoverage} tone="violet" />
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
              <AuditList title={t.openFindings} items={data.findings.map((finding) => `${finding.article} • ${finding.severity} • ${finding.title}`)} />
              <AuditList title={t.openTasks} items={data.tasks.map((task) => `${task.priority} • ${task.status} • ${task.title}`)} />
            </div>

            <Card className="mt-6 overflow-hidden border-white/10 bg-white/[0.045] text-white">
              <CardHeader className="flex flex-col gap-3 border-b border-white/10 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle>{t.register}</CardTitle>
                  <CardDescription className="mt-1 text-white/48">{data.evidenceTotal} evidence items • {data.evidenceValid} valid</CardDescription>
                </div>
                <Button onClick={exportPack} disabled={!data} className="bg-white text-black hover:bg-white/90 disabled:opacity-60">
                  <Download className="mr-2 h-4 w-4" /> {t.export}
                </Button>
              </CardHeader>
              <CardContent className="space-y-3 p-5">
                {data.evidence.length === 0 ? (
                  <p className="py-8 text-center text-sm text-white/48">{t.empty}</p>
                ) : data.evidence.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:border-blue-300/30">
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

function MiniSignal({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-white/38">{label}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  );
}

function MetricCard({ label, value, icon, progress, tone }: { label: string; value: string | number; icon: ReactNode; progress?: number; tone: 'blue' | 'emerald' | 'red' | 'amber' | 'violet' }) {
  const toneClass = {
    blue: 'from-blue-500/20 to-cyan-500/5 text-blue-200',
    emerald: 'from-emerald-500/20 to-teal-500/5 text-emerald-200',
    red: 'from-red-500/20 to-rose-500/5 text-red-200',
    amber: 'from-amber-500/20 to-orange-500/5 text-amber-200',
    violet: 'from-violet-500/20 to-fuchsia-500/5 text-violet-200',
  }[tone];

  return (
    <Card className={`border-white/10 bg-gradient-to-br ${toneClass}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-white/58">{label}</CardTitle>
        <span>{icon}</span>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-white">{value}</div>
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
          <p className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm text-white/48">None</p>
        ) : (
          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={`${item}-${index}`} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/70">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs">{index + 1}</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
