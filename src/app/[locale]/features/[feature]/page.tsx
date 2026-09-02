import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, CheckCircle2, ChevronRight } from 'lucide-react';

import { PublicFooter } from '@/components/marketing/public-footer';
import { LOCALE_META, locales, type Locale } from '@/lib/i18n/routing';
import {
  getFeatureLanguageAlternates,
  getFeaturePageBySlug,
  getFeaturePath,
  getFeatureStaticParams,
} from '@/lib/seo/feature-pages';
import { getSafeLocale, getSiteUrl, makePublicMetadata } from '@/lib/seo/public-metadata';

export const revalidate = 3600;

type PageProps = {
  params: Promise<{ locale: string; feature: string }>;
};

const pageUi: Record<Locale, {
  home: string;
  features: string;
  pricing: string;
  signIn: string;
  createAccount: string;
  disclaimer: string;
  languageLabel: string;
}> = {
  en: { home: 'Home', features: 'Features', pricing: 'Pricing', signIn: 'Sign in', createAccount: 'Create account', disclaimer: 'RISCK COMPLY supports governance operations and evidence preparation. It does not provide legal advice or guarantee compliance outcomes.', languageLabel: 'Language versions' },
  pt: { home: 'Início', features: 'Funcionalidades', pricing: 'Preços', signIn: 'Entrar', createAccount: 'Criar conta', disclaimer: 'A RISCK COMPLY apoia operações de governança e preparação de evidências. Não presta aconselhamento jurídico nem garante resultados de conformidade.', languageLabel: 'Versões linguísticas' },
  es: { home: 'Inicio', features: 'Funcionalidades', pricing: 'Precios', signIn: 'Entrar', createAccount: 'Crear cuenta', disclaimer: 'RISCK COMPLY apoya operaciones de gobernanza y preparación de evidencias. No ofrece asesoramiento jurídico ni garantiza resultados de cumplimiento.', languageLabel: 'Versiones de idioma' },
  fr: { home: 'Accueil', features: 'Fonctionnalités', pricing: 'Tarifs', signIn: 'Connexion', createAccount: 'Créer un compte', disclaimer: 'RISCK COMPLY soutient les opérations de gouvernance et la préparation des preuves. La plateforme ne fournit pas de conseil juridique et ne garantit pas la conformité.', languageLabel: 'Versions linguistiques' },
  it: { home: 'Home', features: 'Funzionalità', pricing: 'Prezzi', signIn: 'Accedi', createAccount: 'Crea account', disclaimer: 'RISCK COMPLY supporta le operazioni di governance e la preparazione delle evidenze. Non fornisce consulenza legale né garantisce risultati di conformità.', languageLabel: 'Versioni linguistiche' },
  de: { home: 'Startseite', features: 'Funktionen', pricing: 'Preise', signIn: 'Anmelden', createAccount: 'Konto erstellen', disclaimer: 'RISCK COMPLY unterstützt Governance-Prozesse und Nachweisvorbereitung. Die Plattform bietet keine Rechtsberatung und garantiert keine Compliance-Ergebnisse.', languageLabel: 'Sprachversionen' },
};

export function generateStaticParams() {
  return getFeatureStaticParams();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: requestedLocale, feature } = await params;
  const locale = getSafeLocale(requestedLocale);
  const page = getFeaturePageBySlug(locale, feature);

  if (!page) {
    return { robots: { index: false, follow: false } };
  }

  const path = `/features/${page.slug}`;
  const metadata = makePublicMetadata({
    locale,
    path,
    title: `${page.title} | RISCK COMPLY`,
    description: page.description,
  });

  return {
    ...metadata,
    alternates: {
      canonical: `/${locale}${path}`,
      languages: getFeatureLanguageAlternates(page.key),
    },
  };
}

export default async function FeaturePage({ params }: PageProps) {
  const { locale: requestedLocale, feature } = await params;
  const locale = getSafeLocale(requestedLocale);
  const page = getFeaturePageBySlug(locale, feature);

  if (!page || requestedLocale !== locale) notFound();

  const ui = pageUi[locale];
  const siteUrl = getSiteUrl();
  const canonicalUrl = `${siteUrl}${getFeaturePath(locale, page.key)}`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        '@id': `${siteUrl}/#software`,
        name: 'RISCK COMPLY',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        url: siteUrl,
        description: page.description,
      },
      {
        '@type': 'WebPage',
        '@id': `${canonicalUrl}#webpage`,
        url: canonicalUrl,
        name: page.title,
        description: page.description,
        inLanguage: locale,
        isPartOf: { '@id': `${siteUrl}/#website` },
        about: { '@id': `${siteUrl}/#software` },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: ui.home, item: `${siteUrl}/${locale}` },
          { '@type': 'ListItem', position: 2, name: ui.features, item: `${siteUrl}/${locale}/#platform` },
          { '@type': 'ListItem', position: 3, name: page.navLabel, item: canonicalUrl },
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: page.faq.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer },
        })),
      },
    ],
  };

  return (
    <main className="min-h-screen bg-[#050913] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }}
      />

      <header className="border-b border-white/10 bg-[#050913]/95">
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-4 lg:px-8" aria-label="Primary navigation">
          <Link href={`/${locale}`} aria-label="RISCK COMPLY home" className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
            <Image src="/brand/risck-comply-wordmark.svg" alt="RISCK COMPLY" width={180} height={44} className="h-10 w-auto" priority />
          </Link>
          <div className="hidden items-center gap-6 text-sm text-white/65 md:flex">
            <Link href={`/${locale}/#platform`} className="transition hover:text-white">{ui.features}</Link>
            <Link href={`/${locale}/pricing`} className="transition hover:text-white">{ui.pricing}</Link>
            <Link href={`/${locale}/login`} className="transition hover:text-white">{ui.signIn}</Link>
            <Link href={`/${locale}/signup`} className="rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">{ui.createAccount}</Link>
          </div>
        </nav>
      </header>

      <section className="border-b border-white/10 px-5 py-20 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-5xl">
          <nav aria-label="Breadcrumb" className="mb-8 flex flex-wrap items-center gap-2 text-sm text-white/45">
            <Link href={`/${locale}`} className="hover:text-white">{ui.home}</Link>
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
            <span>{ui.features}</span>
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
            <span className="text-white/75">{page.navLabel}</span>
          </nav>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-300/70">{page.eyebrow}</p>
          <h1 className="mt-6 max-w-4xl text-4xl font-semibold tracking-[-0.04em] text-white sm:text-6xl lg:text-7xl">{page.title}</h1>
          <p className="mt-7 max-w-3xl text-lg leading-8 text-white/62 sm:text-xl">{page.intro}</p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href={`/${locale}/signup`} className="group inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 font-bold text-white transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
              {ui.createAccount}<ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
            <Link href={`/${locale}/pricing`} className="rounded-xl border border-white/15 bg-white/[0.04] px-6 py-3.5 font-semibold text-white/80 transition hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">{ui.pricing}</Link>
          </div>
        </div>
      </section>

      <section className="px-5 py-18 lg:px-8 lg:py-24">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-xl border border-slate-800/80 bg-[#0d1522] p-7 sm:p-9">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{page.problemTitle}</h2>
            <p className="mt-5 leading-7 text-white/58">{page.problem}</p>
          </div>
          <div className="rounded-xl border border-blue-400/15 bg-blue-500/[0.05] p-7 sm:p-9">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{page.capabilitiesTitle}</h2>
            <ul className="mt-7 grid gap-4 sm:grid-cols-2">
              {page.capabilities.map((capability) => (
                <li key={capability} className="flex gap-3 rounded-lg border border-white/10 bg-slate-950/25 p-4 text-sm leading-6 text-white/68">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-blue-300" aria-hidden="true" />
                  <span>{capability}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.02] px-5 py-18 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">{page.workflowTitle}</h2>
          <ol className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {page.workflow.map((step, index) => (
              <li key={step} className="rounded-xl border border-slate-800/80 bg-[#0d1522] p-6">
                <span className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-300/65">{String(index + 1).padStart(2, '0')}</span>
                <p className="mt-4 leading-7 text-white/75">{step}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="px-5 py-18 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{page.faqTitle}</h2>
          <div className="mt-9 space-y-4">
            {page.faq.map((item) => (
              <article key={item.question} className="rounded-xl border border-slate-800/80 bg-[#0d1522] p-6 sm:p-7">
                <h3 className="text-lg font-semibold text-white">{item.question}</h3>
                <p className="mt-3 leading-7 text-white/58">{item.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 pb-10 lg:px-8 lg:pb-16">
        <div className="mx-auto max-w-6xl rounded-xl border border-slate-800/80 bg-[#0d1522] p-8 sm:p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-300/65">RISCK COMPLY</p>
          <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight sm:text-5xl">{page.ctaTitle}</h2>
          <p className="mt-5 max-w-2xl leading-7 text-white/60">{page.ctaText}</p>
          <Link href={`/${locale}/signup`} className="group mt-8 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 font-bold text-white transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
            {ui.createAccount}<ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
          <p className="mt-7 max-w-3xl text-xs leading-5 text-white/38">{ui.disclaimer}</p>
        </div>
      </section>

      <nav aria-label={ui.languageLabel} className="mx-auto flex max-w-6xl flex-wrap gap-2 px-5 pb-14 lg:px-8">
        {locales.map((language) => (
          <Link
            key={language}
            href={getFeaturePath(language, page.key)}
            hrefLang={language}
            className={`rounded-lg border px-4 py-2 text-xs transition ${language === locale ? 'border-blue-400/35 bg-blue-500/10 text-white' : 'border-white/10 text-white/48 hover:border-white/25 hover:text-white'}`}
          >
            {LOCALE_META[language].nativeName}
          </Link>
        ))}
      </nav>

      <PublicFooter locale={locale} />
    </main>
  );
}
