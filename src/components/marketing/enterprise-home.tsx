import Link from 'next/link';
import {
  Building2,
  CalendarDays,
  Check,
  ChevronRight,
  Database,
  FileText,
  Fingerprint,
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

type PlanCopy = {
  name: string;
  planKey?: 'essential' | 'professional' | 'business';
  price: string;
  period: string;
  text: string;
  cta: string;
  features: string[];
  highlighted?: boolean;
  enterprise?: boolean;
};

type SecurityItem = [string, typeof ShieldCheck, string];
type FeatureCard = [string, string, typeof CalendarDays];

type LandingCopy = {
  nav: { features: string; security: string; plans: string; trust: string; login: string; subscribe: string };
  badge: string;
  heroTitle: string;
  heroSubtitle: string;
  cta: { start: string; demo: string; trust: string; learnMore: string };
  cockpit: { eyebrow: string; title: string; live: string; metrics: [string, string][]; events: string[] };
  security: { eyebrow: string; title: string; subtitle: string; items: SecurityItem[] };
  features: { eyebrow: string; title: string; cards: FeatureCard[] };
  infrastructure: { eyebrow: string; title: string; subtitle: string; cta: string };
  pricing: { eyebrow: string; title: string; subtitle: string; popular: string; consultive: string; note: string; plans: PlanCopy[] };
  finalCta: { title: string; button: string; subtitle: string };
};

const englishCopy: LandingCopy = {
  nav: { features: 'Features', security: 'Security', plans: 'Plans', trust: 'Trust Center', login: 'Log in', subscribe: 'Subscribe now' },
  badge: 'European compliance operations platform',
  heroTitle: 'Compliance evidence, risk and vendor operations without procurement surprises.',
  heroSubtitle: 'EuroComply helps European teams centralize evidence, risks, vendors, roles and audit trails while keeping security claims tied to documented implementation.',
  cta: { start: 'Subscribe now', demo: 'View demo', trust: 'Review Trust Center', learnMore: 'Learn more' },
  cockpit: {
    eyebrow: 'Executive cockpit',
    title: 'Compliance workspace',
    live: 'Workspace view',
    metrics: [['RBAC', 'role-based access'], ['RLS', 'tenant isolation design'], ['Audit', 'traceable events'], ['Docs', 'enterprise packet']],
    events: ['Policy approved and recorded as an audit event', 'Vendor risk ready for review', 'Security questionnaire response needs evidence check'],
  },
  security: {
    eyebrow: 'Security architecture',
    title: 'Security posture with honest evidence boundaries',
    subtitle: 'Controls implemented in the platform plus clearly disclosed roadmap or evidence gaps for enterprise procurement.',
    items: [
      ['Provider-managed encryption', ShieldCheck, 'Designed to use TLS in transit and managed-provider encryption at rest.'],
      ['Privacy workflows', Lock, 'Supports privacy and data subject request workflows without claiming legal certification.'],
      ['Audit event integrity', FileText, 'Audit events can use SHA-256 hash chains and optional HMAC signatures.'],
      ['Organization isolation', Building2, 'Organization membership checks and Supabase RLS migrations support tenant boundaries.'],
      ['Supabase Auth', Fingerprint, 'Protected sessions and server-side user checks for private routes.'],
      ['Vercel + Supabase architecture', Server, 'Managed hosting, database, authentication and storage configuration.'],
      ['Organization-level RLS', Database, 'RLS evidence must pass against the target Supabase project before production claims.'],
      ['Permission controls', KeyRound, 'Owner, admin, editor, member and viewer roles map to explicit permissions.'],
      ['Operational monitoring posture', Network, 'Logging and release evidence are tracked; 24/7 staffed monitoring is not claimed.'],
      ['Trust documentation', ShieldAlert, 'SOC 2, ISO 27001 and pentest are disclosed as not currently completed.'],
    ],
  },
  features: {
    eyebrow: 'Features',
    title: 'What teams operate in EuroComply',
    cards: [
      ['Compliance calendar', 'Track obligations, deadlines and owners in one workspace.', CalendarDays],
      ['Multilingual operations', 'Support cross-border teams with localized public and product surfaces.', Globe2],
      ['Risk matrix', 'Identify, assess and mitigate risks before reviews or incidents.', ShieldAlert],
      ['Team invitations', 'Align people with organization roles and permissions.', Users],
      ['Multi-country entities', 'Track operating context across European markets.', Building2],
      ['Audit trail', 'Record critical workflow activity for review and investigation.', FileText],
    ],
  },
  infrastructure: {
    eyebrow: 'Infrastructure',
    title: 'Architecture designed to support enterprise review.',
    subtitle: 'Next.js, Supabase Auth, organization-scoped RBAC, RLS migrations, server-only admin operations, audit events and release evidence checks are documented in the Trust Center.',
    cta: 'Open security overview',
  },
  pricing: {
    eyebrow: 'Plans',
    title: 'Choose the right plan for your company',
    subtitle: 'Start with operational compliance workflows and scale into enterprise procurement materials when needed.',
    popular: 'Best balance',
    consultive: 'Enterprise review',
    note: 'Enterprise security commitments depend on the signed agreement and available evidence. EuroComply does not currently claim SOC 2, ISO 27001 certification, completed third-party pentesting or tested backup restore.',
    plans: [
      { name: 'Essential', planKey: 'essential', price: '€49', period: '/month', text: 'Entry plan for small teams moving evidence and deadlines out of spreadsheets.', cta: 'Start Essential', features: ['1 fiscal country', '1 user', 'Basic legal calendar', 'Basic regulatory news', 'Company profile', 'Up to 10 documents', 'Simple risk matrix', 'Basic notifications'] },
      { name: 'Professional', planKey: 'professional', price: '€149', period: '/month', text: 'For SMEs with real obligations, documents, risks and review cycles.', cta: 'Choose Professional', features: ['Up to 2 fiscal countries', 'Compliance calendar', 'Controlled documents', 'Versioning', 'Risk matrix', 'Audit events', 'Basic reports', 'Up to 3 users'] },
      { name: 'Business', planKey: 'business', price: '€399', period: '/month', text: 'For companies growing across Europe with teams, approvals and reporting needs.', cta: 'Choose Business', highlighted: true, features: ['Up to 5 fiscal countries', 'Tax IDs by country', 'Approval workflows', 'Executive reports', 'Audit packs', 'Country-specific news', 'RACI matrix', 'Up to 10 users'] },
      { name: 'Enterprise', price: 'From €990', period: '/month', text: 'Consultive plan for regulated companies and B2B vendors that need procurement support.', cta: 'Talk to sales', enterprise: true, features: ['Expanded limits', 'Advanced users', 'Role-based permissions', 'Trust documentation packet', 'Assisted onboarding', 'Support terms by agreement', 'DPA and subprocessor review', 'Security questionnaire support'] },
    ],
  },
  finalCta: { title: 'Give buyers evidence they can evaluate, not claims they have to decode.', button: 'Subscribe to EuroComply', subtitle: 'Review the Trust Center before procurement.' },
};

const portugueseCopy: LandingCopy = {
  ...englishCopy,
  nav: { features: 'Funcionalidades', security: 'Segurança', plans: 'Planos', trust: 'Trust Center', login: 'Entrar', subscribe: 'Assinar agora' },
  badge: 'Plataforma europeia de operações de compliance',
  heroTitle: 'Evidências, riscos e fornecedores sem surpresas em procurement.',
  heroSubtitle: 'O EuroComply ajuda equipas europeias a centralizar evidências, riscos, fornecedores, papéis e trilhas de auditoria mantendo claims de segurança ligados à implementação documentada.',
  cta: { start: 'Assinar agora', demo: 'Ver demonstração', trust: 'Ver Trust Center', learnMore: 'Saiba mais' },
  cockpit: { eyebrow: 'Cockpit executivo', title: 'Workspace de compliance', live: 'Vista do workspace', metrics: [['RBAC', 'acesso por função'], ['RLS', 'desenho de isolamento'], ['Auditoria', 'eventos rastreáveis'], ['Docs', 'pacote enterprise']], events: ['Política aprovada e registada como evento de auditoria', 'Risco de fornecedor pronto para revisão', 'Resposta de questionário de segurança requer validação de evidência'] },
  security: { ...englishCopy.security, eyebrow: 'Arquitetura de segurança', title: 'Postura de segurança com limites honestos de evidência', subtitle: 'Controlos implementados na plataforma e lacunas de roadmap/evidência claramente divulgadas para procurement enterprise.', items: [
    ['Criptografia gerida pelo fornecedor', ShieldCheck, 'Desenhado para usar TLS em trânsito e criptografia gerida em repouso.'],
    ['Workflows de privacidade', Lock, 'Suporta fluxos de privacidade e pedidos de titulares sem afirmar certificação legal.'],
    ['Integridade de eventos de auditoria', FileText, 'Eventos de auditoria podem usar cadeia hash SHA-256 e assinaturas HMAC opcionais.'],
    ['Isolamento por organização', Building2, 'Membership e migrações RLS do Supabase apoiam fronteiras entre tenants.'],
    ['Supabase Auth', Fingerprint, 'Sessões protegidas e verificações server-side para rotas privadas.'],
    ['Arquitetura Vercel + Supabase', Server, 'Hosting, base de dados, autenticação e storage geridos.'],
    ['RLS por organização', Database, 'Evidência RLS deve passar no projeto Supabase alvo antes de claims de produção.'],
    ['Controlo de permissões', KeyRound, 'Owner, admin, editor, member e viewer mapeiam para permissões explícitas.'],
    ['Postura de monitorização operacional', Network, 'Logs e evidência de release são acompanhados; monitorização 24/7 com equipa dedicada não é afirmada.'],
    ['Documentação de confiança', ShieldAlert, 'SOC 2, ISO 27001 e pentest são divulgados como não concluídos atualmente.'],
  ] },
  features: { ...englishCopy.features, eyebrow: 'Funcionalidades', title: 'O que as equipas operam no EuroComply', cards: [
    ['Calendário de compliance', 'Acompanhe obrigações, prazos e responsáveis num workspace.', CalendarDays],
    ['Operações multilíngues', 'Apoie equipas cross-border com superfícies públicas e de produto localizadas.', Globe2],
    ['Matriz de riscos', 'Identifique, avalie e mitigue riscos antes de revisões ou incidentes.', ShieldAlert],
    ['Convites de equipa', 'Alinhe pessoas com funções e permissões da organização.', Users],
    ['Entidades multi-país', 'Acompanhe contexto operacional em mercados europeus.', Building2],
    ['Trilha de auditoria', 'Registe atividade crítica para revisão e investigação.', FileText],
  ] },
  infrastructure: { ...englishCopy.infrastructure, eyebrow: 'Infraestrutura', title: 'Arquitetura desenhada para apoiar avaliação enterprise.', subtitle: 'Next.js, Supabase Auth, RBAC por organização, migrações RLS, operações admin server-only, eventos de auditoria e checks de evidência estão documentados no Trust Center.', cta: 'Abrir visão de segurança' },
  pricing: { ...englishCopy.pricing, eyebrow: 'Planos', title: 'Escolha o plano certo para a sua empresa', subtitle: 'Comece com workflows operacionais e evolua para materiais de procurement enterprise.', popular: 'Melhor equilíbrio', consultive: 'Avaliação enterprise', note: 'Compromissos enterprise dependem do contrato assinado e da evidência disponível. O EuroComply não afirma SOC 2, certificação ISO 27001, pentest terceiro concluído ou restore de backup testado.', plans: [
    { name: 'Essential', planKey: 'essential', price: '€49', period: '/mês', text: 'Plano de entrada para pequenas equipas que querem sair das folhas de cálculo.', cta: 'Começar Essential', features: ['1 país fiscal', '1 utilizador', 'Calendário legal básico', 'Notícias regulatórias básicas', 'Perfil da empresa', 'Até 10 documentos', 'Matriz de riscos simples', 'Notificações básicas'] },
    { name: 'Professional', planKey: 'professional', price: '€149', period: '/mês', text: 'Para PMEs com obrigações, documentos, riscos e ciclos de revisão reais.', cta: 'Escolher Professional', features: ['Até 2 países fiscais', 'Calendário de compliance', 'Documentos controlados', 'Versionamento', 'Matriz de riscos', 'Eventos de auditoria', 'Relatórios básicos', 'Até 3 utilizadores'] },
    { name: 'Business', planKey: 'business', price: '€399', period: '/mês', text: 'Para empresas em crescimento europeu com equipas, aprovações e reporting.', cta: 'Escolher Business', highlighted: true, features: ['Até 5 países fiscais', 'NIFs por país', 'Workflows de aprovação', 'Relatórios executivos', 'Audit packs', 'Notícias por país', 'Matriz RACI', 'Até 10 utilizadores'] },
    { name: 'Enterprise', price: 'Desde €990', period: '/mês', text: 'Plano consultivo para empresas reguladas e fornecedores B2B com procurement.', cta: 'Falar com vendas', enterprise: true, features: ['Limites expandidos', 'Utilizadores avançados', 'Permissões por função', 'Pacote de documentação Trust', 'Onboarding assistido', 'Termos de suporte por acordo', 'Revisão de DPA e subprocessadores', 'Apoio a questionários de segurança'] },
  ] },
  finalCta: { title: 'Dê aos compradores evidência avaliável, não claims para decifrar.', button: 'Assinar EuroComply', subtitle: 'Revise o Trust Center antes do procurement.' },
};

const spanishCopy: LandingCopy = {
  ...englishCopy,
  nav: { features: 'Funcionalidades', security: 'Seguridad', plans: 'Planes', trust: 'Trust Center', login: 'Iniciar sesión', subscribe: 'Suscribirse ahora' },
  badge: 'Plataforma europea de operaciones de compliance',
  heroTitle: 'Evidencias, riesgos y proveedores sin sorpresas de procurement.',
  heroSubtitle: 'EuroComply ayuda a equipos europeos a centralizar evidencias, riesgos, proveedores, roles y trazas de auditoría manteniendo los claims de seguridad ligados a implementación documentada.',
  cta: { start: 'Suscribirse ahora', demo: 'Ver demo', trust: 'Revisar Trust Center', learnMore: 'Más información' },
  cockpit: { eyebrow: 'Cockpit ejecutivo', title: 'Workspace de compliance', live: 'Vista del workspace', metrics: [['RBAC', 'acceso por rol'], ['RLS', 'diseño de aislamiento'], ['Auditoría', 'eventos trazables'], ['Docs', 'paquete enterprise']], events: ['Política aprobada y registrada como evento de auditoría', 'Riesgo de proveedor listo para revisión', 'Respuesta de cuestionario de seguridad requiere evidencia'] },
  security: { ...englishCopy.security, eyebrow: 'Arquitectura de seguridad', title: 'Postura de seguridad con límites de evidencia claros', subtitle: 'Controles implementados en la plataforma y brechas de roadmap o evidencia comunicadas claramente para procurement enterprise.', items: [
    ['Cifrado gestionado por proveedor', ShieldCheck, 'Diseñado para usar TLS en tránsito y cifrado gestionado en reposo.'],
    ['Workflows de privacidad', Lock, 'Soporta flujos de privacidad y solicitudes de titulares sin afirmar certificación legal.'],
    ['Integridad de eventos de auditoría', FileText, 'Los eventos pueden usar cadenas hash SHA-256 y firmas HMAC opcionales.'],
    ['Aislamiento por organización', Building2, 'Membership y migraciones RLS de Supabase apoyan límites entre tenants.'],
    ['Supabase Auth', Fingerprint, 'Sesiones protegidas y verificaciones server-side para rutas privadas.'],
    ['Arquitectura Vercel + Supabase', Server, 'Hosting, base de datos, autenticación y storage gestionados.'],
    ['RLS por organización', Database, 'La evidencia RLS debe pasar en el proyecto Supabase objetivo antes de claims de producción.'],
    ['Controles de permisos', KeyRound, 'Owner, admin, editor, member y viewer mapean a permisos explícitos.'],
    ['Postura de monitoreo operacional', Network, 'Logs y evidencia de release se mantienen; no se afirma monitoreo 24/7 con equipo dedicado.'],
    ['Documentación de confianza', ShieldAlert, 'SOC 2, ISO 27001 y pentest se divulgan como no completados actualmente.'],
  ] },
  features: { ...englishCopy.features, eyebrow: 'Funcionalidades', title: 'Qué operan los equipos en EuroComply', cards: [
    ['Calendario de compliance', 'Gestiona obligaciones, plazos y responsables en un workspace.', CalendarDays],
    ['Operaciones multilingües', 'Apoya equipos transfronterizos con superficies públicas y de producto localizadas.', Globe2],
    ['Matriz de riesgos', 'Identifica, evalúa y mitiga riesgos antes de revisiones o incidentes.', ShieldAlert],
    ['Invitaciones de equipo', 'Alinea personas con roles y permisos de organización.', Users],
    ['Entidades multi-país', 'Gestiona contexto operativo en mercados europeos.', Building2],
    ['Traza de auditoría', 'Registra actividad crítica para revisión e investigación.', FileText],
  ] },
  infrastructure: { ...englishCopy.infrastructure, eyebrow: 'Infraestructura', title: 'Arquitectura diseñada para apoyar evaluación enterprise.', subtitle: 'Next.js, Supabase Auth, RBAC por organización, migraciones RLS, operaciones admin server-only, eventos de auditoría y checks de evidencia están documentados en el Trust Center.', cta: 'Abrir visión de seguridad' },
  pricing: { ...englishCopy.pricing, eyebrow: 'Planes', title: 'Elige el plan adecuado para tu empresa', subtitle: 'Empieza con workflows operacionales y escala hacia materiales de procurement enterprise.', popular: 'Mejor equilibrio', consultive: 'Evaluación enterprise', note: 'Los compromisos enterprise dependen del contrato firmado y de la evidencia disponible. EuroComply no afirma SOC 2, certificación ISO 27001, pentest tercero completado ni restore de backup probado.', plans: [
    { name: 'Essential', planKey: 'essential', price: '€49', period: '/mes', text: 'Plan de entrada para equipos pequeños que quieren sacar evidencias y plazos de hojas de cálculo.', cta: 'Empezar Essential', features: ['1 país fiscal', '1 usuario', 'Calendario legal básico', 'Noticias regulatorias básicas', 'Perfil de empresa', 'Hasta 10 documentos', 'Matriz de riesgos simple', 'Notificaciones básicas'] },
    { name: 'Professional', planKey: 'professional', price: '€149', period: '/mes', text: 'Para pymes con obligaciones, documentos, riesgos y ciclos de revisión reales.', cta: 'Elegir Professional', features: ['Hasta 2 países fiscales', 'Calendario de compliance', 'Documentos controlados', 'Versionado', 'Matriz de riesgos', 'Eventos de auditoría', 'Informes básicos', 'Hasta 3 usuarios'] },
    { name: 'Business', planKey: 'business', price: '€399', period: '/mes', text: 'Para empresas que crecen en Europa con equipos, aprobaciones y reporting.', cta: 'Elegir Business', highlighted: true, features: ['Hasta 5 países fiscales', 'NIF por país', 'Workflows de aprobación', 'Informes ejecutivos', 'Audit packs', 'Noticias por país', 'Matriz RACI', 'Hasta 10 usuarios'] },
    { name: 'Enterprise', price: 'Desde €990', period: '/mes', text: 'Plan consultivo para empresas reguladas y proveedores B2B que necesitan procurement.', cta: 'Hablar con ventas', enterprise: true, features: ['Límites ampliados', 'Usuarios avanzados', 'Permisos por rol', 'Paquete de documentación Trust', 'Onboarding asistido', 'Términos de soporte por acuerdo', 'Revisión de DPA y subprocesadores', 'Soporte para cuestionarios de seguridad'] },
  ] },
  finalCta: { title: 'Entrega a los compradores evidencia evaluable, no claims difíciles de descifrar.', button: 'Suscribirse a EuroComply', subtitle: 'Revisa el Trust Center antes del procurement.' },
};

const frenchCopy: LandingCopy = {
  ...englishCopy,
  nav: { features: 'Fonctionnalités', security: 'Sécurité', plans: 'Offres', trust: 'Trust Center', login: 'Connexion', subscribe: 'Souscrire' },
  badge: 'Plateforme européenne d’opérations compliance',
  heroTitle: 'Preuves, risques et fournisseurs sans surprises procurement.',
  heroSubtitle: 'EuroComply aide les équipes européennes à centraliser preuves, risques, fournisseurs, rôles et traces d’audit tout en liant les claims sécurité à l’implémentation documentée.',
  cta: { start: 'Souscrire', demo: 'Voir la démo', trust: 'Consulter le Trust Center', learnMore: 'En savoir plus' },
  cockpit: { eyebrow: 'Cockpit exécutif', title: 'Workspace compliance', live: 'Vue workspace', metrics: [['RBAC', 'accès par rôle'], ['RLS', 'design d’isolation'], ['Audit', 'événements traçables'], ['Docs', 'paquet enterprise']], events: ['Politique approuvée et enregistrée comme événement d’audit', 'Risque fournisseur prêt pour revue', 'Réponse au questionnaire sécurité à valider avec preuves'] },
  security: { ...englishCopy.security, eyebrow: 'Architecture sécurité', title: 'Posture sécurité avec limites de preuve explicites', subtitle: 'Contrôles implémentés et écarts de roadmap ou de preuve clairement indiqués pour le procurement enterprise.', items: [
    ['Chiffrement géré par fournisseur', ShieldCheck, 'Conçu pour utiliser TLS en transit et le chiffrement géré au repos.'],
    ['Workflows confidentialité', Lock, 'Prend en charge les workflows privacy et demandes des personnes sans affirmer de certification juridique.'],
    ['Intégrité des événements d’audit', FileText, 'Les événements peuvent utiliser des chaînes hash SHA-256 et des signatures HMAC optionnelles.'],
    ['Isolation par organisation', Building2, 'Les memberships et migrations RLS Supabase soutiennent les frontières entre tenants.'],
    ['Supabase Auth', Fingerprint, 'Sessions protégées et contrôles server-side pour routes privées.'],
    ['Architecture Vercel + Supabase', Server, 'Hébergement, base de données, authentification et stockage gérés.'],
    ['RLS par organisation', Database, 'La preuve RLS doit réussir sur le projet Supabase cible avant tout claim de production.'],
    ['Contrôles de permissions', KeyRound, 'Owner, admin, editor, member et viewer correspondent à des permissions explicites.'],
    ['Posture de monitoring opérationnel', Network, 'Logs et preuves de release sont suivis; aucun monitoring 24/7 staffé n’est affirmé.'],
    ['Documentation de confiance', ShieldAlert, 'SOC 2, ISO 27001 et pentest sont indiqués comme non finalisés actuellement.'],
  ] },
  features: { ...englishCopy.features, eyebrow: 'Fonctionnalités', title: 'Ce que les équipes opèrent dans EuroComply', cards: [
    ['Calendrier compliance', 'Suivez obligations, échéances et responsables dans un workspace.', CalendarDays],
    ['Opérations multilingues', 'Soutenez les équipes transfrontalières avec des surfaces publiques et produit localisées.', Globe2],
    ['Matrice des risques', 'Identifiez, évaluez et atténuez les risques avant revues ou incidents.', ShieldAlert],
    ['Invitations équipe', 'Alignez les personnes avec les rôles et permissions de l’organisation.', Users],
    ['Entités multi-pays', 'Suivez le contexte opérationnel sur les marchés européens.', Building2],
    ['Trace d’audit', 'Enregistrez les activités critiques pour revue et investigation.', FileText],
  ] },
  infrastructure: { ...englishCopy.infrastructure, eyebrow: 'Infrastructure', title: 'Architecture conçue pour soutenir l’évaluation enterprise.', subtitle: 'Next.js, Supabase Auth, RBAC par organisation, migrations RLS, opérations admin server-only, événements d’audit et checks de preuve sont documentés dans le Trust Center.', cta: 'Ouvrir la vue sécurité' },
  pricing: { ...englishCopy.pricing, eyebrow: 'Offres', title: 'Choisissez l’offre adaptée à votre entreprise', subtitle: 'Commencez avec des workflows opérationnels puis évoluez vers les matériaux procurement enterprise.', popular: 'Meilleur équilibre', consultive: 'Évaluation enterprise', note: 'Les engagements enterprise dépendent du contrat signé et des preuves disponibles. EuroComply ne revendique pas SOC 2, certification ISO 27001, pentest tiers finalisé ni restauration de backup testée.', plans: [
    { name: 'Essential', planKey: 'essential', price: '€49', period: '/mois', text: 'Offre d’entrée pour petites équipes qui sortent preuves et échéances des tableurs.', cta: 'Commencer Essential', features: ['1 pays fiscal', '1 utilisateur', 'Calendrier légal basique', 'Actualités réglementaires basiques', 'Profil entreprise', 'Jusqu’à 10 documents', 'Matrice simple', 'Notifications basiques'] },
    { name: 'Professional', planKey: 'professional', price: '€149', period: '/mois', text: 'Pour PME avec obligations, documents, risques et cycles de revue réels.', cta: 'Choisir Professional', features: ['Jusqu’à 2 pays fiscaux', 'Calendrier compliance', 'Documents contrôlés', 'Versioning', 'Matrice des risques', 'Événements d’audit', 'Rapports basiques', 'Jusqu’à 3 utilisateurs'] },
    { name: 'Business', planKey: 'business', price: '€399', period: '/mois', text: 'Pour entreprises en croissance européenne avec équipes, approbations et reporting.', cta: 'Choisir Business', highlighted: true, features: ['Jusqu’à 5 pays fiscaux', 'Identifiants fiscaux par pays', 'Workflows d’approbation', 'Rapports exécutifs', 'Audit packs', 'Actualités par pays', 'Matrice RACI', 'Jusqu’à 10 utilisateurs'] },
    { name: 'Enterprise', price: 'Dès €990', period: '/mois', text: 'Offre consultative pour entreprises réglementées et fournisseurs B2B soumis au procurement.', cta: 'Parler aux ventes', enterprise: true, features: ['Limites étendues', 'Utilisateurs avancés', 'Permissions par rôle', 'Paquet documentaire Trust', 'Onboarding assisté', 'Conditions support par accord', 'Revue DPA et sous-traitants', 'Support questionnaire sécurité'] },
  ] },
  finalCta: { title: 'Donnez aux acheteurs des preuves évaluables, pas des claims à décoder.', button: 'Souscrire à EuroComply', subtitle: 'Consultez le Trust Center avant le procurement.' },
};

const italianCopy: LandingCopy = {
  ...englishCopy,
  nav: { features: 'Funzionalità', security: 'Sicurezza', plans: 'Piani', trust: 'Trust Center', login: 'Accedi', subscribe: 'Abbonati ora' },
  badge: 'Piattaforma europea per operazioni di compliance',
  heroTitle: 'Evidenze, rischi e fornitori senza sorprese di procurement.',
  heroSubtitle: 'EuroComply aiuta i team europei a centralizzare evidenze, rischi, fornitori, ruoli e audit trail mantenendo i claim di sicurezza collegati all’implementazione documentata.',
  cta: { start: 'Abbonati ora', demo: 'Vedi demo', trust: 'Consulta il Trust Center', learnMore: 'Scopri di più' },
  cockpit: { eyebrow: 'Cockpit executive', title: 'Workspace compliance', live: 'Vista workspace', metrics: [['RBAC', 'accesso per ruolo'], ['RLS', 'design isolamento'], ['Audit', 'eventi tracciabili'], ['Docs', 'pacchetto enterprise']], events: ['Policy approvata e registrata come evento audit', 'Rischio fornitore pronto per revisione', 'Risposta al questionario sicurezza da validare con evidenze'] },
  security: { ...englishCopy.security, eyebrow: 'Architettura sicurezza', title: 'Postura di sicurezza con limiti di evidenza chiari', subtitle: 'Controlli implementati nella piattaforma e gap di roadmap o evidenza dichiarati chiaramente per procurement enterprise.', items: [
    ['Cifratura gestita dal provider', ShieldCheck, 'Progettato per usare TLS in transito e cifratura gestita a riposo.'],
    ['Workflow privacy', Lock, 'Supporta flussi privacy e richieste degli interessati senza affermare certificazione legale.'],
    ['Integrità degli eventi audit', FileText, 'Gli eventi possono usare catene hash SHA-256 e firme HMAC opzionali.'],
    ['Isolamento per organizzazione', Building2, 'Membership e migrazioni RLS Supabase supportano confini tra tenant.'],
    ['Supabase Auth', Fingerprint, 'Sessioni protette e controlli server-side per route private.'],
    ['Architettura Vercel + Supabase', Server, 'Hosting, database, autenticazione e storage gestiti.'],
    ['RLS per organizzazione', Database, 'Le evidenze RLS devono passare sul progetto Supabase target prima di claim di produzione.'],
    ['Controlli permessi', KeyRound, 'Owner, admin, editor, member e viewer mappano permessi espliciti.'],
    ['Postura di monitoraggio operativo', Network, 'Log ed evidenze di release sono tracciati; non si afferma monitoraggio 24/7 con team dedicato.'],
    ['Documentazione trust', ShieldAlert, 'SOC 2, ISO 27001 e pentest sono dichiarati come non completati attualmente.'],
  ] },
  features: { ...englishCopy.features, eyebrow: 'Funzionalità', title: 'Cosa gestiscono i team in EuroComply', cards: [
    ['Calendario compliance', 'Monitora obblighi, scadenze e responsabili in un workspace.', CalendarDays],
    ['Operazioni multilingue', 'Supporta team cross-border con superfici pubbliche e prodotto localizzate.', Globe2],
    ['Matrice rischi', 'Identifica, valuta e mitiga rischi prima di revisioni o incidenti.', ShieldAlert],
    ['Inviti team', 'Allinea persone con ruoli e permessi dell’organizzazione.', Users],
    ['Entità multi-paese', 'Monitora il contesto operativo nei mercati europei.', Building2],
    ['Audit trail', 'Registra attività critiche per revisione e indagine.', FileText],
  ] },
  infrastructure: { ...englishCopy.infrastructure, eyebrow: 'Infrastruttura', title: 'Architettura progettata per supportare valutazioni enterprise.', subtitle: 'Next.js, Supabase Auth, RBAC per organizzazione, migrazioni RLS, operazioni admin server-only, eventi audit e controlli evidenza sono documentati nel Trust Center.', cta: 'Apri panoramica sicurezza' },
  pricing: { ...englishCopy.pricing, eyebrow: 'Piani', title: 'Scegli il piano giusto per la tua azienda', subtitle: 'Inizia con workflow operativi e scala verso materiali di procurement enterprise.', popular: 'Miglior equilibrio', consultive: 'Valutazione enterprise', note: 'Gli impegni enterprise dipendono dal contratto firmato e dalle evidenze disponibili. EuroComply non afferma SOC 2, certificazione ISO 27001, pentest di terze parti completato o restore backup testato.', plans: [
    { name: 'Essential', planKey: 'essential', price: '€49', period: '/mese', text: 'Piano di ingresso per piccoli team che spostano evidenze e scadenze fuori dai fogli di calcolo.', cta: 'Inizia Essential', features: ['1 paese fiscale', '1 utente', 'Calendario legale base', 'Notizie normative base', 'Profilo azienda', 'Fino a 10 documenti', 'Matrice rischi semplice', 'Notifiche base'] },
    { name: 'Professional', planKey: 'professional', price: '€149', period: '/mese', text: 'Per PMI con obblighi, documenti, rischi e cicli di revisione reali.', cta: 'Scegli Professional', features: ['Fino a 2 paesi fiscali', 'Calendario compliance', 'Documenti controllati', 'Versioning', 'Matrice rischi', 'Eventi audit', 'Report base', 'Fino a 3 utenti'] },
    { name: 'Business', planKey: 'business', price: '€399', period: '/mese', text: 'Per aziende che crescono in Europa con team, approvazioni e reporting.', cta: 'Scegli Business', highlighted: true, features: ['Fino a 5 paesi fiscali', 'ID fiscali per paese', 'Workflow approvazione', 'Report executive', 'Audit pack', 'Notizie per paese', 'Matrice RACI', 'Fino a 10 utenti'] },
    { name: 'Enterprise', price: 'Da €990', period: '/mese', text: 'Piano consultivo per aziende regolamentate e fornitori B2B con procurement.', cta: 'Parla con vendite', enterprise: true, features: ['Limiti estesi', 'Utenti avanzati', 'Permessi per ruolo', 'Pacchetto documentazione Trust', 'Onboarding assistito', 'Termini supporto per accordo', 'Revisione DPA e subprocessori', 'Supporto questionari sicurezza'] },
  ] },
  finalCta: { title: 'Dai ai buyer evidenze valutabili, non claim da decifrare.', button: 'Abbonati a EuroComply', subtitle: 'Consulta il Trust Center prima del procurement.' },
};

const germanCopy: LandingCopy = {
  ...englishCopy,
  nav: { features: 'Funktionen', security: 'Sicherheit', plans: 'Pläne', trust: 'Trust Center', login: 'Anmelden', subscribe: 'Jetzt abonnieren' },
  badge: 'Europäische Plattform für Compliance-Operationen',
  heroTitle: 'Compliance-Evidenz, Risiken und Lieferanten ohne Procurement-Überraschungen.',
  heroSubtitle: 'EuroComply hilft europäischen Teams, Evidenz, Risiken, Lieferanten, Rollen und Audit Trails zu zentralisieren und Security Claims an dokumentierte Umsetzung zu binden.',
  cta: { start: 'Jetzt abonnieren', demo: 'Demo ansehen', trust: 'Trust Center prüfen', learnMore: 'Mehr erfahren' },
  cockpit: { eyebrow: 'Executive Cockpit', title: 'Compliance Workspace', live: 'Workspace-Ansicht', metrics: [['RBAC', 'rollenbasierter Zugriff'], ['RLS', 'Isolationsdesign'], ['Audit', 'nachvollziehbare Events'], ['Docs', 'Enterprise-Paket']], events: ['Richtlinie genehmigt und als Audit-Event erfasst', 'Lieferantenrisiko bereit zur Prüfung', 'Antwort auf Security-Fragebogen benötigt Evidenzprüfung'] },
  security: { ...englishCopy.security, eyebrow: 'Sicherheitsarchitektur', title: 'Security Posture mit ehrlichen Evidenzgrenzen', subtitle: 'Implementierte Kontrollen sowie klar offengelegte Roadmap- oder Evidenzlücken für Enterprise Procurement.', items: [
    ['Provider-verwaltete Verschlüsselung', ShieldCheck, 'Ausgelegt auf TLS in Transit und provider-verwaltete Verschlüsselung im Ruhezustand.'],
    ['Datenschutz-Workflows', Lock, 'Unterstützt Privacy- und Betroffenenanfragen ohne rechtliche Zertifizierung zu behaupten.'],
    ['Integrität von Audit-Events', FileText, 'Audit-Events können SHA-256 Hash Chains und optionale HMAC-Signaturen nutzen.'],
    ['Isolation pro Organisation', Building2, 'Membership Checks und Supabase RLS Migrationen unterstützen Tenant-Grenzen.'],
    ['Supabase Auth', Fingerprint, 'Geschützte Sessions und serverseitige Nutzerprüfungen für private Routen.'],
    ['Vercel + Supabase Architektur', Server, 'Managed Hosting, Datenbank, Authentifizierung und Storage-Konfiguration.'],
    ['RLS pro Organisation', Database, 'RLS-Evidenz muss im Ziel-Supabase-Projekt bestehen, bevor Production Claims gemacht werden.'],
    ['Berechtigungskontrollen', KeyRound, 'Owner, admin, editor, member und viewer sind expliziten Berechtigungen zugeordnet.'],
    ['Operative Monitoring-Posture', Network, 'Logs und Release-Evidenz werden verfolgt; 24/7 Staffed Monitoring wird nicht behauptet.'],
    ['Trust-Dokumentation', ShieldAlert, 'SOC 2, ISO 27001 und Pentest werden als aktuell nicht abgeschlossen offengelegt.'],
  ] },
  features: { ...englishCopy.features, eyebrow: 'Funktionen', title: 'Was Teams in EuroComply betreiben', cards: [
    ['Compliance-Kalender', 'Verfolgen Sie Pflichten, Fristen und Verantwortliche in einem Workspace.', CalendarDays],
    ['Mehrsprachige Operationen', 'Unterstützen Sie grenzüberschreitende Teams mit lokalisierten Public- und Produktflächen.', Globe2],
    ['Risikomatrix', 'Risiken identifizieren, bewerten und mindern, bevor Reviews oder Incidents entstehen.', ShieldAlert],
    ['Team-Einladungen', 'Richten Sie Personen an Rollen und Berechtigungen der Organisation aus.', Users],
    ['Multi-Land-Entitäten', 'Verfolgen Sie operativen Kontext in europäischen Märkten.', Building2],
    ['Audit Trail', 'Erfassen Sie kritische Aktivitäten für Review und Untersuchung.', FileText],
  ] },
  infrastructure: { ...englishCopy.infrastructure, eyebrow: 'Infrastruktur', title: 'Architektur zur Unterstützung von Enterprise Reviews.', subtitle: 'Next.js, Supabase Auth, organisationsbezogenes RBAC, RLS Migrationen, server-only Admin Operationen, Audit Events und Evidenzprüfungen sind im Trust Center dokumentiert.', cta: 'Security-Übersicht öffnen' },
  pricing: { ...englishCopy.pricing, eyebrow: 'Pläne', title: 'Wählen Sie den richtigen Plan für Ihr Unternehmen', subtitle: 'Starten Sie mit operativen Compliance Workflows und skalieren Sie zu Enterprise Procurement Materialien.', popular: 'Beste Balance', consultive: 'Enterprise Review', note: 'Enterprise Security Commitments hängen vom unterschriebenen Vertrag und verfügbarer Evidenz ab. EuroComply behauptet derzeit weder SOC 2 noch ISO 27001 Zertifizierung, abgeschlossenen Drittanbieter-Pentest oder getestete Backup-Wiederherstellung.', plans: [
    { name: 'Essential', planKey: 'essential', price: '€49', period: '/Monat', text: 'Einstiegsplan für kleine Teams, die Evidenz und Fristen aus Tabellen herauslösen.', cta: 'Essential starten', features: ['1 Steuerland', '1 Nutzer', 'Basiskalender', 'Basis-Regulatory-News', 'Unternehmensprofil', 'Bis 10 Dokumente', 'Einfache Risikomatrix', 'Basisbenachrichtigungen'] },
    { name: 'Professional', planKey: 'professional', price: '€149', period: '/Monat', text: 'Für KMU mit echten Pflichten, Dokumenten, Risiken und Review-Zyklen.', cta: 'Professional wählen', features: ['Bis 2 Steuerländer', 'Compliance-Kalender', 'Kontrollierte Dokumente', 'Versionierung', 'Risikomatrix', 'Audit Events', 'Basisberichte', 'Bis 3 Nutzer'] },
    { name: 'Business', planKey: 'business', price: '€399', period: '/Monat', text: 'Für Unternehmen, die in Europa mit Teams, Freigaben und Reporting wachsen.', cta: 'Business wählen', highlighted: true, features: ['Bis 5 Steuerländer', 'Steuer-IDs je Land', 'Freigabe-Workflows', 'Executive Reports', 'Audit Packs', 'Länderspezifische News', 'RACI-Matrix', 'Bis 10 Nutzer'] },
    { name: 'Enterprise', price: 'Ab €990', period: '/Monat', text: 'Beratender Plan für regulierte Unternehmen und B2B-Anbieter mit Procurement-Anforderungen.', cta: 'Mit Vertrieb sprechen', enterprise: true, features: ['Erweiterte Limits', 'Fortgeschrittene Nutzer', 'Rollenbasierte Berechtigungen', 'Trust-Dokumentationspaket', 'Begleitetes Onboarding', 'Support-Bedingungen nach Vereinbarung', 'DPA- und Subprocessor-Review', 'Support für Security-Fragebögen'] },
  ] },
  finalCta: { title: 'Geben Sie Käufern bewertbare Evidenz statt Claims zum Entschlüsseln.', button: 'EuroComply abonnieren', subtitle: 'Prüfen Sie das Trust Center vor dem Procurement.' },
};

const landingCopy: Record<Locale, LandingCopy> = {
  en: englishCopy,
  pt: portugueseCopy,
  es: spanishCopy,
  fr: frenchCopy,
  it: italianCopy,
  de: germanCopy,
};

function href(locale: Locale, path: string) {
  return `/${locale}${path}`;
}

function planHref(locale: Locale, plan: PlanCopy) {
  if (plan.enterprise) return href(locale, '/contact');
  return href(locale, `/billing/checkout/${plan.planKey}`);
}

export function EnterpriseHome({ locale }: { locale: string }) {
  const activeLocale = (locales.includes(locale as Locale) ? locale : 'en') as Locale;
  const copy = landingCopy[activeLocale];
  const meta = LOCALE_META[activeLocale];
  const localeName = meta.nativeName ?? meta.name;

  return (
    <main className="min-h-screen scroll-smooth bg-[#0A0A0F] text-[#E0E0E0]">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#0A0A0F]/70 backdrop-blur-2xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href={`/${activeLocale}`} className="flex items-center gap-3 text-sm font-semibold tracking-tight text-white">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-white">EC</span>
            <span className="text-lg">EuroComply</span>
          </Link>
          <div className="hidden items-center gap-8 text-sm text-zinc-300 lg:flex">
            <a href="#features" className="transition hover:text-white">{copy.nav.features}</a>
            <a href="#security" className="transition hover:text-white">{copy.nav.security}</a>
            <a href="#plans" className="transition hover:text-white">{copy.nav.plans}</a>
            <Link href={href(activeLocale, '/trust')} className="transition hover:text-white">{copy.nav.trust}</Link>
            <span className="text-zinc-500">{localeName}</span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher currentLocale={activeLocale} variant="dark" compact />
            <Link href={href(activeLocale, '/login')} className="hidden rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 sm:inline-flex">{copy.nav.login}</Link>
            <Link href={href(activeLocale, '/billing/checkout/essential')} className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-black shadow-[0_0_40px_rgba(255,255,255,.18)] transition hover:-translate-y-0.5 hover:bg-zinc-200">{copy.nav.subscribe}</Link>
          </div>
        </nav>
      </header>

      <section className="relative isolate min-h-screen overflow-hidden pt-24">
        <div className="absolute inset-0 -z-30 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,.14),transparent_32%),radial-gradient(circle_at_70%_20%,rgba(255,255,255,.08),transparent_28%),linear-gradient(to_bottom,#0A0A0F_0%,#050508_100%)]" />
        <div className="mx-auto grid max-w-7xl gap-16 px-6 pb-28 pt-24 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white shadow-2xl backdrop-blur-xl">
              <ShieldCheck className="h-4 w-4" /> {copy.badge}
            </div>
            <h1 className="mt-8 max-w-4xl text-5xl font-semibold leading-[1.02] tracking-[-0.06em] text-white sm:text-6xl lg:text-7xl">
              {copy.heroTitle}
            </h1>
            <p className="mt-7 max-w-3xl text-lg leading-8 text-zinc-300 sm:text-xl">
              {copy.heroSubtitle}
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href={href(activeLocale, '/billing/checkout/essential')} className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-4 text-base font-bold text-black shadow-[0_0_50px_rgba(255,255,255,.18)] transition hover:-translate-y-1 hover:bg-zinc-200">{copy.cta.start} <ChevronRight className="h-4 w-4" /></Link>
              <Link href={href(activeLocale, '/trust')} className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-7 py-4 text-base font-bold text-white backdrop-blur transition hover:-translate-y-1 hover:bg-white/10">{copy.cta.trust}</Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-[#13131A]/70 p-5 shadow-2xl backdrop-blur-2xl">
            <div className="rounded-[1.5rem] border border-white/10 bg-black/35 p-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.26em] text-zinc-500">{copy.cockpit.eyebrow}</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">{copy.cockpit.title}</h2>
                </div>
                <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white">{copy.cockpit.live}</span>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {copy.cockpit.metrics.map(([value, label]) => (
                  <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                    <p className="text-3xl font-semibold text-white">{value}</p>
                    <p className="mt-2 text-sm text-zinc-500">{label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 space-y-3">
                {copy.cockpit.events.map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-300">
                    <Check className="h-4 w-4 text-white" /> {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="security" className="overflow-hidden border-y border-white/10 bg-[#0D0D14] py-16">
        <div className="mx-auto max-w-7xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-[0.24em] text-zinc-500">{copy.security.eyebrow}</p>
          <h2 className="mt-4 text-center text-3xl font-semibold tracking-tight text-white sm:text-4xl">{copy.security.title}</h2>
          <p className="mx-auto mt-4 max-w-3xl text-center text-sm leading-6 text-zinc-500">{copy.security.subtitle}</p>
        </div>
        <div className="group mt-10 flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
          <div className="flex min-w-full shrink-0 animate-[security-marquee-right_28s_linear_infinite] gap-4 pr-4 group-hover:[animation-play-state:paused]">
            {[...copy.security.items, ...copy.security.items].map(([label, Icon, description], index) => (
              <div key={`${label}-${index}`} className="flex min-w-[290px] items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 shadow-xl backdrop-blur transition hover:-translate-y-1 hover:border-white/25 hover:bg-white/[0.08]">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/40 text-white"><Icon className="h-5 w-5" /></span>
                <div>
                  <p className="text-sm font-semibold text-white">{label}</p>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-6 py-28">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-500">{copy.features.eyebrow}</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">{copy.features.title}</h2>
        </div>
        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {copy.features.cards.map(([title, description, Icon]) => (
            <article key={title} className="rounded-3xl border border-[#2A2A35] bg-[#13131A] p-7 transition hover:-translate-y-1 hover:border-white/25 hover:bg-[#171720]">
              <Icon className="h-7 w-7 text-white" />
              <h3 className="mt-6 text-xl font-semibold text-white">{title}</h3>
              <p className="mt-4 min-h-24 leading-7 text-zinc-400">{description}</p>
              <a href="#plans" className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-white">{copy.cta.learnMore} <ChevronRight className="h-4 w-4" /></a>
            </article>
          ))}
        </div>
      </section>

      <section id="demo" className="relative overflow-hidden border-y border-white/10 bg-black px-6 py-28">
        <div className="absolute inset-0 opacity-30 [background:radial-gradient(circle_at_70%_20%,rgba(255,255,255,.16),transparent_34%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-12 lg:grid-cols-2 lg:items-center">
          <div className="rounded-3xl border border-white/10 bg-[#09090E] p-6 font-mono text-sm text-zinc-300 shadow-2xl">
            <div className="mb-5 flex gap-2"><span className="h-3 w-3 rounded-full bg-zinc-700" /><span className="h-3 w-3 rounded-full bg-zinc-700" /><span className="h-3 w-3 rounded-full bg-white" /></div>
            <pre className="whitespace-pre-wrap leading-7 text-zinc-400"><code>{`type TrustClaim = {
  statement: string;
  status: 'implemented' | 'evidence_pending' | 'designed_to_support' | 'planned';
  evidencePath?: string;
};

await EuroComply.procurement.review({
  claims: 'evidence-bound',
  controls: ['RBAC', 'RLS', 'audit-events'],
  disclosure: 'no-compliance-washing',
});`}</code></pre>
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-500">{copy.infrastructure.eyebrow}</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">{copy.infrastructure.title}</h2>
            <p className="mt-6 text-lg leading-8 text-zinc-400">{copy.infrastructure.subtitle}</p>
            <Link href={href(activeLocale, '/security')} className="mt-8 inline-flex rounded-full border border-white/15 px-7 py-4 font-bold text-white transition hover:-translate-y-1 hover:bg-white/10">{copy.infrastructure.cta}</Link>
          </div>
        </div>
      </section>

      <section id="plans" className="mx-auto max-w-7xl px-6 py-28">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-500">{copy.pricing.eyebrow}</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">{copy.pricing.title}</h2>
          <p className="mx-auto mt-5 max-w-3xl text-lg text-zinc-400">{copy.pricing.subtitle}</p>
        </div>
        <div className="mt-14 grid gap-5 lg:grid-cols-4">
          {copy.pricing.plans.map((plan) => (
            <article key={plan.name} className={`group relative rounded-3xl border p-7 transition duration-300 hover:-translate-y-2 hover:bg-white hover:text-black hover:shadow-[0_30px_90px_rgba(255,255,255,.14)] ${plan.highlighted ? 'border-white bg-white text-black shadow-[0_0_90px_rgba(255,255,255,.12)]' : 'border-[#2A2A35] bg-[#13131A] text-white'}`}>
              {plan.highlighted ? <span className="rounded-full border border-black/10 bg-black px-3 py-1 text-xs font-bold text-white">{copy.pricing.popular}</span> : null}
              {plan.enterprise ? <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold text-white transition group-hover:border-black/10 group-hover:bg-black group-hover:text-white">{copy.pricing.consultive}</span> : null}
              <h3 className={`mt-5 text-2xl font-semibold ${plan.highlighted ? 'text-black' : 'text-white group-hover:text-black'}`}>{plan.name}</h3>
              <p className={`mt-4 min-h-28 text-sm leading-6 ${plan.highlighted ? 'text-zinc-700' : 'text-zinc-400 group-hover:text-zinc-700'}`}>{plan.text}</p>
              <div className="mt-7 flex items-end gap-1">
                <span className={`text-4xl font-semibold tracking-tight transition duration-300 group-hover:scale-105 ${plan.highlighted ? 'text-black' : 'text-white group-hover:text-black'}`}>{plan.price}</span>
                <span className={`pb-1.5 ${plan.highlighted ? 'text-zinc-600' : 'text-zinc-500 group-hover:text-zinc-600'}`}>{plan.period}</span>
              </div>
              <Link href={planHref(activeLocale, plan)} className={`mt-7 inline-flex w-full justify-center rounded-2xl px-5 py-4 font-bold transition hover:-translate-y-0.5 ${plan.highlighted ? 'bg-black text-white hover:bg-zinc-800' : 'border border-white/15 bg-white/5 text-white hover:border-black hover:bg-black hover:text-white group-hover:border-black/10 group-hover:bg-black group-hover:text-white'}`}>{plan.cta}</Link>
              <ul className="mt-7 space-y-3">
                {plan.features.map((feature) => <li key={feature} className={`flex gap-3 text-sm ${plan.highlighted ? 'text-zinc-800' : 'text-zinc-300 group-hover:text-zinc-800'}`}><Check className={`mt-0.5 h-4 w-4 shrink-0 ${plan.highlighted ? 'text-black' : 'text-white group-hover:text-black'}`} />{feature}</li>)}
              </ul>
            </article>
          ))}
        </div>
        <p className="mx-auto mt-10 max-w-3xl text-center text-zinc-400">{copy.pricing.note}</p>
      </section>

      <section className="mx-6 mb-16 rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,#111118,#050508)] px-6 py-24 text-center shadow-2xl">
        <h2 className="mx-auto max-w-4xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">{copy.finalCta.title}</h2>
        <Link href={href(activeLocale, '/billing/checkout/essential')} className="mt-8 inline-flex rounded-full bg-white px-8 py-4 text-lg font-bold text-black transition hover:-translate-y-1 hover:bg-zinc-200">{copy.finalCta.button}</Link>
        <p className="mt-4 text-sm text-zinc-500">{copy.finalCta.subtitle}</p>
      </section>

      <style>{`@keyframes security-marquee-right{from{transform:translateX(-50%)}to{transform:translateX(0)}}`}</style>
      <PublicFooter locale={activeLocale} />
    </main>
  );
}
