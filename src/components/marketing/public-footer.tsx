import Image from 'next/image';
import Link from 'next/link';
import { locales, type Locale } from '@/lib/i18n/routing';

type FooterLink = { label: string; href: string };
type FooterCopy = {
  tagline: string;
  productTitle: string;
  companyTitle: string;
  trustTitle: string;
  productLinks: FooterLink[];
  companyLinks: FooterLink[];
  trustLinks: FooterLink[];
};

const trustHrefs = ['/trust', '/security', '/compliance', '/data-processing', '/sla', '/privacy', '/terms', '/dpa', '/subprocessors', '/status'];

function makeLinks(labels: string[], hrefs: string[]): FooterLink[] {
  return labels.map((label, index) => ({ label, href: hrefs[index] ?? hrefs[0] ?? '/' }));
}

const footerCopy: Record<Locale, FooterCopy> = {
  en: {
    tagline: 'Compliance evidence, risk and vendor operations for modern European teams.',
    productTitle: 'Product', companyTitle: 'Company', trustTitle: 'Trust',
    productLinks: makeLinks(['Pricing', 'Resources', 'FAQ'], ['/pricing', '/resources', '/faq']),
    companyLinks: makeLinks(['About', 'Contact'], ['/about', '/contact']),
    trustLinks: makeLinks(['Trust Center', 'Security', 'Compliance', 'Data Processing', 'Service Commitments', 'Privacy', 'Terms', 'DPA', 'Subprocessors', 'Status'], trustHrefs),
  },
  pt: {
    tagline: 'Evidencias de compliance, risco e fornecedores para equipas europeias.',
    productTitle: 'Produto', companyTitle: 'Empresa', trustTitle: 'Confianca',
    productLinks: makeLinks(['Precos', 'Recursos', 'FAQ'], ['/pricing', '/resources', '/faq']),
    companyLinks: makeLinks(['Sobre', 'Contacto'], ['/about', '/contact']),
    trustLinks: makeLinks(['Centro de Confianca', 'Seguranca', 'Compliance', 'Tratamento de Dados', 'Compromissos de Servico', 'Privacidade', 'Termos', 'DPA', 'Subprocessadores', 'Estado'], trustHrefs),
  },
  es: {
    tagline: 'Evidencias de compliance, riesgo y proveedores para equipos europeos.',
    productTitle: 'Producto', companyTitle: 'Empresa', trustTitle: 'Confianza',
    productLinks: makeLinks(['Precios', 'Recursos', 'FAQ'], ['/pricing', '/resources', '/faq']),
    companyLinks: makeLinks(['Acerca de', 'Contacto'], ['/about', '/contact']),
    trustLinks: makeLinks(['Centro de Confianza', 'Seguridad', 'Compliance', 'Tratamiento de Datos', 'Compromisos de Servicio', 'Privacidad', 'Terminos', 'DPA', 'Subprocesadores', 'Estado'], trustHrefs),
  },
  fr: {
    tagline: 'Preuves de conformite, risque et fournisseurs pour equipes europeennes.',
    productTitle: 'Produit', companyTitle: 'Entreprise', trustTitle: 'Confiance',
    productLinks: makeLinks(['Tarifs', 'Ressources', 'FAQ'], ['/pricing', '/resources', '/faq']),
    companyLinks: makeLinks(['A propos', 'Contact'], ['/about', '/contact']),
    trustLinks: makeLinks(['Centre de Confiance', 'Securite', 'Conformite', 'Traitement des Donnees', 'Engagements de Service', 'Confidentialite', 'Conditions', 'DPA', 'Sous-traitants', 'Statut'], trustHrefs),
  },
  it: {
    tagline: 'Evidenze di compliance, rischio e fornitori per team europei.',
    productTitle: 'Prodotto', companyTitle: 'Azienda', trustTitle: 'Fiducia',
    productLinks: makeLinks(['Prezzi', 'Risorse', 'FAQ'], ['/pricing', '/resources', '/faq']),
    companyLinks: makeLinks(['Chi siamo', 'Contatto'], ['/about', '/contact']),
    trustLinks: makeLinks(['Centro Fiducia', 'Sicurezza', 'Compliance', 'Trattamento Dati', 'Impegni di Servizio', 'Privacy', 'Termini', 'DPA', 'Subprocessori', 'Stato'], trustHrefs),
  },
  de: {
    tagline: 'Compliance-Nachweise, Risiken und Lieferantenprozesse fuer europaeische Teams.',
    productTitle: 'Produkt', companyTitle: 'Unternehmen', trustTitle: 'Vertrauen',
    productLinks: makeLinks(['Preise', 'Ressourcen', 'FAQ'], ['/pricing', '/resources', '/faq']),
    companyLinks: makeLinks(['Ueber uns', 'Kontakt'], ['/about', '/contact']),
    trustLinks: makeLinks(['Trust Center', 'Sicherheit', 'Compliance', 'Datenverarbeitung', 'Service Commitments', 'Datenschutz', 'Bedingungen', 'DPA', 'Unterauftragsverarbeiter', 'Status'], trustHrefs),
  },
};

export function PublicFooter({ locale }: { locale: string }) {
  const activeLocale = (locales.includes(locale as Locale) ? locale : 'en') as Locale;
  const copy = footerCopy[activeLocale];

  return (
    <footer className="border-t bg-background px-6 py-10 text-sm text-muted-foreground">
      <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Image src="/brand/risck-comply-wordmark.svg" alt="Risck comply" width={160} height={40} className="h-9 w-auto object-contain" />
          <p className="mt-3 max-w-md leading-6">{copy.tagline}</p>
        </div>
        <nav><p className="font-medium text-foreground">{copy.productTitle}</p><ul className="mt-3 space-y-2">{copy.productLinks.map((link) => <li key={link.href}><Link href={`/${activeLocale}${link.href}`} className="hover:text-foreground">{link.label}</Link></li>)}</ul></nav>
        <nav><p className="font-medium text-foreground">{copy.companyTitle}</p><ul className="mt-3 space-y-2">{copy.companyLinks.map((link) => <li key={link.href}><Link href={`/${activeLocale}${link.href}`} className="hover:text-foreground">{link.label}</Link></li>)}</ul></nav>
        <nav><p className="font-medium text-foreground">{copy.trustTitle}</p><ul className="mt-3 space-y-2">{copy.trustLinks.map((link) => <li key={link.href}><Link href={`/${activeLocale}${link.href}`} className="hover:text-foreground">{link.label}</Link></li>)}</ul></nav>
      </div>
    </footer>
  );
}
