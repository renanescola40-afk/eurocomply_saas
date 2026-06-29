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
    tagline: 'AI governance evidence, risk and policy readiness for modern European teams.',
    productTitle: 'Product', companyTitle: 'Company', trustTitle: 'Trust',
    productLinks: makeLinks(['Platform', 'Pricing', 'Enterprise', 'Book demo', 'FAQ'], ['/#platform', '/pricing', '/book-demo?plan=enterprise', '/book-demo', '/#faq']),
    companyLinks: makeLinks(['Home', 'Log in'], ['/', '/login']),
  },
  pt: {
    tagline: 'Evidencias de AI governance, risco e policy readiness para equipas europeias.',
    productTitle: 'Produto', companyTitle: 'Empresa', trustTitle: 'Confianca',
    productLinks: makeLinks(['Plataforma', 'Precos', 'Enterprise', 'Demo', 'FAQ'], ['/#platform', '/pricing', '/book-demo?plan=enterprise', '/book-demo', '/#faq']),
    companyLinks: makeLinks(['Inicio', 'Entrar'], ['/', '/login']),
  },
  es: {
    tagline: 'Evidencias de AI governance, riesgo y policy readiness para equipos europeos.',
    productTitle: 'Producto', companyTitle: 'Empresa', trustTitle: 'Confianza',
    productLinks: makeLinks(['Plataforma', 'Precios', 'Enterprise', 'Demo', 'FAQ'], ['/#platform', '/pricing', '/book-demo?plan=enterprise', '/book-demo', '/#faq']),
    companyLinks: makeLinks(['Inicio', 'Entrar'], ['/', '/login']),
  },
  fr: {
    tagline: 'Preuves d’AI governance, risque et policy readiness pour equipes europeennes.',
    productTitle: 'Produit', companyTitle: 'Entreprise', trustTitle: 'Confiance',
    productLinks: makeLinks(['Plateforme', 'Tarifs', 'Enterprise', 'Demo', 'FAQ'], ['/#platform', '/pricing', '/book-demo?plan=enterprise', '/book-demo', '/#faq']),
    companyLinks: makeLinks(['Accueil', 'Connexion'], ['/', '/login']),
  },
  it: {
    tagline: 'Evidenze di AI governance, rischio e policy readiness per team europei.',
    productTitle: 'Prodotto', companyTitle: 'Azienda', trustTitle: 'Fiducia',
    productLinks: makeLinks(['Piattaforma', 'Prezzi', 'Enterprise', 'Demo', 'FAQ'], ['/#platform', '/pricing', '/book-demo?plan=enterprise', '/book-demo', '/#faq']),
    companyLinks: makeLinks(['Home', 'Accesso'], ['/', '/login']),
  },
  de: {
    tagline: 'AI-Governance-Nachweise, Risiken und Policy Readiness fuer europaeische Teams.',
    productTitle: 'Produkt', companyTitle: 'Unternehmen', trustTitle: 'Vertrauen',
    productLinks: makeLinks(['Plattform', 'Preise', 'Enterprise', 'Demo', 'FAQ'], ['/#platform', '/pricing', '/book-demo?plan=enterprise', '/book-demo', '/#faq']),
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
          <Image src="/brand/risck-comply-wordmark.svg" alt="Risck comply" width={160} height={40} className="h-9 w-auto object-contain" />
          <p className="mt-3 max-w-md leading-6">{copy.tagline}</p>
        </div>
        <nav><p className="font-medium text-foreground">{copy.productTitle}</p><ul className="mt-3 space-y-2">{copy.productLinks.map((link) => <li key={link.href}><Link href={localizeHref(activeLocale, link.href)} className="hover:text-foreground">{link.label}</Link></li>)}</ul></nav>
        <nav><p className="font-medium text-foreground">{copy.companyTitle}</p><ul className="mt-3 space-y-2">{copy.companyLinks.map((link) => <li key={link.href}><Link href={localizeHref(activeLocale, link.href)} className="hover:text-foreground">{link.label}</Link></li>)}</ul></nav>
        <nav><p className="font-medium text-foreground">{copy.trustTitle}</p><ul className="mt-3 space-y-2">{trustLinks.map((link) => <li key={link.href}><Link href={localizeHref(activeLocale, link.href)} className="hover:text-foreground">{link.label}</Link></li>)}</ul></nav>
      </div>
    </footer>
  );
}
