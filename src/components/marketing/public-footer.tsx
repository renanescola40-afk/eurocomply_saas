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
    tagline: 'AI Act readiness, governance evidence and risk workflows for European B2B teams.',
    productTitle: 'Product', companyTitle: 'Company', trustTitle: 'Trust',
    productLinks: makeLinks(['Platform', 'Pricing', 'FAQ'], ['/#platform', '/#pricing', '/#faq']),
    companyLinks: makeLinks(['Home', 'Log in'], ['/', '/login']),
  },
  pt: {
    tagline: 'AI Act readiness, evidências de governação e workflows de risco para equipas B2B europeias.',
    productTitle: 'Produto', companyTitle: 'Empresa', trustTitle: 'Confiança',
    productLinks: makeLinks(['Plataforma', 'Preços', 'FAQ'], ['/#platform', '/#pricing', '/#faq']),
    companyLinks: makeLinks(['Início', 'Entrar'], ['/', '/login']),
  },
  es: {
    tagline: 'AI Act readiness, evidencias de gobernanza y workflows de riesgo para equipos B2B europeos.',
    productTitle: 'Producto', companyTitle: 'Empresa', trustTitle: 'Confianza',
    productLinks: makeLinks(['Plataforma', 'Precios', 'FAQ'], ['/#platform', '/#pricing', '/#faq']),
    companyLinks: makeLinks(['Inicio', 'Entrar'], ['/', '/login']),
  },
  fr: {
    tagline: 'AI Act readiness, preuves de gouvernance et workflows de risque pour équipes B2B européennes.',
    productTitle: 'Produit', companyTitle: 'Entreprise', trustTitle: 'Confiance',
    productLinks: makeLinks(['Plateforme', 'Tarifs', 'FAQ'], ['/#platform', '/#pricing', '/#faq']),
    companyLinks: makeLinks(['Accueil', 'Connexion'], ['/', '/login']),
  },
  it: {
    tagline: 'AI Act readiness, evidenze di governance e workflow di rischio per team B2B europei.',
    productTitle: 'Prodotto', companyTitle: 'Azienda', trustTitle: 'Fiducia',
    productLinks: makeLinks(['Piattaforma', 'Prezzi', 'FAQ'], ['/#platform', '/#pricing', '/#faq']),
    companyLinks: makeLinks(['Home', 'Accesso'], ['/', '/login']),
  },
  de: {
    tagline: 'AI Act Readiness, Governance-Nachweise und Risiko-Workflows für europäische B2B-Teams.',
    productTitle: 'Produkt', companyTitle: 'Unternehmen', trustTitle: 'Vertrauen',
    productLinks: makeLinks(['Plattform', 'Preise', 'FAQ'], ['/#platform', '/#pricing', '/#faq']),
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
    <footer className="border-t bg-background px-6 py-10 text-sm text-muted-foreground">
      <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Image src="/brand/risck-comply-wordmark.svg" alt="Risck Comply wordmark" width={160} height={40} className="h-9 w-auto object-contain" />
          <p className="mt-3 max-w-md leading-6">{copy.tagline}</p>
        </div>
        <nav><p className="font-medium text-foreground">{copy.productTitle}</p><ul className="mt-3 space-y-2">{copy.productLinks.map((link) => <li key={link.href}><Link href={localizeHref(activeLocale, link.href)} className="hover:text-foreground">{link.label}</Link></li>)}</ul></nav>
        <nav><p className="font-medium text-foreground">{copy.companyTitle}</p><ul className="mt-3 space-y-2">{copy.companyLinks.map((link) => <li key={link.href}><Link href={localizeHref(activeLocale, link.href)} className="hover:text-foreground">{link.label}</Link></li>)}</ul></nav>
        <nav><p className="font-medium text-foreground">{copy.trustTitle}</p><ul className="mt-3 space-y-2">{trustLinks.map((link) => <li key={link.href}><Link href={localizeHref(activeLocale, link.href)} className="hover:text-foreground">{link.label}</Link></li>)}</ul></nav>
      </div>
    </footer>
  );
}
