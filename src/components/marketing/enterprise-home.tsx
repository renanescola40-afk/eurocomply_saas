import Link from 'next/link';
import { PublicFooter } from '@/components/marketing/public-footer';
import { LOCALE_META, locales, type Locale } from '@/lib/i18n/routing';

type HomeCopy = {
  nav: { product: string; pricing: string; login: string; cta: string };
  badge: string;
  title: string;
  subtitle: string;
  primary: string;
  secondary: string;
  platformTitle: string;
  finalTitle: string;
  finalSubtitle: string;
  features: Array<[string, string]>;
  metrics: Array<[string, string]>;
  steps: string[];
};

const homeCopy: Record<Locale, HomeCopy> = {
  en: {
    nav: { product: 'Platform', pricing: 'Pricing', login: 'Sign in', cta: 'Start free' },
    badge: 'European compliance operating system',
    title: 'The compliance command center for ambitious B2B teams.',
    subtitle: 'EuroComply turns GDPR evidence, vendor reviews, operational risks, documents, tasks and executive reporting into a premium control layer for European companies preparing customer, board and investor scrutiny.',
    primary: 'Start your workspace',
    secondary: 'View pricing',
    platformTitle: 'Not another checklist. A control room for evidence, exposure and executive trust.',
    finalTitle: 'Make compliance look like a strategic operating system.',
    finalSubtitle: 'Start focused today. Scale into reports, alerts and enterprise controls as your program matures.',
    metrics: [['Compliance score', '82%'], ['Open risks', '7'], ['High-risk vendors', '3'], ['Missing evidence', '5']],
    features: [
      ['Executive cockpit', 'A board-ready view of compliance score, maturity, exposure, trends and next best actions.'],
      ['Evidence chain', 'Connect policies, vendor files, DPIAs, signed downloads, expiry dates and approvals into one audit trail.'],
      ['Vendor exposure map', 'Track suppliers, DPA status, data access, review status and third-party risk concentration.'],
      ['Board memo reports', 'Generate narrative reports, maturity scorecards, CSV exports and printable PDF-ready summaries.'],
    ],
    steps: ['Create organization', 'Generate tasks and evidence', 'Upload documents', 'Review vendors and risks', 'Export executive reports'],
  },
  pt: {
    nav: { product: 'Plataforma', pricing: 'Preços', login: 'Entrar', cta: 'Começar grátis' },
    badge: 'Sistema operacional europeu de compliance',
    title: 'O command center de compliance para equipas B2B ambiciosas.',
    subtitle: 'O EuroComply transforma evidências GDPR, revisão de vendors, riscos operacionais, documentos, tarefas e reports executivos em uma camada premium de controlo para empresas europeias que precisam impressionar clientes, board e investidores.',
    primary: 'Criar workspace',
    secondary: 'Ver preços',
    platformTitle: 'Não é mais uma checklist. É uma sala de controlo para evidência, exposição e confiança executiva.',
    finalTitle: 'Faça compliance parecer um sistema operacional estratégico.',
    finalSubtitle: 'Comece focado hoje. Escale para reports, alertas e controles enterprise conforme amadurece.',
    metrics: [['Score de compliance', '82%'], ['Riscos abertos', '7'], ['Vendors high-risk', '3'], ['Evidências faltando', '5']],
    features: [
      ['Cockpit executivo', 'Uma visão board-ready de score, maturidade, exposição, trends e next best actions.'],
      ['Cadeia de evidências', 'Conecte policies, ficheiros de vendor, DPIAs, signed downloads, vencimentos e aprovações num audit trail.'],
      ['Mapa de vendor exposure', 'Acompanhe fornecedores, DPA status, acesso a dados, review status e concentração de risco terceiro.'],
      ['Board memo reports', 'Gere reports narrativos, maturity scorecards, CSV exports e PDFs imprimíveis.'],
    ],
    steps: ['Criar organização', 'Gerar tasks e evidências', 'Subir documentos', 'Rever vendors e riscos', 'Exportar reports executivos'],
  },
  es: {
    nav: { product: 'Plataforma', pricing: 'Precios', login: 'Entrar', cta: 'Empezar' },
    badge: 'Sistema operativo europeo de compliance',
    title: 'El command center de compliance para equipos B2B ambiciosos.',
    subtitle: 'EuroComply une evidencia GDPR, proveedores, riesgos, documentos, tareas e informes ejecutivos en una capa premium de control.',
    primary: 'Crear workspace',
    secondary: 'Ver precios',
    platformTitle: 'No es otra checklist. Es una sala de control para evidencia, exposición y confianza ejecutiva.',
    finalTitle: 'Convierte compliance en un sistema operativo estratégico.',
    finalSubtitle: 'Empieza enfocado y escala con informes, alertas y controles enterprise.',
    metrics: [['Score compliance', '82%'], ['Riesgos abiertos', '7'], ['Proveedores high-risk', '3'], ['Evidencia faltante', '5']],
    features: [['Cockpit ejecutivo', 'Score, madurez, exposición y acciones recomendadas.'], ['Cadena de evidencia', 'Políticas, vendors, DPIAs, expiraciones y aprobaciones.'], ['Mapa de proveedores', 'DPA, acceso a datos, revisión y concentración de riesgo.'], ['Board memo reports', 'Informes narrativos, CSV y PDFs imprimibles.']],
    steps: ['Crear organización', 'Generar tareas', 'Subir documentos', 'Revisar riesgos', 'Exportar informes'],
  },
  fr: {
    nav: { product: 'Plateforme', pricing: 'Tarifs', login: 'Connexion', cta: 'Commencer' },
    badge: 'Système opérationnel européen de compliance',
    title: 'Le command center compliance pour équipes B2B ambitieuses.',
    subtitle: 'EuroComply centralise preuves GDPR, fournisseurs, risques, documents, tâches et rapports exécutifs dans une couche de contrôle premium.',
    primary: 'Créer un workspace',
    secondary: 'Voir tarifs',
    platformTitle: 'Pas une checklist. Une salle de contrôle pour preuves, exposition et confiance exécutive.',
    finalTitle: 'Faites de la compliance un système opérationnel stratégique.',
    finalSubtitle: 'Commencez ciblé et évoluez vers rapports, alertes et contrôles enterprise.',
    metrics: [['Score compliance', '82%'], ['Risques ouverts', '7'], ['Fournisseurs high-risk', '3'], ['Preuves manquantes', '5']],
    features: [['Cockpit exécutif', 'Score, maturité, exposition et prochaines actions.'], ['Chaîne de preuves', 'Politiques, vendors, DPIA, expirations et validations.'], ['Carte fournisseurs', 'DPA, accès data, revues et concentration du risque.'], ['Board memo reports', 'Rapports narratifs, CSV et PDF imprimables.']],
    steps: ['Créer organisation', 'Générer tâches', 'Uploader documents', 'Revoir risques', 'Exporter rapports'],
  },
  it: {
    nav: { product: 'Piattaforma', pricing: 'Prezzi', login: 'Accedi', cta: 'Inizia' },
    badge: 'Sistema operativo europeo di compliance',
    title: 'Il command center compliance per team B2B ambiziosi.',
    subtitle: 'EuroComply centralizza evidenze GDPR, vendor, rischi, documenti, task e report executive in un layer premium di controllo.',
    primary: 'Crea workspace',
    secondary: 'Vedi prezzi',
    platformTitle: 'Non una checklist. Una control room per evidenze, esposizione e fiducia executive.',
    finalTitle: 'Trasforma compliance in un sistema operativo strategico.',
    finalSubtitle: 'Parti focalizzato e scala con report, alert e controlli enterprise.',
    metrics: [['Score compliance', '82%'], ['Rischi aperti', '7'], ['Vendor high-risk', '3'], ['Evidenze mancanti', '5']],
    features: [['Cockpit executive', 'Score, maturità, esposizione e next actions.'], ['Catena evidenze', 'Policy, vendor, DPIA, scadenze e approvazioni.'], ['Mappa vendor', 'DPA, accesso dati, review e concentrazione rischio.'], ['Board memo reports', 'Report narrativi, CSV e PDF stampabili.']],
    steps: ['Crea organizzazione', 'Genera task', 'Carica documenti', 'Rivedi rischi', 'Esporta report'],
  },
  de: {
    nav: { product: 'Plattform', pricing: 'Preise', login: 'Anmelden', cta: 'Starten' },
    badge: 'Europäisches Compliance-Betriebssystem',
    title: 'Das Compliance Command Center für ambitionierte B2B-Teams.',
    subtitle: 'EuroComply bündelt GDPR-Nachweise, Lieferanten, Risiken, Dokumente, Aufgaben und Executive Reports in einer Premium-Kontrollebene.',
    primary: 'Workspace starten',
    secondary: 'Preise ansehen',
    platformTitle: 'Keine weitere Checkliste. Ein Kontrollraum für Nachweise, Exposition und Vertrauen.',
    finalTitle: 'Machen Sie Compliance zu einem strategischen Betriebssystem.',
    finalSubtitle: 'Starten Sie fokussiert und skalieren Sie mit Reports, Alerts und Enterprise Controls.',
    metrics: [['Compliance Score', '82%'], ['Offene Risiken', '7'], ['High-risk Vendors', '3'], ['Fehlende Nachweise', '5']],
    features: [['Executive Cockpit', 'Score, Reifegrad, Exposition und nächste Aktionen.'], ['Evidence Chain', 'Policies, Vendors, DPIAs, Fristen und Freigaben.'], ['Vendor Map', 'DPA, Datenzugriff, Reviews und Risikokonzentration.'], ['Board Memo Reports', 'Narrative Reports, CSV und druckbare PDFs.']],
    steps: ['Organisation erstellen', 'Tasks generieren', 'Dokumente hochladen', 'Risiken prüfen', 'Reports exportieren'],
  },
};

function SignalRail({ items }: { items: Array<[string, string]> }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4 shadow-lg">
          <span className="text-xs uppercase tracking-[0.16em] text-white/35">{label}</span>
          <p className="mt-2 text-2xl font-semibold">{value}</p>
        </div>
      ))}
    </div>
  );
}

function ProductTheatre({ metrics }: { metrics: Array<[string, string]> }) {
  return (
    <div className="relative overflow-hidden rounded-[2.25rem] border border-white/10 bg-[#070b15] p-5 shadow-2xl">
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
      <div className="absolute -bottom-24 left-10 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl" />
      <div className="relative grid gap-4">
        <div className="flex items-center justify-between gap-4 rounded-3xl border border-white/10 bg-white/[0.045] p-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-white/35">Live control room</p>
            <h2 className="mt-1 text-xl font-semibold">Board memo ready</h2>
          </div>
          <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">Synced</span>
        </div>

        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-5 text-center">
            <p className="text-xs uppercase tracking-[0.24em] text-white/35">Compliance score</p>
            <div className="mx-auto mt-4 flex h-40 w-40 items-center justify-center rounded-full bg-[conic-gradient(rgb(52,211,153)_295deg,rgba(255,255,255,0.10)_0deg)]">
              <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-[#070b15]">
                <p className="text-5xl font-bold text-emerald-300">82%</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/35">controlled</p>
              </div>
            </div>
          </div>

          <div className="grid gap-3">
            <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-4">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-white/35">
                <span>Risk radar</span>
                <span>Q2 review</span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                {['Vendors', 'Evidence', 'Tasks'].map((item, index) => (
                  <div key={item} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                    <div className={`mx-auto h-10 w-10 rounded-full ${index === 0 ? 'bg-amber-300/20' : index === 1 ? 'bg-rose-300/20' : 'bg-emerald-300/20'}`} />
                    <p className="mt-2 text-white/60">{item}</p>
                  </div>
                ))}
              </div>
            </div>
            <SignalRail items={metrics} />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {['Evidence chain locked', 'Vendor review queue', 'Board memo generated'].map((item) => (
            <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/62">{item}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function EnterpriseHome({ locale }: { locale: Locale }) {
  const c = homeCopy[locale];

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#050505]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link href={`/${locale}`} className="text-lg font-bold tracking-tight">EuroComply</Link>
          <nav className="hidden items-center gap-2 text-sm md:flex">
            <a href="#platform" className="rounded-full px-4 py-2 text-white/60 hover:bg-white/10 hover:text-white">{c.nav.product}</a>
            <Link href={`/${locale}/pricing`} className="rounded-full px-4 py-2 text-white/60 hover:bg-white/10 hover:text-white">{c.nav.pricing}</Link>
          </nav>
          <div className="flex items-center gap-2">
            <div className="hidden gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1 lg:flex">
              {locales.map((item) => (
                <Link key={item} href={`/${item}`} className={`rounded-full px-2.5 py-1 text-xs ${item === locale ? 'bg-white text-black' : 'text-white/60 hover:text-white'}`}>{LOCALE_META[item].flag}</Link>
              ))}
            </div>
            <Link href={`/${locale}/login`} className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium hover:bg-white/10">{c.nav.login}</Link>
            <Link href={`/${locale}/signup`} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/90">{c.nav.cta}</Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[44rem] w-[44rem] -translate-x-1/2 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute right-0 top-40 h-[30rem] w-[30rem] rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:py-28">
          <div className="relative max-w-4xl">
            <p className="inline-flex rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary/90">{c.badge}</p>
            <h1 className="mt-6 text-5xl font-bold tracking-tight md:text-7xl">{c.title}</h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-white/62">{c.subtitle}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href={`/${locale}/signup`} className="inline-flex h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-semibold text-black hover:bg-white/90">{c.primary}</Link>
              <Link href={`/${locale}/pricing`} className="inline-flex h-12 items-center justify-center rounded-full border border-white/15 px-6 text-sm font-semibold hover:bg-white/10">{c.secondary}</Link>
            </div>
            <div className="mt-8 grid max-w-xl grid-cols-3 gap-3 text-xs text-white/45">
              <span>ISO-ready evidence</span>
              <span>GDPR operations</span>
              <span>Fintech vendor risk</span>
            </div>
          </div>

          <ProductTheatre metrics={c.metrics} />
        </div>
      </section>

      <section id="platform" className="border-y border-white/10 bg-white/[0.03] py-20">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="max-w-4xl text-3xl font-bold tracking-tight md:text-5xl">{c.platformTitle}</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-4">
            {c.features.map(([title, description]) => (
              <article key={title} className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-xl transition hover:-translate-y-1 hover:border-white/25">
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-white/55">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-20 md:grid-cols-2">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-white/35">Operating rhythm</p>
          <h2 className="mt-3 text-4xl font-bold tracking-tight">{c.finalTitle}</h2>
          <p className="mt-4 max-w-xl text-white/55">{c.finalSubtitle}</p>
        </div>
        <ol className="space-y-4">
          {c.steps.map((step, index) => (
            <li key={step} className="flex gap-4 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-black">{index + 1}</span>
              <span className="pt-1 font-medium text-white/82">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-center shadow-2xl md:p-12">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary/80">Built for serious operators</p>
          <h2 className="mt-4 text-4xl font-bold tracking-tight">{c.finalTitle}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-white/55">{c.finalSubtitle}</p>
          <Link href={`/${locale}/signup`} className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-semibold text-black hover:bg-white/90">{c.primary}</Link>
        </div>
      </section>

      <PublicFooter locale={locale} />
    </main>
  );
}
