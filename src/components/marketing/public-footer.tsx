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

const commonTrustHrefs = ['/trust', '/security', '/compliance', '/data-processing', '/sla', '/privacy', '/terms', '/dpa', '/subprocessors', '/status'] as const;

const footerCopy: Record<Locale, FooterCopy> = {
  en: {
    tagline: 'Compliance evidence, risk and vendor operations for modern European teams. Built for operational readiness, not spreadsheet archaeology.',
    productTitle: 'Product',
    companyTitle: 'Company',
    trustTitle: 'Trust',
    productLinks: [{ label: 'Pricing', href: '/pricing' }, { label: 'Resources', href: '/resources' }, { label: 'FAQ', href: '/faq' }],
    companyLinks: [{ label: 'About', href: '/about' }, { label: 'Contact', href: '/contact' }],
    trustLinks: ['Trust Center', 'Security', 'Compliance', 'Data Processing', 'Service Commitments', 'Privacy', 'Terms', 'DPA', 'Subprocessors', 'Status'].map((label, index) => ({ label, href: commonTrustHrefs[index] })),
  },
  pt: {
    tagline: 'Evidências de compliance, risco e operações com fornecedores para equipas europeias modernas. Criado para prontidão operacional, não para arqueologia em folhas de cálculo.',
    productTitle: 'Produto',
    companyTitle: 'Empresa',
    trustTitle: 'Confiança',
    productLinks: [{ label: 'Preços', href: '/pricing' }, { label: 'Recursos', href: '/resources' }, { label: 'FAQ', href: '/faq' }],
    companyLinks: [{ label: 'Sobre', href: '/about' }, { label: 'Contacto', href: '/contact' }],
    trustLinks: ['Centro de Confiança', 'Segurança', 'Compliance', 'Tratamento de Dados', 'Compromissos de Serviço', 'Privacidade', 'Termos', 'DPA', 'Subprocessadores', 'Estado'].map((label, index) => ({ label, href: commonTrustHrefs[index] })),
  },
  es: {
    tagline: 'Evidencias de compliance, riesgo y operaciones con proveedores para equipos europeos modernos. Construido para preparación operativa, no para arqueología en hojas de cálculo.',
    productTitle: 'Producto',
    companyTitle: 'Empresa',
    trustTitle: 'Confianza',
    productLinks: [{ label: 'Precios', href: '/pricing' }, { label: 'Recursos', href: '/resources' }, { label: 'FAQ', href: '/faq' }],
    companyLinks: [{ label: 'Acerca de', href: '/about' }, { label: 'Contacto', href: '/contact' }],
    trustLinks: ['Centro de Confianza', 'Seguridad', 'Compliance', 'Tratamiento de Datos', 'Compromisos de Servicio', 'Privacidad', 'Términos', 'DPA', 'Subprocesadores', 'Estado'].map((label, index) => ({ label, href: commonTrustHrefs[index] })),
  },
  fr: {
    tagline: 'Preuves de conformité, risques et opérations fournisseurs pour les équipes européennes modernes. Conçu pour la préparation opérationnelle, pas pour l’archéologie de tableurs.',
    productTitle: 'Produit',
    companyTitle: 'Entreprise',
    trustTitle: 'Confiance',
    productLinks: [{ label: 'Tarifs', href: '/pricing' }, { label: 'Ressources', href: '/resources' }, { label: 'FAQ', href: '/faq' }],
    companyLinks: [{ label: 'À propos', href: '/about' }, { label: 'Contact', href: '/contact' }],
    trustLinks: ['Centre de Confiance', 'Sécurité', 'Conformité', 'Traitement des Données', 'Engagements de Service', 'Confidentialité', 'Conditions', 'DPA', 'Sous-traitants', 'Statut'].map((label, index) => ({ label, href: commonTrustHrefs[index] })),
  },
  it: {
    tagline: 'Evidenze di compliance, rischio e operazioni fornitori per team europei moderni. Costruito per prontezza operativa, non per archeologia nei fogli di calcolo.',
    productTitle: 'Prodotto',
    companyTitle: 'Azienda',
    trustTitle: 'Fiducia',
    productLinks: [{ label: 'Prezzi', href: '/pricing' }, { label: 'Risorse', href: '/resources' }, { label: 'FAQ', href: '/faq' }],
    companyLinks: [{ label: 'Chi siamo', href: '/about' }, { label: 'Contatto', href: '/contact' }],
    trustLinks: ['Centro Fiducia', 'Sicurezza', 'Compliance', 'Trattamento Dati', 'Impegni di Servizio', 'Privacy', 'Termini', 'DPA', 'Subprocessori', 'Stato'].map((label, index) => ({ label, href: commonTrustHrefs[index] })),
  },
  de: {
    tagline: 'Compliance-Nachweise, Risiken und Lieferantenprozesse für moderne europäische Teams. Gebaut für operative Bereitschaft, nicht für Tabellenkalkulations-Archäologie.',
    productTitle: 'Produkt',
    companyTitle: 'Unternehmen',
    trustTitle: 'Vertrauen',
    productLinks: [{ label: 'Preise', href: '/pricing' }, { label: 'Ressourcen', href: '/resources' }, { label: 'FAQ', href: '/faq' }],
    companyLinks: [{ label: 'Über uns', href: '/about' }, { label: 'Kontakt', href: '/contact' }],
    trustLinks: ['Trust Center', 'Sicherheit', 'Compliance', 'Datenverarbeitung', 'Service Commitments', 'Datenschutz', 'Bedingungen', 'DPA', 'Unterauftragsverarbeiter', 'Status'].map((label, index) => ({ label, href: commonTrustHrefs[index] })),
  },
};

export function PublicFooter({ locale }: { locale: string }) {
  const activeLocale = (locales.includes(locale as Locale) ? locale : 'en') as Locale;
  const copy = footerCopy[activeLocale];

  return (
    <footer className="border-t bg-background px-6 py-10 text-sm text-muted-foreground">
      <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <p className="text-base font-semibold text-foreground">EuroComply</p>
          <p className="mt-3 max-w-md leading-6">{copy.tagline}</p>
        </div>
        <nav>
          <p className="font-medium text-foreground">{copy.productTitle}</p>
          <ul className="mt-3 space-y-2">
            {copy.productLinks.map((link) => (
              <li key={link.href}>
                <Link href={`/${activeLocale}${link.href}`} className="hover:text-foreground">{link.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav>
          <p className="font-medium text-foreground">{copy.companyTitle}</p>
          <ul className="mt-3 space-y-2">
            {copy.companyLinks.map((link) => (
              <li key={link.href}>
                <Link href={`/${activeLocale}${link.href}`} className="hover:text-foreground">{link.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav>
          <p className="font-medium text-foreground">{copy.trustTitle}</p>
          <ul className="mt-3 space-y-2">
            {copy.trustLinks.map((link) => (
              <li key={link.href}>
                <Link href={`/${activeLocale}${link.href}`} className="hover:text-foreground">{link.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
