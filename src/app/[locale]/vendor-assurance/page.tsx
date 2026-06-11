import { ShieldCheck, Building2, AlertTriangle, CheckCircle2, Clock3 } from 'lucide-react';
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
}> = {
  en: {
    title: 'Vendor Assurance Center',
    subtitle: 'Operational view of key providers, subprocessors and vendor review evidence used to run EuroComply.',
    score: 'Assurance score',
    status: 'Status',
    ready: 'Ready controls',
    tracked: 'Tracked controls',
    review: 'Need review',
    criticalOpen: 'Critical open items',
    controls: 'Vendor controls',
    evidence: 'Evidence',
    cadence: 'Cadence',
    nextActions: 'Next actions',
  },
  pt: {
    title: 'Centro de Garantia de Fornecedores',
    subtitle: 'Visão operacional dos fornecedores, subprocessadores e evidências usadas para operar o EuroComply.',
    score: 'Score de garantia',
    status: 'Estado',
    ready: 'Controlos prontos',
    tracked: 'Controlos acompanhados',
    review: 'Precisam de revisão',
    criticalOpen: 'Itens críticos abertos',
    controls: 'Controlos de fornecedores',
    evidence: 'Evidências',
    cadence: 'Cadência',
    nextActions: 'Próximas ações',
  },
  es: {
    title: 'Centro de Garantía de Proveedores',
    subtitle: 'Vista operativa de proveedores, subprocesadores y evidencias usadas para operar EuroComply.',
    score: 'Puntuación de garantía',
    status: 'Estado',
    ready: 'Controles listos',
    tracked: 'Controles monitorizados',
    review: 'Necesitan revisión',
    criticalOpen: 'Elementos críticos abiertos',
    controls: 'Controles de proveedores',
    evidence: 'Evidencias',
    cadence: 'Cadencia',
    nextActions: 'Próximas acciones',
  },
  fr: {
    title: 'Centre Assurance Fournisseurs',
    subtitle: 'Vue opérationnelle des prestataires, sous-traitants et preuves utilisées pour exploiter EuroComply.',
    score: 'Score assurance',
    status: 'Statut',
    ready: 'Contrôles prêts',
    tracked: 'Contrôles suivis',
    review: 'À revoir',
    criticalOpen: 'Points critiques ouverts',
    controls: 'Contrôles fournisseurs',
    evidence: 'Preuves',
    cadence: 'Cadence',
    nextActions: 'Prochaines actions',
  },
  it: {
    title: 'Centro Assurance Fornitori',
    subtitle: 'Vista operativa di provider, subprocessori ed evidenze usate per gestire EuroComply.',
    score: 'Punteggio assurance',
    status: 'Stato',
    ready: 'Controlli pronti',
    tracked: 'Controlli monitorati',
    review: 'Da rivedere',
    criticalOpen: 'Elementi critici aperti',
    controls: 'Controlli fornitori',
    evidence: 'Evidenze',
    cadence: 'Cadenza',
    nextActions: 'Prossime azioni',
  },
  de: {
    title: 'Vendor Assurance Center',
    subtitle: 'Operative Sicht auf Anbieter, Unterauftragsverarbeiter und Nachweise für den Betrieb von EuroComply.',
    score: 'Assurance-Score',
    status: 'Status',
    ready: 'Bereite Kontrollen',
    tracked: 'Verfolgte Kontrollen',
    review: 'Prüfung erforderlich',
    criticalOpen: 'Offene kritische Punkte',
    controls: 'Anbieterkontrollen',
    evidence: 'Nachweise',
    cadence: 'Kadenz',
    nextActions: 'Nächste Schritte',
  },
};

function statusLabel(status: string) {
  if (status === 'enterprise_ready') return 'Enterprise ready';
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
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-muted-foreground">Enterprise Governance</p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight">{copy.title}</h1>
              <p className="mt-4 max-w-3xl text-muted-foreground">{copy.subtitle}</p>
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
