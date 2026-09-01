import Link from 'next/link';
import { Activity, ArrowUpRight, CheckCircle2, ShieldCheck } from 'lucide-react';

import { PublicFooter } from '@/components/marketing/public-footer';
import { normalizeLocale } from '@/lib/i18n/locales';
import { VERIFIED_STATUS_PAGE_URL } from '@/lib/trust-center/verified-authority';

type Copy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  authority: string;
  authorityBody: string;
  openStatus: string;
  trustCenter: string;
  operations: string;
  operationsBody: string;
  incidents: string;
  incidentsBody: string;
  boundary: string;
};

const COPY: Record<string, Copy> = {
  en: {
    eyebrow: 'System status',
    title: 'Verified public incident communication.',
    subtitle: 'RISCK COMPLY uses a dedicated public Statuspage authority for service components, active incidents, updates and resolution history.',
    authority: 'Authoritative public status',
    authorityBody: 'The Statuspage URL below is the canonical public incident-communication authority operated by authorized RISCK COMPLY personnel.',
    openStatus: 'Open live status',
    trustCenter: 'Open Trust Center',
    operations: 'Service components',
    operationsBody: 'Web application, authentication, database, storage, document generation, billing, email delivery and external-provider dependencies can be represented on the public authority.',
    incidents: 'Incident lifecycle',
    incidentsBody: 'Authorized operators can publish investigating, update/monitoring and resolved states without exposing customer or session data.',
    boundary: 'This page does not promise a contractual uptime percentage or 24/7 staffed support. Contractual commitments require a signed agreement.',
  },
  pt: {
    eyebrow: 'Estado do sistema',
    title: 'Comunicação pública de incidentes verificada.',
    subtitle: 'A RISCK COMPLY utiliza uma Statuspage pública dedicada para componentes do serviço, incidentes ativos, atualizações e histórico de resolução.',
    authority: 'Estado público canónico',
    authorityBody: 'A Statuspage abaixo é a autoridade pública canónica para comunicação de incidentes operada por responsáveis autorizados da RISCK COMPLY.',
    openStatus: 'Abrir estado ao vivo',
    trustCenter: 'Abrir Centro de Confiança',
    operations: 'Componentes do serviço',
    operationsBody: 'Aplicação web, autenticação, base de dados, armazenamento, geração de documentos, faturação, entrega de email e dependências externas podem ser representados na autoridade pública.',
    incidents: 'Ciclo de incidentes',
    incidentsBody: 'Operadores autorizados podem publicar estados de investigação, atualização/monitorização e resolução sem expor dados de clientes ou de sessão.',
    boundary: 'Esta página não promete uma percentagem contratual de uptime nem suporte humano 24/7. Compromissos contratuais exigem acordo assinado.',
  },
  es: {
    eyebrow: 'Estado del sistema',
    title: 'Comunicación pública de incidentes verificada.',
    subtitle: 'RISCK COMPLY utiliza una Statuspage pública dedicada para componentes del servicio, incidentes activos, actualizaciones e historial de resolución.',
    authority: 'Estado público canónico',
    authorityBody: 'La Statuspage siguiente es la autoridad pública canónica para la comunicación de incidentes operada por responsables autorizados de RISCK COMPLY.',
    openStatus: 'Abrir estado en vivo',
    trustCenter: 'Abrir Centro de Confianza',
    operations: 'Componentes del servicio',
    operationsBody: 'Aplicación web, autenticación, base de datos, almacenamiento, generación de documentos, facturación, entrega de correo y dependencias externas pueden representarse en la autoridad pública.',
    incidents: 'Ciclo de incidentes',
    incidentsBody: 'Los operadores autorizados pueden publicar estados de investigación, actualización/monitorización y resolución sin exponer datos de clientes o de sesión.',
    boundary: 'Esta página no promete un porcentaje contractual de disponibilidad ni soporte humano 24/7. Los compromisos contractuales requieren un acuerdo firmado.',
  },
  fr: {
    eyebrow: 'État du système',
    title: 'Communication publique des incidents vérifiée.',
    subtitle: 'RISCK COMPLY utilise une Statuspage publique dédiée pour les composants du service, les incidents actifs, les mises à jour et l’historique de résolution.',
    authority: 'État public de référence',
    authorityBody: 'La Statuspage ci-dessous est l’autorité publique de référence pour la communication des incidents, opérée par des responsables RISCK COMPLY autorisés.',
    openStatus: 'Ouvrir le statut en direct',
    trustCenter: 'Ouvrir le Centre de confiance',
    operations: 'Composants du service',
    operationsBody: 'Application web, authentification, base de données, stockage, génération de documents, facturation, livraison des e-mails et dépendances externes peuvent être représentés sur l’autorité publique.',
    incidents: 'Cycle des incidents',
    incidentsBody: 'Les opérateurs autorisés peuvent publier les états investigation, mise à jour/surveillance et résolu sans exposer de données client ou de session.',
    boundary: 'Cette page ne promet pas de pourcentage contractuel de disponibilité ni de support humain 24/7. Les engagements contractuels exigent un accord signé.',
  },
  it: {
    eyebrow: 'Stato del sistema',
    title: 'Comunicazione pubblica degli incidenti verificata.',
    subtitle: 'RISCK COMPLY utilizza una Statuspage pubblica dedicata per componenti del servizio, incidenti attivi, aggiornamenti e storico delle risoluzioni.',
    authority: 'Stato pubblico autorevole',
    authorityBody: 'La Statuspage seguente è l’autorità pubblica canonica per la comunicazione degli incidenti gestita da responsabili RISCK COMPLY autorizzati.',
    openStatus: 'Apri stato live',
    trustCenter: 'Apri Centro fiducia',
    operations: 'Componenti del servizio',
    operationsBody: 'Applicazione web, autenticazione, database, storage, generazione documenti, fatturazione, consegna email e dipendenze esterne possono essere rappresentati sull’autorità pubblica.',
    incidents: 'Ciclo degli incidenti',
    incidentsBody: 'Gli operatori autorizzati possono pubblicare stati di investigazione, aggiornamento/monitoraggio e risoluzione senza esporre dati dei clienti o di sessione.',
    boundary: 'Questa pagina non promette una percentuale contrattuale di uptime né supporto umano 24/7. Gli impegni contrattuali richiedono un accordo firmato.',
  },
  de: {
    eyebrow: 'Systemstatus',
    title: 'Verifizierte öffentliche Vorfallkommunikation.',
    subtitle: 'RISCK COMPLY verwendet eine dedizierte öffentliche Statuspage für Dienstkomponenten, aktive Vorfälle, Updates und den Lösungsverlauf.',
    authority: 'Maßgeblicher öffentlicher Status',
    authorityBody: 'Die folgende Statuspage ist die maßgebliche öffentliche Instanz für Vorfallkommunikation und wird von autorisierten RISCK-COMPLY-Verantwortlichen betrieben.',
    openStatus: 'Live-Status öffnen',
    trustCenter: 'Trust Center öffnen',
    operations: 'Dienstkomponenten',
    operationsBody: 'Webanwendung, Authentifizierung, Datenbank, Speicherung, Dokumenterstellung, Abrechnung, E-Mail-Zustellung und externe Abhängigkeiten können auf der öffentlichen Instanz dargestellt werden.',
    incidents: 'Vorfall-Lebenszyklus',
    incidentsBody: 'Autorisierte Betreiber können Untersuchungs-, Update/Monitoring- und Gelöst-Status veröffentlichen, ohne Kunden- oder Sitzungsdaten offenzulegen.',
    boundary: 'Diese Seite verspricht keine vertragliche Uptime-Prozentzahl und keinen menschlich besetzten 24/7-Support. Vertragliche Zusagen erfordern eine unterzeichnete Vereinbarung.',
  },
};

export function VerifiedStatusPage({ locale }: { locale: string }) {
  const normalizedLocale = normalizeLocale(locale);
  const copy = COPY[normalizedLocale] ?? COPY.en;

  return (
    <main className="min-h-screen bg-[#050913] text-white">
      <section className="border-b border-white/10 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <p className="inline-flex items-center gap-2 rounded-lg border border-emerald-300/20 bg-emerald-300/[0.08] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> {copy.eyebrow}
          </p>
          <h1 className="mt-7 max-w-4xl text-4xl font-semibold tracking-[-0.055em] sm:text-6xl">{copy.title}</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-white/62">{copy.subtitle}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href={VERIFIED_STATUS_PAGE_URL} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-bold text-white transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
              <Activity className="h-4 w-4" aria-hidden="true" /> {copy.openStatus} <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </a>
            <Link href={`/${normalizedLocale}/trust`} className="inline-flex h-12 items-center justify-center rounded-xl border border-white/15 px-6 text-sm font-bold transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
              {copy.trustCenter}
            </Link>
          </div>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-3">
          <article className="rounded-xl border border-slate-800/80 bg-[#0d1522] p-6">
            <ShieldCheck className="h-5 w-5 text-blue-300" aria-hidden="true" />
            <h2 className="mt-4 text-xl font-semibold">{copy.authority}</h2>
            <p className="mt-3 text-sm leading-7 text-white/58">{copy.authorityBody}</p>
            <p className="mt-4 break-all text-sm font-medium text-blue-300">{VERIFIED_STATUS_PAGE_URL}</p>
          </article>
          <article className="rounded-xl border border-slate-800/80 bg-[#0d1522] p-6">
            <Activity className="h-5 w-5 text-blue-300" aria-hidden="true" />
            <h2 className="mt-4 text-xl font-semibold">{copy.operations}</h2>
            <p className="mt-3 text-sm leading-7 text-white/58">{copy.operationsBody}</p>
          </article>
          <article className="rounded-xl border border-slate-800/80 bg-[#0d1522] p-6">
            <CheckCircle2 className="h-5 w-5 text-blue-300" aria-hidden="true" />
            <h2 className="mt-4 text-xl font-semibold">{copy.incidents}</h2>
            <p className="mt-3 text-sm leading-7 text-white/58">{copy.incidentsBody}</p>
          </article>
        </div>
        <p className="mx-auto mt-8 max-w-6xl text-sm leading-7 text-white/42">{copy.boundary}</p>
      </section>

      <PublicFooter locale={normalizedLocale} />
    </main>
  );
}
