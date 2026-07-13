import Link from 'next/link';
import { ShieldCheck, Building2, AlertTriangle, CheckCircle2, Clock3, Download } from 'lucide-react';
import { DashboardCommandNavigation } from '@/components/dashboard/dashboard-command-navigation';
import { isSupportedLocale, type SupportedLocale } from '@/lib/i18n/locales';
import { getVendorAssuranceSummary, VENDOR_ASSURANCE_CONTROLS } from '@/server/governance/vendor-assurance-policy';

const COPY: Record<SupportedLocale, {
  title: string;
  subtitle: string;
  score: string;
  status: string;
  ready: string;
  tracked: string;
  review: string;
  criticalOpen: string;
  controls: string;
  evidence: string;
  cadence: string;
  nextActions: string;
  exportLabel: string;
  exportDescription: string;
}> = {
  en: {
    title: 'Vendor Assurance Center',
    subtitle: 'Operational view of key providers, subprocessors and vendor-review evidence used to operate RISCK COMPLY.',
    score: 'Assurance score',
    status: 'Status',
    ready: 'Review-ready controls',
    tracked: 'Tracked controls',
    review: 'Need review',
    criticalOpen: 'Critical open items',
    controls: 'Vendor controls',
    evidence: 'Evidence',
    cadence: 'Cadence',
    nextActions: 'Next actions',
    exportLabel: 'Export vendor assurance JSON',
    exportDescription: 'Download a structured supplier-assurance JSON export for customer procurement reviews.',
  },
  pt: {
    title: 'Centro de Garantia de Fornecedores',
    subtitle: 'Visão operacional dos principais fornecedores, subprocessadores e evidências de revisão usados para operar a RISCK COMPLY.',
    score: 'Índice de garantia',
    status: 'Estado',
    ready: 'Controlos prontos para revisão',
    tracked: 'Controlos acompanhados',
    review: 'Precisam de revisão',
    criticalOpen: 'Itens críticos abertos',
    controls: 'Controlos de fornecedores',
    evidence: 'Evidências',
    cadence: 'Cadência',
    nextActions: 'Próximas ações',
    exportLabel: 'Exportar garantia de fornecedores em JSON',
    exportDescription: 'Transfira um ficheiro JSON estruturado de garantia de fornecedores para processos de aquisição de clientes.',
  },
  es: {
    title: 'Centro de Garantía de Proveedores',
    subtitle: 'Vista operativa de los principales proveedores, subprocesadores y evidencias de revisión utilizados para operar RISCK COMPLY.',
    score: 'Puntuación de garantía',
    status: 'Estado',
    ready: 'Controles preparados para revisión',
    tracked: 'Controles monitorizados',
    review: 'Necesitan revisión',
    criticalOpen: 'Elementos críticos abiertos',
    controls: 'Controles de proveedores',
    evidence: 'Evidencias',
    cadence: 'Cadencia',
    nextActions: 'Próximas acciones',
    exportLabel: 'Exportar garantía de proveedores en JSON',
    exportDescription: 'Descarga una exportación JSON estructurada de garantía de proveedores para revisiones de compras de clientes.',
  },
  fr: {
    title: 'Centre d’assurance fournisseurs',
    subtitle: 'Vue opérationnelle des principaux prestataires, sous-traitants et preuves de revue utilisés pour exploiter RISCK COMPLY.',
    score: 'Score d’assurance',
    status: 'Statut',
    ready: 'Contrôles prêts pour la revue',
    tracked: 'Contrôles suivis',
    review: 'À revoir',
    criticalOpen: 'Points critiques ouverts',
    controls: 'Contrôles fournisseurs',
    evidence: 'Preuves',
    cadence: 'Cadence',
    nextActions: 'Prochaines actions',
    exportLabel: 'Exporter l’assurance fournisseurs en JSON',
    exportDescription: 'Téléchargez un export JSON structuré d’assurance fournisseurs pour les revues achats des clients.',
  },
  it: {
    title: 'Centro di garanzia dei fornitori',
    subtitle: 'Vista operativa dei principali fornitori, sub-responsabili ed evidenze di revisione utilizzati per gestire RISCK COMPLY.',
    score: 'Punteggio di garanzia',
    status: 'Stato',
    ready: 'Controlli pronti per la revisione',
    tracked: 'Controlli monitorati',
    review: 'Da rivedere',
    criticalOpen: 'Elementi critici aperti',
    controls: 'Controlli dei fornitori',
    evidence: 'Evidenze',
    cadence: 'Cadenza',
    nextActions: 'Prossime azioni',
    exportLabel: 'Esporta la garanzia fornitori in JSON',
    exportDescription: 'Scarica un export JSON strutturato della garanzia fornitori per le revisioni acquisti dei clienti.',
  },
  de: {
    title: 'Übersicht zur Lieferantenprüfung',
    subtitle: 'Operative Übersicht der wichtigsten Anbieter, Unterauftragsverarbeiter und Prüfnachweise für den Betrieb von RISCK COMPLY.',
    score: 'Prüfwert',
    status: 'Status',
    ready: 'Für die Prüfung vorbereitete Kontrollen',
    tracked: 'Verfolgte Kontrollen',
    review: 'Prüfung erforderlich',
    criticalOpen: 'Offene kritische Punkte',
    controls: 'Anbieterkontrollen',
    evidence: 'Nachweise',
    cadence: 'Prüfintervall',
    nextActions: 'Nächste Schritte',
    exportLabel: 'Lieferantenprüfung als JSON exportieren',
    exportDescription: 'Laden Sie einen strukturierten JSON-Export zur Lieferantenprüfung für Beschaffungsprüfungen von Kunden herunter.',
  },
};

function statusLabel(status: string) {
  if (status === 'enterprise_ready') return 'Evidence review ready';
  if (status === 'operational') return 'Operational';
  return 'Foundation';
}

export default async function VendorAssurancePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = isSupportedLocale(rawLocale) ? rawLocale : 'en';
  const copy = COPY[locale];
  const summary = getVendorAssuranceSummary();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,_hsl(var(--primary)/0.12),_transparent_32%),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--muted)/0.35))]">
      <DashboardCommandNavigation locale={locale} />
      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="rounded-[2rem] border bg-background/90 p-8 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-muted-foreground">Vendor governance</p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight">{copy.title}</h1>
              <p className="mt-4 max-w-3xl text-muted-foreground">{copy.subtitle}</p>
              <Link href="/api/vendor-assurance/export" className="mt-5 inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-background transition hover:-translate-y-0.5">
                <Download className="h-4 w-4" />
                {copy.exportLabel}
              </Link>
              <p className="mt-2 text-xs text-muted-foreground">{copy.exportDescription}</p>
            </div>
            <div className="rounded-3xl border bg-muted/40 p-6 text-center">
              <ShieldCheck className="mx-auto h-8 w-8" />
              <p className="mt-3 text-sm text-muted-foreground">{copy.score}</p>
              <p className="mt-1 text-4xl font-semibold">{summary.score}%</p>
              <p className="mt-1 text-xs uppercase tracking-[0.22em] text-muted-foreground">{statusLabel(summary.status)}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {[
            { label: copy.ready, value: summary.readyControls, icon: CheckCircle2 },
            { label: copy.tracked, value: summary.trackedControls, icon: Clock3 },
            { label: copy.review, value: summary.needsReview, icon: AlertTriangle },
            { label: copy.criticalOpen, value: summary.criticalOpenItems, icon: Building2 },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.label} className="rounded-3xl border bg-background/85 p-5 shadow-sm">
                <Icon className="h-5 w-5 text-muted-foreground" />
                <p className="mt-4 text-3xl font-semibold">{item.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.label}</p>
              </article>
            );
          })}
        </div>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_0.8fr]">
          <div className="rounded-[2rem] border bg-background/90 p-6 shadow-sm">
            <h2 className="text-xl font-semibold">{copy.controls}</h2>
            <div className="mt-5 space-y-4">
              {VENDOR_ASSURANCE_CONTROLS.map((control) => (
                <article key={control.id} className="rounded-2xl border bg-muted/30 p-5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-lg font-semibold">{control.provider}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{control.purpose}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      <span className="rounded-full border px-3 py-1">{control.criticality}</span>
                      <span className="rounded-full border px-3 py-1">{control.status.replace('_', ' ')}</span>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{copy.evidence}</p>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                        {control.evidence.map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{copy.cadence}</p>
                      <p className="mt-2 text-sm text-muted-foreground">{control.reviewCadence}</p>
                      <p className="mt-3 text-sm text-muted-foreground">{control.nextAction}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <aside className="rounded-[2rem] border bg-background/90 p-6 shadow-sm">
            <h2 className="text-xl font-semibold">{copy.nextActions}</h2>
            <ol className="mt-5 space-y-3">
              {summary.nextActions.map((action, index) => (
                <li key={action} className="rounded-2xl border bg-muted/30 p-4 text-sm text-muted-foreground">
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
