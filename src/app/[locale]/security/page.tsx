import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Activity, Database, FileText, KeyRound, LockKeyhole, Server, ShieldCheck, UsersRound } from 'lucide-react';

import { PublicFooter } from '@/components/marketing/public-footer';
import { isSupportedLocale, type SupportedLocale } from '@/lib/i18n/locales';

type Card = { title: string; body: string; items: string[] };
type PageCopy = {
  title: string;
  subtitle: string;
  back: string;
  evidenceTitle: string;
  evidenceBody: string;
  openTrust: string;
  contactTitle: string;
  contactLabel: string;
  cards: Card[];
};

const copy: Record<SupportedLocale, PageCopy> = {
  en: {
    title: 'Security at EuroComply',
    subtitle: 'Current controls, architecture and honest limitations for European B2B compliance teams.',
    back: 'Back to Trust Center',
    evidenceTitle: 'Enterprise documentation',
    evidenceBody: 'Security overview, architecture, access control, encryption, incident response, backup and subprocessor documentation are maintained in the enterprise trust packet.',
    openTrust: 'Open Trust Center',
    contactTitle: 'Responsible disclosure',
    contactLabel: 'Responsible disclosure contact',
    cards: [
      { title: 'Identity and access', body: 'Private product areas require signed-in users.', items: ['Session checks', 'Localized login redirect', 'Server-side user context'] },
      { title: 'Roles and organization scope', body: 'Organization roles map to explicit product permissions.', items: ['Owner, admin, editor, member, viewer', 'Organization membership checks', 'Denied access is logged where possible'] },
      { title: 'Tenant data boundaries', body: 'Database policies and organization filters support tenant separation.', items: ['Organization-scoped records', 'Target-environment validation required', 'Server-only admin paths'] },
      { title: 'Audit records', body: 'Critical workflow activity is recorded for review.', items: ['Filtered metadata', 'Hash-chain support', 'Optional signing when configured'] },
      { title: 'Data handling', body: 'Customer workspaces and documents are handled through managed providers.', items: ['Provider-managed protection', 'Retention requires policy review', 'DPA terms require legal review'] },
      { title: 'Operations', body: 'Operational evidence and response ownership are tracked before stronger claims are made.', items: ['Release checklist', 'Named owners', 'Private contact path'] },
    ],
  },
  pt: {
    title: 'Segurança no EuroComply',
    subtitle: 'Controlos atuais, arquitetura e limitações honestas para equipas B2B europeias de compliance.',
    back: 'Voltar ao Trust Center',
    evidenceTitle: 'Documentação enterprise',
    evidenceBody: 'Visão geral de segurança, arquitetura, controlo de acesso, criptografia, resposta a incidentes, backups e subprocessadores fazem parte do pacote de confiança enterprise.',
    openTrust: 'Abrir Trust Center',
    contactTitle: 'Divulgação responsável',
    contactLabel: 'Contacto de divulgação responsável',
    cards: [
      { title: 'Identidade e acesso', body: 'Áreas privadas do produto exigem utilizadores autenticados.', items: ['Checks de sessão', 'Redirect para login localizado', 'Contexto server-side do utilizador'] },
      { title: 'Roles e escopo por organização', body: 'Roles de organização mapeiam para permissões explícitas do produto.', items: ['Owner, admin, editor, member, viewer', 'Checks de membership da organização', 'Acesso negado é registado quando possível'] },
      { title: 'Fronteiras de dados por tenant', body: 'Políticas de base de dados e filtros por organização apoiam separação entre tenants.', items: ['Registos por organização', 'Validação no ambiente alvo exigida', 'Caminhos admin apenas no servidor'] },
      { title: 'Registos de auditoria', body: 'Atividade crítica de workflow é registada para revisão.', items: ['Metadata filtrada', 'Suporte a cadeia hash', 'Assinatura opcional quando configurada'] },
      { title: 'Tratamento de dados', body: 'Workspaces e documentos de clientes são tratados por fornecedores geridos.', items: ['Proteção gerida pelo fornecedor', 'Retenção exige revisão de política', 'Termos DPA exigem revisão legal'] },
      { title: 'Operações', body: 'Evidência operacional e ownership de resposta são acompanhados antes de claims mais fortes.', items: ['Checklist de release', 'Owners nomeados', 'Canal privado de contacto'] },
    ],
  },
  es: {
    title: 'Seguridad en EuroComply',
    subtitle: 'Controles actuales, arquitectura y limitaciones claras para equipos B2B europeos de compliance.',
    back: 'Volver al Trust Center',
    evidenceTitle: 'Documentación enterprise',
    evidenceBody: 'El paquete enterprise mantiene documentación de seguridad, arquitectura, acceso, cifrado, incidentes, backups y subprocesadores.',
    openTrust: 'Abrir Trust Center',
    contactTitle: 'Divulgación responsable',
    contactLabel: 'Contacto de divulgación responsable',
    cards: [
      { title: 'Identidad y acceso', body: 'Las áreas privadas del producto requieren usuarios autenticados.', items: ['Checks de sesión', 'Redirect a login localizado', 'Contexto server-side del usuario'] },
      { title: 'Roles y alcance por organización', body: 'Los roles de organización mapean a permisos explícitos del producto.', items: ['Owner, admin, editor, member, viewer', 'Checks de membership', 'Acceso denegado registrado cuando es posible'] },
      { title: 'Límites de datos por tenant', body: 'Políticas de base de datos y filtros por organización apoyan separación entre tenants.', items: ['Registros por organización', 'Validación en ambiente objetivo requerida', 'Rutas admin solo en servidor'] },
      { title: 'Registros de auditoría', body: 'La actividad crítica de workflow se registra para revisión.', items: ['Metadata filtrada', 'Soporte de cadena hash', 'Firma opcional cuando esté configurada'] },
      { title: 'Tratamiento de datos', body: 'Workspaces y documentos de clientes se gestionan mediante proveedores administrados.', items: ['Protección gestionada por proveedor', 'Retención requiere revisión de política', 'Términos DPA requieren revisión legal'] },
      { title: 'Operaciones', body: 'Evidencia operacional y ownership de respuesta se controlan antes de claims más fuertes.', items: ['Checklist de release', 'Owners nombrados', 'Canal privado de contacto'] },
    ],
  },
  fr: {
    title: 'Sécurité chez EuroComply',
    subtitle: 'Contrôles actuels, architecture et limites explicites pour les équipes conformité B2B européennes.',
    back: 'Retour au Trust Center',
    evidenceTitle: 'Documentation enterprise',
    evidenceBody: 'Le paquet de confiance maintient sécurité, architecture, accès, chiffrement, incidents, sauvegardes et sous-traitants.',
    openTrust: 'Ouvrir le Trust Center',
    contactTitle: 'Divulgation responsable',
    contactLabel: 'Contact de divulgation responsable',
    cards: [
      { title: 'Identité et accès', body: 'Les zones privées du produit exigent des utilisateurs authentifiés.', items: ['Contrôles de session', 'Redirection vers login localisé', 'Contexte utilisateur server-side'] },
      { title: 'Rôles et périmètre organisation', body: 'Les rôles d’organisation correspondent à des permissions produit explicites.', items: ['Owner, admin, editor, member, viewer', 'Contrôles de membership', 'Accès refusé enregistré si possible'] },
      { title: 'Frontières de données tenant', body: 'Politiques de base de données et filtres organisation soutiennent la séparation tenant.', items: ['Enregistrements par organisation', 'Validation sur environnement cible requise', 'Chemins admin côté serveur'] },
      { title: 'Registres d’audit', body: 'L’activité critique des workflows est enregistrée pour revue.', items: ['Metadata filtrée', 'Support de chaîne hash', 'Signature optionnelle si configurée'] },
      { title: 'Traitement des données', body: 'Workspaces et documents clients sont traités via des fournisseurs gérés.', items: ['Protection gérée par fournisseur', 'Rétention à revoir par politique', 'Termes DPA à revoir juridiquement'] },
      { title: 'Opérations', body: 'Preuves opérationnelles et ownership de réponse sont suivis avant claims plus forts.', items: ['Checklist de release', 'Owners nommés', 'Canal de contact privé'] },
    ],
  },
  it: {
    title: 'Sicurezza in EuroComply',
    subtitle: 'Controlli attuali, architettura e limiti dichiarati per team B2B europei di compliance.',
    back: 'Torna al Trust Center',
    evidenceTitle: 'Documentazione enterprise',
    evidenceBody: 'Il pacchetto trust include sicurezza, architettura, accesso, cifratura, incidenti, backup e subprocessori.',
    openTrust: 'Apri Trust Center',
    contactTitle: 'Responsible disclosure',
    contactLabel: 'Contatto responsible disclosure',
    cards: [
      { title: 'Identità e accesso', body: 'Le aree private del prodotto richiedono utenti autenticati.', items: ['Controlli sessione', 'Redirect al login localizzato', 'Contesto utente server-side'] },
      { title: 'Ruoli e ambito organizzazione', body: 'I ruoli organizzativi mappano permessi prodotto espliciti.', items: ['Owner, admin, editor, member, viewer', 'Controlli membership', 'Accesso negato registrato quando possibile'] },
      { title: 'Confini dati tenant', body: 'Policy database e filtri organizzazione supportano separazione tenant.', items: ['Record per organizzazione', 'Validazione ambiente target richiesta', 'Percorsi admin solo server'] },
      { title: 'Registri audit', body: 'Attività critica dei workflow registrata per revisione.', items: ['Metadata filtrata', 'Supporto catena hash', 'Firma opzionale quando configurata'] },
      { title: 'Gestione dati', body: 'Workspace e documenti cliente gestiti tramite provider amministrati.', items: ['Protezione gestita dal provider', 'Retention da rivedere per policy', 'Termini DPA da rivedere legalmente'] },
      { title: 'Operazioni', body: 'Evidenze operative e ownership risposta sono tracciati prima di claim più forti.', items: ['Checklist release', 'Owner nominati', 'Canale privato di contatto'] },
    ],
  },
  de: {
    title: 'Sicherheit bei EuroComply',
    subtitle: 'Aktuelle Kontrollen, Architektur und klare Grenzen für europäische B2B-Compliance-Teams.',
    back: 'Zurück zum Trust Center',
    evidenceTitle: 'Enterprise-Dokumentation',
    evidenceBody: 'Das Trust-Paket umfasst Sicherheit, Architektur, Zugriff, Verschlüsselung, Incident Response, Backups und Unterauftragsverarbeiter.',
    openTrust: 'Trust Center öffnen',
    contactTitle: 'Responsible Disclosure',
    contactLabel: 'Responsible Disclosure Kontakt',
    cards: [
      { title: 'Identität und Zugriff', body: 'Private Produktbereiche erfordern angemeldete Nutzer.', items: ['Session Checks', 'Weiterleitung zum lokalisierten Login', 'Serverseitiger Nutzerkontext'] },
      { title: 'Rollen und Organisationsumfang', body: 'Organisationsrollen sind expliziten Produktberechtigungen zugeordnet.', items: ['Owner, admin, editor, member, viewer', 'Membership Checks', 'Verweigerter Zugriff wird erfasst, wenn möglich'] },
      { title: 'Tenant-Datengrenzen', body: 'Datenbankregeln und Organisationsfilter unterstützen Tenant-Trennung.', items: ['Datensätze pro Organisation', 'Validierung in Zielumgebung erforderlich', 'Admin-Pfade nur serverseitig'] },
      { title: 'Audit-Aufzeichnungen', body: 'Kritische Workflow-Aktivität wird für Reviews erfasst.', items: ['Gefilterte Metadata', 'Hash-Chain Support', 'Optionale Signatur wenn konfiguriert'] },
      { title: 'Datenbehandlung', body: 'Kunden-Workspaces und Dokumente werden über Managed Provider verarbeitet.', items: ['Provider-verwalteter Schutz', 'Retention erfordert Policy Review', 'DPA-Bedingungen erfordern Legal Review'] },
      { title: 'Betrieb', body: 'Operative Evidenz und Response Ownership werden verfolgt, bevor stärkere Claims gemacht werden.', items: ['Release Checklist', 'Benannte Owner', 'Privater Kontaktkanal'] },
    ],
  },
};

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
            {page.cards.map((card, index) => {
              const Icon = icons[index] ?? LockKeyhole;
              return (
                <section key={card.title} className="rounded-3xl border border-white/10 bg-white/[0.04] p-7 shadow-2xl shadow-black/30">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h2 className="text-xl font-semibold">{card.title}</h2>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-white/60">{card.body}</p>
                  <ul className="mt-6 space-y-3 text-sm text-white/70">
                    {card.items.map((item) => (
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
                {page.openTrust}
              </Link>
            </article>
            <article className="rounded-3xl border border-white/10 bg-white/[0.03] p-7 text-sm leading-7 text-white/60">
              <div className="mb-4 flex items-center gap-3 text-white">
                <ShieldCheck className="h-5 w-5" />
                <h2 className="text-xl font-semibold">{page.contactTitle}</h2>
              </div>
              <p>
                {page.contactLabel}:{' '}
                <a href="mailto:renansilva2002@gmail.com" className="font-semibold text-white hover:text-white/80">
                  renansilva2002@gmail.com
                </a>
              </p>
            </article>
          </section>
        </div>
      </section>
      <PublicFooter locale={locale} />
    </main>
  );
}
