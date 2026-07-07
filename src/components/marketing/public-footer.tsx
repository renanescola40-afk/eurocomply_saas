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
    tagline: 'AI Act readiness, governance evidence and risk workflows for modern European teams.',
    productTitle: 'Product', companyTitle: 'Company', trustTitle: 'Trust',
    productLinks: makeLinks(['Platform', 'Pricing', 'Enterprise', 'Book demo', 'FAQ'], ['/#platform', '/pricing', '/enterprise', '/book-demo', '/#faq']),
    companyLinks: makeLinks(['Home', 'Log in'], ['/', '/login']),
  },
  pt: {
    tagline: 'AI Act readiness, evidencias de governanca e workflows de risco para equipas europeias.',
    productTitle: 'Produto', companyTitle: 'Empresa', trustTitle: 'Confianca',
    productLinks: makeLinks(['Plataforma', 'Precos', 'Enterprise', 'Demo', 'FAQ'], ['/#platform', '/pricing', '/enterprise', '/book-demo', '/#faq']),
    companyLinks: makeLinks(['Inicio', 'Entrar'], ['/', '/login']),
  },
  es: {
    tagline: 'AI Act readiness, evidencias de gobernanza y workflows de riesgo para equipos europeos.',
    productTitle: 'Producto', companyTitle: 'Empresa', trustTitle: 'Confianza',
    productLinks: makeLinks(['Plataforma', 'Precios', 'Enterprise', 'Demo', 'FAQ'], ['/#platform', '/pricing', '/enterprise', '/book-demo', '/#faq']),
    companyLinks: makeLinks(['Inicio', 'Entrar'], ['/', '/login']),
  },
  fr: {
    tagline: 'AI Act readiness, preuves de gouvernance et workflows de risque pour equipes europeennes.',
    productTitle: 'Produit', companyTitle: 'Entreprise', trustTitle: 'Confiance',
    productLinks: makeLinks(['Plateforme', 'Tarifs', 'Enterprise', 'Demo', 'FAQ'], ['/#platform', '/pricing', '/enterprise', '/book-demo', '/#faq']),
    companyLinks: makeLinks(['Accueil', 'Connexion'], ['/', '/login']),
  },
  it: {
    tagline: 'AI Act readiness, evidenze di governance e workflow di rischio per team europei.',
    productTitle: 'Prodotto', companyTitle: 'Azienda', trustTitle: 'Fiducia',
    productLinks: makeLinks(['Piattaforma', 'Prezzi', 'Enterprise', 'Demo', 'FAQ'], ['/#platform', '/pricing', '/enterprise', '/book-demo', '/#faq']),
    companyLinks: makeLinks(['Home', 'Accesso'], ['/', '/login']),
  },
  de: {
    tagline: 'AI Act readiness, Governance-Nachweise und Risiko-Workflows fuer europaeische Teams.',
    productTitle: 'Produkt', companyTitle: 'Unternehmen', trustTitle: 'Vertrauen',
    productLinks: makeLinks(['Plattform', 'Preise', 'Enterprise', 'Demo', 'FAQ'], ['/#platform', '/pricing', '/enterprise', '/book-demo', '/#faq']),
    companyLinks: makeLinks(['Startseite', 'Anmelden'], ['/', '/login']),
  },
};

function localizeHref(locale: Locale, href: string) {
  if (href.startsWith('/#')) return `/${locale}${href.slice(1)}`;
  return `/${locale}${href}`;
}

function FooterNav({ title, links, locale }: { title: string; links: FooterLink[]; locale: Locale }) {
  return (
    <nav aria-label={title}>
      <p className="font-medium text-foreground">{title}</p>
      <ul className="mt-3 space-y-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={localizeHref(locale, link.href)} className="rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function PublicFooter({ locale }: { locale: string }) {
  const activeLocale = (locales.includes(locale as Locale) ? locale : 'en') as Locale;
  const copy = footerCopy[activeLocale];
  const trustLinks = getTrustCenterPages(activeLocale).map((page) => ({ label: page.navLabel, href: `/${page.slug}` }));

  return (
    <footer className="border-t bg-background px-6 py-10 text-sm text-muted-foreground">
      <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Image src="/brand/risck-comply-wordmark.svg" alt="Risck Comply wordmark" width={160} height={40} className="h-9 w-auto object-contain" loading="lazy" />
          <p className="mt-3 max-w-md leading-6">{copy.tagline}</p>
        </div>
        <FooterNav title={copy.productTitle} links={copy.productLinks} locale={activeLocale} />
        <FooterNav title={copy.companyTitle} links={copy.companyLinks} locale={activeLocale} />
        <FooterNav title={copy.trustTitle} links={trustLinks} locale={activeLocale} />
      </div>
    </footer>
  );
}
