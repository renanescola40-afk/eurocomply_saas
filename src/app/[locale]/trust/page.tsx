import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Activity, Database, FileCheck2, Globe2, LockKeyhole, Scale, ShieldCheck } from 'lucide-react';
import { isSupportedLocale, type SupportedLocale } from '@/lib/i18n/locales';

const TRUST_COPY: Record<SupportedLocale, {
  eyebrow: string;
  title: string;
  description: string;
  cards: Array<{ title: string; description: string; href: string; icon: 'shield' | 'scale' | 'database' | 'activity' | 'file' | 'lock' }>;
}> = {
  en: {
    eyebrow: 'Trust Center',
    title: 'Security, privacy and operational transparency for European companies.',
    description: 'EuroComply is built for organizations that need control, evidence and confidence before expanding across Europe.',
    cards: [
      { title: 'Security overview', description: 'Authentication, tenant isolation, audit logs, secure storage and operational safeguards.', href: '/security', icon: 'shield' },
      { title: 'Compliance posture', description: 'European compliance workflows, evidence readiness and regulatory roadmap.', href: '/compliance', icon: 'shield' },
      { title: 'Data processing', description: 'How EuroComply processes customer data, access controls and document storage.', href: '/data-processing', icon: 'database' },
      { title: 'Service commitments', description: 'Availability posture, incident handling, support expectations and enterprise service commitments.', href: '/sla', icon: 'activity' },
      { title: 'Privacy policy', description: 'How EuroComply handles personal data, legal bases and GDPR rights.', href: '/privacy', icon: 'lock' },
      { title: 'Data Processing Addendum', description: 'Processor commitments for customers that use EuroComply with personal data.', href: '/dpa', icon: 'scale' },
      { title: 'Subprocessors', description: 'Infrastructure and service providers involved in operating EuroComply.', href: '/subprocessors', icon: 'database' },
      { title: 'Service status', description: 'Public operational status and availability overview.', href: '/status', icon: 'activity' },
      { title: 'Terms of service', description: 'Commercial and acceptable-use terms for the platform.', href: '/terms', icon: 'file' },
    ],
  },
  pt: {
    eyebrow: 'Centro de Confiança',
    title: 'Segurança, privacidade e transparência operacional para empresas europeias.',
    description: 'O EuroComply foi criado para organizações que precisam de controlo, evidência e confiança antes de crescer na Europa.',
    cards: [
      { title: 'Visão geral de segurança', description: 'Autenticação, isolamento por empresa, auditoria, armazenamento seguro e controlos operacionais.', href: '/security', icon: 'shield' },
      { title: 'Postura de compliance', description: 'Workflows europeus, prontidão de evidências e roadmap regulatório.', href: '/compliance', icon: 'shield' },
      { title: 'Tratamento de dados', description: 'Como o EuroComply trata dados de clientes, controlos de acesso e armazenamento documental.', href: '/data-processing', icon: 'database' },
      { title: 'Compromissos de serviço', description: 'Disponibilidade, resposta a incidentes, expectativas de suporte e compromissos enterprise.', href: '/sla', icon: 'activity' },
      { title: 'Política de privacidade', description: 'Como o EuroComply trata dados pessoais, bases legais e direitos GDPR.', href: '/privacy', icon: 'lock' },
      { title: 'Acordo de tratamento de dados', description: 'Compromissos como subcontratante para clientes que usam dados pessoais.', href: '/dpa', icon: 'scale' },
      { title: 'Subprocessadores', description: 'Infraestrutura e fornecedores usados para operar o EuroComply.', href: '/subprocessors', icon: 'database' },
      { title: 'Estado do serviço', description: 'Resumo público da disponibilidade operacional.', href: '/status', icon: 'activity' },
      { title: 'Termos de serviço', description: 'Termos comerciais e de utilização aceitável da plataforma.', href: '/terms', icon: 'file' },
    ],
  },
  es: {
    eyebrow: 'Centro de Confianza',
    title: 'Seguridad, privacidad y transparencia operativa para empresas europeas.',
    description: 'EuroComply está diseñado para organizaciones que necesitan control, evidencia y confianza antes de expandirse por Europa.',
    cards: [
      { title: 'Resumen de seguridad', description: 'Autenticación, aislamiento por empresa, auditoría, almacenamiento seguro y controles operativos.', href: '/security', icon: 'shield' },
      { title: 'Postura de compliance', description: 'Workflows europeos, preparación de evidencias y roadmap regulatorio.', href: '/compliance', icon: 'shield' },
      { title: 'Tratamiento de datos', description: 'Cómo EuroComply trata datos de clientes, controles de acceso y almacenamiento documental.', href: '/data-processing', icon: 'database' },
      { title: 'Compromisos de servicio', description: 'Disponibilidad, respuesta a incidentes, expectativas de soporte y compromisos enterprise.', href: '/sla', icon: 'activity' },
      { title: 'Política de privacidad', description: 'Cómo EuroComply gestiona datos personales, bases legales y derechos GDPR.', href: '/privacy', icon: 'lock' },
      { title: 'Acuerdo de tratamiento de datos', description: 'Compromisos como encargado del tratamiento para clientes con datos personales.', href: '/dpa', icon: 'scale' },
      { title: 'Subprocesadores', description: 'Infraestructura y proveedores utilizados para operar EuroComply.', href: '/subprocessors', icon: 'database' },
      { title: 'Estado del servicio', description: 'Resumen público de disponibilidad operativa.', href: '/status', icon: 'activity' },
      { title: 'Términos de servicio', description: 'Términos comerciales y uso aceptable de la plataforma.', href: '/terms', icon: 'file' },
    ],
  },
  fr: {
    eyebrow: 'Centre de Confiance',
    title: 'Sécurité, confidentialité et transparence opérationnelle pour les entreprises européennes.',
    description: 'EuroComply est conçu pour les organisations qui ont besoin de contrôle, de preuves et de confiance avant de se développer en Europe.',
    cards: [
      { title: 'Vue sécurité', description: 'Authentification, isolation par entreprise, journaux d’audit, stockage sécurisé et contrôles opérationnels.', href: '/security', icon: 'shield' },
      { title: 'Posture conformité', description: 'Workflows européens, préparation des preuves et feuille de route réglementaire.', href: '/compliance', icon: 'shield' },
      { title: 'Traitement des données', description: 'Traitement des données client, contrôles d’accès et stockage documentaire.', href: '/data-processing', icon: 'database' },
      { title: 'Engagements de service', description: 'Disponibilité, réponse aux incidents, attentes de support et engagements enterprise.', href: '/sla', icon: 'activity' },
      { title: 'Politique de confidentialité', description: 'Traitement des données personnelles, bases légales et droits GDPR.', href: '/privacy', icon: 'lock' },
      { title: 'Accord de traitement des données', description: 'Engagements de sous-traitant pour les clients utilisant des données personnelles.', href: '/dpa', icon: 'scale' },
      { title: 'Sous-traitants', description: 'Infrastructure et prestataires utilisés pour exploiter EuroComply.', href: '/subprocessors', icon: 'database' },
      { title: 'Statut du service', description: 'Vue publique de la disponibilité opérationnelle.', href: '/status', icon: 'activity' },
      { title: 'Conditions de service', description: 'Conditions commerciales et d’utilisation acceptable de la plateforme.', href: '/terms', icon: 'file' },
    ],
  },
  it: {
    eyebrow: 'Centro Fiducia',
    title: 'Sicurezza, privacy e trasparenza operativa per aziende europee.',
    description: 'EuroComply è progettato per organizzazioni che richiedono controllo, prove e fiducia prima di crescere in Europa.',
    cards: [
      { title: 'Panoramica sicurezza', description: 'Autenticazione, isolamento tenant, audit log, storage sicuro e controlli operativi.', href: '/security', icon: 'shield' },
      { title: 'Postura compliance', description: 'Workflow europei, evidenze pronte e roadmap regolatoria.', href: '/compliance', icon: 'shield' },
      { title: 'Trattamento dati', description: 'Come EuroComply tratta dati cliente, controlli di accesso e storage documentale.', href: '/data-processing', icon: 'database' },
      { title: 'Impegni di servizio', description: 'Disponibilità, risposta agli incidenti, aspettative di supporto e impegni enterprise.', href: '/sla', icon: 'activity' },
      { title: 'Privacy policy', description: 'Come EuroComply tratta dati personali, basi legali e diritti GDPR.', href: '/privacy', icon: 'lock' },
      { title: 'Accordo trattamento dati', description: 'Impegni come responsabile del trattamento per clienti con dati personali.', href: '/dpa', icon: 'scale' },
      { title: 'Subprocessori', description: 'Infrastruttura e provider usati per operare EuroComply.', href: '/subprocessors', icon: 'database' },
      { title: 'Stato servizio', description: 'Panoramica pubblica della disponibilità operativa.', href: '/status', icon: 'activity' },
      { title: 'Termini di servizio', description: 'Termini commerciali e uso accettabile della piattaforma.', href: '/terms', icon: 'file' },
    ],
  },
  de: {
    eyebrow: 'Trust Center',
    title: 'Sicherheit, Datenschutz und operative Transparenz für europäische Unternehmen.',
    description: 'EuroComply wurde für Organisationen entwickelt, die Kontrolle, Nachweise und Vertrauen für Wachstum in Europa benötigen.',
    cards: [
      { title: 'Sicherheitsübersicht', description: 'Authentifizierung, Mandantentrennung, Audit-Logs, sichere Speicherung und operative Kontrollen.', href: '/security', icon: 'shield' },
      { title: 'Compliance-Position', description: 'Europäische Workflows, Nachweisbereitschaft und regulatorische Roadmap.', href: '/compliance', icon: 'shield' },
      { title: 'Datenverarbeitung', description: 'Wie EuroComply Kundendaten, Zugriffskontrollen und Dokumentenspeicherung verarbeitet.', href: '/data-processing', icon: 'database' },
      { title: 'Service Commitments', description: 'Verfügbarkeit, Incident Handling, Support-Erwartungen und Enterprise-Zusagen.', href: '/sla', icon: 'activity' },
      { title: 'Datenschutzerklärung', description: 'Wie EuroComply personenbezogene Daten, Rechtsgrundlagen und GDPR-Rechte behandelt.', href: '/privacy', icon: 'lock' },
      { title: 'Datenverarbeitungsvereinbarung', description: 'Auftragsverarbeiterpflichten für Kunden mit personenbezogenen Daten.', href: '/dpa', icon: 'scale' },
      { title: 'Unterauftragsverarbeiter', description: 'Infrastruktur und Anbieter, die für den Betrieb von EuroComply genutzt werden.', href: '/subprocessors', icon: 'database' },
      { title: 'Service-Status', description: 'Öffentliche Übersicht der operativen Verfügbarkeit.', href: '/status', icon: 'activity' },
      { title: 'Nutzungsbedingungen', description: 'Kommerzielle Bedingungen und akzeptable Nutzung der Plattform.', href: '/terms', icon: 'file' },
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
    <main className="min-h-screen bg-[#0A0A0F] px-6 py-24 text-white">
      <section className="mx-auto max-w-6xl">
        <Link href={`/${locale}`} className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/70 transition hover:border-white/30 hover:text-white">
          <Globe2 className="h-4 w-4" /> EuroComply
        </Link>
        <div className="mt-12 max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-white/50">{copy.eyebrow}</p>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight md:text-6xl">{copy.title}</h1>
          <p className="mt-6 text-lg leading-8 text-white/65">{copy.description}</p>
        </div>
        <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {copy.cards.map((card) => {
            const Icon = iconMap[card.icon];
            return (
              <Link key={card.href} href={`/${locale}${card.href}`} className="group rounded-3xl border border-white/10 bg-white/[0.04] p-6 transition hover:-translate-y-1 hover:border-white/30 hover:bg-white/[0.08]">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="mt-6 text-xl font-semibold">{card.title}</h2>
                <p className="mt-3 text-sm leading-6 text-white/60">{card.description}</p>
                <span className="mt-6 inline-flex text-sm font-semibold text-white/80 transition group-hover:text-white">Open resource</span>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
