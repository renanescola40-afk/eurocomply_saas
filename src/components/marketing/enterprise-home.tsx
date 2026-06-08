import Link from 'next/link';
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
    badge: 'European compliance operations platform',
    title: 'Board-ready compliance operations for ambitious B2B teams.',
    subtitle: 'EuroComply brings evidence, vendors, risks, documents, tasks and executive reporting into one secure operating system for European companies.',
    primary: 'Start your workspace',
    secondary: 'View pricing',
    platformTitle: 'A premium control layer for compliance, risk and evidence.',
    finalTitle: 'Make compliance look like a strategic operating system.',
    finalSubtitle: 'Start focused today. Scale into reports, alerts and enterprise controls as your program matures.',
    metrics: [['Compliance score', '82%'], ['Open risks', '7'], ['High-risk vendors', '3'], ['Missing documents', '5']],
    features: [
      ['Executive dashboard', 'Compliance score, maturity, top risks and next best actions in one command center.'],
      ['Evidence workspace', 'Private documents, signed downloads, expiry tracking and generated evidence.'],
      ['Vendor and risk workflows', 'Track supplier exposure, review status, critical risks and ownership.'],
      ['Board-ready reports', 'Printable reports, CSV exports, maturity scorecards and executive commentary.'],
    ],
    steps: ['Create organization', 'Generate tasks and evidence', 'Upload documents', 'Review vendors and risks', 'Export executive reports'],
  },
  pt: {
    nav: { product: 'Plataforma', pricing: 'Preços', login: 'Entrar', cta: 'Começar grátis' },
    badge: 'Plataforma europeia de operações de compliance',
    title: 'Compliance board-ready para equipas B2B ambiciosas.',
    subtitle: 'O EuroComply junta evidências, vendors, riscos, documentos, tarefas e reports executivos em um sistema seguro para empresas europeias.',
    primary: 'Criar workspace',
    secondary: 'Ver preços',
    platformTitle: 'Uma camada premium para compliance, risco e evidências.',
    finalTitle: 'Faça compliance parecer um sistema operacional estratégico.',
    finalSubtitle: 'Comece focado hoje. Escale para reports, alertas e controles enterprise conforme amadurece.',
    metrics: [['Score de compliance', '82%'], ['Riscos abertos', '7'], ['Vendors high-risk', '3'], ['Documentos faltando', '5']],
    features: [
      ['Dashboard executivo', 'Score, maturidade, top risks e next best actions em um command center.'],
      ['Workspace de evidências', 'Documentos privados, signed downloads, vencimentos e evidências geradas.'],
      ['Workflows de vendors e riscos', 'Exposição de fornecedores, revisão, riscos críticos e ownership.'],
      ['Reports board-ready', 'Reports imprimíveis, CSV, scorecards de maturidade e commentary executivo.'],
    ],
    steps: ['Criar organização', 'Gerar tasks e evidências', 'Subir documentos', 'Rever vendors e riscos', 'Exportar reports executivos'],
  },
  es: {
    nav: { product: 'Plataforma', pricing: 'Precios', login: 'Entrar', cta: 'Empezar' },
    badge: 'Plataforma europea de compliance',
    title: 'Compliance board-ready para equipos B2B ambiciosos.',
    subtitle: 'EuroComply une evidencia, proveedores, riesgos, documentos, tareas e informes ejecutivos en un sistema seguro.',
    primary: 'Crear workspace',
    secondary: 'Ver precios',
    platformTitle: 'Una capa premium para compliance, riesgo y evidencia.',
    finalTitle: 'Convierte compliance en un sistema operativo estratégico.',
    finalSubtitle: 'Empieza enfocado y escala con informes, alertas y controles enterprise.',
    metrics: [['Score compliance', '82%'], ['Riesgos abiertos', '7'], ['Proveedores high-risk', '3'], ['Documentos faltantes', '5']],
    features: [['Dashboard ejecutivo', 'Score, madurez, riesgos y acciones recomendadas.'], ['Workspace de evidencia', 'Documentos privados, links firmados y expiraciones.'], ['Vendors y riesgos', 'Exposición, revisión, riesgos críticos y responsables.'], ['Reports ejecutivos', 'PDF, CSV, scorecards y comentario ejecutivo.']],
    steps: ['Crear organización', 'Generar tareas', 'Subir documentos', 'Revisar riesgos', 'Exportar informes'],
  },
  fr: {
    nav: { product: 'Plateforme', pricing: 'Tarifs', login: 'Connexion', cta: 'Commencer' },
    badge: 'Plateforme européenne de compliance',
    title: 'Compliance board-ready pour équipes B2B ambitieuses.',
    subtitle: 'EuroComply centralise preuves, fournisseurs, risques, documents, tâches et rapports exécutifs.',
    primary: 'Créer un workspace',
    secondary: 'Voir tarifs',
    platformTitle: 'Une couche premium pour compliance, risque et preuves.',
    finalTitle: 'Faites de la compliance un système opérationnel stratégique.',
    finalSubtitle: 'Commencez ciblé et évoluez vers rapports, alertes et contrôles enterprise.',
    metrics: [['Score compliance', '82%'], ['Risques ouverts', '7'], ['Fournisseurs high-risk', '3'], ['Documents manquants', '5']],
    features: [['Dashboard exécutif', 'Score, maturité, risques et actions recommandées.'], ['Workspace preuves', 'Documents privés, liens signés et expirations.'], ['Vendors et risques', 'Exposition, revues, risques critiques et ownership.'], ['Rapports exécutifs', 'PDF, CSV, scorecards et commentaire.']],
    steps: ['Créer organisation', 'Générer tâches', 'Uploader documents', 'Revoir risques', 'Exporter rapports'],
  },
  it: {
    nav: { product: 'Piattaforma', pricing: 'Prezzi', login: 'Accedi', cta: 'Inizia' },
    badge: 'Piattaforma europea di compliance',
    title: 'Compliance board-ready per team B2B ambiziosi.',
    subtitle: 'EuroComply centralizza evidenze, vendor, rischi, documenti, task e report executive.',
    primary: 'Crea workspace',
    secondary: 'Vedi prezzi',
    platformTitle: 'Un layer premium per compliance, rischio ed evidenze.',
    finalTitle: 'Trasforma compliance in un sistema operativo strategico.',
    finalSubtitle: 'Parti focalizzato e scala con report, alert e controlli enterprise.',
    metrics: [['Score compliance', '82%'], ['Rischi aperti', '7'], ['Vendor high-risk', '3'], ['Documenti mancanti', '5']],
    features: [['Dashboard executive', 'Score, maturità, rischi e azioni consigliate.'], ['Workspace evidenze', 'Documenti privati, link firmati e scadenze.'], ['Vendor e rischi', 'Esposizione, review, rischi critici e ownership.'], ['Report executive', 'PDF, CSV, scorecard e commentary.']],
    steps: ['Crea organizzazione', 'Genera task', 'Carica documenti', 'Rivedi rischi', 'Esporta report'],
  },
  de: {
    nav: { product: 'Plattform', pricing: 'Preise', login: 'Anmelden', cta: 'Starten' },
    badge: 'Europäische Compliance-Plattform',
    title: 'Board-ready Compliance Operations für ambitionierte B2B-Teams.',
    subtitle: 'EuroComply bündelt Nachweise, Lieferanten, Risiken, Dokumente, Aufgaben und Executive Reports.',
    primary: 'Workspace starten',
    secondary: 'Preise ansehen',
    platformTitle: 'Eine Premium-Ebene für Compliance, Risiko und Nachweise.',
    finalTitle: 'Machen Sie Compliance zu einem strategischen Betriebssystem.',
    finalSubtitle: 'Starten Sie fokussiert und skalieren Sie mit Reports, Alerts und Enterprise Controls.',
    metrics: [['Compliance Score', '82%'], ['Offene Risiken', '7'], ['High-risk Vendors', '3'], ['Fehlende Dokumente', '5']],
    features: [['Executive Dashboard', 'Score, Reifegrad, Risiken und nächste Aktionen.'], ['Evidence Workspace', 'Private Dokumente, signierte Links und Fristen.'], ['Vendor und Risiko', 'Exposition, Reviews, kritische Risiken und Ownership.'], ['Executive Reports', 'PDF, CSV, Scorecards und Kommentar.']],
    steps: ['Organisation erstellen', 'Tasks generieren', 'Dokumente hochladen', 'Risiken prüfen', 'Reports exportieren'],
  },
};

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
        <div className="absolute left-1/2 top-0 h-[38rem] w-[38rem] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-28">
          <div className="relative max-w-4xl">
            <p className="inline-flex rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary/90">{c.badge}</p>
            <h1 className="mt-6 text-5xl font-bold tracking-tight md:text-7xl">{c.title}</h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-white/62">{c.subtitle}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href={`/${locale}/signup`} className="inline-flex h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-semibold text-black hover:bg-white/90">{c.primary}</Link>
              <Link href={`/${locale}/pricing`} className="inline-flex h-12 items-center justify-center rounded-full border border-white/15 px-6 text-sm font-semibold hover:bg-white/10">{c.secondary}</Link>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 p-6 shadow-2xl">
            <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-emerald-400/20 blur-3xl" />
            <div className="relative">
              <p className="text-sm text-white/45">Executive command center</p>
              <h2 className="mt-1 text-xl font-semibold">Operationally controlled</h2>
              <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.05] p-5 text-center">
                <p className="text-xs uppercase tracking-[0.24em] text-white/35">Compliance score</p>
                <p className="mt-2 text-7xl font-bold text-emerald-300">82%</p>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {c.metrics.map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <span className="text-xs uppercase tracking-[0.16em] text-white/35">{label}</span>
                    <p className="mt-2 text-2xl font-semibold">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="platform" className="border-y border-white/10 bg-white/[0.03] py-20">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="max-w-3xl text-3xl font-bold tracking-tight md:text-5xl">{c.platformTitle}</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-4">
            {c.features.map(([title, description]) => (
              <article key={title} className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-xl">
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-white/55">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-20 md:grid-cols-2">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-white/35">Workflow</p>
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
    </main>
  );
}
