import Image from 'next/image';
import Link from 'next/link';

import { locales, type Locale } from '@/lib/i18n/routing';
import { getFeaturePages } from '@/lib/seo/feature-pages';
import { getTrustCenterPages } from '@/lib/trust-center/content';

type FooterLink = { label: string; href: string };
type FooterCopy = {
  tagline: string;
  assuranceNote: string;
  featuresTitle: string;
  productTitle: string;
  trustTitle: string;
  featureNavLabel: string;
  productNavLabel: string;
  trustNavLabel: string;
  productLinks: FooterLink[];
};

const footerCopy: Record<Locale, FooterCopy> = {
  en: {
    tagline: 'AI governance, risk workflows and evidence preparation for European B2B teams.',
    assuranceNote: 'Built for governance operations and evidence preparation. No certification, legal advice or compliance guarantee is claimed.',
    featuresTitle: 'AI governance features',
    productTitle: 'Platform',
    trustTitle: 'Trust',
    featureNavLabel: 'AI governance feature links',
    productNavLabel: 'Product links',
    trustNavLabel: 'Trust links',
    productLinks: [
      { label: 'Platform', href: '/#platform' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Enterprise', href: '/enterprise' },
      { label: 'Request demo', href: '/book-demo' },
    ],
  },
  pt: {
    tagline: 'Governança de IA, workflows de risco e preparação de evidências para equipas B2B europeias.',
    assuranceNote: 'Criado para operações de governança e preparação de evidências. Não alegamos certificação, aconselhamento jurídico ou garantia de conformidade.',
    featuresTitle: 'Funcionalidades de governança de IA',
    productTitle: 'Plataforma',
    trustTitle: 'Confiança',
    featureNavLabel: 'Links de funcionalidades de governança de IA',
    productNavLabel: 'Links do produto',
    trustNavLabel: 'Links de confiança',
    productLinks: [
      { label: 'Plataforma', href: '/#platform' },
      { label: 'Preços', href: '/pricing' },
      { label: 'Enterprise', href: '/enterprise' },
      { label: 'Pedir demonstração', href: '/book-demo' },
    ],
  },
  es: {
    tagline: 'Gobernanza de IA, flujos de riesgo y preparación de evidencias para equipos B2B europeos.',
    assuranceNote: 'Creado para operaciones de gobernanza y preparación de evidencias. No afirmamos certificación, asesoramiento jurídico ni garantía de cumplimiento.',
    featuresTitle: 'Funcionalidades de gobernanza de IA',
    productTitle: 'Plataforma',
    trustTitle: 'Confianza',
    featureNavLabel: 'Enlaces de funcionalidades de gobernanza de IA',
    productNavLabel: 'Enlaces del producto',
    trustNavLabel: 'Enlaces de confianza',
    productLinks: [
      { label: 'Plataforma', href: '/#platform' },
      { label: 'Precios', href: '/pricing' },
      { label: 'Enterprise', href: '/enterprise' },
      { label: 'Solicitar demo', href: '/book-demo' },
    ],
  },
  fr: {
    tagline: 'Gouvernance IA, workflows de risque et préparation des preuves pour les équipes B2B européennes.',
    assuranceNote: 'Conçu pour les opérations de gouvernance et la préparation des preuves. Aucune certification, conseil juridique ou garantie de conformité n’est revendiqué.',
    featuresTitle: 'Fonctionnalités de gouvernance IA',
    productTitle: 'Plateforme',
    trustTitle: 'Confiance',
    featureNavLabel: 'Liens vers les fonctionnalités de gouvernance IA',
    productNavLabel: 'Liens produit',
    trustNavLabel: 'Liens de confiance',
    productLinks: [
      { label: 'Plateforme', href: '/#platform' },
      { label: 'Tarifs', href: '/pricing' },
      { label: 'Enterprise', href: '/enterprise' },
      { label: 'Demander une démo', href: '/book-demo' },
    ],
  },
  it: {
    tagline: 'Governance IA, workflow di rischio e preparazione delle evidenze per team B2B europei.',
    assuranceNote: 'Creato per le operazioni di governance e la preparazione delle evidenze. Non dichiariamo certificazioni, consulenza legale o garanzie di conformità.',
    featuresTitle: 'Funzionalità di governance IA',
    productTitle: 'Piattaforma',
    trustTitle: 'Fiducia',
    featureNavLabel: 'Link alle funzionalità di governance IA',
    productNavLabel: 'Link del prodotto',
    trustNavLabel: 'Link di fiducia',
    productLinks: [
      { label: 'Piattaforma', href: '/#platform' },
      { label: 'Prezzi', href: '/pricing' },
      { label: 'Enterprise', href: '/enterprise' },
      { label: 'Richiedi demo', href: '/book-demo' },
    ],
  },
  de: {
    tagline: 'KI-Governance, Risikoworkflows und Nachweisvorbereitung für europäische B2B-Teams.',
    assuranceNote: 'Entwickelt für Governance-Prozesse und Nachweisvorbereitung. Wir behaupten keine Zertifizierung, Rechtsberatung oder Compliance-Garantie.',
    featuresTitle: 'KI-Governance-Funktionen',
    productTitle: 'Plattform',
    trustTitle: 'Vertrauen',
    featureNavLabel: 'Links zu KI-Governance-Funktionen',
    productNavLabel: 'Produktlinks',
    trustNavLabel: 'Trust-Links',
    productLinks: [
      { label: 'Plattform', href: '/#platform' },
      { label: 'Preise', href: '/pricing' },
      { label: 'Enterprise', href: '/enterprise' },
      { label: 'Demo anfragen', href: '/book-demo' },
    ],
  },
};

function getActiveLocale(locale: string): Locale {
  return (locales.includes(locale as Locale) ? locale : 'en') as Locale;
}

function localizeHref(locale: Locale, href: string) {
  if (href.startsWith('/#')) return `/${locale}${href.slice(1)}`;
  return `/${locale}${href}`;
}

export function PublicFooter({ locale }: { locale: string }) {
  const activeLocale = getActiveLocale(locale);
  const copy = footerCopy[activeLocale];
  const featureLinks = getFeaturePages(activeLocale).map((page) => ({
    label: page.navLabel,
    href: `/${activeLocale}/features/${page.slug}`,
  }));
  const trustLinks = getTrustCenterPages(activeLocale).map((page) => ({ label: page.navLabel, href: `/${page.slug}` }));

  return (
    <footer className="border-t border-white/10 bg-[#050505] px-6 py-12 text-sm text-white/55">
      <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-2 xl:grid-cols-[1.35fr_1.25fr_.8fr_.9fr]">
        <div>
          <Image src="/brand/risck-comply-wordmark.svg" alt="RISCK COMPLY" width={170} height={42} className="h-10 w-auto object-contain" />
          <p className="mt-4 max-w-md leading-7 text-white/58">{copy.tagline}</p>
          <p className="mt-5 rounded-2xl border border-cyan-200/15 bg-cyan-300/[0.06] px-4 py-3 text-xs leading-5 text-cyan-50/72">{copy.assuranceNote}</p>
        </div>

        <nav aria-label={copy.featureNavLabel}>
          <p className="font-semibold text-white">{copy.featuresTitle}</p>
          <ul className="mt-4 grid gap-x-5 gap-y-2.5 sm:grid-cols-2 xl:grid-cols-1">
            {featureLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="transition hover:text-white">{link.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label={copy.productNavLabel}>
          <p className="font-semibold text-white">{copy.productTitle}</p>
          <ul className="mt-4 space-y-2.5">
            {copy.productLinks.map((link) => (
              <li key={link.href}>
                <Link href={localizeHref(activeLocale, link.href)} className="transition hover:text-white">{link.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label={copy.trustNavLabel}>
          <p className="font-semibold text-white">{copy.trustTitle}</p>
          <ul className="mt-4 space-y-2.5">
            {trustLinks.map((link) => (
              <li key={link.href}>
                <Link href={localizeHref(activeLocale, link.href)} className="transition hover:text-white">{link.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
