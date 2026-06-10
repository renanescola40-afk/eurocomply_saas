import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Database, FileText, Globe2, KeyRound, LockKeyhole, ShieldCheck } from 'lucide-react';
import { isSupportedLocale, type SupportedLocale } from '@/lib/i18n/locales';

const COPY: Record<SupportedLocale, {
  eyebrow: string;
  title: string;
  description: string;
  sections: Array<{ title: string; description: string; icon: 'database' | 'lock' | 'key' | 'shield' | 'file' }>;
  note: string;
}> = {
  en: {
    eyebrow: 'Data Processing',
    title: 'How EuroComply processes and protects customer data.',
    description: 'A practical overview for procurement, privacy and security teams evaluating EuroComply as a European compliance platform.',
    note: 'This overview is informational and should be read together with the Privacy Policy, DPA and Subprocessors list.',
    sections: [
      { title: 'Customer data', description: 'Organization profiles, compliance records, documents, vendors, audit events and user activity are processed to provide the service.', icon: 'database' },
      { title: 'Access controls', description: 'Access is scoped by authenticated user, organization membership and server-side authorization checks.', icon: 'key' },
      { title: 'Document storage', description: 'Controlled documents are stored in private storage with metadata, checksum and organization-level access controls.', icon: 'file' },
      { title: 'Auditability', description: 'Security-relevant actions are designed to generate audit events and operational notifications.', icon: 'shield' },
      { title: 'Data minimization', description: 'EuroComply is designed to collect only the information needed to operate compliance workflows.', icon: 'lock' },
    ],
  },
  pt: {
    eyebrow: 'Tratamento de Dados',
    title: 'Como o EuroComply trata e protege os dados dos clientes.',
    description: 'Resumo prático para equipas de compras, privacidade e segurança que avaliam o EuroComply como plataforma europeia de compliance.',
    note: 'Este resumo é informativo e deve ser lido em conjunto com a Política de Privacidade, o DPA e a lista de Subprocessadores.',
    sections: [
      { title: 'Dados do cliente', description: 'Perfis de organização, registos de compliance, documentos, fornecedores, eventos de auditoria e atividade de utilizadores são tratados para prestar o serviço.', icon: 'database' },
      { title: 'Controlos de acesso', description: 'O acesso é limitado por utilizador autenticado, pertença à organização e verificações server-side.', icon: 'key' },
      { title: 'Armazenamento documental', description: 'Documentos controlados são guardados em storage privado com metadata, checksum e controlos por organização.', icon: 'file' },
      { title: 'Auditabilidade', description: 'Ações relevantes para segurança são desenhadas para gerar eventos de auditoria e notificações operacionais.', icon: 'shield' },
      { title: 'Minimização de dados', description: 'O EuroComply foi desenhado para recolher apenas a informação necessária aos workflows de compliance.', icon: 'lock' },
    ],
  },
  es: {
    eyebrow: 'Tratamiento de Datos',
    title: 'Cómo EuroComply trata y protege los datos de los clientes.',
    description: 'Resumen práctico para equipos de compras, privacidad y seguridad que evalúan EuroComply como plataforma europea de compliance.',
    note: 'Este resumen es informativo y debe leerse junto con la Política de Privacidad, el DPA y la lista de Subprocesadores.',
    sections: [
      { title: 'Datos del cliente', description: 'Perfiles de organización, registros de compliance, documentos, proveedores, eventos de auditoría y actividad de usuarios se tratan para prestar el servicio.', icon: 'database' },
      { title: 'Controles de acceso', description: 'El acceso se limita por usuario autenticado, pertenencia a la organización y verificaciones server-side.', icon: 'key' },
      { title: 'Almacenamiento documental', description: 'Los documentos controlados se almacenan en storage privado con metadata, checksum y controles por organización.', icon: 'file' },
      { title: 'Auditabilidad', description: 'Las acciones relevantes para seguridad están diseñadas para generar eventos de auditoría y notificaciones operativas.', icon: 'shield' },
      { title: 'Minimización de datos', description: 'EuroComply está diseñado para recoger solo la información necesaria para los workflows de compliance.', icon: 'lock' },
    ],
  },
  fr: {
    eyebrow: 'Traitement des Données',
    title: 'Comment EuroComply traite et protège les données client.',
    description: 'Vue pratique pour les équipes achats, confidentialité et sécurité évaluant EuroComply comme plateforme européenne de conformité.',
    note: 'Cette vue est informative et doit être lue avec la Politique de confidentialité, le DPA et la liste des Sous-traitants.',
    sections: [
      { title: 'Données client', description: 'Profils d’organisation, dossiers de conformité, documents, fournisseurs, événements d’audit et activité utilisateur sont traités pour fournir le service.', icon: 'database' },
      { title: 'Contrôles d’accès', description: 'L’accès est limité par utilisateur authentifié, appartenance à l’organisation et contrôles côté serveur.', icon: 'key' },
      { title: 'Stockage documentaire', description: 'Les documents contrôlés sont stockés dans un espace privé avec métadonnées, checksum et contrôles par organisation.', icon: 'file' },
      { title: 'Auditabilité', description: 'Les actions importantes pour la sécurité sont conçues pour générer des événements d’audit et notifications opérationnelles.', icon: 'shield' },
      { title: 'Minimisation des données', description: 'EuroComply est conçu pour collecter uniquement les informations nécessaires aux workflows de conformité.', icon: 'lock' },
    ],
  },
  it: {
    eyebrow: 'Trattamento Dati',
    title: 'Come EuroComply tratta e protegge i dati dei clienti.',
    description: 'Panoramica pratica per team procurement, privacy e sicurezza che valutano EuroComply come piattaforma europea di compliance.',
    note: 'Questa panoramica è informativa e va letta insieme a Privacy Policy, DPA e lista dei Subprocessori.',
    sections: [
      { title: 'Dati cliente', description: 'Profili organizzazione, record compliance, documenti, fornitori, eventi audit e attività utenti sono trattati per fornire il servizio.', icon: 'database' },
      { title: 'Controlli di accesso', description: 'L’accesso è limitato da utente autenticato, appartenenza all’organizzazione e verifiche server-side.', icon: 'key' },
      { title: 'Storage documentale', description: 'I documenti controllati sono archiviati in storage privato con metadata, checksum e controlli per organizzazione.', icon: 'file' },
      { title: 'Auditabilità', description: 'Le azioni rilevanti per la sicurezza sono progettate per generare eventi audit e notifiche operative.', icon: 'shield' },
      { title: 'Minimizzazione dati', description: 'EuroComply è progettato per raccogliere solo le informazioni necessarie ai workflow di compliance.', icon: 'lock' },
    ],
  },
  de: {
    eyebrow: 'Datenverarbeitung',
    title: 'Wie EuroComply Kundendaten verarbeitet und schützt.',
    description: 'Praktische Übersicht für Einkauf, Datenschutz und Sicherheitsteams, die EuroComply als europäische Compliance-Plattform prüfen.',
    note: 'Diese Übersicht ist informativ und sollte zusammen mit Datenschutzerklärung, DPA und Unterauftragsverarbeiterliste gelesen werden.',
    sections: [
      { title: 'Kundendaten', description: 'Organisationsprofile, Compliance-Datensätze, Dokumente, Anbieter, Audit-Ereignisse und Nutzeraktivität werden zur Bereitstellung des Dienstes verarbeitet.', icon: 'database' },
      { title: 'Zugriffskontrollen', description: 'Zugriff wird durch authentifizierte Nutzer, Organisationsmitgliedschaft und serverseitige Prüfungen begrenzt.', icon: 'key' },
      { title: 'Dokumentenspeicherung', description: 'Kontrollierte Dokumente werden in privatem Storage mit Metadaten, Prüfsumme und Organisationskontrollen gespeichert.', icon: 'file' },
      { title: 'Auditierbarkeit', description: 'Sicherheitsrelevante Aktionen sind darauf ausgelegt, Audit-Ereignisse und operative Benachrichtigungen zu erzeugen.', icon: 'shield' },
      { title: 'Datenminimierung', description: 'EuroComply ist darauf ausgelegt, nur die für Compliance-Workflows notwendigen Informationen zu erfassen.', icon: 'lock' },
    ],
  },
};

const iconMap = {
  database: Database,
  lock: LockKeyhole,
  key: KeyRound,
  shield: ShieldCheck,
  file: FileText,
};

export default async function DataProcessingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();
  const copy = COPY[locale];

  return (
    <main className="min-h-screen bg-[#0A0A0F] px-6 py-24 text-white">
      <section className="mx-auto max-w-6xl">
        <Link href={`/${locale}/trust`} className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/70 transition hover:border-white/30 hover:text-white">
          <Globe2 className="h-4 w-4" /> Trust Center
        </Link>
        <div className="mt-12 max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-white/50">{copy.eyebrow}</p>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight md:text-6xl">{copy.title}</h1>
          <p className="mt-6 text-lg leading-8 text-white/65">{copy.description}</p>
        </div>
        <div className="mt-14 grid gap-4 md:grid-cols-2">
          {copy.sections.map((section) => {
            const Icon = iconMap[section.icon];
            return (
              <article key={section.title} className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="mt-6 text-xl font-semibold">{section.title}</h2>
                <p className="mt-3 text-sm leading-6 text-white/60">{section.description}</p>
              </article>
            );
          })}
        </div>
        <p className="mt-10 max-w-3xl rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-sm leading-6 text-white/60">{copy.note}</p>
      </section>
    </main>
  );
}
