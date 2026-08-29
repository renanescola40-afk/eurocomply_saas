'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Download, FileArchive, FileCheck2, FileText, PackageCheck, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { auditPackToText, buildAuditPackData, type AuditPackData } from '@/lib/audit-pack/generator';

const copy = {
  en: {
    back: 'Back to dashboard',
    badge: 'Review Package Generator',
    title: 'Generate your EU AI Act review package',
    subtitle: 'Consolidate your latest Gap Analysis, findings, tasks and evidence into a structured review package.',
    generate: 'Generate Review Package',
    export: 'Export TXT',
    score: 'Readiness Score',
    readiness: 'Review Readiness',
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
    badge: 'Gerador de pacote de revisao',
    title: 'Gere seu pacote de revisao EU AI Act',
    subtitle: 'Consolide o ultimo Gap Analysis, findings, tarefas e evidencias em um pacote estruturado de revisao.',
    generate: 'Gerar pacote de revisao',
    export: 'Exportar TXT',
    score: 'Score de readiness',
    readiness: 'Readiness de revisao',
    findings: 'Findings criticos',
    tasks: 'Tarefas abertas',
    evidence: 'Cobertura de evidencias',
    register: 'Registro de evidencias',
    openFindings: 'Findings abertos',
    openTasks: 'Tarefas abertas',
    empty: 'Ainda nao ha dados. Execute o Gap Analysis e adicione evidencias primeiro.',
  },
  es: {
    back: 'Volver al dashboard',
    badge: 'Generador de paquete de revision',
    title: 'Genera tu paquete de revision EU AI Act',
    subtitle: 'Consolida Gap Analysis, hallazgos, tareas y evidencias en un paquete estructurado de revision.',
    generate: 'Generar paquete de revision',
    export: 'Exportar TXT',
    score: 'Puntuacion de preparacion',
    readiness: 'Preparacion de revision',
    findings: 'Hallazgos criticos',
    tasks: 'Tareas abiertas',
    evidence: 'Cobertura de evidencias',
    register: 'Registro de evidencias',
    openFindings: 'Hallazgos abiertos',
    openTasks: 'Tareas abiertas',
    empty: 'Aun no hay datos. Ejecuta Gap Analysis y agrega evidencias primero.',
  },
  fr: {
    back: 'Retour au dashboard',
    badge: 'Generateur de dossier de revue',
    title: 'Generez votre dossier de revue EU AI Act',
    subtitle: 'Consolidez Gap Analysis, ecarts, taches et preuves dans un dossier structure de revue.',
    generate: 'Generer le dossier',
    export: 'Exporter TXT',
    score: 'Score de preparation',
    readiness: 'Preparation revue',
    findings: 'Ecarts critiques',
    tasks: 'Taches ouvertes',
    evidence: 'Couverture preuves',
    register: 'Registre des preuves',
    openFindings: 'Ecarts ouverts',
    openTasks: 'Taches ouvertes',
    empty: 'Aucune donnee. Lancez le Gap Analysis et ajoutez des preuves d abord.',
  },
  it: {
    back: 'Torna alla dashboard',
    badge: 'Generatore pacchetto review',
    title: 'Genera il tuo pacchetto di review EU AI Act',
    subtitle: 'Consolida Gap Analysis, finding, task ed evidenze in un pacchetto strutturato di review.',
    generate: 'Genera pacchetto review',
    export: 'Esporta TXT',
    score: 'Punteggio readiness',
    readiness: 'Readiness review',
    findings: 'Finding critici',
    tasks: 'Task aperti',
    evidence: 'Copertura evidenze',
    register: 'Registro evidenze',
    openFindings: 'Finding aperti',
    openTasks: 'Task aperti',
    empty: 'Nessun dato. Esegui Gap Analysis e aggiungi evidenze prima.',
  },
  de: {
    back: 'Zuruck zum Dashboard',
    badge: 'Review Package Generator',
    title: 'EU-AI-Act-Review-Paket erstellen',
    subtitle: 'Konsolidieren Sie Gap Analysis, Findings, Aufgaben und Nachweise zu einem strukturierten Review-Paket.',
    generate: 'Review-Paket erstellen',
    export: 'TXT exportieren',
    score: 'Readiness Score',
    readiness: 'Review Readiness',
    findings: 'Kritische Findings',
    tasks: 'Offene Aufgaben',
    evidence: 'Nachweisabdeckung',
    register: 'Nachweisregister',
    openFindings: 'Offene Findings',
    openTasks: 'Offene Aufgaben',
    empty: 'Noch keine Daten. Starten Sie Gap Analysis und fugen Sie Nachweise hinzu.',
  },
} as const;

type Locale = keyof typeof copy;
type MetricTone = 'neutral' | 'emerald' | 'red' | 'amber';

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
    link.download = 'risck-comply-review-package.txt';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="space-y-6 text-white">
      <Button variant="ghost" onClick={() => router.push(`/${locale}/dashboard`)} className="h-9 px-2 text-white/50 hover:bg-white/[0.05] hover:text-white focus-visible:ring-blue-400/40">
        <ArrowLeft className="mr-2 h-4 w-4" /> {t.back}
      </Button>

      <header className="border-b border-white/[0.07] pb-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <Badge className="mb-3 rounded-lg border-blue-300/15 bg-blue-300/[0.08] text-blue-200">{t.badge}</Badge>
            <h1 className="max-w-4xl text-3xl font-semibold tracking-tight md:text-4xl">{t.title}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/48 md:text-base">{t.subtitle}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={generatePack} disabled={loading} className="bg-blue-600 text-white hover:bg-blue-500 focus-visible:ring-blue-400/60 disabled:opacity-60">
              <FileArchive className="mr-2 h-4 w-4" /> {loading ? '...' : t.generate}
            </Button>
            <Button onClick={exportPack} disabled={!data} variant="outline" className="border-white/[0.09] bg-white/[0.025] text-white/70 hover:bg-white/[0.06] hover:text-white focus-visible:ring-blue-400/40 disabled:opacity-60">
              <Download className="mr-2 h-4 w-4" /> {t.export}
            </Button>
          </div>
        </div>
      </header>

      <section className="grid gap-3 md:grid-cols-3">
        <MiniSignal label={t.score} value={data ? `${data.complianceScore}%` : '--'} />
        <MiniSignal label={t.readiness} value={data ? `${data.auditReadiness}%` : '--'} />
        <MiniSignal label={t.evidence} value={data ? `${data.evidenceCoverage}%` : '--'} />
      </section>

      {!data ? (
        <Card className="rounded-xl border-white/[0.075] bg-[#0d1522] text-white">
          <CardContent className="py-14 text-center">
            <FileArchive className="mx-auto h-8 w-8 text-blue-300/45" />
            <p className="mt-4 text-sm text-white/45">{t.empty}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <MetricCard label={t.score} value={`${data.complianceScore}%`} icon={<ShieldCheck className="h-4 w-4" />} progress={data.complianceScore} tone="neutral" />
            <MetricCard label={t.readiness} value={`${data.auditReadiness}%`} icon={<PackageCheck className="h-4 w-4" />} progress={data.auditReadiness} tone="emerald" />
            <MetricCard label={t.findings} value={data.criticalFindings} icon={<FileText className="h-4 w-4" />} tone="red" />
            <MetricCard label={t.tasks} value={data.openTasks} icon={<FileCheck2 className="h-4 w-4" />} tone="amber" />
            <MetricCard label={t.evidence} value={`${data.evidenceCoverage}%`} icon={<ShieldCheck className="h-4 w-4" />} progress={data.evidenceCoverage} tone="emerald" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <AuditList title={t.openFindings} items={data.findings.map((finding) => `${finding.article} • ${finding.severity} • ${finding.title}`)} />
            <AuditList title={t.openTasks} items={data.tasks.map((task) => `${task.priority} • ${task.status} • ${task.title}`)} />
          </div>

          <Card className="overflow-hidden rounded-xl border-white/[0.075] bg-[#0d1522] text-white">
            <CardHeader className="flex flex-col gap-3 border-b border-white/[0.07] md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-base">{t.register}</CardTitle>
                <CardDescription className="mt-1 text-white/38">{data.evidenceTotal} evidence items • {data.evidenceValid} valid</CardDescription>
              </div>
              <Button onClick={exportPack} disabled={!data} className="bg-blue-600 text-white hover:bg-blue-500 focus-visible:ring-blue-400/60 disabled:opacity-60">
                <Download className="mr-2 h-4 w-4" /> {t.export}
              </Button>
            </CardHeader>
            <CardContent className="divide-y divide-white/[0.06] p-0">
              {data.evidence.length === 0 ? (
                <p className="py-10 text-center text-sm text-white/45">{t.empty}</p>
              ) : data.evidence.map((item) => (
                <div key={item.id} className="p-4 transition-colors hover:bg-white/[0.02]">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-white/82">{item.title}</p>
                      <p className="mt-1 text-xs text-white/35">{item.owner_name || '-'} • {item.evidence_type}</p>
                    </div>
                    <Badge className="border-emerald-300/15 bg-emerald-300/[0.07] text-emerald-200">{item.status}</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(item.article_refs || []).map((article) => (
                      <Badge key={article} className="rounded-lg border-white/[0.08] bg-white/[0.03] text-white/45">{article}</Badge>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </main>
  );
}

function MiniSignal({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.075] bg-[#0d1522] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30">{label}</p>
      <p className="mt-2 text-xl font-semibold text-white/88">{value}</p>
    </div>
  );
}

function MetricCard({ label, value, icon, progress, tone }: { label: string; value: string | number; icon: ReactNode; progress?: number; tone: MetricTone }) {
  const toneClass: Record<MetricTone, string> = {
    neutral: 'text-blue-300',
    emerald: 'text-emerald-300',
    red: 'text-red-300',
    amber: 'text-amber-300',
  };

  return (
    <Card className="rounded-xl border-white/[0.075] bg-[#0d1522] text-white">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-[11px] font-medium uppercase tracking-[0.1em] text-white/35">{label}</CardTitle>
        <span className={toneClass[tone]}>{icon}</span>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold text-white/88">{value}</div>
        {typeof progress === 'number' && <Progress value={progress} className="mt-3 h-1.5" />}
      </CardContent>
    </Card>
  );
}

function AuditList({ title, items }: { title: string; items: string[] }) {
  return (
    <Card className="rounded-xl border-white/[0.075] bg-[#0d1522] text-white">
      <CardHeader className="pb-3"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="divide-y divide-white/[0.06] border-y border-white/[0.06] px-6">
        {items.length === 0 ? (
          <p className="py-5 text-sm text-white/40">None</p>
        ) : items.map((item, index) => (
          <div key={`${item}-${index}`} className="flex items-start gap-3 py-3 text-sm leading-6 text-white/58">
            <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-blue-300/15 bg-blue-300/[0.05] text-[10px] text-blue-200/65">{index + 1}</span>
            <span>{item}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
