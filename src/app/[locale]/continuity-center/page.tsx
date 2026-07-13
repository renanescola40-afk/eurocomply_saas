import { Activity, CheckCircle2, Cloud, Database, Download, FileCheck2, RotateCcw, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DashboardCommandNavigation } from '@/components/dashboard/dashboard-command-navigation';
import { isSupportedLocale, type SupportedLocale } from '@/lib/i18n/locales';
import { CONTINUITY_CONTROLS, getContinuitySummary } from '@/server/governance/continuity-policy';

const copy: Record<SupportedLocale, {
  title: string;
  subtitle: string;
  score: string;
  controls: string;
  critical: string;
  gaps: string;
  nextActions: string;
  ready: string;
  needsEvidence: string;
  exportJson: string;
  exportHint: string;
}> = {
  en: {
    title: 'Continuity Center',
    subtitle: 'Operational view of RISCK COMPLY continuity controls, recovery posture and evidence gaps.',
    score: 'Continuity readiness',
    controls: 'Ready controls',
    critical: 'Critical controls',
    gaps: 'Open critical gaps',
    nextActions: 'Next actions',
    ready: 'Ready',
    needsEvidence: 'Needs evidence',
    exportJson: 'Export continuity evidence',
    exportHint: 'Business+ export with integrity hash and audit trail.',
  },
  pt: {
    title: 'Centro de Continuidade',
    subtitle: 'Visão operacional dos controlos de continuidade da RISCK COMPLY, postura de recuperação e lacunas de evidência.',
    score: 'Prontidão de continuidade',
    controls: 'Controlos prontos',
    critical: 'Controlos críticos',
    gaps: 'Lacunas críticas abertas',
    nextActions: 'Próximas ações',
    ready: 'Pronto',
    needsEvidence: 'Precisa de evidência',
    exportJson: 'Exportar evidência de continuidade',
    exportHint: 'Exportação Business+ com hash de integridade e trilho de auditoria.',
  },
  es: {
    title: 'Centro de Continuidad',
    subtitle: 'Vista operativa de los controles de continuidad de RISCK COMPLY, la postura de recuperación y las brechas de evidencia.',
    score: 'Preparación de continuidad',
    controls: 'Controles listos',
    critical: 'Controles críticos',
    gaps: 'Brechas críticas abiertas',
    nextActions: 'Próximas acciones',
    ready: 'Listo',
    needsEvidence: 'Necesita evidencia',
    exportJson: 'Exportar evidencia de continuidad',
    exportHint: 'Exportación Business+ con hash de integridad y registro de auditoría.',
  },
  fr: {
    title: 'Centre de Continuité',
    subtitle: 'Vue opérationnelle des contrôles de continuité de RISCK COMPLY, de la posture de reprise et des lacunes de preuve.',
    score: 'Préparation continuité',
    controls: 'Contrôles prêts',
    critical: 'Contrôles critiques',
    gaps: 'Écarts critiques ouverts',
    nextActions: 'Prochaines actions',
    ready: 'Prêt',
    needsEvidence: 'Preuve requise',
    exportJson: 'Exporter la preuve de continuité',
    exportHint: 'Export Business+ avec empreinte d’intégrité et journal d’audit.',
  },
  it: {
    title: 'Centro di Continuità',
    subtitle: 'Vista operativa dei controlli di continuità di RISCK COMPLY, della postura di ripristino e delle lacune nelle evidenze.',
    score: 'Preparazione alla continuità',
    controls: 'Controlli pronti',
    critical: 'Controlli critici',
    gaps: 'Lacune critiche aperte',
    nextActions: 'Prossime azioni',
    ready: 'Pronto',
    needsEvidence: 'Richiede evidenza',
    exportJson: 'Esporta evidenza di continuità',
    exportHint: 'Esportazione Business+ con hash di integrità e registro di audit.',
  },
  de: {
    title: 'Continuity Center',
    subtitle: 'Operative Übersicht der Kontinuitätskontrollen von RISCK COMPLY, der Wiederherstellungsposition und offener Nachweislücken.',
    score: 'Kontinuitätsreife',
    controls: 'Bereite Kontrollen',
    critical: 'Kritische Kontrollen',
    gaps: 'Offene kritische Lücken',
    nextActions: 'Nächste Schritte',
    ready: 'Bereit',
    needsEvidence: 'Nachweis erforderlich',
    exportJson: 'Kontinuitätsnachweis exportieren',
    exportHint: 'Business+-Export mit Integritäts-Hash und Audit-Protokoll.',
  },
};

function ControlIcon({ category }: { category: string }) {
  const className = 'h-5 w-5';
  if (category === 'cloud_hosting') return <Cloud className={className} />;
  if (category === 'database_platform') return <Database className={className} />;
  if (category === 'backup_restore') return <RotateCcw className={className} />;
  if (category === 'incident_process') return <ShieldAlert className={className} />;
  if (category === 'evidence_exports') return <FileCheck2 className={className} />;
  return <Activity className={className} />;
}

export default async function ContinuityCenterPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isSupportedLocale(rawLocale)) notFound();
  const locale = rawLocale;
  const t = copy[locale];
  const summary = getContinuitySummary();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,_hsl(var(--primary)/0.12),_transparent_32%),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--muted)/0.35))]">
      <DashboardCommandNavigation locale={locale} activePage={t.title} />
      <div className="mx-auto max-w-7xl space-y-8 px-6 py-10">
        <section className="rounded-[2rem] border bg-card/90 p-8 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-sm text-muted-foreground">
                <RotateCcw className="h-4 w-4" /> Continuity operations
              </div>
              <h1 className="mt-5 text-4xl font-semibold tracking-tight text-foreground">{t.title}</h1>
              <p className="mt-4 text-lg leading-8 text-muted-foreground">{t.subtitle}</p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/api/continuity-center/export"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background transition hover:opacity-90"
                >
                  <Download className="h-4 w-4" />
                  {t.exportJson}
                </Link>
                <p className="text-sm text-muted-foreground">{t.exportHint}</p>
              </div>
            </div>
            <div className="rounded-3xl border bg-background p-6 text-center">
              <p className="text-sm text-muted-foreground">{t.score}</p>
              <p className="mt-2 text-5xl font-semibold text-foreground">{summary.readinessScore}%</p>
              <p className="mt-2 text-sm capitalize text-muted-foreground">{summary.level.replace('_', ' ')}</p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border bg-card p-6">
            <CheckCircle2 className="h-5 w-5 text-foreground" />
            <p className="mt-4 text-sm text-muted-foreground">{t.controls}</p>
            <p className="mt-2 text-3xl font-semibold">{summary.readyControls}/{summary.totalControls}</p>
          </div>
          <div className="rounded-3xl border bg-card p-6">
            <ShieldAlert className="h-5 w-5 text-foreground" />
            <p className="mt-4 text-sm text-muted-foreground">{t.critical}</p>
            <p className="mt-2 text-3xl font-semibold">{summary.criticalControls}</p>
          </div>
          <div className="rounded-3xl border bg-card p-6">
            <Activity className="h-5 w-5 text-foreground" />
            <p className="mt-4 text-sm text-muted-foreground">{t.gaps}</p>
            <p className="mt-2 text-3xl font-semibold">{summary.openCriticalControls}</p>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          {CONTINUITY_CONTROLS.map((control) => (
            <article key={control.category} className="rounded-3xl border bg-card p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border bg-background text-foreground">
                    <ControlIcon category={control.category} />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">{control.label}</h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{control.description}</p>
                    <p className="mt-3 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">{control.target}</p>
                  </div>
                </div>
                <span className="rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                  {control.enterpriseReady ? t.ready : t.needsEvidence}
                </span>
              </div>
            </article>
          ))}
        </section>

        <section className="rounded-3xl border bg-card p-6">
          <h2 className="text-xl font-semibold text-foreground">{t.nextActions}</h2>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            {summary.nextActions.map((action) => (
              <li key={action} className="flex gap-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-foreground" />
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
