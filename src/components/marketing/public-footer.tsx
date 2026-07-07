import Image from 'next/image';
import Link from 'next/link';
import { getTrustCenterPages } from '@/lib/trust-center/content';
import { locales, type Locale } from '@/lib/i18n/routing';

type FooterLink = { label: string; href: string };
type FooterCopy = {
  tagline: string;
  productTitle: string;
  companyTitle: string;
  trustTitle: string;
  productLinks: FooterLink[];
  companyLinks: FooterLink[];
};

function makeLinks(labels: string[], hrefs: string[]): FooterLink[] {
  return labels.map((label, index) => ({ label, href: hrefs[index] ?? hrefs[0] ?? '/' }));
}

const footerCopy: Record<Locale, FooterCopy> = {
  en: {
    tagline: 'Enterprise-grade AI governance workflows, evidence preparation and risk visibility for European teams preparing for serious compliance review.',
    productTitle: 'Platform', companyTitle: 'Company', trustTitle: 'Trust & Assurance',
    productLinks: makeLinks(['Operating layer', 'Pricing', 'Enterprise', 'Request demo', 'FAQ'], ['/#platform', '/pricing', '/enterprise', '/book-demo', '/#faq']),
    companyLinks: makeLinks(['Home', 'Log in'], ['/', '/login']),
  },
  pt: {
    tagline: 'Workflows enterprise de governança de IA, preparação de evidências e visibilidade de risco para equipas europeias que se preparam para revisão séria de compliance.',
    productTitle: 'Plataforma', companyTitle: 'Empresa', trustTitle: 'Confiança & Assurance',
    productLinks: makeLinks(['Camada operacional', 'Preços', 'Enterprise', 'Pedir demo', 'FAQ'], ['/#platform', '/pricing', '/enterprise', '/book-demo', '/#faq']),
    companyLinks: makeLinks(['Início', 'Entrar'], ['/', '/login']),
  },
  es: {
    tagline: 'Workflows enterprise de gobernanza de IA, preparación de evidencias y visibilidad de riesgo para equipos europeos que se preparan para revisiones serias de compliance.',
    productTitle: 'Plataforma', companyTitle: 'Empresa', trustTitle: 'Confianza & Assurance',
    productLinks: makeLinks(['Capa operativa', 'Precios', 'Enterprise', 'Demo', 'FAQ'], ['/#platform', '/pricing', '/enterprise', '/book-demo', '/#faq']),
    companyLinks: makeLinks(['Inicio', 'Entrar'], ['/', '/login']),
  },
  fr: {
    tagline: 'Workflows enterprise de gouvernance IA, préparation de preuves et visibilité du risque pour les équipes européennes préparant des revues compliance sérieuses.',
    productTitle: 'Produit', companyTitle: 'Entreprise', trustTitle: 'Confiance & Assurance',
    productLinks: makeLinks(['Couche opérationnelle', 'Tarifs', 'Enterprise', 'Demo', 'FAQ'], ['/#platform', '/pricing', '/enterprise', '/book-demo', '/#faq']),
    companyLinks: makeLinks(['Accueil', 'Connexion'], ['/', '/login']),
  },
  it: {
    tagline: 'Workflow enterprise di governance AI, preparazione delle evidenze e visibilità del rischio per team europei che si preparano a review compliance serie.',
    productTitle: 'Prodotto', companyTitle: 'Azienda', trustTitle: 'Trust & Assurance',
    productLinks: makeLinks(['Livello operativo', 'Prezzi', 'Enterprise', 'Demo', 'FAQ'], ['/#platform', '/pricing', '/enterprise', '/book-demo', '/#faq']),
    companyLinks: makeLinks(['Home', 'Accesso'], ['/', '/login']),
  },
  de: {
    tagline: 'Enterprise-Workflows für KI-Governance, Evidenzvorbereitung und Risikotransparenz für europäische Teams vor anspruchsvollen Compliance-Reviews.',
    productTitle: 'Produkt', companyTitle: 'Unternehmen', trustTitle: 'Trust & Assurance',
    productLinks: makeLinks(['Operating Layer', 'Preise', 'Enterprise', 'Demo', 'FAQ'], ['/#platform', '/pricing', '/enterprise', '/book-demo', '/#faq']),
    companyLinks: makeLinks(['Startseite', 'Anmelden'], ['/', '/login']),
  },
};

function localizeHref(locale: Locale, href: string) {
  if (href.startsWith('/#')) return `/${locale}${href.slice(1)}`;
  return `/${locale}${href}`;
}

export function PublicFooter({ locale }: { locale: string }) {
  const activeLocale = (locales.includes(locale as Locale) ? locale : 'en') as Locale;
  const copy = footerCopy[activeLocale];
  const trustLinks = getTrustCenterPages(activeLocale).map((page) => ({ label: page.navLabel, href: `/${page.slug}` }));

  return (
    <footer className="border-t border-white/10 bg-[#050505] px-6 py-12 text-sm text-white/55">
      <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[1.45fr_1fr_1fr_1fr]">
        <div>
          <Image src="/brand/risck-comply-wordmark.svg" alt="Risck Comply wordmark" width={170} height={42} className="h-10 w-auto object-contain" />
          <p className="mt-4 max-w-md leading-7 text-white/58">{copy.tagline}</p>
          <p className="mt-5 rounded-2xl border border-cyan-200/15 bg-cyan-300/[0.06] px-4 py-3 text-xs leading-5 text-cyan-50/72">
            Built for evidence preparation, operational governance and review support. No unsupported certification, audit or compliance guarantee is claimed.
          </p>
        </div>
        <nav><p className="font-semibold text-white">{copy.productTitle}</p><ul className="mt-4 space-y-2.5">{copy.productLinks.map((link) => <li key={link.href}><Link href={localizeHref(activeLocale, link.href)} className="transition hover:text-white">{link.label}</Link></li>)}</ul></nav>
        <nav><p className="font-semibold text-white">{copy.companyTitle}</p><ul className="mt-4 space-y-2.5">{copy.companyLinks.map((link) => <li key={link.href}><Link href={localizeHref(activeLocale, link.href)} className="transition hover:text-white">{link.label}</Link></li>)}</ul></nav>
        <nav><p className="font-semibold text-white">{copy.trustTitle}</p><ul className="mt-4 space-y-2.5">{trustLinks.map((link) => <li key={link.href}><Link href={localizeHref(activeLocale, link.href)} className="transition hover:text-white">{link.label}</Link></li>)}</ul></nav>
      </div>
    </footer>
  );
}
