import Link from 'next/link';
import { ArrowRight, BarChart3, CheckCircle2, CircleAlert, Download, ShieldCheck, Target } from 'lucide-react';
import { DashboardCommandNavigation } from '@/components/dashboard/dashboard-command-navigation';
import { isSupportedLocale, type SupportedLocale } from '@/lib/i18n/locales';
import { getEnterpriseReadinessSummary } from '@/server/governance/enterprise-readiness';

const COPY: Record<SupportedLocale, {
  title: string;
  subtitle: string;
  score: string;
  status: string;
  strongest: string;
  weakest: string;
  areas: string;
  nextActions: string;
  evidencePack: string;
  evidencePackDescription: string;
  exportLabel: string;
  exportDescription: string;
}> = {
  en: {
    title: 'Enterprise Readiness Center',
    subtitle: 'A consolidated view of RISCK COMPLY readiness across evidence, access, continuity, retention, vendors and procurement workflows.',
    score: 'Readiness score',
    status: 'Status',
    strongest: 'Strongest areas',
    weakest: 'Areas to improve',
    areas: 'Readiness areas',
    nextActions: 'Next actions',
    evidencePack: 'Open Evidence Pack',
    evidencePackDescription: 'Export a structured pack with governance summaries and integrity metadata.',
    exportLabel: 'Export readiness JSON',
    exportDescription: 'Download a structured executive-readiness JSON export for board, audit or customer review.',
  },
  pt: {
    title: 'Centro de Preparação Enterprise',
    subtitle: 'Visão consolidada da preparação da RISCK COMPLY em evidências, acesso, continuidade, retenção, fornecedores e processos de aquisição.',
    score: 'Índice de preparação',
    status: 'Estado',
    strongest: 'Áreas mais fortes',
    weakest: 'Áreas a melhorar',
    areas: 'Áreas de preparação',
    nextActions: 'Próximas ações',
    evidencePack: 'Abrir pacote de evidências',
    evidencePackDescription: 'Exporte um pacote estruturado com resumos de governação e metadados de integridade.',
    exportLabel: 'Exportar preparação em JSON',
    exportDescription: 'Transfira um ficheiro JSON estruturado de preparação executiva para revisão da administração, auditoria ou clientes.',
  },
  es: {
    title: 'Centro de Preparación Enterprise',
    subtitle: 'Vista consolidada de la preparación de RISCK COMPLY en evidencias, acceso, continuidad, retención, proveedores y procesos de compras.',
    score: 'Puntuación de preparación',
    status: 'Estado',
    strongest: 'Áreas más fuertes',
    weakest: 'Áreas a mejorar',
    areas: 'Áreas de preparación',
    nextActions: 'Próximas acciones',
    evidencePack: 'Abrir paquete de evidencias',
    evidencePackDescription: 'Exporta un paquete estructurado con resúmenes de gobernanza y metadatos de integridad.',
    exportLabel: 'Exportar preparación en JSON',
    exportDescription: 'Descarga una exportación JSON estructurada de preparación ejecutiva para revisión del consejo, auditoría o clientes.',
  },
  fr: {
    title: 'Centre de préparation Enterprise',
    subtitle: 'Vue consolidée de la préparation de RISCK COMPLY en matière de preuves, accès, continuité, conservation, fournisseurs et achats.',
    score: 'Score de préparation',
    status: 'Statut',
    strongest: 'Points forts',
    weakest: 'Axes d’amélioration',
    areas: 'Domaines de préparation',
    nextActions: 'Prochaines actions',
    evidencePack: 'Ouvrir le dossier de preuves',
    evidencePackDescription: 'Exportez un dossier structuré avec des synthèses de gouvernance et des métadonnées d’intégrité.',
    exportLabel: 'Exporter la préparation en JSON',
    exportDescription: 'Téléchargez un export JSON structuré de préparation exécutive pour le conseil, l’audit ou la revue client.',
  },
  it: {
    title: 'Centro di preparazione Enterprise',
    subtitle: 'Vista consolidata della preparazione di RISCK COMPLY su evidenze, accesso, continuità, conservazione, fornitori e acquisti.',
    score: 'Punteggio di preparazione',
    status: 'Stato',
    strongest: 'Aree più forti',
    weakest: 'Aree da migliorare',
    areas: 'Aree di preparazione',
    nextActions: 'Prossime azioni',
    evidencePack: 'Apri il pacchetto di evidenze',
    evidencePackDescription: 'Esporta un pacchetto strutturato con sintesi di governance e metadati di integrità.',
    exportLabel: 'Esporta la preparazione in JSON',
    exportDescription: 'Scarica un export JSON strutturato di preparazione esecutiva per il consiglio, l’audit o la revisione dei clienti.',
  },
  de: {
    title: 'Übersicht zur Enterprise-Vorbereitung',
    subtitle: 'Konsolidierte Übersicht der Vorbereitung von RISCK COMPLY in den Bereichen Nachweise, Zugriff, Kontinuität, Aufbewahrung, Anbieter und Beschaffung.',
    score: 'Vorbereitungswert',
    status: 'Status',
    strongest: 'Stärkste Bereiche',
    weakest: 'Verbesserungsbereiche',
    areas: 'Vorbereitungsbereiche',
    nextActions: 'Nächste Schritte',
    evidencePack: 'Nachweispaket öffnen',
    evidencePackDescription: 'Exportieren Sie ein strukturiertes Paket mit Governance-Zusammenfassungen und Integritätsmetadaten.',
    exportLabel: 'Vorbereitung als JSON exportieren',
    exportDescription: 'Laden Sie einen strukturierten JSON-Export zur Vorbereitung für Vorstand, Audit oder Kundenprüfung herunter.',
  },
};

function statusLabel(status: string) {
  if (status === 'enterprise_ready') return 'Evidence review ready';
  if (status === 'operational') return 'Operational';
  if (status === 'review_ready') return 'Review ready';
  return 'Foundation';
}

function statusClass(status: string) {
  if (status === 'enterprise_ready') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
  if (status === 'operational') return 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300';
  if (status === 'review_ready') return 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300';
  return 'border-muted-foreground/20 bg-muted text-muted-foreground';
}

export default async function EnterpriseReadinessPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = isSupportedLocale(rawLocale) ? rawLocale : 'en';
  const copy = COPY[locale];
  const summary = getEnterpriseReadinessSummary();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,_hsl(var(--primary)/0.12),_transparent_32%),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--muted)/0.35))]">
      <DashboardCommandNavigation locale={locale} />
      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="rounded-[2rem] border bg-background/90 p-8 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-muted-foreground">Enterprise readiness</p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight">{copy.title}</h1>
              <p className="mt-4 max-w-3xl text-muted-foreground">{copy.subtitle}</p>
              <a href="/api/enterprise-readiness/export" download className="mt-5 inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-background transition hover:-translate-y-0.5">
                <Download className="h-4 w-4" />
                {copy.exportLabel}
              </a>
              <p className="mt-2 text-xs text-muted-foreground">{copy.exportDescription}</p>
            </div>
            <div className="rounded-3xl border bg-muted/40 p-6 text-center">
              <ShieldCheck className="mx-auto h-8 w-8" />
              <p className="mt-3 text-sm text-muted-foreground">{copy.score}</p>
              <p className="mt-1 text-5xl font-semibold">{summary.score}%</p>
              <p className={`mt-3 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${statusClass(summary.status)}`}>{statusLabel(summary.status)}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <article className="rounded-3xl border bg-background/85 p-5 shadow-sm">
            <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
            <h2 className="mt-4 text-lg font-semibold">{copy.strongest}</h2>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {summary.strongestAreas.map((area) => <li key={area}>{area}</li>)}
            </ul>
          </article>
          <article className="rounded-3xl border bg-background/85 p-5 shadow-sm">
            <CircleAlert className="h-5 w-5 text-muted-foreground" />
            <h2 className="mt-4 text-lg font-semibold">{copy.weakest}</h2>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {summary.weakestAreas.map((area) => <li key={area}>{area}</li>)}
            </ul>
          </article>
          <Link href={`/${locale}/audit-pack`} className="rounded-3xl border bg-background/85 p-5 shadow-sm transition hover:-translate-y-1 hover:border-primary/40">
            <Target className="h-5 w-5 text-muted-foreground" />
            <h2 className="mt-4 text-lg font-semibold">{copy.evidencePack}</h2>
            <p className="mt-3 text-sm text-muted-foreground">{copy.evidencePackDescription}</p>
            <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold">Open <ArrowRight className="h-4 w-4" /></span>
          </Link>
        </div>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_0.8fr]">
          <div className="rounded-[2rem] border bg-background/90 p-6 shadow-sm">
            <h2 className="text-xl font-semibold">{copy.areas}</h2>
            <div className="mt-5 space-y-4">
              {summary.areas.map((area) => (
                <article key={area.id} className="rounded-2xl border bg-muted/30 p-5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">{area.label}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">Weight {area.weight}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${statusClass(area.status)}`}>{statusLabel(area.status)}</span>
                      <span className="text-2xl font-semibold">{area.score}%</span>
                    </div>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-foreground" style={{ width: `${Math.max(4, Math.min(100, area.score))}%` }} />
                  </div>
                </article>
              ))}
            </div>
          </div>

          <aside className="rounded-[2rem] border bg-background/90 p-6 shadow-sm">
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
            <h2 className="mt-4 text-xl font-semibold">{copy.nextActions}</h2>
            <ol className="mt-5 space-y-3">
              {summary.nextActions.map((action, index) => (
                <li key={`${action}-${index}`} className="rounded-2xl border bg-muted/30 p-4 text-sm text-muted-foreground">
                  <span className="mr-2 font-semibold text-foreground">{index + 1}.</span>{action}
                </li>
              ))}
            </ol>
          </aside>
        </section>
      </section>
    </main>
  );
}
