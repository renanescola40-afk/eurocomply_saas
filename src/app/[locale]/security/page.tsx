import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Activity, Database, FileText, KeyRound, LockKeyhole, Server, ShieldCheck, UsersRound } from 'lucide-react';

import { isSupportedLocale, type SupportedLocale } from '@/lib/i18n/locales';

const copy: Record<SupportedLocale, {
  title: string;
  subtitle: string;
  back: string;
  sections: Array<{ title: string; description: string; items: string[] }>;
}> = {
  en: {
    title: 'Security at EuroComply',
    subtitle: 'Controls, architecture and operational practices designed for European B2B compliance teams.',
    back: 'Back to Trust Center',
    sections: [
      { title: 'Identity and access', description: 'Authentication is handled through Supabase Auth and protected application routes.', items: ['Session-based access controls', 'Protected dashboard routes', 'Role-aware workflows for team invitations'] },
      { title: 'Tenant isolation', description: 'Organization-scoped access patterns reduce the risk of cross-company data exposure.', items: ['Organization membership checks', 'Server-side service-role access only where required', 'RLS policies prepared in launch migrations'] },
      { title: 'Data protection', description: 'Sensitive business evidence is treated as controlled compliance data.', items: ['Private document storage bucket', 'Document checksums for uploaded files', 'No public document listing'] },
      { title: 'Auditability', description: 'Critical actions are designed to create traceable operational records.', items: ['Audit events for billing and sensitive actions', 'Notifications for important workflow changes', 'GDPR export and deletion request logging'] },
    ],
  },
  pt: {
    title: 'Segurança no EuroComply',
    subtitle: 'Controlos, arquitetura e práticas operacionais pensadas para equipas B2B europeias de compliance.',
    back: 'Voltar ao Trust Center',
    sections: [
      { title: 'Identidade e acesso', description: 'A autenticação é gerida via Supabase Auth e as rotas da aplicação são protegidas.', items: ['Controlos por sessão', 'Rotas de dashboard protegidas', 'Workflows atentos ao papel do utilizador'] },
      { title: 'Isolamento por empresa', description: 'Os acessos são sempre enquadrados por organização para reduzir risco de exposição entre clientes.', items: ['Verificação de membros da organização', 'Service role apenas no servidor quando necessário', 'Políticas RLS preparadas nas migrations de lançamento'] },
      { title: 'Proteção de dados', description: 'Evidências e documentos sensíveis são tratados como dados controlados de compliance.', items: ['Bucket privado para documentos', 'Checksums nos ficheiros carregados', 'Sem listagem pública de documentos'] },
      { title: 'Auditabilidade', description: 'Ações críticas foram desenhadas para gerar registos rastreáveis.', items: ['Eventos de auditoria para billing e ações sensíveis', 'Notificações para alterações relevantes', 'Registo de exportação GDPR e pedidos de apagamento'] },
    ],
  },
  es: {
    title: 'Seguridad en EuroComply',
    subtitle: 'Controles, arquitectura y prácticas operativas para equipos B2B europeos de compliance.',
    back: 'Volver al Trust Center',
    sections: [
      { title: 'Identidad y acceso', description: 'La autenticación se gestiona con Supabase Auth y rutas protegidas.', items: ['Controles basados en sesión', 'Rutas privadas del dashboard', 'Flujos según rol de usuario'] },
      { title: 'Aislamiento por empresa', description: 'Los accesos se limitan por organización para reducir exposición entre clientes.', items: ['Verificación de membresía', 'Service role solo en servidor cuando es necesario', 'Políticas RLS en migrations de lanzamiento'] },
      { title: 'Protección de datos', description: 'Los documentos sensibles se tratan como evidencia controlada.', items: ['Bucket privado de documentos', 'Checksums de archivos subidos', 'Sin listado público de documentos'] },
      { title: 'Auditabilidad', description: 'Las acciones críticas generan registros trazables.', items: ['Eventos de auditoría', 'Notificaciones operativas', 'Registro de exportaciones GDPR y solicitudes de borrado'] },
    ],
  },
  fr: {
    title: 'Sécurité chez EuroComply',
    subtitle: 'Contrôles, architecture et pratiques opérationnelles pour les équipes conformité B2B européennes.',
    back: 'Retour au Trust Center',
    sections: [
      { title: 'Identité et accès', description: 'L’authentification repose sur Supabase Auth et des routes protégées.', items: ['Contrôles par session', 'Routes dashboard protégées', 'Flux adaptés aux rôles'] },
      { title: 'Isolation par entreprise', description: 'Les accès sont limités par organisation afin de réduire l’exposition entre clients.', items: ['Vérification des membres', 'Service role côté serveur uniquement si nécessaire', 'Politiques RLS préparées dans les migrations'] },
      { title: 'Protection des données', description: 'Les documents sensibles sont traités comme preuves de conformité contrôlées.', items: ['Bucket privé pour les documents', 'Checksums des fichiers téléversés', 'Pas de liste publique de documents'] },
      { title: 'Auditabilité', description: 'Les actions critiques sont conçues pour produire des traces vérifiables.', items: ['Événements d’audit', 'Notifications opérationnelles', 'Journalisation GDPR export/suppression'] },
    ],
  },
  it: {
    title: 'Sicurezza in EuroComply',
    subtitle: 'Controlli, architettura e pratiche operative per team B2B europei di compliance.',
    back: 'Torna al Trust Center',
    sections: [
      { title: 'Identità e accesso', description: 'Autenticazione tramite Supabase Auth e rotte applicative protette.', items: ['Controlli basati sulla sessione', 'Rotte dashboard protette', 'Workflow basati sui ruoli'] },
      { title: 'Isolamento aziendale', description: 'Gli accessi sono limitati per organizzazione per ridurre esposizioni tra clienti.', items: ['Verifica dei membri', 'Service role solo lato server quando necessario', 'Policy RLS nelle migration di lancio'] },
      { title: 'Protezione dei dati', description: 'I documenti sensibili sono trattati come evidenze di compliance controllate.', items: ['Bucket documentale privato', 'Checksum dei file caricati', 'Nessuna lista pubblica dei documenti'] },
      { title: 'Auditabilità', description: 'Le azioni critiche generano registri tracciabili.', items: ['Eventi di audit', 'Notifiche operative', 'Logging GDPR export/cancellazione'] },
    ],
  },
  de: {
    title: 'Sicherheit bei EuroComply',
    subtitle: 'Kontrollen, Architektur und Betriebspraktiken für europäische B2B-Compliance-Teams.',
    back: 'Zurück zum Trust Center',
    sections: [
      { title: 'Identität und Zugriff', description: 'Authentifizierung über Supabase Auth und geschützte App-Routen.', items: ['Sitzungsbasierte Kontrollen', 'Geschützte Dashboard-Routen', 'Rollenbasierte Workflows'] },
      { title: 'Mandantentrennung', description: 'Zugriffe werden organisationsbezogen begrenzt, um Datenexposition zu reduzieren.', items: ['Mitgliedschaftsprüfung', 'Service Role nur serverseitig bei Bedarf', 'RLS-Policies in Launch-Migrationen'] },
      { title: 'Datenschutz', description: 'Sensible Dokumente werden als kontrollierte Compliance-Nachweise behandelt.', items: ['Privater Dokumenten-Bucket', 'Checksums für Uploads', 'Keine öffentliche Dokumentenliste'] },
      { title: 'Auditierbarkeit', description: 'Kritische Aktionen erzeugen nachvollziehbare Betriebsprotokolle.', items: ['Audit Events', 'Operative Benachrichtigungen', 'GDPR Export-/Löschprotokolle'] },
    ],
  },
};

const icons = [KeyRound, UsersRound, Database, FileText];

export default async function SecurityPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  if (!isSupportedLocale(locale)) {
    notFound();
  }

  const page = copy[locale];

  return (
    <main className="min-h-screen bg-[#0A0A0F] px-6 py-24 text-white">
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
          {page.sections.map((section, index) => {
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

        <section className="mt-10 rounded-3xl border border-white/10 bg-white/[0.03] p-7 text-sm leading-7 text-white/60">
          <div className="mb-4 flex items-center gap-3 text-white">
            <Server className="h-5 w-5" />
            <h2 className="text-xl font-semibold">Operational note</h2>
          </div>
          <p>
            Security controls depend on production configuration, including Supabase RLS policies,
            private storage buckets, Stripe webhook secrets, Sentry source maps and operational monitoring.
            Enterprise customers may request the latest DPA, subprocessors list and security documentation during procurement.
          </p>
        </section>
      </div>
    </main>
  );
}
