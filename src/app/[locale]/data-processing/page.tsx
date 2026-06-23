import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Database, FileText, Globe2, KeyRound, LockKeyhole, ShieldCheck } from 'lucide-react';
import { isSupportedLocale, type Locale as SupportedLocale } from '@/lib/i18n/locales';

const COPY: Record<SupportedLocale, {
  eyebrow: string;
  title: string;
  description: string;
  sections: Array<{ title: string; description: string; icon: 'database' | 'lock' | 'key' | 'shield' | 'file' }>;
  note: string;
}> = {
  en: {
    eyebrow: 'Data Processing',
    title: 'How Risck comply handles customer data.',
    description: 'A practical overview for procurement, privacy and review teams evaluating Risck comply as a European compliance platform.',
    note: 'This overview is informational and should be read together with the Privacy Policy, DPA and Subprocessors list.',
    sections: [
      { title: 'Customer data', description: 'Organization profiles, compliance records, documents, vendors, audit events and user activity are processed to provide the service.', icon: 'database' },
      { title: 'Access controls', description: 'Access is scoped by authenticated user, organization membership and server-side authorization checks.', icon: 'key' },
      { title: 'Document storage', description: 'Controlled documents are stored with metadata, checksum and organization scoping.', icon: 'file' },
      { title: 'Auditability', description: 'Important actions are designed to generate audit events and notifications for operational evidence.', icon: 'shield' },
      { title: 'Minimisation', description: 'Risck comply aims to collect only the information needed to run compliance workflows and customer operations.', icon: 'lock' },
    ],
  },
  pt: {
    eyebrow: 'Tratamento de Dados',
    title: 'Como o Risck comply trata dados de clientes.',
    description: 'Uma visão prática para equipas de procurement, privacidade e revisão que avaliam o Risck comply como plataforma europeia de compliance.',
    note: 'Esta visão geral é informativa e deve ser lida em conjunto com a Política de Privacidade, DPA e lista de subprocessadores.',
    sections: [
      { title: 'Dados de cliente', description: 'Perfis de organização, registos de compliance, documentos, fornecedores, eventos de auditoria e atividade de utilizadores são tratados para prestar o serviço.', icon: 'database' },
      { title: 'Controlos de acesso', description: 'O acesso é limitado por utilizador autenticado, pertença à organização e verificações server-side.', icon: 'key' },
      { title: 'Armazenamento documental', description: 'Documentos controlados são armazenados com metadata, checksum e escopo por organização.', icon: 'file' },
      { title: 'Auditabilidade', description: 'Ações importantes foram desenhadas para gerar eventos de auditoria e notificações como evidência operacional.', icon: 'shield' },
      { title: 'Minimização', description: 'O Risck comply procura recolher apenas a informação necessária para executar workflows de compliance e operação do cliente.', icon: 'lock' },
    ],
  },
  es: {
    eyebrow: 'Tratamiento de Datos',
    title: 'Cómo Risck comply trata los datos de clientes.',
    description: 'Una visión práctica para equipos de compras, privacidad y revisión que evalúan Risck comply como plataforma europea de compliance.',
    note: 'Esta visión general es informativa y debe leerse junto con la Política de Privacidad, el DPA y la lista de subprocesadores.',
    sections: [
      { title: 'Datos de cliente', description: 'Perfiles de organización, registros de compliance, documentos, proveedores, eventos de auditoría y actividad de usuarios se tratan para prestar el servicio.', icon: 'database' },
      { title: 'Controles de acceso', description: 'El acceso se limita por usuario autenticado, pertenencia a organización y verificaciones server-side.', icon: 'key' },
      { title: 'Almacenamiento documental', description: 'Los documentos controlados se almacenan con metadata, checksum y alcance por organización.', icon: 'file' },
      { title: 'Auditabilidad', description: 'Las acciones importantes están diseñadas para generar eventos de auditoría y notificaciones como evidencia operacional.', icon: 'shield' },
      { title: 'Minimización', description: 'Risck comply busca recoger solo la información necesaria para ejecutar workflows de compliance y operación del cliente.', icon: 'lock' },
    ],
  },
  fr: {
    eyebrow: 'Traitement des Données',
    title: 'Comment Risck comply traite les données clients.',
    description: 'Une vue pratique pour les équipes achats, confidentialité et revue évaluant Risck comply comme plateforme européenne de conformité.',
    note: 'Cette vue est informative et doit être lue avec la Politique de confidentialité, le DPA et la liste des sous-traitants.',
    sections: [
      { title: 'Données client', description: 'Profils d’organisation, registres de conformité, documents, fournisseurs, événements d’audit et activité utilisateur sont traités pour fournir le service.', icon: 'database' },
      { title: 'Contrôles d’accès', description: 'L’accès est limité par utilisateur authentifié, appartenance à l’organisation et contrôles côté serveur.', icon: 'key' },
      { title: 'Stockage documentaire', description: 'Les documents contrôlés sont stockés avec métadonnées, checksum et périmètre organisationnel.', icon: 'file' },
      { title: 'Auditabilité', description: 'Les actions importantes sont conçues pour générer événements d’audit et notifications comme preuves opérationnelles.', icon: 'shield' },
      { title: 'Minimisation', description: 'Risck comply vise à collecter uniquement les informations nécessaires aux workflows de conformité et opérations client.', icon: 'lock' },
    ],
  },
  it: {
    eyebrow: 'Trattamento Dati',
    title: 'Come Risck comply tratta i dati dei clienti.',
    description: 'Una panoramica pratica per procurement, privacy e review team che valutano Risck comply come piattaforma europea di compliance.',
    note: 'Questa panoramica è informativa e va letta insieme a Privacy Policy, DPA e lista subprocessori.',
    sections: [
      { title: 'Dati cliente', description: 'Profili organizzazione, registri compliance, documenti, fornitori, eventi audit e attività utenti sono trattati per fornire il servizio.', icon: 'database' },
      { title: 'Controlli accesso', description: 'L’accesso è limitato da utente autenticato, appartenenza organizzativa e controlli server-side.', icon: 'key' },
      { title: 'Storage documentale', description: 'I documenti controllati sono archiviati con metadata, checksum e scope organizzativo.', icon: 'file' },
      { title: 'Auditabilità', description: 'Le azioni importanti sono progettate per generare eventi audit e notifiche come evidenza operativa.', icon: 'shield' },
      { title: 'Minimizzazione', description: 'Risck comply mira a raccogliere solo le informazioni necessarie per workflow compliance e operazioni cliente.', icon: 'lock' },
    ],
  },
  de: {
    eyebrow: 'Datenverarbeitung',
    title: 'Wie Risck comply Kundendaten verarbeitet.',
    description: 'Eine praktische Übersicht für Einkauf, Datenschutz und Review Teams, die Risck comply als europäische Compliance-Plattform bewerten.',
    note: 'Diese Übersicht ist informativ und sollte zusammen mit Datenschutzerklärung, DPA und Unterauftragsverarbeiterliste gelesen werden.',
    sections: [
      { title: 'Kundendaten', description: 'Organisationsprofile, Compliance-Datensätze, Dokumente, Lieferanten, Audit-Ereignisse und Nutzeraktivität werden zur Bereitstellung des Dienstes verarbeitet.', icon: 'database' },
      { title: 'Zugriffskontrollen', description: 'Zugriff ist durch authentifizierte Nutzer, Organisationsmitgliedschaft und serverseitige Prüfungen begrenzt.', icon: 'key' },
      { title: 'Dokumentenspeicherung', description: 'Kontrollierte Dokumente werden mit Metadaten, Prüfsumme und Organisationsumfang gespeichert.', icon: 'file' },
      { title: 'Auditierbarkeit', description: 'Wichtige Aktionen sind darauf ausgelegt, Audit-Ereignisse und Benachrichtigungen als operative Nachweise zu erzeugen.', icon: 'shield' },
      { title: 'Minimierung', description: 'Risck comply zielt darauf ab, nur Informationen zu erheben, die für Compliance-Workflows und Kundenbetrieb notwendig sind.', icon: 'lock' },
    ],
  },
};

function Icon({ name }: { name: 'database' | 'lock' | 'key' | 'shield' | 'file' }) {
  const className = 'h-5 w-5';
  if (name === 'database') return <Database className={className} />;
  if (name === 'key') return <KeyRound className={className} />;
  if (name === 'shield') return <ShieldCheck className={className} />;
  if (name === 'file') return <FileText className={className} />;
  return <LockKeyhole className={className} />;
}

export default async function DataProcessingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();
  const copy = COPY[locale];

  return (
    <main className="min-h-screen bg-[#0A0A0F] px-6 py-24 text-[#E0E0E0]">
      <div className="mx-auto max-w-5xl">
        <Link href={`/${locale}/trust`} className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/60 transition hover:border-white/30 hover:text-white">
          <Globe2 className="h-4 w-4" /> Trust Center
        </Link>
        <section className="mt-10 rounded-[2rem] border border-white/10 bg-white/[0.03] p-8 shadow-2xl shadow-black/30 md:p-12">
          <p className="text-sm uppercase tracking-[0.35em] text-white/45">{copy.eyebrow}</p>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-white md:text-6xl">{copy.title}</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-white/65">{copy.description}</p>
        </section>
        <section className="mt-8 grid gap-4 md:grid-cols-2">
          {copy.sections.map((section) => (
            <article key={section.title} className="rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-6 transition hover:-translate-y-1 hover:bg-white/[0.06]">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white text-black">
                <Icon name={section.icon} />
              </div>
              <h2 className="mt-5 text-xl font-semibold text-white">{section.title}</h2>
              <p className="mt-3 text-sm leading-7 text-white/60">{section.description}</p>
            </article>
          ))}
        </section>
        <p className="mt-8 rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-6 text-sm leading-7 text-white/55">{copy.note}</p>
      </div>
    </main>
  );
}
