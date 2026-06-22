import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Activity, Database, FileCheck2, Globe2, LockKeyhole, Scale, ShieldCheck } from 'lucide-react';

import { PublicFooter } from '@/components/marketing/public-footer';
import { isSupportedLocale, type SupportedLocale } from '@/lib/i18n/locales';

type TrustCard = { title: string; description: string; href: string; icon: 'shield' | 'scale' | 'database' | 'activity' | 'file' | 'lock' };

type TrustCopy = {
  eyebrow: string;
  title: string;
  description: string;
  assuranceTitle: string;
  assuranceBody: string;
  resourceLabel: string;
  cards: TrustCard[];
};

const TRUST_COPY: Record<SupportedLocale, TrustCopy> = {
  en: {
    eyebrow: 'Trust Center',
    title: 'Security, privacy and operational transparency without compliance washing.',
    description: 'EuroComply publishes current controls, open gaps and procurement-ready documentation so enterprise buyers can evaluate the platform honestly.',
    assuranceTitle: 'Current assurance status',
    assuranceBody: 'EuroComply is not currently ISO 27001 certified, does not currently have a SOC 2 report, and separates current controls from future evidence. The platform is designed to support enterprise review through RBAC, RLS, audit logging, controlled data flows and release evidence gates.',
    resourceLabel: 'Open resource',
    cards: [
      { title: 'Security overview', description: 'Authentication, RBAC, RLS, audit logs, monitoring posture and current non-claims.', href: '/security', icon: 'shield' },
      { title: 'Architecture', description: 'Next.js, Supabase, server-only admin operations, trust boundaries and data flow.', href: '/security', icon: 'database' },
      { title: 'Data processing', description: 'Data categories, privacy workflows, retention posture and DPA readiness.', href: '/data-processing', icon: 'database' },
      { title: 'Subprocessors', description: 'Provider register for hosting, database/auth/storage, billing, CI/CD and conditional services.', href: '/subprocessors', icon: 'database' },
      { title: 'Service commitments', description: 'Availability, incident handling, support expectations and enterprise limitations.', href: '/sla', icon: 'activity' },
      { title: 'Responsible disclosure', description: 'Private contact path for coordinated review.', href: '/contact', icon: 'lock' },
      { title: 'Privacy policy', description: 'Personal data handling, legal bases and rights information.', href: '/privacy', icon: 'lock' },
      { title: 'Data Processing Addendum', description: 'Draft processor commitments for customers using personal data.', href: '/dpa', icon: 'scale' },
      { title: 'Terms of service', description: 'Commercial and acceptable-use terms for the platform.', href: '/terms', icon: 'file' },
    ],
  },
  pt: {
    eyebrow: 'Centro de Confiança',
    title: 'Segurança, privacidade e transparência operacional sem compliance washing.',
    description: 'O EuroComply publica controlos atuais, lacunas abertas e documentação pronta para procurement para avaliação enterprise honesta.',
    assuranceTitle: 'Estado atual de assurance',
    assuranceBody: 'O EuroComply não é atualmente certificado ISO 27001, não tem atualmente relatório SOC 2 e separa controlos atuais de evidência futura. A plataforma foi desenhada para apoiar avaliação enterprise com RBAC, RLS, audit logs, fluxos de dados controlados e release gates de evidência.',
    resourceLabel: 'Abrir recurso',
    cards: [
      { title: 'Visão geral de segurança', description: 'Autenticação, RBAC, RLS, audit logs, monitorização e claims atuais.', href: '/security', icon: 'shield' },
      { title: 'Arquitetura', description: 'Next.js, Supabase, operações admin server-only, boundaries e fluxo de dados.', href: '/security', icon: 'database' },
      { title: 'Tratamento de dados', description: 'Categorias de dados, privacidade, retenção e prontidão de DPA.', href: '/data-processing', icon: 'database' },
      { title: 'Subprocessadores', description: 'Registo de hosting, base de dados/auth/storage, billing, CI/CD e serviços condicionais.', href: '/subprocessors', icon: 'database' },
      { title: 'Compromissos de serviço', description: 'Disponibilidade, incidentes, suporte e limitações enterprise.', href: '/sla', icon: 'activity' },
      { title: 'Divulgação responsável', description: 'Caminho privado de contacto para revisão coordenada.', href: '/contact', icon: 'lock' },
      { title: 'Política de privacidade', description: 'Dados pessoais, bases legais e direitos GDPR.', href: '/privacy', icon: 'lock' },
      { title: 'Acordo de tratamento de dados', description: 'Compromissos draft como subcontratante.', href: '/dpa', icon: 'scale' },
      { title: 'Termos de serviço', description: 'Termos comerciais e utilização aceitável.', href: '/terms', icon: 'file' },
    ],
  },
  es: {
    eyebrow: 'Centro de Confianza',
    title: 'Seguridad, privacidad y transparencia operacional sin compliance washing.',
    description: 'EuroComply publica controles actuales, brechas abiertas y documentación lista para procurement enterprise.',
    assuranceTitle: 'Estado actual de assurance',
    assuranceBody: 'EuroComply no cuenta actualmente con certificación ISO 27001, no tiene informe SOC 2 y separa controles actuales de evidencia futura. Está diseñado para apoyar revisión enterprise con RBAC, RLS, auditoría y evidencia de release.',
    resourceLabel: 'Abrir recurso',
    cards: [
      { title: 'Resumen de seguridad', description: 'Autenticación, RBAC, RLS, audit logs, monitoreo y no-claims actuales.', href: '/security', icon: 'shield' },
      { title: 'Arquitectura', description: 'Next.js, Supabase, operaciones admin server-only, límites de confianza y flujo de datos.', href: '/security', icon: 'database' },
      { title: 'Procesamiento de datos', description: 'Categorías de datos, privacidad, retención y preparación DPA.', href: '/data-processing', icon: 'database' },
      { title: 'Subprocesadores', description: 'Registro de hosting, base de datos/auth/storage, billing, CI/CD y servicios condicionales.', href: '/subprocessors', icon: 'database' },
      { title: 'Compromisos de servicio', description: 'Disponibilidad, incidentes, soporte y limitaciones enterprise.', href: '/sla', icon: 'activity' },
      { title: 'Divulgación responsable', description: 'Ruta privada de contacto para revisión coordinada.', href: '/contact', icon: 'lock' },
      { title: 'Política de privacidad', description: 'Datos personales, bases legales e información sobre derechos.', href: '/privacy', icon: 'lock' },
      { title: 'Acuerdo de procesamiento de datos', description: 'Compromisos draft como procesador para clientes.', href: '/dpa', icon: 'scale' },
      { title: 'Términos de servicio', description: 'Términos comerciales y de uso aceptable.', href: '/terms', icon: 'file' },
    ],
  },
  fr: {
    eyebrow: 'Centre de Confiance',
    title: 'Sécurité, confidentialité et transparence opérationnelle sans compliance washing.',
    description: 'EuroComply publie les contrôles actuels, limites ouvertes et documents prêts pour les évaluations enterprise.',
    assuranceTitle: 'Statut assurance actuel',
    assuranceBody: 'EuroComply n’est pas certifié ISO 27001, ne dispose pas d’un rapport SOC 2 et sépare les contrôles actuels des preuves futures. La plateforme est conçue pour soutenir les revues enterprise avec RBAC, RLS, audit logs et preuves de release.',
    resourceLabel: 'Ouvrir la ressource',
    cards: [
      { title: 'Vue sécurité', description: 'Authentification, RBAC, RLS, audit logs, monitoring et non-claims actuels.', href: '/security', icon: 'shield' },
      { title: 'Architecture', description: 'Next.js, Supabase, opérations admin server-only, frontières de confiance et flux de données.', href: '/security', icon: 'database' },
      { title: 'Traitement des données', description: 'Catégories de données, confidentialité, rétention et préparation DPA.', href: '/data-processing', icon: 'database' },
      { title: 'Sous-traitants', description: 'Registre pour hosting, base/auth/storage, billing, CI/CD et services conditionnels.', href: '/subprocessors', icon: 'database' },
      { title: 'Engagements de service', description: 'Disponibilité, incidents, support et limites enterprise.', href: '/sla', icon: 'activity' },
      { title: 'Divulgation responsable', description: 'Chemin de contact privé pour revue coordonnée.', href: '/contact', icon: 'lock' },
      { title: 'Politique de confidentialité', description: 'Données personnelles, bases légales et droits des personnes.', href: '/privacy', icon: 'lock' },
      { title: 'Accord de traitement des données', description: 'Engagements draft de processeur pour les clients.', href: '/dpa', icon: 'scale' },
      { title: 'Conditions de service', description: 'Conditions commerciales et d’utilisation acceptable.', href: '/terms', icon: 'file' },
    ],
  },
  it: {
    eyebrow: 'Centro Fiducia',
    title: 'Sicurezza, privacy e trasparenza operativa senza compliance washing.',
    description: 'EuroComply pubblica controlli attuali, gap aperti e documentazione pronta per procurement enterprise.',
    assuranceTitle: 'Stato assurance attuale',
    assuranceBody: 'EuroComply non è attualmente certificato ISO 27001, non ha un report SOC 2 e separa controlli attuali da evidenze future. È progettato per supportare review enterprise con RBAC, RLS, audit log ed evidenze di release.',
    resourceLabel: 'Apri risorsa',
    cards: [
      { title: 'Panoramica sicurezza', description: 'Autenticazione, RBAC, RLS, audit log, monitoring e non-claim attuali.', href: '/security', icon: 'shield' },
      { title: 'Architettura', description: 'Next.js, Supabase, operazioni admin server-only, confini trust e flusso dati.', href: '/security', icon: 'database' },
      { title: 'Trattamento dati', description: 'Categorie dati, privacy, retention e preparazione DPA.', href: '/data-processing', icon: 'database' },
      { title: 'Subprocessori', description: 'Registro per hosting, database/auth/storage, billing, CI/CD e servizi condizionali.', href: '/subprocessors', icon: 'database' },
      { title: 'Impegni di servizio', description: 'Disponibilità, incidenti, supporto e limiti enterprise.', href: '/sla', icon: 'activity' },
      { title: 'Responsible disclosure', description: 'Percorso privato di contatto per revisione coordinata.', href: '/contact', icon: 'lock' },
      { title: 'Privacy policy', description: 'Dati personali, basi legali e diritti degli interessati.', href: '/privacy', icon: 'lock' },
      { title: 'Data Processing Addendum', description: 'Impegni draft come processor per clienti.', href: '/dpa', icon: 'scale' },
      { title: 'Termini di servizio', description: 'Termini commerciali e uso accettabile.', href: '/terms', icon: 'file' },
    ],
  },
  de: {
    eyebrow: 'Trust Center',
    title: 'Sicherheit, Datenschutz und operative Transparenz ohne Compliance Washing.',
    description: 'EuroComply veröffentlicht aktuelle Kontrollen, offene Lücken und procurement-fähige Dokumentation für Enterprise Reviews.',
    assuranceTitle: 'Aktueller Assurance-Status',
    assuranceBody: 'EuroComply ist derzeit nicht ISO 27001-zertifiziert, verfügt nicht über einen SOC 2-Bericht und trennt aktuelle Kontrollen von zukünftiger Evidenz. Die Plattform ist für Enterprise Reviews mit RBAC, RLS, Audit-Logs und Release Evidence Gates ausgelegt.',
    resourceLabel: 'Ressource öffnen',
    cards: [
      { title: 'Security Overview', description: 'Authentifizierung, RBAC, RLS, Audit Logs, Monitoring und aktuelle Non-Claims.', href: '/security', icon: 'shield' },
      { title: 'Architektur', description: 'Next.js, Supabase, server-only Admin Operationen, Trust Boundaries und Datenfluss.', href: '/security', icon: 'database' },
      { title: 'Datenverarbeitung', description: 'Datenkategorien, Datenschutz, Retention und DPA Readiness.', href: '/data-processing', icon: 'database' },
      { title: 'Unterauftragsverarbeiter', description: 'Register für Hosting, Datenbank/Auth/Storage, Billing, CI/CD und bedingte Dienste.', href: '/subprocessors', icon: 'database' },
      { title: 'Service Commitments', description: 'Verfügbarkeit, Incident Handling, Support und Enterprise-Limitierungen.', href: '/sla', icon: 'activity' },
      { title: 'Responsible Disclosure', description: 'Privater Kontaktpfad für koordinierte Prüfung.', href: '/contact', icon: 'lock' },
      { title: 'Datenschutzerklärung', description: 'Personendaten, Rechtsgrundlagen und Betroffenenrechte.', href: '/privacy', icon: 'lock' },
      { title: 'Data Processing Addendum', description: 'Draft Processor Commitments für Kunden.', href: '/dpa', icon: 'scale' },
      { title: 'Nutzungsbedingungen', description: 'Kommerzielle und Acceptable-Use-Bedingungen.', href: '/terms', icon: 'file' },
    ],
  },
};

const iconMap = {
  shield: ShieldCheck,
  scale: Scale,
  database: Database,
  activity: Activity,
  file: FileCheck2,
  lock: LockKeyhole,
};

export default async function TrustCenterPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();
  const copy = TRUST_COPY[locale];

  return (
    <main className="min-h-screen bg-[#0A0A0F] text-white">
      <section className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <Link href={`/${locale}`} className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/70 transition hover:border-white/30 hover:text-white">
            <Globe2 className="h-4 w-4" /> EuroComply
          </Link>
          <div className="mt-12 max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-white/50">{copy.eyebrow}</p>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight md:text-6xl">{copy.title}</h1>
            <p className="mt-6 text-lg leading-8 text-white/65">{copy.description}</p>
          </div>

          <section className="mt-10 rounded-3xl border border-amber-200/20 bg-amber-200/[0.06] p-6 text-sm leading-7 text-amber-50/80">
            <h2 className="text-xl font-semibold text-white">{copy.assuranceTitle}</h2>
            <p className="mt-3">{copy.assuranceBody}</p>
          </section>

          <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {copy.cards.map((card) => {
              const Icon = iconMap[card.icon];
              return (
                <Link key={`${card.title}-${card.href}`} href={`/${locale}${card.href}`} className="group rounded-3xl border border-white/10 bg-white/[0.04] p-6 transition hover:-translate-y-1 hover:border-white/30 hover:bg-white/[0.08]">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="mt-6 text-xl font-semibold">{card.title}</h2>
                  <p className="mt-3 text-sm leading-6 text-white/60">{card.description}</p>
                  <span className="mt-6 inline-flex text-sm font-semibold text-white/80 transition group-hover:text-white">{copy.resourceLabel}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
      <PublicFooter locale={locale} />
    </main>
  );
}
