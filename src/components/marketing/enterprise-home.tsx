import Link from 'next/link';
import {
  Award,
  Bell,
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
  ShieldCheck,
  ShieldAlert,
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
  nav: { features: string; security: string; plans: string; login: string; subscribe: string };
  badge: string;
  heroTitle: string;
  heroSubtitle: string;
  cta: { start: string; demo: string; learnMore: string };
  cockpit: { eyebrow: string; title: string; live: string; metrics: [string, string][]; events: string[] };
  security: { eyebrow: string; title: string; subtitle: string; items: SecurityItem[] };
  features: { eyebrow: string; title: string; cards: FeatureCard[] };
  infrastructure: { eyebrow: string; title: string; subtitle: string; cta: string };
  pricing: { eyebrow: string; title: string; subtitle: string; popular: string; consultive: string; note: string; plans: PlanCopy[] };
  finalCta: { title: string; button: string; subtitle: string };
};

const landingCopy: Record<Locale, LandingCopy> = {
  en: {
    nav: { features: 'Features', security: 'Security', plans: 'Plans', login: 'Log in', subscribe: 'Subscribe now' },
    badge: 'European compliance intelligence platform',
    heroTitle: 'Compliance that accelerates your business. Not slows it down.',
    heroSubtitle: 'Companies using EuroComply reduce fiscal risk by 73% and save 40h/month in bureaucracy.',
    cta: { start: 'Subscribe now', demo: 'View demo', learnMore: 'Learn more' },
    cockpit: {
      eyebrow: 'Executive cockpit',
      title: 'Compliance status',
      live: 'Live',
      metrics: [['73%', 'fiscal risk reduced'], ['40h', 'saved per month'], ['12k', 'euros in avoided fines'], ['8', 'upcoming obligations']],
      events: ['New fiscal deadline identified for France', 'Policy approved and recorded in the audit log', 'Executive report ready for review'],
    },
    security: {
      eyebrow: 'Security architecture',
      title: 'Security your company requires',
      subtitle: 'Controls already applied in the platform and additional layers planned for Business and Enterprise customers.',
      items: [
        ['End-to-end encryption', ShieldCheck, 'Sensitive data protected in transit and at rest.'],
        ['GDPR compliant', Lock, 'Flows aligned with privacy and data subject rights.'],
        ['Immutable audit log', FileText, 'Every critical action is recorded for inspections.'],
        ['Multi-company isolation', Building2, 'Strict data separation between organizations.'],
        ['Secure authentication', Fingerprint, 'Protected sessions with Supabase Auth and RLS policies.'],
        ['Vercel + Supabase infrastructure', Server, 'Global deployment, managed database and server-side security.'],
        ['Organization-level RLS policies', Database, 'Access based on membership and business context.'],
        ['Permission controls', KeyRound, 'Profiles and roles for sensitive operations.'],
        ['Event monitoring', Bell, 'Alerts for activity, approvals and critical deadlines.'],
        ['Backups and continuity planning', Network, 'Resilience roadmap for enterprise operations.'],
        ['ISO 27001 in preparation', Award, 'Security maturity and governance program.'],
        ['Annual penetration testing', ShieldAlert, 'Planned control for enterprise security.'],
      ],
    },
    features: {
      eyebrow: 'Features',
      title: 'What you gain by subscribing to EuroComply',
      cards: [
        ['AI calendar', 'Never miss a fiscal deadline again. Automatic alerts for new obligations.', CalendarDays],
        ['Multilingual news', 'Compliance news in PT, FR, ES, EN, IT and DE, updated by AI.', Globe2],
        ['Risk matrix', 'Identify, assess and mitigate risks before they become fines.', ShieldAlert],
        ['Employee invitations', 'Keep the whole team aligned with permissions and secure access.', Users],
        ['Multiple tax IDs by country', 'Expand into France, Germany, Italy, Spain and Portugal with less fiscal friction.', Building2],
        ['Audit log', 'Every action recorded and ready for inspections.', FileText],
      ],
    },
    infrastructure: {
      eyebrow: 'Infrastructure',
      title: 'Our team works to protect your data and reduce operational risk.',
      subtitle: 'Continuous updates, server-side architecture, secure authentication and organization isolation for companies treating compliance as critical infrastructure.',
      cta: 'Explore our infrastructure',
    },
    pricing: {
      eyebrow: 'Plans',
      title: 'Choose the right plan for your company',
      subtitle: 'How much are you losing without a structured compliance operation?',
      popular: 'Best balance',
      consultive: 'Premium consultive',
      note: 'Essential reduces the entry barrier. Professional captures SMEs with real obligations. Business sells operations, team and European expansion. Enterprise preserves premium value for regulated and multi-country companies.',
      plans: [
        { name: 'Essential', planKey: 'essential', price: '€49', period: '/month', text: 'Entry plan for micro-businesses, consultants and small teams that want to leave spreadsheets behind.', cta: 'Start Essential', features: ['1 fiscal country', '1 user', 'Basic legal calendar', 'Basic regulatory news', 'Company profile', 'Up to 10 documents', 'Simple risk matrix', 'Basic notifications'] },
        { name: 'Professional', planKey: 'professional', price: '€149', period: '/month', text: 'For SMEs with real obligations, documents, risks and deadlines that need consistent control.', cta: 'Choose Professional', features: ['Up to 2 fiscal countries', 'AI calendar', 'Controlled documents', 'Versioning', 'Complete risk matrix', 'Audit log', 'Basic reports', 'Up to 3 users'] },
        { name: 'Business', planKey: 'business', price: '€399', period: '/month', text: 'For companies growing across Europe with multi-country operations, internal teams and executive reporting.', cta: 'Choose Business', highlighted: true, features: ['Up to 5 fiscal countries', 'Tax IDs by country', 'Approval workflows', 'Executive reports', 'Audit packs', 'AI news by country', 'RACI matrix', 'Up to 10 users'] },
        { name: 'Enterprise', price: 'From €990', period: '/month', text: 'Consultive plan for regulated companies, groups, fintechs, healthtechs and enterprise B2B suppliers.', cta: 'Talk to sales', enterprise: true, features: ['Unlimited countries', 'Advanced users', 'Role-based permissions', 'White-label reports', 'Assisted onboarding', 'SLA and priority support', 'DORA, NIS2, ISO 27001 and AI Act modules', 'Full audit trail'] },
      ],
    },
    finalCta: { title: 'Compliance does not need to be a nightmare. Leave it with people who understand it.', button: 'Subscribe to EuroComply now', subtitle: '14-day free trial. No commitment.' },
  },
  pt: {
    nav: { features: 'Funcionalidades', security: 'Segurança', plans: 'Planos', login: 'Entrar', subscribe: 'Assinar agora' },
    badge: 'Plataforma europeia de inteligência de compliance',
    heroTitle: 'Compliance que acelera o seu negócio. Não atrasa.',
    heroSubtitle: 'Empresas que usam EuroComply reduzem riscos fiscais em 73% e poupam 40h/mês em burocracia.',
    cta: { start: 'Assinar agora', demo: 'Ver demonstração', learnMore: 'Saiba mais' },
    cockpit: {
      eyebrow: 'Cockpit executivo',
      title: 'Estado de compliance',
      live: 'Ao vivo',
      metrics: [['73%', 'risco fiscal reduzido'], ['40h', 'poupadas por mês'], ['12k', 'euros em multas evitadas'], ['8', 'obrigações próximas']],
      events: ['Novo prazo fiscal identificado para França', 'Política aprovada e registada no log de auditoria', 'Relatório executivo pronto para revisão'],
    },
    security: {
      eyebrow: 'Arquitetura de segurança',
      title: 'Segurança que a sua empresa exige',
      subtitle: 'Controlos já aplicados na plataforma e camadas adicionais planeadas para clientes Business e Enterprise.',
      items: [
        ['Criptografia ponta a ponta', ShieldCheck, 'Dados sensíveis protegidos em trânsito e repouso.'],
        ['GDPR compliant', Lock, 'Fluxos alinhados com privacidade e direitos do titular.'],
        ['Log de auditoria imutável', FileText, 'Toda ação crítica fica registada para fiscalização.'],
        ['Isolamento multiempresa', Building2, 'Separação rígida de dados entre organizações.'],
        ['Autenticação segura', Fingerprint, 'Sessões protegidas com Supabase Auth e políticas RLS.'],
        ['Infraestrutura Vercel + Supabase', Server, 'Deploy global, base de dados gerida e segurança server-side.'],
        ['Políticas RLS por organização', Database, 'Acesso baseado em membership e contexto empresarial.'],
        ['Controlo de permissões', KeyRound, 'Perfis e roles para operações sensíveis.'],
        ['Monitorização de eventos', Bell, 'Alertas para atividades, aprovações e prazos críticos.'],
        ['Backups e continuidade planeados', Network, 'Roadmap de resiliência para operações enterprise.'],
        ['ISO 27001 em preparação', Award, 'Programa de maturidade e governação de segurança.'],
        ['Testes de penetração anuais', ShieldAlert, 'Controlo previsto no plano de segurança enterprise.'],
      ],
    },
    features: {
      eyebrow: 'Funcionalidades',
      title: 'O que ganha ao assinar o EuroComply',
      cards: [
        ['Calendário com IA', 'Nunca mais perca um prazo fiscal. Alertas automáticos de novas obrigações.', CalendarDays],
        ['Notícias multilíngues', 'Notícias de compliance em PT, FR, ES, EN, IT e DE, sempre atualizadas por IA.', Globe2],
        ['Matriz de riscos', 'Identifique, avalie e mitigue riscos antes de virarem multas.', ShieldAlert],
        ['Convite de funcionários', 'Equipa alinhada com permissões e acesso seguro.', Users],
        ['Múltiplos NIFs por país', 'Expanda para França, Alemanha, Itália e Espanha com menos atrito fiscal.', Building2],
        ['Log de auditoria', 'Toda ação registada e pronta para fiscalização.', FileText],
      ],
    },
    infrastructure: {
      eyebrow: 'Infraestrutura',
      title: 'A nossa equipa trabalha para proteger os seus dados e reduzir risco operacional.',
      subtitle: 'Atualizações contínuas, arquitetura server-side, autenticação segura e isolamento por organização para empresas que tratam compliance como infraestrutura crítica.',
      cta: 'Conheça a nossa infraestrutura',
    },
    pricing: {
      eyebrow: 'Planos',
      title: 'Escolha o plano certo para a sua empresa',
      subtitle: 'Quanto está a perder por não ter uma operação de compliance estruturada?',
      popular: 'Melhor equilíbrio',
      consultive: 'Consultivo premium',
      note: 'Essential reduz a barreira de entrada. Professional captura PMEs com obrigações reais. Business vende operação, equipa e expansão europeia. Enterprise preserva valor premium para empresas reguladas e multi-país.',
      plans: [
        { name: 'Essential', planKey: 'essential', price: '€49', period: '/mês', text: 'Plano de acesso para microempresas, consultores e equipas pequenas que querem sair do Excel sem medo.', cta: 'Começar Essential', features: ['1 país fiscal', '1 utilizador', 'Calendário legal básico', 'Notícias regulatórias básicas', 'Perfil da empresa', 'Até 10 documentos', 'Matriz de riscos simples', 'Notificações básicas'] },
        { name: 'Professional', planKey: 'professional', price: '€149', period: '/mês', text: 'Para PMEs com obrigações reais, documentos, riscos e prazos que precisam de controlo consistente.', cta: 'Assinar Professional', features: ['Até 2 países fiscais', 'Calendário com IA', 'Documentos controlados', 'Versionamento', 'Matriz de riscos completa', 'Log de auditoria', 'Relatórios básicos', 'Até 3 utilizadores'] },
        { name: 'Business', planKey: 'business', price: '€399', period: '/mês', text: 'Para empresas em crescimento europeu com operação multi-país, equipa interna e reporting executivo.', cta: 'Assinar Business', highlighted: true, features: ['Até 5 países fiscais', 'NIFs por país', 'Workflows de aprovação', 'Relatórios executivos', 'Audit packs', 'Notícias IA por país', 'Matriz RACI', 'Até 10 utilizadores'] },
        { name: 'Enterprise', price: 'Desde €990', period: '/mês', text: 'Plano consultivo para empresas reguladas, grupos, fintechs, healthtechs e fornecedores B2B enterprise.', cta: 'Falar com vendas', enterprise: true, features: ['Países ilimitados', 'Utilizadores avançados', 'Permissões por função', 'Relatórios white-label', 'Onboarding assistido', 'SLA e suporte prioritário', 'Módulos DORA, NIS2, ISO 27001 e AI Act', 'Trilha de auditoria completa'] },
      ],
    },
    finalCta: { title: 'O compliance não precisa ser um pesadelo. Deixe com quem entende.', button: 'Assinar EuroComply agora', subtitle: 'Teste grátis por 14 dias. Sem compromisso.' },
  },
  es: {
    nav: { features: 'Funcionalidades', security: 'Seguridad', plans: 'Planes', login: 'Entrar', subscribe: 'Suscribirse ahora' },
    badge: 'Plataforma europea de inteligencia de compliance',
    heroTitle: 'Compliance que acelera tu negocio. No lo frena.',
    heroSubtitle: 'Las empresas que usan EuroComply reducen el riesgo fiscal en un 73% y ahorran 40h/mes en burocracia.',
    cta: { start: 'Suscribirse ahora', demo: 'Ver demostración', learnMore: 'Saber más' },
    cockpit: {
      eyebrow: 'Cockpit ejecutivo',
      title: 'Estado de compliance',
      live: 'En vivo',
      metrics: [['73%', 'riesgo fiscal reducido'], ['40h', 'ahorradas al mes'], ['12k', 'euros en multas evitadas'], ['8', 'obligaciones próximas']],
      events: ['Nuevo plazo fiscal identificado para Francia', 'Política aprobada y registrada en el log de auditoría', 'Informe ejecutivo listo para revisión'],
    },
    security: {
      eyebrow: 'Arquitectura de seguridad',
      title: 'La seguridad que tu empresa exige',
      subtitle: 'Controles ya aplicados en la plataforma y capas adicionales planificadas para clientes Business y Enterprise.',
      items: [
        ['Cifrado de extremo a extremo', ShieldCheck, 'Datos sensibles protegidos en tránsito y en reposo.'],
        ['GDPR compliant', Lock, 'Flujos alineados con privacidad y derechos del titular.'],
        ['Log de auditoría inmutable', FileText, 'Toda acción crítica queda registrada para inspecciones.'],
        ['Aislamiento multiempresa', Building2, 'Separación estricta de datos entre organizaciones.'],
        ['Autenticación segura', Fingerprint, 'Sesiones protegidas con Supabase Auth y políticas RLS.'],
        ['Infraestructura Vercel + Supabase', Server, 'Despliegue global, base de datos gestionada y seguridad server-side.'],
        ['Políticas RLS por organización', Database, 'Acceso basado en membresía y contexto empresarial.'],
        ['Control de permisos', KeyRound, 'Perfiles y roles para operaciones sensibles.'],
        ['Monitorización de eventos', Bell, 'Alertas para actividades, aprobaciones y plazos críticos.'],
        ['Backups y continuidad planificados', Network, 'Roadmap de resiliencia para operaciones enterprise.'],
        ['ISO 27001 en preparación', Award, 'Programa de madurez y gobernanza de seguridad.'],
        ['Pruebas de penetración anuales', ShieldAlert, 'Control previsto para seguridad enterprise.'],
      ],
    },
    features: {
      eyebrow: 'Funcionalidades',
      title: 'Lo que ganas al suscribirte a EuroComply',
      cards: [
        ['Calendario con IA', 'No vuelvas a perder un plazo fiscal. Alertas automáticas de nuevas obligaciones.', CalendarDays],
        ['Noticias multilingües', 'Noticias de compliance en PT, FR, ES, EN, IT y DE, actualizadas por IA.', Globe2],
        ['Matriz de riesgos', 'Identifica, evalúa y mitiga riesgos antes de que se conviertan en multas.', ShieldAlert],
        ['Invitación de empleados', 'Equipo alineado con permisos y acceso seguro.', Users],
        ['Múltiples NIF por país', 'Expándete a Francia, Alemania, Italia y España con menos fricción fiscal.', Building2],
        ['Log de auditoría', 'Toda acción registrada y lista para inspecciones.', FileText],
      ],
    },
    infrastructure: {
      eyebrow: 'Infraestructura',
      title: 'Nuestro equipo trabaja para proteger tus datos y reducir el riesgo operativo.',
      subtitle: 'Actualizaciones continuas, arquitectura server-side, autenticación segura y aislamiento por organización para empresas que tratan compliance como infraestructura crítica.',
      cta: 'Explorar nuestra infraestructura',
    },
    pricing: {
      eyebrow: 'Planes',
      title: 'Elige el plan adecuado para tu empresa',
      subtitle: '¿Cuánto estás perdiendo por no tener una operación de compliance estructurada?',
      popular: 'Mejor equilibrio',
      consultive: 'Consultivo premium',
      note: 'Essential reduce la barrera de entrada. Professional captura pymes con obligaciones reales. Business vende operación, equipo y expansión europea. Enterprise conserva valor premium para empresas reguladas y multi-país.',
      plans: [
        { name: 'Essential', planKey: 'essential', price: '€49', period: '/mes', text: 'Plan de entrada para microempresas, consultores y equipos pequeños que quieren dejar Excel atrás.', cta: 'Empezar Essential', features: ['1 país fiscal', '1 usuario', 'Calendario legal básico', 'Noticias regulatorias básicas', 'Perfil de empresa', 'Hasta 10 documentos', 'Matriz de riesgos simple', 'Notificaciones básicas'] },
        { name: 'Professional', planKey: 'professional', price: '€149', period: '/mes', text: 'Para pymes con obligaciones reales, documentos, riesgos y plazos que necesitan control consistente.', cta: 'Elegir Professional', features: ['Hasta 2 países fiscales', 'Calendario con IA', 'Documentos controlados', 'Versionado', 'Matriz de riesgos completa', 'Log de auditoría', 'Informes básicos', 'Hasta 3 usuarios'] },
        { name: 'Business', planKey: 'business', price: '€399', period: '/mes', text: 'Para empresas en crecimiento europeo con operación multi-país, equipo interno y reporting ejecutivo.', cta: 'Elegir Business', highlighted: true, features: ['Hasta 5 países fiscales', 'NIF por país', 'Workflows de aprobación', 'Informes ejecutivos', 'Audit packs', 'Noticias IA por país', 'Matriz RACI', 'Hasta 10 usuarios'] },
        { name: 'Enterprise', price: 'Desde €990', period: '/mes', text: 'Plan consultivo para empresas reguladas, grupos, fintechs, healthtechs y proveedores B2B enterprise.', cta: 'Hablar con ventas', enterprise: true, features: ['Países ilimitados', 'Usuarios avanzados', 'Permisos por rol', 'Informes white-label', 'Onboarding asistido', 'SLA y soporte prioritario', 'Módulos DORA, NIS2, ISO 27001 y AI Act', 'Trazabilidad completa'] },
      ],
    },
    finalCta: { title: 'El compliance no tiene que ser una pesadilla. Déjalo con quienes lo entienden.', button: 'Suscribirse a EuroComply ahora', subtitle: 'Prueba gratuita de 14 días. Sin compromiso.' },
  },
  fr: {
    nav: { features: 'Fonctionnalités', security: 'Sécurité', plans: 'Offres', login: 'Connexion', subscribe: 'Souscrire' },
    badge: 'Plateforme européenne d’intelligence compliance',
    heroTitle: 'Une conformité qui accélère votre activité. Sans la ralentir.',
    heroSubtitle: 'Les entreprises utilisant EuroComply réduisent le risque fiscal de 73% et économisent 40h/mois de bureaucratie.',
    cta: { start: 'Souscrire', demo: 'Voir la démonstration', learnMore: 'En savoir plus' },
    cockpit: { eyebrow: 'Cockpit exécutif', title: 'Statut compliance', live: 'Live', metrics: [['73%', 'risque fiscal réduit'], ['40h', 'économisées par mois'], ['12k', 'euros d’amendes évitées'], ['8', 'obligations à venir']], events: ['Nouvelle échéance fiscale identifiée pour la France', 'Politique approuvée et enregistrée dans le journal d’audit', 'Rapport exécutif prêt pour revue'] },
    security: { eyebrow: 'Architecture sécurité', title: 'La sécurité que votre entreprise exige', subtitle: 'Contrôles déjà appliqués et couches supplémentaires prévues pour Business et Enterprise.', items: [['Chiffrement de bout en bout', ShieldCheck, 'Données sensibles protégées en transit et au repos.'], ['GDPR compliant', Lock, 'Flux alignés avec la confidentialité et les droits des personnes.'], ['Journal d’audit immuable', FileText, 'Chaque action critique est enregistrée.'], ['Isolation multi-entreprise', Building2, 'Séparation stricte des données entre organisations.'], ['Authentification sécurisée', Fingerprint, 'Sessions protégées avec Supabase Auth et politiques RLS.'], ['Infrastructure Vercel + Supabase', Server, 'Déploiement global, base gérée et sécurité server-side.'], ['Politiques RLS par organisation', Database, 'Accès basé sur l’appartenance et le contexte.'], ['Contrôle des permissions', KeyRound, 'Profils et rôles pour opérations sensibles.'], ['Monitoring des événements', Bell, 'Alertes pour activités, approbations et échéances critiques.'], ['Backups et continuité planifiés', Network, 'Roadmap de résilience enterprise.'], ['ISO 27001 en préparation', Award, 'Programme de maturité sécurité.'], ['Tests d’intrusion annuels', ShieldAlert, 'Contrôle prévu pour la sécurité enterprise.']] },
    features: { eyebrow: 'Fonctionnalités', title: 'Ce que vous gagnez avec EuroComply', cards: [['Calendrier IA', 'Ne manquez plus aucune échéance fiscale.', CalendarDays], ['Actualités multilingues', 'Actualités compliance en PT, FR, ES, EN, IT et DE, mises à jour par IA.', Globe2], ['Matrice des risques', 'Identifiez et atténuez les risques avant les amendes.', ShieldAlert], ['Invitations employés', 'Équipe alignée avec permissions et accès sécurisé.', Users], ['Identifiants fiscaux multi-pays', 'Développez-vous en Europe avec moins de friction fiscale.', Building2], ['Journal d’audit', 'Chaque action enregistrée et prête pour inspection.', FileText]] },
    infrastructure: { eyebrow: 'Infrastructure', title: 'Notre équipe protège vos données et réduit le risque opérationnel.', subtitle: 'Mises à jour continues, architecture server-side, authentification sécurisée et isolation par organisation.', cta: 'Découvrir notre infrastructure' },
    pricing: { eyebrow: 'Offres', title: 'Choisissez l’offre adaptée à votre entreprise', subtitle: 'Combien perdez-vous sans opération compliance structurée ?', popular: 'Meilleur équilibre', consultive: 'Consultatif premium', note: 'Essential réduit la barrière d’entrée. Professional sert les PME. Business couvre l’opération et l’expansion européenne. Enterprise garde la valeur premium.', plans: [
      { name: 'Essential', planKey: 'essential', price: '€49', period: '/mois', text: 'Pour microentreprises, consultants et petites équipes.', cta: 'Commencer Essential', features: ['1 pays fiscal', '1 utilisateur', 'Calendrier légal basique', 'Actualités réglementaires basiques', 'Profil entreprise', 'Jusqu’à 10 documents', 'Matrice simple', 'Notifications basiques'] },
      { name: 'Professional', planKey: 'professional', price: '€149', period: '/mois', text: 'Pour PME avec obligations, documents et délais réels.', cta: 'Choisir Professional', features: ['Jusqu’à 2 pays fiscaux', 'Calendrier IA', 'Documents contrôlés', 'Versioning', 'Matrice complète', 'Journal d’audit', 'Rapports basiques', 'Jusqu’à 3 utilisateurs'] },
      { name: 'Business', planKey: 'business', price: '€399', period: '/mois', text: 'Pour entreprises en croissance européenne avec équipe interne.', cta: 'Choisir Business', highlighted: true, features: ['Jusqu’à 5 pays fiscaux', 'Identifiants par pays', 'Workflows d’approbation', 'Rapports exécutifs', 'Audit packs', 'Actualités IA par pays', 'Matrice RACI', 'Jusqu’à 10 utilisateurs'] },
      { name: 'Enterprise', price: 'Dès €990', period: '/mois', text: 'Pour entreprises réglementées, groupes et fournisseurs B2B enterprise.', cta: 'Parler aux ventes', enterprise: true, features: ['Pays illimités', 'Utilisateurs avancés', 'Permissions par rôle', 'Rapports white-label', 'Onboarding assisté', 'SLA et support prioritaire', 'Modules DORA, NIS2, ISO 27001 et AI Act', 'Traçabilité complète'] },
    ] },
    finalCta: { title: 'La conformité ne doit pas être un cauchemar. Confiez-la à ceux qui la comprennent.', button: 'Souscrire à EuroComply', subtitle: 'Essai gratuit de 14 jours. Sans engagement.' },
  },
  it: {
    nav: { features: 'Funzionalità', security: 'Sicurezza', plans: 'Piani', login: 'Accedi', subscribe: 'Abbonati ora' },
    badge: 'Piattaforma europea di intelligence compliance',
    heroTitle: 'Compliance che accelera il business. Non lo rallenta.',
    heroSubtitle: 'Le aziende che usano EuroComply riducono il rischio fiscale del 73% e risparmiano 40h/mese di burocrazia.',
    cta: { start: 'Abbonati ora', demo: 'Vedi demo', learnMore: 'Scopri di più' },
    cockpit: { eyebrow: 'Cockpit executive', title: 'Stato compliance', live: 'Live', metrics: [['73%', 'rischio fiscale ridotto'], ['40h', 'risparmiate al mese'], ['12k', 'euro di multe evitate'], ['8', 'obblighi imminenti']], events: ['Nuova scadenza fiscale identificata per la Francia', 'Policy approvata e registrata nell’audit log', 'Report executive pronto per revisione'] },
    security: { eyebrow: 'Architettura sicurezza', title: 'La sicurezza che la tua azienda richiede', subtitle: 'Controlli già applicati e livelli aggiuntivi pianificati per Business ed Enterprise.', items: [['Crittografia end-to-end', ShieldCheck, 'Dati sensibili protetti in transito e a riposo.'], ['GDPR compliant', Lock, 'Flussi allineati a privacy e diritti degli interessati.'], ['Audit log immutabile', FileText, 'Ogni azione critica viene registrata.'], ['Isolamento multi-azienda', Building2, 'Separazione rigorosa dei dati tra organizzazioni.'], ['Autenticazione sicura', Fingerprint, 'Sessioni protette con Supabase Auth e policy RLS.'], ['Infrastruttura Vercel + Supabase', Server, 'Deploy globale, database gestito e sicurezza server-side.'], ['Policy RLS per organizzazione', Database, 'Accesso basato su membership e contesto.'], ['Controllo permessi', KeyRound, 'Profili e ruoli per operazioni sensibili.'], ['Monitoraggio eventi', Bell, 'Alert per attività, approvazioni e scadenze critiche.'], ['Backup e continuità pianificati', Network, 'Roadmap di resilienza enterprise.'], ['ISO 27001 in preparazione', Award, 'Programma di maturità sicurezza.'], ['Penetration test annuali', ShieldAlert, 'Controllo previsto per sicurezza enterprise.']] },
    features: { eyebrow: 'Funzionalità', title: 'Cosa ottieni con EuroComply', cards: [['Calendario IA', 'Non perdere più una scadenza fiscale.', CalendarDays], ['Notizie multilingue', 'Notizie compliance in PT, FR, ES, EN, IT e DE, aggiornate da IA.', Globe2], ['Matrice rischi', 'Identifica e mitiga i rischi prima delle multe.', ShieldAlert], ['Inviti dipendenti', 'Team allineato con permessi e accesso sicuro.', Users], ['ID fiscali multi-paese', 'Espanditi in Europa con meno frizione fiscale.', Building2], ['Audit log', 'Ogni azione registrata e pronta per ispezioni.', FileText]] },
    infrastructure: { eyebrow: 'Infrastruttura', title: 'Il nostro team protegge i tuoi dati e riduce il rischio operativo.', subtitle: 'Aggiornamenti continui, architettura server-side, autenticazione sicura e isolamento per organizzazione.', cta: 'Esplora la nostra infrastruttura' },
    pricing: { eyebrow: 'Piani', title: 'Scegli il piano giusto per la tua azienda', subtitle: 'Quanto perdi senza una compliance strutturata?', popular: 'Miglior equilibrio', consultive: 'Consultivo premium', note: 'Essential riduce la barriera d’ingresso. Professional serve le PMI. Business copre operazioni, team ed espansione europea. Enterprise preserva valore premium.', plans: [
      { name: 'Essential', planKey: 'essential', price: '€49', period: '/mese', text: 'Per microimprese, consulenti e piccoli team.', cta: 'Inizia Essential', features: ['1 paese fiscale', '1 utente', 'Calendario legale base', 'Notizie normative base', 'Profilo azienda', 'Fino a 10 documenti', 'Matrice semplice', 'Notifiche base'] },
      { name: 'Professional', planKey: 'professional', price: '€149', period: '/mese', text: 'Per PMI con obblighi, documenti e scadenze reali.', cta: 'Scegli Professional', features: ['Fino a 2 paesi fiscali', 'Calendario IA', 'Documenti controllati', 'Versioning', 'Matrice completa', 'Audit log', 'Report base', 'Fino a 3 utenti'] },
      { name: 'Business', planKey: 'business', price: '€399', period: '/mese', text: 'Per aziende in crescita europea con team interno.', cta: 'Scegli Business', highlighted: true, features: ['Fino a 5 paesi fiscali', 'ID fiscali per paese', 'Workflow approvazione', 'Report executive', 'Audit pack', 'Notizie IA per paese', 'Matrice RACI', 'Fino a 10 utenti'] },
      { name: 'Enterprise', price: 'Da €990', period: '/mese', text: 'Per aziende regolamentate, gruppi e fornitori B2B enterprise.', cta: 'Parla con vendite', enterprise: true, features: ['Paesi illimitati', 'Utenti avanzati', 'Permessi per ruolo', 'Report white-label', 'Onboarding assistito', 'SLA e supporto prioritario', 'Moduli DORA, NIS2, ISO 27001 e AI Act', 'Tracciabilità completa'] },
    ] },
    finalCta: { title: 'La compliance non deve essere un incubo. Lasciala a chi la capisce.', button: 'Abbonati a EuroComply', subtitle: 'Prova gratuita di 14 giorni. Senza impegno.' },
  },
  de: {
    nav: { features: 'Funktionen', security: 'Sicherheit', plans: 'Pläne', login: 'Anmelden', subscribe: 'Jetzt abonnieren' },
    badge: 'Europäische Compliance-Intelligence-Plattform',
    heroTitle: 'Compliance, die Ihr Geschäft beschleunigt. Nicht bremst.',
    heroSubtitle: 'Unternehmen mit EuroComply reduzieren fiskalische Risiken um 73% und sparen 40h/Monat Bürokratie.',
    cta: { start: 'Jetzt abonnieren', demo: 'Demo ansehen', learnMore: 'Mehr erfahren' },
    cockpit: { eyebrow: 'Executive Cockpit', title: 'Compliance-Status', live: 'Live', metrics: [['73%', 'fiskalisches Risiko reduziert'], ['40h', 'pro Monat gespart'], ['12k', 'Euro Bußgelder vermieden'], ['8', 'anstehende Pflichten']], events: ['Neue Steuerfrist für Frankreich erkannt', 'Richtlinie genehmigt und im Audit-Log erfasst', 'Executive Report bereit zur Prüfung'] },
    security: { eyebrow: 'Sicherheitsarchitektur', title: 'Sicherheit, die Ihr Unternehmen verlangt', subtitle: 'Bereits angewandte Kontrollen und zusätzliche Ebenen für Business und Enterprise.', items: [['End-to-End-Verschlüsselung', ShieldCheck, 'Sensible Daten in Übertragung und Speicherung geschützt.'], ['GDPR compliant', Lock, 'Abläufe ausgerichtet auf Datenschutz und Betroffenenrechte.'], ['Unveränderliches Audit-Log', FileText, 'Jede kritische Aktion wird aufgezeichnet.'], ['Multi-Unternehmens-Isolation', Building2, 'Strikte Datentrennung zwischen Organisationen.'], ['Sichere Authentifizierung', Fingerprint, 'Geschützte Sitzungen mit Supabase Auth und RLS.'], ['Vercel + Supabase Infrastruktur', Server, 'Globales Deployment, verwaltete Datenbank und serverseitige Sicherheit.'], ['RLS pro Organisation', Database, 'Zugriff nach Mitgliedschaft und Kontext.'], ['Berechtigungskontrolle', KeyRound, 'Profile und Rollen für sensible Vorgänge.'], ['Event-Monitoring', Bell, 'Alarme für Aktivitäten, Freigaben und kritische Fristen.'], ['Backups und Kontinuität geplant', Network, 'Resilienz-Roadmap für Enterprise-Betrieb.'], ['ISO 27001 in Vorbereitung', Award, 'Programm für Sicherheitsreife.'], ['Jährliche Penetrationstests', ShieldAlert, 'Geplante Kontrolle für Enterprise-Sicherheit.']] },
    features: { eyebrow: 'Funktionen', title: 'Was Sie mit EuroComply gewinnen', cards: [['KI-Kalender', 'Verpassen Sie keine Steuerfrist mehr.', CalendarDays], ['Mehrsprachige News', 'Compliance-News in PT, FR, ES, EN, IT und DE, per KI aktualisiert.', Globe2], ['Risikomatrix', 'Risiken identifizieren und mindern, bevor Bußgelder entstehen.', ShieldAlert], ['Mitarbeitereinladungen', 'Team mit Berechtigungen und sicherem Zugriff ausrichten.', Users], ['Mehrere Steuer-IDs je Land', 'Expansion in Europa mit weniger fiskalischer Reibung.', Building2], ['Audit-Log', 'Jede Aktion aufgezeichnet und prüfbereit.', FileText]] },
    infrastructure: { eyebrow: 'Infrastruktur', title: 'Unser Team schützt Ihre Daten und reduziert operative Risiken.', subtitle: 'Kontinuierliche Updates, serverseitige Architektur, sichere Authentifizierung und Organisation-Isolation.', cta: 'Infrastruktur ansehen' },
    pricing: { eyebrow: 'Pläne', title: 'Wählen Sie den richtigen Plan für Ihr Unternehmen', subtitle: 'Wie viel verlieren Sie ohne strukturierte Compliance?', popular: 'Beste Balance', consultive: 'Premium-Beratung', note: 'Essential senkt die Einstiegshürde. Professional bedient KMU. Business deckt Betrieb, Team und europäische Expansion ab. Enterprise bewahrt Premium-Wert.', plans: [
      { name: 'Essential', planKey: 'essential', price: '€49', period: '/Monat', text: 'Für Kleinstunternehmen, Berater und kleine Teams.', cta: 'Essential starten', features: ['1 Steuerland', '1 Nutzer', 'Basiskalender', 'Basis-Regulatory-News', 'Unternehmensprofil', 'Bis 10 Dokumente', 'Einfache Matrix', 'Basisbenachrichtigungen'] },
      { name: 'Professional', planKey: 'professional', price: '€149', period: '/Monat', text: 'Für KMU mit echten Pflichten, Dokumenten und Fristen.', cta: 'Professional wählen', features: ['Bis 2 Steuerländer', 'KI-Kalender', 'Kontrollierte Dokumente', 'Versionierung', 'Vollständige Matrix', 'Audit-Log', 'Basisberichte', 'Bis 3 Nutzer'] },
      { name: 'Business', planKey: 'business', price: '€399', period: '/Monat', text: 'Für europäisch wachsende Unternehmen mit internem Team.', cta: 'Business wählen', highlighted: true, features: ['Bis 5 Steuerländer', 'Steuer-IDs je Land', 'Freigabe-Workflows', 'Executive Reports', 'Audit Packs', 'KI-News je Land', 'RACI-Matrix', 'Bis 10 Nutzer'] },
      { name: 'Enterprise', price: 'Ab €990', period: '/Monat', text: 'Für regulierte Unternehmen, Gruppen und B2B-Enterprise-Anbieter.', cta: 'Mit Vertrieb sprechen', enterprise: true, features: ['Unbegrenzte Länder', 'Erweiterte Nutzer', 'Rollenbasierte Rechte', 'White-Label-Reports', 'Begleitetes Onboarding', 'SLA und Priority Support', 'DORA, NIS2, ISO 27001 und AI Act Module', 'Vollständige Nachverfolgung'] },
    ] },
    finalCta: { title: 'Compliance muss kein Albtraum sein. Überlassen Sie sie denen, die sie verstehen.', button: 'EuroComply abonnieren', subtitle: '14 Tage kostenlos testen. Keine Verpflichtung.' },
  },
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
        <video className="absolute inset-0 -z-30 hidden h-full w-full object-cover opacity-70 md:block" autoPlay muted loop playsInline poster="https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=2400&q=90">
          <source src="https://videos.pexels.com/video-files/3209828/3209828-uhd_2560_1440_25fps.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 -z-30 bg-[url('https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=2400&q=90')] bg-cover bg-center md:hidden" />
        <div className="absolute inset-0 -z-20 bg-[linear-gradient(105deg,rgba(10,10,15,.98)_0%,rgba(10,10,15,.88)_46%,rgba(10,10,15,.38)_100%)]" />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,.10),transparent_32%),radial-gradient(circle_at_70%_20%,rgba(255,255,255,.08),transparent_28%),linear-gradient(to_bottom,transparent_0%,#0A0A0F_94%)]" />

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
              <a href="#demo" className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-7 py-4 text-base font-bold text-white backdrop-blur transition hover:-translate-y-1 hover:bg-white/10">{copy.cta.demo}</a>
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
            <pre className="whitespace-pre-wrap leading-7 text-zinc-400"><code>{`type ComplianceControl = {
  company: EuropeanEntity;
  fiscalIds: CountryTaxProfile[];
  auditTrail: ImmutableEvent[];
  riskScore: LiveMetric;
};

await EuroComply.monitor({
  deadlines: 'real-time',
  evidence: 'controlled',
  security: 'enterprise',
});`}</code></pre>
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-500">{copy.infrastructure.eyebrow}</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">{copy.infrastructure.title}</h2>
            <p className="mt-6 text-lg leading-8 text-zinc-400">{copy.infrastructure.subtitle}</p>
            <a href="#security" className="mt-8 inline-flex rounded-full border border-white/15 px-7 py-4 font-bold text-white transition hover:-translate-y-1 hover:bg-white/10">{copy.infrastructure.cta}</a>
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
