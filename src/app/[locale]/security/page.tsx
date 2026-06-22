import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Activity, Database, FileText, KeyRound, LockKeyhole, Server, ShieldCheck, UsersRound } from 'lucide-react';

import { PublicFooter } from '@/components/marketing/public-footer';
import { isSupportedLocale, type SupportedLocale } from '@/lib/i18n/locales';

type SecuritySection = {
  title: string;
  description: string;
  items: string[];
};

const copy: Record<SupportedLocale, {
  title: string;
  subtitle: string;
  back: string;
  evidenceTitle: string;
  evidenceBody: string;
  contactTitle: string;
}> = {
  en: {
    title: 'Security at EuroComply',
    subtitle: 'Current controls, architecture and honest limitations for European B2B compliance teams.',
    back: 'Back to Trust Center',
    evidenceTitle: 'Enterprise documentation',
    evidenceBody: 'Security overview, architecture, access control, encryption, incident response, backup and subprocessor documentation are maintained in the enterprise trust packet.',
    contactTitle: 'Responsible disclosure',
  },
  pt: {
    title: 'Segurança no EuroComply',
    subtitle: 'Controlos atuais, arquitetura e limitações honestas para equipas B2B europeias de compliance.',
    back: 'Voltar ao Trust Center',
    evidenceTitle: 'Documentação enterprise',
    evidenceBody: 'Visão geral de segurança, arquitetura, controlo de acesso, criptografia, resposta a incidentes, backups e subprocessadores fazem parte do pacote de confiança enterprise.',
    contactTitle: 'Divulgação responsável',
  },
  es: {
    title: 'Seguridad en EuroComply',
    subtitle: 'Controles actuales, arquitectura y limitaciones claras para equipos B2B europeos de compliance.',
    back: 'Volver al Trust Center',
    evidenceTitle: 'Documentación enterprise',
    evidenceBody: 'El paquete enterprise mantiene documentación de seguridad, arquitectura, acceso, cifrado, incidentes, backups y subprocesadores.',
    contactTitle: 'Divulgación responsable',
  },
  fr: {
    title: 'Sécurité chez EuroComply',
    subtitle: 'Contrôles actuels, architecture et limites explicites pour les équipes conformité B2B européennes.',
    back: 'Retour au Trust Center',
    evidenceTitle: 'Documentation enterprise',
    evidenceBody: 'Le paquet de confiance maintient sécurité, architecture, accès, chiffrement, incidents, sauvegardes et sous-traitants.',
    contactTitle: 'Divulgation responsable',
  },
  it: {
    title: 'Sicurezza in EuroComply',
    subtitle: 'Controlli attuali, architettura e limiti dichiarati per team B2B europei di compliance.',
    back: 'Torna al Trust Center',
    evidenceTitle: 'Documentazione enterprise',
    evidenceBody: 'Il pacchetto trust include sicurezza, architettura, accesso, cifratura, incidenti, backup e subprocessori.',
    contactTitle: 'Responsible disclosure',
  },
  de: {
    title: 'Sicherheit bei EuroComply',
    subtitle: 'Aktuelle Kontrollen, Architektur und klare Grenzen für europäische B2B-Compliance-Teams.',
    back: 'Zurück zum Trust Center',
    evidenceTitle: 'Enterprise-Dokumentation',
    evidenceBody: 'Das Trust-Paket umfasst Sicherheit, Architektur, Zugriff, Verschlüsselung, Incident Response, Backups und Unterauftragsverarbeiter.',
    contactTitle: 'Responsible Disclosure',
  },
};

const sections: SecuritySection[] = [
  {
    title: 'Identity and access',
    description: 'Authentication is handled through Supabase Auth. Private localized routes require an authenticated session.',
    items: ['Supabase session validation in middleware', 'Server-side getUser checks for user context', 'Private dashboard redirects to localized login'],
  },
  {
    title: 'RBAC and organization scope',
    description: 'Organization roles map to explicit permissions and unknown role labels normalize to viewer.',
    items: ['Roles: owner, admin, editor, member, viewer', 'Server-side organization membership checks', 'Authorization denials are best-effort audited'],
  },
  {
    title: 'RLS and tenant isolation',
    description: 'Supabase RLS migrations and validation scripts are used to support tenant isolation evidence.',
    items: ['Organization-scoped policies for critical tables', 'Live RLS validation required before production claims', 'Service-role access remains server-only'],
  },
  {
    title: 'Auditability',
    description: 'Audit events are designed for traceability and integrity, without claiming externally immutable storage.',
    items: ['Sensitive metadata keys are filtered', 'SHA-256 hash-chain support', 'Optional HMAC signatures when configured'],
  },
  {
    title: 'Data protection',
    description: 'The platform is designed around controlled customer workspaces and private document handling.',
    items: ['Provider-managed encryption expected for managed infrastructure', 'No browser-level end-to-end encryption claim', 'Retention and DPA terms require legal review'],
  },
  {
    title: 'Monitoring and response',
    description: 'Operational logging, release evidence and incident-response documentation are maintained without claiming 24/7 staffed monitoring.',
    items: ['Release evidence checklist', 'Incident owner and communication owner required for release', 'Security reports handled privately'],
  },
];

const icons = [KeyRound, UsersRound, Database, FileText, LockKeyhole, Server];

export default async function SecurityPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  if (!isSupportedLocale(locale)) {
    notFound();
  }

  const page = copy[locale];

  return (
    <main className="min-h-screen bg-[#0A0A0F] text-white">
      <section className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <Link href={`/${locale}/trust`} className="text-sm text-white/60 hover:text-white">
            {page.back}
          </Link>
          <div className="mt-10 max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70">
              <ShieldCheck className="h-4 w-4" /> EuroComply Security
            </div>
            <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">{page.title}</h1>
            <p className="mt-6 text-lg leading-8 text-white/65">{page.subtitle}</p>
          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-2">
            {sections.map((section, index) => {
              const Icon = icons[index] ?? LockKeyhole;
              return (
                <section key={section.title} className="rounded-3xl border border-white/10 bg-white/[0.04] p-7 shadow-2xl shadow-black/30">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h2 className="text-xl font-semibold">{section.title}</h2>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-white/60">{section.description}</p>
                  <ul className="mt-6 space-y-3 text-sm text-white/70">
                    {section.items.map((item) => (
                      <li key={item} className="flex gap-3">
                        <Activity className="mt-0.5 h-4 w-4 shrink-0 text-white/40" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>

          <section className="mt-10 grid gap-5 md:grid-cols-2">
            <article className="rounded-3xl border border-white/10 bg-white/[0.03] p-7 text-sm leading-7 text-white/60">
              <div className="mb-4 flex items-center gap-3 text-white">
                <Server className="h-5 w-5" />
                <h2 className="text-xl font-semibold">{page.evidenceTitle}</h2>
              </div>
              <p>{page.evidenceBody}</p>
              <Link href={`/${locale}/trust`} className="mt-5 inline-flex font-semibold text-white hover:text-white/80">
                Open Trust Center
              </Link>
            </article>
            <article className="rounded-3xl border border-white/10 bg-white/[0.03] p-7 text-sm leading-7 text-white/60">
              <div className="mb-4 flex items-center gap-3 text-white">
                <ShieldCheck className="h-5 w-5" />
                <h2 className="text-xl font-semibold">{page.contactTitle}</h2>
              </div>
              <p>
                Report vulnerabilities privately to{' '}
                <a href="mailto:renansilva2002@gmail.com" className="font-semibold text-white hover:text-white/80">
                  renansilva2002@gmail.com
                </a>
                . Do not open public GitHub issues for security vulnerabilities.
              </p>
            </article>
          </section>
        </div>
      </section>
      <PublicFooter locale={locale} />
    </main>
  );
}
