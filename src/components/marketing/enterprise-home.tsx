import Image from 'next/image';
import Link from 'next/link';
import {
  Building2,
  CalendarDays,
  Check,
  ChevronRight,
  Database,
  FileText,
  Globe2,
  KeyRound,
  Lock,
  Network,
  Server,
  ShieldAlert,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { LanguageSwitcher } from '@/components/i18n/language-switcher';
import { PublicFooter } from '@/components/marketing/public-footer';
import { LOCALE_META, locales, type Locale } from '@/lib/i18n/routing';

type PlanCopy = { name: string; planKey?: 'essential' | 'professional' | 'business'; price: string; period: string; text: string; cta: string; features: string[]; highlighted?: boolean; enterprise?: boolean };
type SecurityItem = [string, typeof ShieldCheck, string];
type FeatureCard = [string, string, typeof CalendarDays];
type LandingCopy = {
  nav: { features: string; security: string; plans: string; trust: string; login: string; subscribe: string };
  badge: string;
  heroTitle: string;
  heroSubtitle: string;
  proof: string[];
  cta: { start: string; trust: string; learnMore: string };
  cockpit: { eyebrow: string; title: string; live: string; metrics: [string, string][]; events: string[] };
  security: { eyebrow: string; title: string; subtitle: string; items: SecurityItem[] };
  features: { eyebrow: string; title: string; subtitle: string; cards: FeatureCard[] };
  infrastructure: { eyebrow: string; title: string; subtitle: string; cta: string };
  pricing: { eyebrow: string; title: string; subtitle: string; popular: string; consultive: string; note: string; plans: PlanCopy[] };
  finalCta: { title: string; button: string; subtitle: string };
};

const securityItems: SecurityItem[] = [
  ['Provider-managed encryption', ShieldCheck, 'Designed to use TLS in transit and managed-provider encryption at rest.'],
  ['Privacy workflows', Lock, 'Supports privacy and data subject request workflows without claiming legal certification.'],
  ['Audit event integrity', FileText, 'Audit events can use SHA-256 hash chains and optional HMAC signatures.'],
  ['Tenant isolation design', Building2, 'Organization membership checks and Supabase RLS migrations support tenant boundaries.'],
  ['Supabase Auth', KeyRound, 'Protected sessions and server-side user checks for private routes.'],
  ['Vercel + Supabase architecture', Server, 'Managed hosting, database, authentication and storage configuration.'],
  ['Organization-level RLS', Database, 'RLS evidence must pass against the target Supabase project before production claims.'],
  ['Role-based access', Users, 'Owner, admin, editor, member and viewer roles map to explicit permissions.'],
  ['Operational monitoring posture', Network, 'Logging and release evidence are tracked; 24/7 staffed monitoring is not claimed.'],
  ['Trust documentation', ShieldAlert, 'SOC 2, ISO 27001 and pentest are disclosed as not currently completed.'],
];

const featureCards: Record<Locale, FeatureCard[]> = {
  en: [
    ['Compliance calendar', 'Track obligations, deadlines and owners in one workspace.', CalendarDays],
    ['Multilingual operations', 'Support cross-border teams with localized public and product surfaces.', Globe2],
    ['Risk matrix', 'Identify, assess and mitigate risks before reviews or incidents.', ShieldAlert],
    ['Team invitations', 'Align people with organization roles and permissions.', Users],
    ['Multi-country entities', 'Track operating context across European markets.', Building2],
    ['Audit trail', 'Record critical workflow activity for review and investigation.', FileText],
  ],
  pt: [
    ['Calendário de compliance', 'Acompanhe obrigações, prazos e responsáveis num workspace.', CalendarDays],
    ['Operações multilíngues', 'Apoie equipas transfronteiriças com superfícies localizadas.', Globe2],
    ['Matriz de risco', 'Identifique, avalie e mitigue riscos antes de revisões.', ShieldAlert],
    ['Convites de equipa', 'Alinhe pessoas com papéis e permissões da organização.', Users],
    ['Entidades multi-país', 'Acompanhe contexto operacional em mercados europeus.', Building2],
    ['Trilha de auditoria', 'Registe atividade crítica para revisão e investigação.', FileText],
  ],
  es: [
    ['Calendario de compliance', 'Sigue obligaciones, plazos y responsables en un workspace.', CalendarDays],
    ['Operaciones multilingües', 'Apoya equipos transfronterizos con superficies localizadas.', Globe2],
    ['Matriz de riesgos', 'Identifica, evalúa y mitiga riesgos antes de revisiones.', ShieldAlert],
    ['Invitaciones de equipo', 'Alinea personas con roles y permisos de organización.', Users],
    ['Entidades multi-país', 'Controla el contexto operativo en mercados europeos.', Building2],
    ['Trazabilidad de auditoría', 'Registra actividad crítica para revisión e investigación.', FileText],
  ],
  fr: [
    ['Calendrier compliance', 'Suivez obligations, échéances et responsables dans un espace.', CalendarDays],
    ['Opérations multilingues', 'Aidez les équipes transfrontalières avec des surfaces localisées.', Globe2],
    ['Matrice des risques', 'Identifiez, évaluez et réduisez les risques avant les revues.', ShieldAlert],
    ['Invitations équipe', 'Alignez les personnes avec rôles et permissions.', Users],
    ['Entités multi-pays', 'Suivez le contexte opérationnel dans les marchés européens.', Building2],
    ['Journal d’audit', 'Enregistrez les activités critiques pour revue et enquête.', FileText],
  ],
  it: [
    ['Calendario compliance', 'Traccia obblighi, scadenze e responsabili in un workspace.', CalendarDays],
    ['Operazioni multilingue', 'Supporta team cross-border con superfici localizzate.', Globe2],
    ['Matrice rischi', 'Identifica, valuta e mitiga rischi prima delle review.', ShieldAlert],
    ['Inviti team', 'Allinea persone con ruoli e permessi organizzativi.', Users],
    ['Entità multi-paese', 'Monitora il contesto operativo nei mercati europei.', Building2],
    ['Audit trail', 'Registra attività critiche per review e indagini.', FileText],
  ],
  de: [
    ['Compliance-Kalender', 'Verfolgen Sie Pflichten, Fristen und Verantwortliche.', CalendarDays],
    ['Mehrsprachige Abläufe', 'Unterstützen Sie grenzüberschreitende Teams lokalisiert.', Globe2],
    ['Risikomatrix', 'Erkennen, bewerten und mindern Sie Risiken vor Reviews.', ShieldAlert],
    ['Team-Einladungen', 'Ordnen Sie Personen Rollen und Berechtigungen zu.', Users],
    ['Multi-Country Entities', 'Verfolgen Sie operative Kontexte in europäischen Märkten.', Building2],
    ['Audit Trail', 'Zeichnen Sie kritische Aktivitäten für Prüfungen auf.', FileText],
  ],
};

const localizedPlans: Record<Locale, PlanCopy[]> = {
  en: [
    { name: 'Essential', planKey: 'essential', price: '€49', period: '/month', text: 'Entry plan for small teams moving evidence and deadlines out of spreadsheets.', cta: 'Start Essential', features: ['1 fiscal country', '1 user', 'Basic legal calendar', 'Basic regulatory news', 'Company profile', 'Up to 10 documents', 'Simple risk matrix', 'Basic notifications'] },
    { name: 'Professional', planKey: 'professional', price: '€149', period: '/month', text: 'For SMEs with real obligations, documents, risks and review cycles.', cta: 'Choose Professional', features: ['Up to 2 fiscal countries', 'Compliance calendar', 'Controlled documents', 'Versioning', 'Risk matrix', 'Audit events', 'Basic reports', 'Up to 3 users'] },
    { name: 'Business', planKey: 'business', price: '€399', period: '/month', text: 'For companies growing across Europe with teams, approvals and reporting needs.', cta: 'Choose Business', highlighted: true, features: ['Up to 5 fiscal countries', 'Tax IDs by country', 'Approval workflows', 'Executive reports', 'Audit packs', 'Country-specific news', 'RACI matrix', 'Up to 10 users'] },
    { name: 'Enterprise', price: 'From €990', period: '/month', text: 'Consultive plan for regulated companies and B2B vendors that need procurement support.', cta: 'Talk to sales', enterprise: true, features: ['Expanded limits', 'Advanced users', 'Role-based permissions', 'Trust documentation packet', 'Assisted onboarding', 'Support terms by agreement', 'DPA and subprocessor review', 'Security questionnaire support'] },
  ],
  pt: [
    { name: 'Essential', planKey: 'essential', price: '€49', period: '/mês', text: 'Plano inicial para pequenas equipas que querem sair das folhas de cálculo.', cta: 'Começar Essential', features: ['1 país fiscal', '1 utilizador', 'Calendário legal básico', 'Notícias regulatórias básicas', 'Perfil da empresa', 'Até 10 documentos', 'Matriz de risco simples', 'Notificações básicas'] },
    { name: 'Professional', planKey: 'professional', price: '€149', period: '/mês', text: 'Para PMEs com obrigações, documentos, riscos e ciclos de revisão reais.', cta: 'Escolher Professional', features: ['Até 2 países fiscais', 'Calendário de compliance', 'Documentos controlados', 'Versionamento', 'Matriz de riscos', 'Eventos de auditoria', 'Relatórios básicos', 'Até 3 utilizadores'] },
    { name: 'Business', planKey: 'business', price: '€399', period: '/mês', text: 'Para empresas em crescimento com equipas, aprovações e reporting.', cta: 'Escolher Business', highlighted: true, features: ['Até 5 países fiscais', 'NIF por país', 'Workflows de aprovação', 'Relatórios executivos', 'Audit packs', 'Notícias por país', 'Matriz RACI', 'Até 10 utilizadores'] },
    { name: 'Enterprise', price: 'A partir de €990', period: '/mês', text: 'Plano consultivo para empresas reguladas que precisam de suporte de procurement.', cta: 'Falar com vendas', enterprise: true, features: ['Limites expandidos', 'Utilizadores avançados', 'Permissões por função', 'Pacote trust', 'Onboarding assistido', 'Termos de suporte por acordo', 'Revisão DPA e subprocessadores', 'Suporte a questionários'] },
  ],
  es: [
    { name: 'Essential', planKey: 'essential', price: '€49', period: '/mes', text: 'Plan inicial para equipos pequeños que salen de hojas de cálculo.', cta: 'Empezar Essential', features: ['1 país fiscal', '1 usuario', 'Calendario legal básico', 'Noticias regulatorias básicas', 'Perfil de empresa', 'Hasta 10 documentos', 'Matriz de riesgos simple', 'Notificaciones básicas'] },
    { name: 'Professional', planKey: 'professional', price: '€149', period: '/mes', text: 'Para pymes con obligaciones, documentos, riesgos y ciclos de revisión.', cta: 'Elegir Professional', features: ['Hasta 2 países fiscales', 'Calendario de compliance', 'Documentos controlados', 'Versionado', 'Matriz de riesgos', 'Eventos de auditoría', 'Informes básicos', 'Hasta 3 usuarios'] },
    { name: 'Business', planKey: 'business', price: '€399', period: '/mes', text: 'Para empresas que crecen en Europa con equipos, aprobaciones e informes.', cta: 'Elegir Business', highlighted: true, features: ['Hasta 5 países fiscales', 'IDs fiscales por país', 'Flujos de aprobación', 'Informes ejecutivos', 'Audit packs', 'Noticias por país', 'Matriz RACI', 'Hasta 10 usuarios'] },
    { name: 'Enterprise', price: 'Desde €990', period: '/mes', text: 'Plan consultivo para empresas reguladas y vendors B2B.', cta: 'Hablar con ventas', enterprise: true, features: ['Límites ampliados', 'Usuarios avanzados', 'Permisos por rol', 'Paquete trust', 'Onboarding asistido', 'Soporte por acuerdo', 'Revisión DPA y subprocesadores', 'Soporte para cuestionarios'] },
  ],
  fr: [
    { name: 'Essential', planKey: 'essential', price: '€49', period: '/mois', text: 'Offre d’entrée pour petites équipes qui quittent les tableurs.', cta: 'Démarrer Essential', features: ['1 pays fiscal', '1 utilisateur', 'Calendrier légal basique', 'Actualités réglementaires basiques', 'Profil entreprise', 'Jusqu’à 10 documents', 'Matrice de risque simple', 'Notifications basiques'] },
    { name: 'Professional', planKey: 'professional', price: '€149', period: '/mois', text: 'Pour PME avec obligations, documents, risques et cycles de revue.', cta: 'Choisir Professional', features: ['Jusqu’à 2 pays fiscaux', 'Calendrier compliance', 'Documents contrôlés', 'Versioning', 'Matrice des risques', 'Événements d’audit', 'Rapports basiques', 'Jusqu’à 3 utilisateurs'] },
    { name: 'Business', planKey: 'business', price: '€399', period: '/mois', text: 'Pour entreprises en croissance avec équipes, approbations et reporting.', cta: 'Choisir Business', highlighted: true, features: ['Jusqu’à 5 pays fiscaux', 'Identifiants fiscaux par pays', 'Workflows d’approbation', 'Rapports exécutifs', 'Audit packs', 'Actualités par pays', 'Matrice RACI', 'Jusqu’à 10 utilisateurs'] },
    { name: 'Enterprise', price: 'Dès €990', period: '/mois', text: 'Offre consultative pour entreprises régulées et vendors B2B.', cta: 'Parler aux ventes', enterprise: true, features: ['Limites étendues', 'Utilisateurs avancés', 'Permissions par rôle', 'Paquet trust', 'Onboarding assisté', 'Support selon accord', 'Revue DPA et sous-traitants', 'Support questionnaires'] },
  ],
  it: [
    { name: 'Essential', planKey: 'essential', price: '€49', period: '/mese', text: 'Piano iniziale per piccoli team che lasciano i fogli di calcolo.', cta: 'Avvia Essential', features: ['1 paese fiscale', '1 utente', 'Calendario legale base', 'News regolatorie base', 'Profilo azienda', 'Fino a 10 documenti', 'Matrice rischi semplice', 'Notifiche base'] },
    { name: 'Professional', planKey: 'professional', price: '€149', period: '/mese', text: 'Per PMI con obblighi, documenti, rischi e cicli di review.', cta: 'Scegli Professional', features: ['Fino a 2 paesi fiscali', 'Calendario compliance', 'Documenti controllati', 'Versioning', 'Matrice rischi', 'Eventi audit', 'Report base', 'Fino a 3 utenti'] },
    { name: 'Business', planKey: 'business', price: '€399', period: '/mese', text: 'Per aziende in crescita con team, approvazioni e reporting.', cta: 'Scegli Business', highlighted: true, features: ['Fino a 5 paesi fiscali', 'ID fiscali per paese', 'Workflow approvazioni', 'Report esecutivi', 'Audit pack', 'News per paese', 'Matrice RACI', 'Fino a 10 utenti'] },
    { name: 'Enterprise', price: 'Da €990', period: '/mese', text: 'Piano consultivo per aziende regolamentate e vendor B2B.', cta: 'Parla con vendite', enterprise: true, features: ['Limiti estesi', 'Utenti avanzati', 'Permessi per ruolo', 'Pacchetto trust', 'Onboarding assistito', 'Supporto da accordo', 'Revisione DPA e subprocessori', 'Supporto questionari'] },
  ],
  de: [
    { name: 'Essential', planKey: 'essential', price: '€49', period: '/Monat', text: 'Einstiegsplan für kleine Teams, die Tabellen ablösen.', cta: 'Essential starten', features: ['1 Steuerland', '1 Nutzer', 'Basis-Rechtskalender', 'Basis-Regulatory News', 'Unternehmensprofil', 'Bis 10 Dokumente', 'Einfache Risikomatrix', 'Basis-Benachrichtigungen'] },
    { name: 'Professional', planKey: 'professional', price: '€149', period: '/Monat', text: 'Für KMU mit echten Pflichten, Dokumenten, Risiken und Reviews.', cta: 'Professional wählen', features: ['Bis 2 Steuerländer', 'Compliance-Kalender', 'Kontrollierte Dokumente', 'Versionierung', 'Risikomatrix', 'Audit Events', 'Basisberichte', 'Bis 3 Nutzer'] },
    { name: 'Business', planKey: 'business', price: '€399', period: '/Monat', text: 'Für wachsende Unternehmen mit Teams, Freigaben und Reporting.', cta: 'Business wählen', highlighted: true, features: ['Bis 5 Steuerländer', 'Steuer-IDs je Land', 'Freigabe-Workflows', 'Executive Reports', 'Audit Packs', 'Länderspezifische News', 'RACI-Matrix', 'Bis 10 Nutzer'] },
    { name: 'Enterprise', price: 'Ab €990', period: '/Monat', text: 'Beratender Plan für regulierte Unternehmen und B2B Vendors.', cta: 'Mit Sales sprechen', enterprise: true, features: ['Erweiterte Limits', 'Advanced Users', 'Rollenbasierte Berechtigungen', 'Trust-Dokumentationspaket', 'Begleitetes Onboarding', 'Support nach Vereinbarung', 'DPA/Subprocessor Review', 'Security Questionnaire Support'] },
  ],
};

const englishCopy: LandingCopy = {
  nav: { features: 'Features', security: 'Security', plans: 'Plans', trust: 'Trust Center', login: 'Log in', subscribe: 'Subscribe now' },
  badge: 'European compliance operations platform',
  heroTitle: 'Compliance evidence, risk and vendor operations without procurement surprises.',
  heroSubtitle: 'RISCK COMPLY helps European teams centralize evidence, risks, vendors, roles and audit trails while keeping security claims tied to documented implementation.',
  proof: ['audit-ready', 'tenant isolated', 'GDPR aligned', 'role-based access'],
  cta: { start: 'Subscribe now', trust: 'Review Trust Center', learnMore: 'Learn more' },
  cockpit: { eyebrow: 'Executive cockpit', title: 'Compliance workspace', live: 'Workspace view', metrics: [['RBAC', 'role-based access'], ['RLS', 'tenant isolation design'], ['Audit', 'traceable events'], ['Docs', 'enterprise packet']], events: ['Policy approved and recorded as an audit event', 'Vendor risk ready for review', 'Security questionnaire response needs evidence check'] },
  security: { eyebrow: 'Security architecture', title: 'Security posture with honest evidence boundaries', subtitle: 'Controls implemented in the platform plus clearly disclosed roadmap or evidence gaps for enterprise procurement.', items: securityItems },
  features: { eyebrow: 'Features', title: 'What teams operate in RISCK COMPLY', subtitle: 'A clear control room for obligations, owners, evidence and risk. No generic dashboard theatre.', cards: featureCards.en },
  infrastructure: { eyebrow: 'Infrastructure', title: 'Architecture designed to support enterprise review.', subtitle: 'Next.js, Supabase Auth, organization-scoped RBAC, RLS migrations, server-only admin operations, audit events and release evidence checks are documented in the Trust Center.', cta: 'Open security overview' },
  pricing: { eyebrow: 'Plans', title: 'Choose the right plan for your company', subtitle: 'Start with operational compliance workflows and scale into enterprise procurement materials when needed.', popular: 'Best balance', consultive: 'Enterprise review', note: 'Enterprise security commitments depend on the signed agreement and available evidence. RISCK COMPLY does not currently claim SOC 2, ISO 27001 certification, completed third-party pentesting or tested backup restore.', plans: localizedPlans.en },
  finalCta: { title: 'Give buyers evidence they can evaluate, not claims they have to decode.', button: 'Subscribe to RISCK COMPLY', subtitle: 'Review the Trust Center before procurement.' },
};

const portugueseCopy: LandingCopy = { ...englishCopy, nav: { features: 'Funcionalidades', security: 'Segurança', plans: 'Planos', trust: 'Trust Center', login: 'Entrar', subscribe: 'Assinar agora' }, badge: 'Plataforma europeia de operações de compliance', heroTitle: 'Evidências, riscos e fornecedores sem surpresas em procurement.', heroSubtitle: 'O RISCK COMPLY ajuda equipas europeias a centralizar evidências, riscos, fornecedores, papéis e trilhas de auditoria mantendo claims de segurança ligados à implementação documentada.', proof: ['audit-ready', 'tenant isolated', 'GDPR aligned', 'role-based access'], cta: { start: 'Assinar agora', trust: 'Ver Trust Center', learnMore: 'Saiba mais' }, cockpit: { eyebrow: 'Cockpit executivo', title: 'Workspace de compliance', live: 'Vista do workspace', metrics: [['RBAC', 'acesso por função'], ['RLS', 'desenho de isolamento'], ['Auditoria', 'eventos rastreáveis'], ['Docs', 'pacote enterprise']], events: ['Política aprovada e registada como evento de auditoria', 'Risco de fornecedor pronto para revisão', 'Resposta de questionário de segurança requer validação de evidência'] }, security: { ...englishCopy.security, eyebrow: 'Arquitetura de segurança', title: 'Postura de segurança com limites honestos de evidência', subtitle: 'Controlos implementados na plataforma e lacunas de roadmap/evidência claramente divulgadas para procurement enterprise.' }, features: { eyebrow: 'Funcionalidades', title: 'O que as equipas operam no RISCK COMPLY', subtitle: 'Uma sala de controlo clara para obrigações, responsáveis, evidências e risco. Sem teatro de dashboard genérico.', cards: featureCards.pt }, infrastructure: { ...englishCopy.infrastructure, eyebrow: 'Infraestrutura', title: 'Arquitetura desenhada para apoiar avaliação enterprise.', cta: 'Abrir visão de segurança' }, pricing: { ...englishCopy.pricing, eyebrow: 'Planos', title: 'Escolha o plano certo para a sua empresa', subtitle: 'Comece com workflows operacionais e evolua para materiais de procurement enterprise.', popular: 'Melhor equilíbrio', consultive: 'Avaliação enterprise', note: 'Compromissos enterprise dependem do contrato assinado e da evidência disponível. O RISCK COMPLY não afirma SOC 2, certificação ISO 27001, pentest terceiro concluído ou restore de backup testado.', plans: localizedPlans.pt }, finalCta: { title: 'Dê aos compradores evidência avaliável, não claims para decifrar.', button: 'Assinar RISCK COMPLY', subtitle: 'Revise o Trust Center antes do procurement.' } };
const spanishCopy: LandingCopy = { ...englishCopy, nav: { features: 'Funcionalidades', security: 'Seguridad', plans: 'Planes', trust: 'Trust Center', login: 'Iniciar sesión', subscribe: 'Suscribirse ahora' }, badge: 'Plataforma europea de operaciones de compliance', heroTitle: 'Evidencias, riesgos y proveedores sin sorpresas de procurement.', heroSubtitle: 'RISCK COMPLY ayuda a equipos europeos a centralizar evidencias, riesgos, proveedores, roles y trazas de auditoría manteniendo los claims de seguridad ligados a implementación documentada.', cta: { start: 'Suscribirse ahora', trust: 'Revisar Trust Center', learnMore: 'Más información' }, features: { eyebrow: 'Funcionalidades', title: 'Qué operan los equipos en RISCK COMPLY', subtitle: 'Un control room claro para obligaciones, responsables, evidencias y riesgo.', cards: featureCards.es }, pricing: { ...englishCopy.pricing, eyebrow: 'Planes', title: 'Elige el plan adecuado para tu empresa', note: 'Los compromisos enterprise dependen del contrato firmado y de la evidencia disponible. RISCK COMPLY no afirma SOC 2, certificación ISO 27001, pentest tercero completado ni restore de backup probado.', plans: localizedPlans.es }, finalCta: { title: 'Entrega a los compradores evidencia evaluable, no claims difíciles de descifrar.', button: 'Suscribirse a RISCK COMPLY', subtitle: 'Revisa el Trust Center antes del procurement.' } };
const frenchCopy: LandingCopy = { ...englishCopy, nav: { features: 'Fonctionnalités', security: 'Sécurité', plans: 'Offres', trust: 'Trust Center', login: 'Connexion', subscribe: 'Souscrire' }, heroSubtitle: 'RISCK COMPLY aide les équipes européennes à centraliser preuves, risques, fournisseurs, rôles et traces d’audit tout en liant les claims sécurité à l’implémentation documentée.', features: { eyebrow: 'Fonctionnalités', title: 'Ce que les équipes opèrent dans RISCK COMPLY', subtitle: 'Un control room clair pour obligations, responsables, preuves et risques.', cards: featureCards.fr }, pricing: { ...englishCopy.pricing, eyebrow: 'Offres', note: 'Les engagements enterprise dépendent du contrat signé et des preuves disponibles. RISCK COMPLY ne revendique pas SOC 2, certification ISO 27001, pentest tiers finalisé ni restauration de backup testée.', plans: localizedPlans.fr }, finalCta: { title: 'Donnez aux acheteurs des preuves évaluables, pas des claims à décoder.', button: 'Souscrire à RISCK COMPLY', subtitle: 'Consultez le Trust Center avant le procurement.' } };
const italianCopy: LandingCopy = { ...englishCopy, nav: { features: 'Funzionalità', security: 'Sicurezza', plans: 'Piani', trust: 'Trust Center', login: 'Accedi', subscribe: 'Abbonati ora' }, heroSubtitle: 'RISCK COMPLY aiuta i team europei a centralizzare evidenze, rischi, fornitori, ruoli e audit trail mantenendo i claim di sicurezza collegati all’implementazione documentata.', features: { eyebrow: 'Funzionalità', title: 'Cosa gestiscono i team in RISCK COMPLY', subtitle: 'Una control room chiara per obblighi, owner, evidenze e rischio.', cards: featureCards.it }, pricing: { ...englishCopy.pricing, eyebrow: 'Piani', note: 'Gli impegni enterprise dipendono dal contratto firmato e dalle evidenze disponibili. RISCK COMPLY non afferma SOC 2, certificazione ISO 27001, pentest di terze parti completato o restore backup testato.', plans: localizedPlans.it }, finalCta: { title: 'Dai ai buyer evidenze valutabili, non claim da decifrare.', button: 'Abbonati a RISCK COMPLY', subtitle: 'Consulta il Trust Center prima del procurement.' } };
const germanCopy: LandingCopy = { ...englishCopy, nav: { features: 'Funktionen', security: 'Sicherheit', plans: 'Pläne', trust: 'Trust Center', login: 'Anmelden', subscribe: 'Jetzt abonnieren' }, heroSubtitle: 'RISCK COMPLY hilft europäischen Teams, Evidenz, Risiken, Lieferanten, Rollen und Audit Trails zu zentralisieren und Security Claims an dokumentierte Umsetzung zu binden.', features: { eyebrow: 'Funktionen', title: 'Was Teams in RISCK COMPLY betreiben', subtitle: 'Ein klarer Control Room für Pflichten, Owner, Evidenz und Risiko.', cards: featureCards.de }, pricing: { ...englishCopy.pricing, eyebrow: 'Pläne', note: 'Enterprise Security Commitments hängen vom unterschriebenen Vertrag und verfügbarer Evidenz ab. RISCK COMPLY behauptet derzeit weder SOC 2 noch ISO 27001 Zertifizierung, abgeschlossenen Drittanbieter-Pentest oder getestete Backup-Wiederherstellung.', plans: localizedPlans.de }, finalCta: { title: 'Geben Sie Käufern bewertbare Evidenz statt Claims zum Entschlüsseln.', button: 'RISCK COMPLY abonnieren', subtitle: 'Prüfen Sie das Trust Center vor dem Procurement.' } };

const landingCopy: Record<Locale, LandingCopy> = { en: englishCopy, pt: portugueseCopy, es: spanishCopy, fr: frenchCopy, it: italianCopy, de: germanCopy };
function href(locale: Locale, path: string) { return `/${locale}${path}`; }
function planHref(locale: Locale, plan: PlanCopy) { return plan.enterprise ? href(locale, '/contact') : href(locale, `/billing/checkout/${plan.planKey}`); }

export function EnterpriseHome({ locale }: { locale: string }) {
  const activeLocale = (locales.includes(locale as Locale) ? locale : 'en') as Locale;
  const copy = landingCopy[activeLocale];
  const meta = LOCALE_META[activeLocale];
  const localeName = meta.nativeName ?? meta.name;

  return (
    <main className="min-h-screen scroll-smooth overflow-hidden bg-[#050505] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_16%_14%,rgba(37,99,235,.24),transparent_30rem),radial-gradient(circle_at_80%_18%,rgba(16,185,129,.1),transparent_28rem),linear-gradient(180deg,#050505_0%,#080b12_48%,#050505_100%)]" />
      <div className="pointer-events-none fixed inset-0 tech-grid opacity-25" />
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#050505]/72 backdrop-blur-2xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href={`/${activeLocale}`} className="flex items-center gap-3" aria-label="RISCK COMPLY home"><Image src="/brand/risck-comply-wordmark.svg" alt="RISCK COMPLY" width={180} height={44} className="h-10 w-auto object-contain" priority /></Link>
          <div className="hidden items-center gap-8 text-sm text-white/56 lg:flex"><a href="#features" className="transition hover:text-white">{copy.nav.features}</a><a href="#security" className="transition hover:text-white">{copy.nav.security}</a><a href="#plans" className="transition hover:text-white">{copy.nav.plans}</a><Link href={href(activeLocale, '/trust')} className="transition hover:text-white">{copy.nav.trust}</Link><span className="text-white/32">{localeName}</span></div>
          <div className="flex items-center gap-3"><LanguageSwitcher currentLocale={activeLocale} variant="dark" compact /><Link href={href(activeLocale, '/login')} className="hidden rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 sm:inline-flex">{copy.nav.login}</Link><Link href={href(activeLocale, '/billing/checkout/essential')} className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-black shadow-[0_0_40px_rgba(255,255,255,.18)] transition hover:bg-zinc-200">{copy.nav.subscribe}</Link></div>
        </nav>
      </header>

      <section className="relative z-10 px-4 pb-24 pt-32 sm:px-6 lg:px-8 lg:pt-40">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white/76"><ShieldCheck className="h-4 w-4" /> {copy.badge}</div>
            <h1 className="mt-8 max-w-4xl text-5xl font-semibold leading-[1.02] tracking-[-0.065em] text-white sm:text-6xl lg:text-7xl">{copy.heroTitle}</h1>
            <p className="mt-7 max-w-3xl text-lg leading-8 text-white/62 sm:text-xl">{copy.heroSubtitle}</p>
            <div className="mt-6 flex flex-wrap gap-2">{copy.proof.map((item) => <span key={item} className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white/50">{item}</span>)}</div>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row"><Link href={href(activeLocale, '/billing/checkout/essential')} className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-4 text-base font-bold text-black shadow-[0_0_50px_rgba(255,255,255,.18)] transition hover:bg-zinc-200">{copy.cta.start} <ChevronRight className="h-4 w-4" /></Link><Link href={href(activeLocale, '/trust')} className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/[0.04] px-7 py-4 text-base font-bold text-white backdrop-blur transition hover:bg-white/10">{copy.cta.trust}</Link></div>
          </div>

          <div className="premium-card rounded-[2rem] p-5 shadow-2xl">
            <div className="rounded-[1.5rem] border border-white/10 bg-black/35 p-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-5"><div><p className="text-xs uppercase tracking-[0.26em] text-white/35">{copy.cockpit.eyebrow}</p><h2 className="mt-2 text-2xl font-semibold text-white">{copy.cockpit.title}</h2></div><span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white">{copy.cockpit.live}</span></div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">{copy.cockpit.metrics.map(([value, label]) => <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"><p className="text-3xl font-semibold text-white">{value}</p><p className="mt-2 text-sm text-white/42">{label}</p></div>)}</div>
              <div className="mt-6 space-y-3">{copy.cockpit.events.map((item) => <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-6 text-white/62"><Check className="mt-1 h-4 w-4 shrink-0 text-white" /> {item}</div>)}</div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="relative z-10 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl"><p className="text-sm font-semibold uppercase tracking-[0.24em] text-white/35">{copy.features.eyebrow}</p><div className="mt-4 grid gap-4 lg:grid-cols-[.9fr_1.1fr]"><h2 className="text-3xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">{copy.features.title}</h2><p className="text-sm leading-7 text-white/55 md:text-base">{copy.features.subtitle}</p></div><div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{copy.features.cards.map(([title, text, Icon]) => <article key={title} className="premium-card premium-card-hover rounded-[1.75rem] p-6"><div className="rounded-2xl bg-white/10 p-3 text-white w-fit"><Icon className="h-5 w-5" /></div><h3 className="mt-5 text-xl font-semibold text-white">{title}</h3><p className="mt-3 text-sm leading-6 text-white/52">{text}</p></article>)}</div></div>
      </section>

      <section id="security" className="relative z-10 border-y border-white/10 bg-white/[0.02] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl"><p className="text-sm font-semibold uppercase tracking-[0.24em] text-white/35">{copy.security.eyebrow}</p><h2 className="mt-4 max-w-4xl text-3xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">{copy.security.title}</h2><p className="mt-5 max-w-3xl text-sm leading-7 text-white/55 md:text-base">{copy.security.subtitle}</p><div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-5">{copy.security.items.map(([title, Icon, text]) => <article key={title} className="rounded-3xl border border-white/10 bg-black/20 p-5"><Icon className="h-5 w-5 text-white" /><h3 className="mt-4 font-semibold text-white">{title}</h3><p className="mt-2 text-sm leading-6 text-white/48">{text}</p></article>)}</div></div>
      </section>

      <section className="relative z-10 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 md:p-9"><div className="grid gap-6 lg:grid-cols-[.8fr_1.2fr] lg:items-center"><div><p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/35">{copy.infrastructure.eyebrow}</p><h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white">{copy.infrastructure.title}</h2></div><div><p className="text-sm leading-7 text-white/55">{copy.infrastructure.subtitle}</p><Link href={href(activeLocale, '/security')} className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white hover:bg-white/10">{copy.infrastructure.cta} <ChevronRight className="h-4 w-4" /></Link></div></div></div>
      </section>

      <section id="plans" className="relative z-10 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl"><div className="max-w-3xl"><p className="text-sm font-semibold uppercase tracking-[0.24em] text-white/35">{copy.pricing.eyebrow}</p><h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">{copy.pricing.title}</h2><p className="mt-4 text-sm leading-7 text-white/55 md:text-base">{copy.pricing.subtitle}</p></div><div className="mt-10 grid gap-4 lg:grid-cols-4">{copy.pricing.plans.map((plan) => <article key={plan.name} className={`flex rounded-[1.75rem] border p-6 ${plan.highlighted ? 'border-white/35 bg-white text-black shadow-[0_24px_90px_rgba(255,255,255,.12)]' : 'border-white/10 bg-white/[0.035] text-white'}`}><div className="flex flex-1 flex-col"><div className="flex items-center justify-between gap-4"><h3 className="text-xl font-semibold">{plan.name}</h3>{plan.highlighted ? <span className="rounded-full bg-black px-3 py-1 text-xs font-bold text-white">{copy.pricing.popular}</span> : plan.enterprise ? <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-white/60">{copy.pricing.consultive}</span> : null}</div><p className={`mt-3 text-sm leading-6 ${plan.highlighted ? 'text-black/58' : 'text-white/52'}`}>{plan.text}</p><p className="mt-6 text-4xl font-semibold tracking-[-0.04em]">{plan.price}<span className={`text-sm font-normal ${plan.highlighted ? 'text-black/50' : 'text-white/42'}`}>{plan.period}</span></p><ul className={`mt-6 space-y-2 text-sm ${plan.highlighted ? 'text-black/64' : 'text-white/54'}`}>{plan.features.map((feature) => <li key={feature} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0" /> {feature}</li>)}</ul><Link href={planHref(activeLocale, plan)} className={`mt-8 inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-bold ${plan.highlighted ? 'bg-black text-white hover:bg-zinc-800' : 'border border-white/15 bg-white/[0.04] text-white hover:bg-white/10'}`}>{plan.cta} <ChevronRight className="h-4 w-4" /></Link></div></article>)}</div><p className="mt-6 text-xs leading-6 text-white/38">{copy.pricing.note}</p></div>
      </section>

      <section className="relative z-10 px-4 py-20 sm:px-6 lg:px-8"><div className="mx-auto max-w-5xl rounded-[2rem] border border-white/10 bg-white/[0.05] p-8 text-center md:p-12"><h2 className="text-3xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">{copy.finalCta.title}</h2><p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-white/55">{copy.finalCta.subtitle}</p><Link href={href(activeLocale, '/billing/checkout/essential')} className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-4 text-base font-bold text-black hover:bg-zinc-200">{copy.finalCta.button} <ChevronRight className="h-4 w-4" /></Link></div></section>

      <div className="relative z-10"><PublicFooter locale={activeLocale} /></div>
    </main>
  );
}
