import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Globe2, Layers3, Workflow } from 'lucide-react';

import { PublicFooter } from '@/components/marketing/public-footer';
import { LOCALE_META, locales, type Locale } from '@/lib/i18n/routing';
import { getFeaturePages } from '@/lib/seo/feature-pages';

type InternationalLocale = Exclude<Locale, 'en' | 'pt'>;

type InternationalHomeCopy = {
  navFeatures: string;
  navPricing: string;
  navLogin: string;
  navSignup: string;
  languageLabel: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  primaryCta: string;
  secondaryCta: string;
  trustItems: string[];
  platformEyebrow: string;
  platformTitle: string;
  platformText: string;
  workflowEyebrow: string;
  workflowTitle: string;
  workflowText: string;
  workflowSteps: string[];
  assuranceTitle: string;
  assuranceText: string;
  finalTitle: string;
  finalText: string;
};

const copyByLocale: Record<InternationalLocale, InternationalHomeCopy> = {
  es: {
    navFeatures: 'Funcionalidades',
    navPricing: 'Precios',
    navLogin: 'Entrar',
    navSignup: 'Crear cuenta',
    languageLabel: 'Idiomas',
    eyebrow: 'Operaciones de gobernanza de IA para equipos europeos',
    title: 'Convierte la gobernanza de IA en evidencias listas para revisión.',
    subtitle: 'Reúne inventario de IA, evaluaciones de riesgo, proveedores, documentos, responsables e historial de actividad en un workspace controlado para compliance, legal, seguridad, privacidad y compras.',
    primaryCta: 'Crear cuenta',
    secondaryCta: 'Explorar funcionalidades',
    trustItems: ['Workspaces por organización', 'Acceso basado en roles', 'Historial de actividad', 'Flujos de evidencia'],
    platformEyebrow: 'Una fuente operativa de verdad',
    platformTitle: 'Conoce qué IA se utiliza, quién responde por ella y qué requiere atención.',
    platformText: 'Sustituye hojas de cálculo y cadenas de correos por registros estructurados, responsabilidades visibles y flujos de gobernanza revisables.',
    workflowEyebrow: 'Del descubrimiento a la revisión',
    workflowTitle: 'Un flujo práctico para operar la gobernanza de IA.',
    workflowText: 'Conduce cada sistema por un proceso claro sin convertir la gobernanza en un laberinto de documentos desconectados.',
    workflowSteps: ['Descubrir', 'Registrar', 'Evaluar', 'Asignar', 'Documentar', 'Revisar', 'Monitorizar'],
    assuranceTitle: 'Gobernanza profesional sin promesas jurídicas falsas.',
    assuranceText: 'RISCK COMPLY apoya operaciones de gobernanza y preparación de evidencias. No sustituye asesoramiento jurídico, auditorías externas ni garantiza resultados regulatorios.',
    finalTitle: 'Haz que la gobernanza de IA sea más fácil de operar y revisar.',
    finalText: 'Crea tu workspace y empieza a organizar sistemas, responsables, riesgos, proveedores y evidencias en un solo lugar.',
  },
  fr: {
    navFeatures: 'Fonctionnalités',
    navPricing: 'Tarifs',
    navLogin: 'Connexion',
    navSignup: 'Créer un compte',
    languageLabel: 'Langues',
    eyebrow: 'Opérations de gouvernance IA pour les équipes européennes',
    title: 'Transformez la gouvernance IA en preuves prêtes à être examinées.',
    subtitle: 'Réunissez inventaire IA, évaluations des risques, fournisseurs, documents, responsables et historique d’activité dans un workspace contrôlé pour conformité, juridique, sécurité, privacy et achats.',
    primaryCta: 'Créer un compte',
    secondaryCta: 'Explorer les fonctionnalités',
    trustItems: ['Workspaces par organisation', 'Accès fondé sur les rôles', 'Historique d’activité', 'Workflows de preuves'],
    platformEyebrow: 'Une source opérationnelle unique',
    platformTitle: 'Identifiez l’IA utilisée, les responsables et les éléments qui exigent une action.',
    platformText: 'Remplacez les tableurs dispersés et fils d’emails par des dossiers structurés, une responsabilité claire et des workflows de gouvernance révisables.',
    workflowEyebrow: 'De la découverte à la revue',
    workflowTitle: 'Un flux pratique pour exploiter la gouvernance IA.',
    workflowText: 'Faites progresser chaque système dans un processus clair sans transformer la gouvernance en labyrinthe de documents isolés.',
    workflowSteps: ['Découvrir', 'Enregistrer', 'Évaluer', 'Attribuer', 'Documenter', 'Revoir', 'Surveiller'],
    assuranceTitle: 'Une gouvernance professionnelle sans promesses juridiques excessives.',
    assuranceText: 'RISCK COMPLY soutient les opérations de gouvernance et la préparation des preuves. La plateforme ne remplace pas le conseil juridique, les audits externes et ne garantit pas un résultat réglementaire.',
    finalTitle: 'Rendez la gouvernance IA plus simple à exploiter et à examiner.',
    finalText: 'Créez votre workspace et commencez à organiser systèmes, responsables, risques, fournisseurs et preuves au même endroit.',
  },
  it: {
    navFeatures: 'Funzionalità',
    navPricing: 'Prezzi',
    navLogin: 'Accedi',
    navSignup: 'Crea account',
    languageLabel: 'Lingue',
    eyebrow: 'Operazioni di governance IA per team europei',
    title: 'Trasforma la governance IA in evidenze pronte per la revisione.',
    subtitle: 'Riunisci inventario IA, valutazioni del rischio, fornitori, documenti, responsabili e storico delle attività in un workspace controllato per compliance, legale, sicurezza, privacy e procurement.',
    primaryCta: 'Crea account',
    secondaryCta: 'Esplora le funzionalità',
    trustItems: ['Workspace per organizzazione', 'Accesso basato sui ruoli', 'Storico delle attività', 'Workflow di evidenza'],
    platformEyebrow: 'Un’unica fonte operativa',
    platformTitle: 'Scopri quale IA viene usata, chi ne è responsabile e cosa richiede attenzione.',
    platformText: 'Sostituisci fogli di calcolo e conversazioni email con record strutturati, responsabilità chiare e workflow di governance revisionabili.',
    workflowEyebrow: 'Dalla scoperta alla revisione',
    workflowTitle: 'Un flusso pratico per gestire la governance IA.',
    workflowText: 'Porta ogni sistema attraverso un processo chiaro senza trasformare la governance in un labirinto di documenti scollegati.',
    workflowSteps: ['Scoprire', 'Registrare', 'Valutare', 'Assegnare', 'Documentare', 'Rivedere', 'Monitorare'],
    assuranceTitle: 'Governance professionale senza false promesse legali.',
    assuranceText: 'RISCK COMPLY supporta le operazioni di governance e la preparazione delle evidenze. Non sostituisce consulenza legale o audit esterni e non garantisce risultati normativi.',
    finalTitle: 'Rendi la governance IA più semplice da gestire e revisionare.',
    finalText: 'Crea il tuo workspace e inizia a organizzare sistemi, responsabili, rischi, fornitori ed evidenze in un unico luogo.',
  },
  de: {
    navFeatures: 'Funktionen',
    navPricing: 'Preise',
    navLogin: 'Anmelden',
    navSignup: 'Konto erstellen',
    languageLabel: 'Sprachen',
    eyebrow: 'KI-Governance-Prozesse für europäische Teams',
    title: 'Machen Sie aus KI-Governance prüfbare Nachweise.',
    subtitle: 'Führen Sie KI-Inventar, Risikobewertungen, Anbieter, Dokumente, Verantwortliche und Aktivitätshistorie in einem kontrollierten Workspace für Compliance, Recht, Sicherheit, Datenschutz und Einkauf zusammen.',
    primaryCta: 'Konto erstellen',
    secondaryCta: 'Funktionen entdecken',
    trustItems: ['Organisations-Workspaces', 'Rollenbasierter Zugriff', 'Aktivitätshistorie', 'Nachweisworkflows'],
    platformEyebrow: 'Eine operative Quelle der Wahrheit',
    platformTitle: 'Erkennen Sie, welche KI genutzt wird, wer verantwortlich ist und wo Handlungsbedarf besteht.',
    platformText: 'Ersetzen Sie verteilte Tabellen und E-Mail-Ketten durch strukturierte Datensätze, klare Verantwortung und prüfbare Governance-Workflows.',
    workflowEyebrow: 'Von der Erfassung zur Prüfung',
    workflowTitle: 'Ein praktischer Ablauf für KI-Governance.',
    workflowText: 'Führen Sie jedes System durch einen klaren Prozess, ohne Governance in ein Labyrinth getrennter Dokumente zu verwandeln.',
    workflowSteps: ['Erkennen', 'Erfassen', 'Bewerten', 'Zuweisen', 'Dokumentieren', 'Prüfen', 'Überwachen'],
    assuranceTitle: 'Professionelle Governance ohne falsche Rechtsversprechen.',
    assuranceText: 'RISCK COMPLY unterstützt Governance-Prozesse und Nachweisvorbereitung. Die Plattform ersetzt keine Rechtsberatung oder externe Audits und garantiert keine regulatorischen Ergebnisse.',
    finalTitle: 'Machen Sie KI-Governance einfacher zu betreiben und zu prüfen.',
    finalText: 'Erstellen Sie Ihren Workspace und organisieren Sie Systeme, Verantwortliche, Risiken, Anbieter und Nachweise an einem Ort.',
  },
};

export function InternationalHome({ locale }: { locale: InternationalLocale }) {
  const copy = copyByLocale[locale];
  const features = getFeaturePages(locale);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#050913] text-white">
      <header className="border-b border-white/10 bg-[#050913]/95">
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 lg:px-8" aria-label="Primary navigation">
          <Link href={`/${locale}`} aria-label="RISCK COMPLY home" className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
            <Image src="/brand/risck-comply-wordmark.svg" alt="RISCK COMPLY" width={180} height={44} className="h-10 w-auto" priority />
          </Link>
          <div className="hidden items-center gap-6 text-sm text-white/62 lg:flex">
            <a href="#platform" className="transition hover:text-white">{copy.navFeatures}</a>
            <Link href={`/${locale}/pricing`} className="transition hover:text-white">{copy.navPricing}</Link>
            <Link href={`/${locale}/login`} className="transition hover:text-white">{copy.navLogin}</Link>
            <Link href={`/${locale}/signup`} className="rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">{copy.navSignup}</Link>
          </div>
        </nav>
      </header>

      <section className="border-b border-white/10 px-5 py-20 lg:px-8 lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[1.08fr_.92fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-300/70">{copy.eyebrow}</p>
            <h1 className="mt-6 text-5xl font-semibold tracking-[-0.055em] sm:text-6xl lg:text-7xl">{copy.title}</h1>
            <p className="mt-7 max-w-3xl text-lg leading-8 text-white/62 sm:text-xl">{copy.subtitle}</p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link href={`/${locale}/signup`} className="group inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 font-bold text-white transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
                {copy.primaryCta}<ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
              <a href="#platform" className="rounded-xl border border-white/15 bg-white/[0.04] px-6 py-3.5 font-semibold text-white/80 transition hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">{copy.secondaryCta}</a>
            </div>
            <ul className="mt-9 grid gap-3 text-sm text-white/55 sm:grid-cols-2">
              {copy.trustItems.map((item) => (
                <li key={item} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-300" aria-hidden="true" />{item}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-slate-800/80 bg-[#0d1522] p-5">
            <div className="rounded-lg border border-slate-800 bg-slate-950/25 p-6">
              <div className="flex items-center justify-between gap-4">
                <Image src="/brand/risck-comply-wordmark.svg" alt="RISCK COMPLY" width={150} height={34} className="h-8 w-auto" />
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300/65">Governance workspace</span>
              </div>
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                {features.slice(0, 4).map((feature, index) => (
                  <Link key={feature.key} href={`/${locale}/features/${feature.slug}`} className="rounded-lg border border-slate-800 bg-slate-950/25 p-4 transition hover:border-blue-400/30 hover:bg-blue-500/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
                    <span className="text-xs font-semibold text-blue-300/65">0{index + 1}</span>
                    <p className="mt-3 font-semibold text-white/88">{feature.navLabel}</p>
                    <p className="mt-2 line-clamp-3 text-xs leading-5 text-white/42">{feature.description}</p>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="platform" className="scroll-mt-8 px-5 py-20 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-300/65">{copy.platformEyebrow}</p>
          <div className="mt-5 grid gap-8 lg:grid-cols-[.9fr_1.1fr]">
            <div>
              <h2 className="text-3xl font-semibold tracking-[-0.035em] sm:text-5xl">{copy.platformTitle}</h2>
              <p className="mt-5 max-w-xl leading-7 text-white/55">{copy.platformText}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {features.map((feature) => (
                <Link key={feature.key} href={`/${locale}/features/${feature.slug}`} className="group rounded-xl border border-slate-800/80 bg-[#0d1522] p-5 transition hover:border-blue-400/30 hover:bg-blue-500/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
                  <div className="flex items-start justify-between gap-3"><Layers3 className="h-5 w-5 text-blue-300" aria-hidden="true" /><ArrowRight className="h-4 w-4 text-white/25 transition group-hover:translate-x-0.5 group-hover:text-white/60" aria-hidden="true" /></div>
                  <h3 className="mt-5 font-semibold text-white">{feature.navLabel}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/48">{feature.description}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.02] px-5 py-20 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center gap-3 text-blue-300/70"><Workflow className="h-5 w-5" aria-hidden="true" /><span className="text-sm font-semibold uppercase tracking-[0.24em]">{copy.workflowEyebrow}</span></div>
          <h2 className="mt-5 max-w-4xl text-3xl font-semibold tracking-[-0.035em] sm:text-5xl">{copy.workflowTitle}</h2>
          <p className="mt-5 max-w-3xl leading-7 text-white/55">{copy.workflowText}</p>
          <ol className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
            {copy.workflowSteps.map((step, index) => (
              <li key={step} className="rounded-lg border border-slate-800 bg-[#0d1522] p-4"><span className="text-xs font-semibold text-blue-300/60">{String(index + 1).padStart(2, '0')}</span><p className="mt-3 text-sm text-white/70">{step}</p></li>
            ))}
          </ol>
        </div>
      </section>

      <section className="px-5 py-20 lg:px-8 lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-blue-400/15 bg-blue-500/[0.05] p-8 sm:p-10">
            <Globe2 className="h-7 w-7 text-blue-300" aria-hidden="true" />
            <h2 className="mt-6 text-3xl font-semibold tracking-tight">{copy.assuranceTitle}</h2>
            <p className="mt-5 leading-7 text-white/55">{copy.assuranceText}</p>
          </div>
          <div className="rounded-xl border border-slate-800/80 bg-[#0d1522] p-8 sm:p-10">
            <h2 className="text-3xl font-semibold tracking-tight">{copy.finalTitle}</h2>
            <p className="mt-5 leading-7 text-white/55">{copy.finalText}</p>
            <Link href={`/${locale}/signup`} className="group mt-8 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 font-bold text-white transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">{copy.primaryCta}<ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" /></Link>
          </div>
        </div>
      </section>

      <nav aria-label={copy.languageLabel} className="mx-auto flex max-w-7xl flex-wrap gap-2 px-5 pb-14 lg:px-8">
        {locales.map((language) => (
          <Link key={language} href={`/${language}`} hrefLang={language} className={`rounded-lg border px-4 py-2 text-xs transition ${language === locale ? 'border-blue-400/35 bg-blue-500/10 text-white' : 'border-white/10 text-white/48 hover:border-white/25 hover:text-white'}`}>
            {LOCALE_META[language].nativeName}
          </Link>
        ))}
      </nav>

      <PublicFooter locale={locale} />
    </main>
  );
}
