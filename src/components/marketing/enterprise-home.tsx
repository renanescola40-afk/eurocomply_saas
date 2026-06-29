import Image from 'next/image';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  Building2,
  Check,
  ChevronRight,
  ClipboardCheck,
  Database,
  FileText,
  Fingerprint,
  KeyRound,
  Layers3,
  Lock,
  Network,
  Scale,
  SearchCheck,
  Server,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
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

type Icon = typeof ShieldCheck;
type SectionCard = { title: string; text: string; icon: Icon };
type PlatformModule = { title: string; text: string; icon: Icon; points: string[] };
type FaqItem = { question: string; answer: string };

type LandingCopy = {
  nav: { problem: string; platform: string; security: string; pricing: string; login: string; demo: string };
  badge: string;
  heroTitle: string;
  heroSubtitle: string;
  urgency: string;
  buyerNote: string;
  cta: { primary: string; secondary: string; waitlist: string; sales: string };
  proof: string[];
  problem: { eyebrow: string; title: string; subtitle: string; cards: SectionCard[] };
  how: { eyebrow: string; title: string; steps: SectionCard[] };
  generates: { eyebrow: string; title: string; subtitle: string; items: string[] };
  preview: { eyebrow: string; title: string; subtitle: string; metrics: [string, string][]; activity: string[] };
  modules: { eyebrow: string; title: string; subtitle: string; cards: PlatformModule[] };
  security: { eyebrow: string; title: string; subtitle: string; items: SectionCard[]; note: string };
  pricing: { eyebrow: string; title: string; subtitle: string; popular: string; consultive: string; note: string; plans: PlanCopy[] };
  enterprise: { eyebrow: string; title: string; subtitle: string; bullets: string[]; cta: string };
  faq: { eyebrow: string; title: string; items: FaqItem[] };
  finalCta: { title: string; subtitle: string; primary: string; secondary: string };
};

function iconCard(title: string, text: string, icon: Icon): SectionCard {
  return { title, text, icon };
}

const plans: Record<Locale, PlanCopy[]> = {
  en: [
    { name: 'Essential', planKey: 'essential', price: '€49', period: '/month', text: 'For small teams replacing spreadsheets with a controlled AI compliance workspace.', cta: 'Start Essential', features: ['1 workspace', 'AI inventory', 'Basic risk classification', 'Policy templates', 'Evidence checklist', 'Up to 10 generated documents'] },
    { name: 'Professional', planKey: 'professional', price: '€149', period: '/month', text: 'For SaaS, fintech and HR teams preparing structured AI Act readiness evidence.', cta: 'Start trial', highlighted: true, features: ['Multi-user workspace', 'AI system registry', 'Risk and owner tracking', 'Evidence pack builder', 'Policy generator', 'Audit activity history'] },
    { name: 'Business', planKey: 'business', price: '€399', period: '/month', text: 'For companies operating several AI workflows across departments and countries.', cta: 'Choose Business', features: ['Department views', 'Approval workflows', 'Executive reporting', 'Document versioning', 'Vendor and tool review', 'Priority onboarding'] },
    { name: 'Enterprise', price: 'Custom', period: '', text: 'For regulated teams and B2B vendors that need procurement-ready documentation and assisted rollout.', cta: 'Talk to sales', enterprise: true, features: ['Expanded limits', 'DPA and subprocessor review', 'Security questionnaire support', 'Role-based permissions', 'Assisted onboarding', 'Support terms by agreement'] },
  ],
  pt: [
    { name: 'Essential', planKey: 'essential', price: '€49', period: '/mês', text: 'Para pequenas equipas que querem substituir folhas de cálculo por um workspace controlado.', cta: 'Começar Essential', features: ['1 workspace', 'Inventário de IA', 'Classificação básica de risco', 'Templates de políticas', 'Checklist de evidências', 'Até 10 documentos gerados'] },
    { name: 'Professional', planKey: 'professional', price: '€149', period: '/mês', text: 'Para SaaS, fintech e HR teams a preparar evidências estruturadas de AI Act readiness.', cta: 'Iniciar trial', highlighted: true, features: ['Workspace multiutilizador', 'Registo de sistemas de IA', 'Risco e owners', 'Evidence pack builder', 'Gerador de políticas', 'Histórico de auditoria'] },
    { name: 'Business', planKey: 'business', price: '€399', period: '/mês', text: 'Para empresas com vários workflows de IA entre departamentos e países.', cta: 'Escolher Business', features: ['Vistas por departamento', 'Workflows de aprovação', 'Reporting executivo', 'Versionamento documental', 'Revisão de fornecedores', 'Onboarding prioritário'] },
    { name: 'Enterprise', price: 'Custom', period: '', text: 'Para equipas reguladas e vendors B2B que precisam de documentação para procurement.', cta: 'Falar com vendas', enterprise: true, features: ['Limites expandidos', 'Revisão DPA e subprocessadores', 'Suporte a questionários', 'Permissões por função', 'Onboarding assistido', 'Termos de suporte por acordo'] },
  ],
  es: [
    { name: 'Essential', planKey: 'essential', price: '€49', period: '/mes', text: 'Para equipos pequeños que reemplazan hojas de cálculo por un workspace controlado.', cta: 'Empezar Essential', features: ['1 workspace', 'Inventario de IA', 'Clasificación básica de riesgo', 'Plantillas de políticas', 'Checklist de evidencias', 'Hasta 10 documentos'] },
    { name: 'Professional', planKey: 'professional', price: '€149', period: '/mes', text: 'Para SaaS, fintech y HR teams que preparan evidencias estructuradas.', cta: 'Iniciar trial', highlighted: true, features: ['Workspace multiusuario', 'Registro de sistemas de IA', 'Riesgo y owners', 'Evidence pack builder', 'Generador de políticas', 'Historial de auditoría'] },
    { name: 'Business', planKey: 'business', price: '€399', period: '/mes', text: 'Para empresas con múltiples workflows de IA entre departamentos.', cta: 'Elegir Business', features: ['Vistas por departamento', 'Flujos de aprobación', 'Informes ejecutivos', 'Versionado documental', 'Revisión de vendors', 'Onboarding prioritario'] },
    { name: 'Enterprise', price: 'Custom', period: '', text: 'Para equipos regulados y vendors B2B con revisión de procurement.', cta: 'Hablar con ventas', enterprise: true, features: ['Límites ampliados', 'Revisión DPA', 'Cuestionarios de seguridad', 'Permisos por rol', 'Onboarding asistido', 'Soporte acordado'] },
  ],
  fr: [
    { name: 'Essential', planKey: 'essential', price: '€49', period: '/mois', text: 'Pour petites équipes qui remplacent les tableurs par un workspace contrôlé.', cta: 'Démarrer Essential', features: ['1 workspace', 'Inventaire IA', 'Classification de risque', 'Templates de politiques', 'Checklist preuves', 'Jusqu’à 10 documents'] },
    { name: 'Professional', planKey: 'professional', price: '€149', period: '/mois', text: 'Pour SaaS, fintech et HR teams qui préparent des preuves structurées.', cta: 'Démarrer trial', highlighted: true, features: ['Workspace multi-utilisateur', 'Registre systèmes IA', 'Risques et owners', 'Evidence pack builder', 'Générateur de politiques', 'Historique audit'] },
    { name: 'Business', planKey: 'business', price: '€399', period: '/mois', text: 'Pour entreprises avec plusieurs workflows IA entre départements.', cta: 'Choisir Business', features: ['Vues département', 'Workflows approbation', 'Reporting exécutif', 'Versioning documents', 'Revue vendors', 'Onboarding prioritaire'] },
    { name: 'Enterprise', price: 'Custom', period: '', text: 'Pour équipes régulées et vendors B2B avec exigences procurement.', cta: 'Parler aux ventes', enterprise: true, features: ['Limites étendues', 'Revue DPA', 'Questionnaires sécurité', 'Permissions par rôle', 'Onboarding assisté', 'Support selon accord'] },
  ],
  it: [
    { name: 'Essential', planKey: 'essential', price: '€49', period: '/mese', text: 'Per piccoli team che sostituiscono fogli di calcolo con un workspace controllato.', cta: 'Avvia Essential', features: ['1 workspace', 'Inventario IA', 'Classificazione rischio', 'Template policy', 'Checklist evidenze', 'Fino a 10 documenti'] },
    { name: 'Professional', planKey: 'professional', price: '€149', period: '/mese', text: 'Per SaaS, fintech e HR team che preparano evidenze strutturate.', cta: 'Avvia trial', highlighted: true, features: ['Workspace multiutente', 'Registro sistemi IA', 'Rischi e owner', 'Evidence pack builder', 'Generatore policy', 'Audit history'] },
    { name: 'Business', planKey: 'business', price: '€399', period: '/mese', text: 'Per aziende con più workflow IA tra dipartimenti.', cta: 'Scegli Business', features: ['Viste reparto', 'Workflow approvazione', 'Report executive', 'Versioning documenti', 'Review vendor', 'Onboarding prioritario'] },
    { name: 'Enterprise', price: 'Custom', period: '', text: 'Per team regolamentati e vendor B2B con procurement review.', cta: 'Parla con vendite', enterprise: true, features: ['Limiti estesi', 'Review DPA', 'Questionari sicurezza', 'Permessi per ruolo', 'Onboarding assistito', 'Supporto concordato'] },
  ],
  de: [
    { name: 'Essential', planKey: 'essential', price: '€49', period: '/Monat', text: 'Für kleine Teams, die Tabellen durch einen kontrollierten Workspace ersetzen.', cta: 'Essential starten', features: ['1 Workspace', 'KI-Inventar', 'Basis-Risikoklassifizierung', 'Policy Templates', 'Evidenz-Checklist', 'Bis 10 Dokumente'] },
    { name: 'Professional', planKey: 'professional', price: '€149', period: '/Monat', text: 'Für SaaS, Fintech und HR Teams mit strukturierter AI Act Readiness.', cta: 'Trial starten', highlighted: true, features: ['Multi-User Workspace', 'KI-Systemregister', 'Risiken und Owner', 'Evidence Pack Builder', 'Policy Generator', 'Audit History'] },
    { name: 'Business', planKey: 'business', price: '€399', period: '/Monat', text: 'Für Unternehmen mit mehreren KI-Workflows über Abteilungen hinweg.', cta: 'Business wählen', features: ['Abteilungsansichten', 'Approval Workflows', 'Executive Reporting', 'Dokumentversionen', 'Vendor Review', 'Priority Onboarding'] },
    { name: 'Enterprise', price: 'Custom', period: '', text: 'Für regulierte Teams und B2B Vendors mit Procurement-Anforderungen.', cta: 'Mit Sales sprechen', enterprise: true, features: ['Erweiterte Limits', 'DPA Review', 'Security Questionnaires', 'Rollenrechte', 'Begleitetes Onboarding', 'Support nach Vereinbarung'] },
  ],
};

const en: LandingCopy = {
  nav: { problem: 'Problem', platform: 'Platform', security: 'Security', pricing: 'Pricing', login: 'Log in', demo: 'Book demo' },
  badge: 'EU AI Act readiness workspace for European B2B teams',
  heroTitle: 'Turn scattered AI use into board-ready governance evidence.',
  heroSubtitle: 'RISCK COMPLY helps European companies map AI systems, classify risk, assign owners, generate policies and prepare evidence packs for AI Act readiness — without claiming legal guarantees or replacing counsel.',
  urgency: 'EU AI Act obligations are moving from legal memos into operating evidence. Companies need a controlled record of what AI is used, who owns it, what risk it carries and what evidence exists.',
  buyerNote: 'Built for founders, CTOs, compliance officers, legal teams and security-conscious B2B buyers.',
  cta: { primary: 'Start trial', secondary: 'Book demo', waitlist: 'Join waitlist', sales: 'Talk to sales' },
  proof: ['AI inventory', 'risk classification', 'evidence packs', 'policy generator', 'audit trail'],
  problem: {
    eyebrow: 'The problem',
    title: 'AI compliance fails when evidence lives in chats, decks and forgotten spreadsheets.',
    subtitle: 'Enterprise buyers do not only ask whether you use AI. They ask where it is used, who approved it, how risk was assessed and which policies prove governance maturity.',
    cards: [
      iconCard('Unknown AI footprint', 'Teams adopt AI across product, support, HR and operations before compliance has a reliable inventory.', SearchCheck),
      iconCard('Risk without ownership', 'High-impact workflows need clear owners, rationale and follow-up actions — not a vague status column.', ShieldAlert),
      iconCard('Documents without traceability', 'Policies and reports lose value when they are not connected to systems, evidence and review history.', FileText),
    ],
  },
  how: {
    eyebrow: 'How it works',
    title: 'A practical workflow for readiness, not legal theatre.',
    steps: [
      iconCard('1. Register AI systems', 'Capture the use case, department, provider, data context, owner and operating country.', Database),
      iconCard('2. Classify and prioritize risk', 'Structure risk signals and next actions so compliance work becomes operational.', Scale),
      iconCard('3. Generate governance assets', 'Create policies, evidence packs and audit-ready documentation linked to the inventory.', ClipboardCheck),
    ],
  },
  generates: {
    eyebrow: 'What the platform generates',
    title: 'Outputs buyers can review and teams can maintain.',
    subtitle: 'Every output is positioned as operational readiness support — not certification, legal advice or a compliance guarantee.',
    items: ['AI system inventory', 'Risk classification summary', 'Evidence pack', 'Internal AI policy', 'Employee AI usage guide', 'Governance report', 'Audit activity trail', 'Executive readiness snapshot'],
  },
  preview: {
    eyebrow: 'Dashboard preview',
    title: 'A control room for AI governance decisions.',
    subtitle: 'Show leadership what exists, what is risky, what is missing and what is ready for buyer review.',
    metrics: [['42', 'AI systems mapped'], ['9', 'high-priority reviews'], ['86%', 'evidence coverage'], ['14', 'policies generated']],
    activity: ['HR screening assistant flagged for owner review', 'Customer support copilot linked to vendor evidence', 'Internal AI policy generated and awaiting approval'],
  },
  modules: {
    eyebrow: 'Platform depth',
    title: 'The sections enterprise buyers expect to see.',
    subtitle: 'Purpose-built modules for AI Act readiness and governance operations.',
    cards: [
      { title: 'AI inventory', text: 'A living registry of AI systems, vendors, departments, owners, countries and data context.', icon: Database, points: ['Use-case mapping', 'Owner assignment', 'Provider context'] },
      { title: 'Risk classification', text: 'A structured view of minimal, limited, high and unacceptable-risk signals for internal prioritization.', icon: Scale, points: ['Risk rationale', 'Review status', 'Mitigation actions'] },
      { title: 'Evidence pack', text: 'A buyer-ready collection of policies, assessments, logs and supporting documents.', icon: Layers3, points: ['Linked evidence', 'Exportable summary', 'Audit trail'] },
      { title: 'Policy generator', text: 'Generate internal policies and guidance aligned to the company profile and AI usage context.', icon: BookOpenCheck, points: ['Internal AI policy', 'Employee guide', 'Review workflow'] },
    ],
  },
  security: {
    eyebrow: 'Trust and security',
    title: 'Enterprise tone means honest claims, not compliance washing.',
    subtitle: 'The landing avoids claims we cannot evidence. Security, privacy and procurement materials are framed around implementation status and reviewable documentation.',
    items: [
      iconCard('Tenant isolation design', 'Organization-scoped permissions and RLS-oriented architecture support separation between customers.', Building2),
      iconCard('Protected auth flows', 'Supabase/Clerk-backed authentication paths and server-side checks protect private workspace routes.', KeyRound),
      iconCard('Audit trail posture', 'Critical actions can be recorded for review, investigation and evidence continuity.', Fingerprint),
      iconCard('Trust Center alignment', 'Security documents disclose current controls, open gaps and roadmap boundaries.', ShieldCheck),
      iconCard('No false certification claims', 'SOC 2, ISO 27001 and pentest claims are not made unless current evidence exists.', AlertTriangle),
      iconCard('Managed infrastructure', 'Next.js, Vercel and Supabase architecture keeps deployment, auth and data operations structured.', Server),
    ],
    note: 'RISCK COMPLY helps teams organize readiness, governance and evidence. It does not replace a lawyer and does not guarantee legal compliance.',
  },
  pricing: { eyebrow: 'Pricing', title: 'Clear plans for different compliance maturity levels.', subtitle: 'Start with AI inventory and evidence workflows. Upgrade when procurement, approvals and enterprise rollout become the bottleneck.', popular: 'Best for launch', consultive: 'Enterprise', note: 'Prices are monthly and may change. Legal outcomes depend on your facts, implementation and professional advice.', plans: plans.en },
  enterprise: { eyebrow: 'Enterprise', title: 'For companies that need more than a nice dashboard.', subtitle: 'Enterprise buyers need procurement answers, onboarding discipline and a reliable operating model for AI governance.', bullets: ['Assisted onboarding for AI inventory rollout', 'Security questionnaire and procurement support', 'DPA/subprocessor review workflow', 'Custom limits and support terms by agreement'], cta: 'Talk to sales' },
  faq: { eyebrow: 'FAQ', title: 'Questions enterprise buyers ask before they trust a compliance product.', items: [
    { question: 'Does RISCK COMPLY guarantee EU AI Act compliance?', answer: 'No. It helps organize AI Act readiness, governance evidence, policies and audit trails. Legal conclusions depend on your specific facts and professional advice.' },
    { question: 'Does it replace our lawyer or compliance advisor?', answer: 'No. It gives legal, compliance and product teams a structured workspace to collect information, generate operational documents and prepare buyer-ready evidence.' },
    { question: 'Can we use it before every AI system is fully mapped?', answer: 'Yes. The workflow is designed to expose gaps clearly, assign owners and improve evidence coverage over time.' },
    { question: 'Is the platform suitable for SaaS and fintech buyers?', answer: 'Yes. The copy and workflow are designed for B2B teams that face procurement, security reviews and EU compliance expectations.' },
  ] },
  finalCta: { title: 'Stop selling AI with scattered governance evidence.', subtitle: 'Start building the AI inventory, policies, risk classification and evidence pack your buyers will ask for.', primary: 'Start trial', secondary: 'Book demo' },
};

const pt: LandingCopy = {
  ...en,
  nav: { problem: 'Problema', platform: 'Plataforma', security: 'Segurança', pricing: 'Preços', login: 'Entrar', demo: 'Marcar demo' },
  badge: 'Workspace de AI Act readiness para empresas B2B europeias',
  heroTitle: 'Transforme uso disperso de IA em evidência de governança para compradores enterprise.',
  heroSubtitle: 'O RISCK COMPLY ajuda empresas europeias a mapear sistemas de IA, classificar riscos, definir owners, gerar políticas e preparar evidence packs para AI Act readiness — sem prometer garantias legais nem substituir aconselhamento jurídico.',
  urgency: 'As obrigações do EU AI Act estão a sair dos memorandos jurídicos e a entrar na operação. Empresas precisam de um registo controlado sobre que IA usam, quem é responsável, qual o risco e que evidência existe.',
  buyerNote: 'Criado para founders, CEOs, CTOs, compliance officers, equipas legais e compradores B2B exigentes.',
  cta: { primary: 'Iniciar trial', secondary: 'Marcar demo', waitlist: 'Entrar na waitlist', sales: 'Falar com vendas' },
  proof: ['inventário de IA', 'classificação de risco', 'evidence packs', 'gerador de políticas', 'audit trail'],
  problem: { ...en.problem, eyebrow: 'O problema', title: 'AI compliance falha quando a evidência vive em chats, decks e folhas de cálculo esquecidas.', subtitle: 'Compradores enterprise não perguntam apenas se a empresa usa IA. Perguntam onde usa, quem aprovou, como o risco foi avaliado e que políticas provam maturidade de governança.' },
  how: { ...en.how, eyebrow: 'Como funciona', title: 'Um workflow prático de readiness, não teatro jurídico.' },
  generates: { ...en.generates, eyebrow: 'O que a plataforma gera', title: 'Outputs que compradores conseguem rever e equipas conseguem manter.', subtitle: 'Cada output é apresentado como suporte operacional de readiness — não como certificação, aconselhamento jurídico ou garantia de compliance.', items: ['Inventário de sistemas de IA', 'Resumo de classificação de risco', 'Evidence pack', 'Política interna de IA', 'Guia de uso de IA para colaboradores', 'Relatório de governança', 'Histórico de auditoria', 'Snapshot executivo de readiness'] },
  preview: { ...en.preview, eyebrow: 'Preview do dashboard', title: 'Uma sala de controlo para decisões de governança de IA.', subtitle: 'Mostre à liderança o que existe, o que é arriscado, o que falta e o que está pronto para buyer review.', activity: ['Assistente de triagem RH marcado para revisão de owner', 'Copilot de suporte ligado a evidência do fornecedor', 'Política interna de IA gerada e à espera de aprovação'] },
  modules: { ...en.modules, eyebrow: 'Profundidade da plataforma', title: 'As secções que compradores enterprise esperam ver.', subtitle: 'Módulos criados para AI Act readiness e operações de governança.' },
  security: { ...en.security, eyebrow: 'Confiança e segurança', title: 'Linguagem enterprise exige claims honestos, não compliance washing.', subtitle: 'A landing evita afirmações que não conseguimos evidenciar. Segurança, privacidade e procurement são ligados a implementação e documentação revível.', note: 'O RISCK COMPLY ajuda equipas a organizar readiness, governança e evidências. Não substitui advogado e não garante compliance legal.' },
  pricing: { ...en.pricing, eyebrow: 'Preços', title: 'Planos claros para diferentes níveis de maturidade.', subtitle: 'Comece com inventário de IA e workflows de evidência. Evolua quando procurement, aprovações e rollout enterprise forem o bloqueio.', popular: 'Melhor para lançar', consultive: 'Enterprise', note: 'Preços mensais e sujeitos a alteração. Resultados legais dependem dos factos, implementação e aconselhamento profissional.', plans: plans.pt },
  enterprise: { ...en.enterprise, eyebrow: 'Enterprise', title: 'Para empresas que precisam de mais do que um dashboard bonito.', subtitle: 'Compradores enterprise exigem respostas de procurement, disciplina de onboarding e um modelo operacional fiável para governança de IA.', bullets: ['Onboarding assistido para rollout do inventário de IA', 'Suporte a questionários de segurança e procurement', 'Workflow para DPA e subprocessadores', 'Limites e termos de suporte personalizados por acordo'], cta: 'Falar com vendas' },
  faq: { ...en.faq, eyebrow: 'FAQ', title: 'Perguntas que compradores enterprise fazem antes de confiar num produto de compliance.' },
  finalCta: { title: 'Pare de vender IA com evidência de governança espalhada.', subtitle: 'Comece a construir o inventário de IA, políticas, classificação de risco e evidence pack que compradores vão pedir.', primary: 'Iniciar trial', secondary: 'Marcar demo' },
};

const landingCopy: Record<Locale, LandingCopy> = {
  en,
  pt,
  es: { ...en, pricing: { ...en.pricing, plans: plans.es } },
  fr: { ...en, pricing: { ...en.pricing, plans: plans.fr } },
  it: { ...en, pricing: { ...en.pricing, plans: plans.it } },
  de: { ...en, pricing: { ...en.pricing, plans: plans.de } },
};

function href(locale: Locale, path: string) {
  return `/${locale}${path}`;
}

function signupHref(locale: Locale, plan: 'professional' | 'essential' | 'business' = 'professional') {
  return href(locale, `/signup?plan=${plan}&next=/${locale}/onboarding`);
}

function contactHref(locale: Locale, intent: 'demo' | 'sales') {
  return href(locale, `/contact?intent=${intent}`);
}

function planHref(locale: Locale, plan: PlanCopy) {
  return plan.enterprise ? contactHref(locale, 'sales') : href(locale, `/billing/checkout/${plan.planKey}`);
}

function SectionHeading({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <div className="max-w-4xl">
      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-200/55">{eyebrow}</p>
      <h2 className="mt-4 text-3xl font-semibold tracking-[-0.045em] text-white sm:text-5xl">{title}</h2>
      {subtitle ? <p className="mt-5 max-w-3xl text-sm leading-7 text-white/56 md:text-base">{subtitle}</p> : null}
    </div>
  );
}

export function EnterpriseHome({ locale }: { locale: string }) {
  const activeLocale = (locales.includes(locale as Locale) ? locale : 'en') as Locale;
  const copy = landingCopy[activeLocale];
  const meta = LOCALE_META[activeLocale];
  const localeName = meta.nativeName ?? meta.name;

  return (
    <main className="min-h-screen scroll-smooth overflow-hidden bg-[#050505] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_12%_10%,rgba(14,165,233,.25),transparent_30rem),radial-gradient(circle_at_78%_12%,rgba(16,185,129,.14),transparent_28rem),radial-gradient(circle_at_50%_80%,rgba(59,130,246,.14),transparent_35rem),linear-gradient(180deg,#050505_0%,#071018_48%,#050505_100%)]" />
      <div className="pointer-events-none fixed inset-0 tech-grid opacity-25" />
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#050505]/75 backdrop-blur-2xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href={`/${activeLocale}`} className="flex items-center gap-3" aria-label="RISCK COMPLY home">
            <Image src="/brand/risck-comply-wordmark.svg" alt="RISCK COMPLY" width={180} height={44} className="h-10 w-auto object-contain" priority />
          </Link>
          <div className="hidden items-center gap-7 text-sm text-white/58 lg:flex">
            <a href="#problem" className="transition hover:text-white">{copy.nav.problem}</a>
            <a href="#platform" className="transition hover:text-white">{copy.nav.platform}</a>
            <a href="#security" className="transition hover:text-white">{copy.nav.security}</a>
            <a href="#pricing" className="transition hover:text-white">{copy.nav.pricing}</a>
            <span className="text-white/32">{localeName}</span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher currentLocale={activeLocale} variant="dark" compact />
            <Link href={href(activeLocale, '/login')} className="hidden rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 sm:inline-flex">{copy.nav.login}</Link>
            <Link href={contactHref(activeLocale, 'demo')} className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-black shadow-[0_0_40px_rgba(255,255,255,.18)] transition hover:bg-zinc-200">{copy.nav.demo}</Link>
          </div>
        </nav>
      </header>

      <section className="relative z-10 px-4 pb-20 pt-32 sm:px-6 lg:px-8 lg:pt-40">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.04fr_.96fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-cyan-300/[0.06] px-4 py-2 text-sm font-medium text-cyan-50/82"><ShieldCheck className="h-4 w-4" /> {copy.badge}</div>
            <h1 className="mt-8 max-w-5xl text-5xl font-semibold leading-[1.02] tracking-[-0.067em] text-white sm:text-6xl lg:text-7xl">{copy.heroTitle}</h1>
            <p className="mt-7 max-w-3xl text-lg leading-8 text-white/66 sm:text-xl">{copy.heroSubtitle}</p>
            <div className="mt-6 rounded-3xl border border-amber-300/20 bg-amber-300/[0.06] p-4 text-sm leading-6 text-amber-50/78"><AlertTriangle className="mr-2 inline h-4 w-4" />{copy.urgency}</div>
            <div className="mt-6 flex flex-wrap gap-2">{copy.proof.map((item) => <span key={item} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white/52">{item}</span>)}</div>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href={signupHref(activeLocale)} className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-4 text-base font-bold text-black shadow-[0_0_50px_rgba(255,255,255,.18)] transition hover:bg-zinc-200">{copy.cta.primary} <ChevronRight className="h-4 w-4" /></Link>
              <Link href={contactHref(activeLocale, 'demo')} className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/[0.04] px-7 py-4 text-base font-bold text-white backdrop-blur transition hover:bg-white/10">{copy.cta.secondary}</Link>
              <Link href={signupHref(activeLocale)} className="inline-flex items-center justify-center rounded-full border border-cyan-200/20 bg-cyan-300/[0.06] px-7 py-4 text-base font-bold text-cyan-50 transition hover:bg-cyan-300/10">{copy.cta.waitlist}</Link>
            </div>
            <p className="mt-5 max-w-2xl text-xs leading-6 text-white/42">{copy.buyerNote}</p>
          </div>

          <div className="premium-card rounded-[2rem] p-5 shadow-2xl">
            <div className="rounded-[1.5rem] border border-white/10 bg-black/35 p-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-5"><div><p className="text-xs uppercase tracking-[0.26em] text-white/35">{copy.preview.eyebrow}</p><h2 className="mt-2 text-2xl font-semibold text-white">{copy.preview.title}</h2></div><span className="rounded-full border border-emerald-200/25 bg-emerald-300/10 px-3 py-1 text-xs font-semibold text-emerald-100">Live readiness view</span></div>
              <p className="mt-4 text-sm leading-6 text-white/52">{copy.preview.subtitle}</p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">{copy.preview.metrics.map(([value, label]) => <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"><p className="text-3xl font-semibold text-white">{value}</p><p className="mt-2 text-sm text-white/42">{label}</p></div>)}</div>
              <div className="mt-6 space-y-3">{copy.preview.activity.map((item) => <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-6 text-white/62"><Check className="mt-1 h-4 w-4 shrink-0 text-cyan-100" /> {item}</div>)}</div>
            </div>
          </div>
        </div>
      </section>

      <section id="problem" className="relative z-10 border-y border-white/10 bg-white/[0.02] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl"><SectionHeading {...copy.problem} /><div className="mt-10 grid gap-4 md:grid-cols-3">{copy.problem.cards.map(({ title, text, icon: IconComponent }) => <article key={title} className="premium-card premium-card-hover rounded-[1.75rem] p-6"><IconComponent className="h-6 w-6 text-cyan-100" /><h3 className="mt-5 text-xl font-semibold text-white">{title}</h3><p className="mt-3 text-sm leading-6 text-white/54">{text}</p></article>)}</div></div>
      </section>

      <section className="relative z-10 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.85fr_1.15fr] lg:items-start"><SectionHeading eyebrow={copy.how.eyebrow} title={copy.how.title} /><div className="grid gap-4">{copy.how.steps.map(({ title, text, icon: IconComponent }) => <article key={title} className="rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-6"><div className="flex gap-4"><div className="rounded-2xl bg-white/10 p-3 text-white"><IconComponent className="h-5 w-5" /></div><div><h3 className="text-xl font-semibold text-white">{title}</h3><p className="mt-2 text-sm leading-6 text-white/54">{text}</p></div></div></article>)}</div></div>
      </section>

      <section className="relative z-10 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 md:p-10"><SectionHeading eyebrow={copy.generates.eyebrow} title={copy.generates.title} subtitle={copy.generates.subtitle} /><div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{copy.generates.items.map((item) => <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/25 px-4 py-4 text-sm font-semibold text-white/72"><Sparkles className="h-4 w-4 text-cyan-100" />{item}</div>)}</div></div>
      </section>

      <section id="platform" className="relative z-10 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl"><SectionHeading eyebrow={copy.modules.eyebrow} title={copy.modules.title} subtitle={copy.modules.subtitle} /><div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">{copy.modules.cards.map(({ title, text, icon: IconComponent, points }) => <article key={title} className="premium-card premium-card-hover rounded-[1.75rem] p-6"><div className="rounded-2xl bg-white/10 p-3 text-white w-fit"><IconComponent className="h-5 w-5" /></div><h3 className="mt-5 text-xl font-semibold text-white">{title}</h3><p className="mt-3 text-sm leading-6 text-white/52">{text}</p><ul className="mt-5 space-y-2 text-sm text-white/58">{points.map((point) => <li key={point} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-cyan-100" /> {point}</li>)}</ul></article>)}</div></div>
      </section>

      <section id="security" className="relative z-10 border-y border-white/10 bg-white/[0.02] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl"><SectionHeading eyebrow={copy.security.eyebrow} title={copy.security.title} subtitle={copy.security.subtitle} /><div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{copy.security.items.map(({ title, text, icon: IconComponent }) => <article key={title} className="rounded-3xl border border-white/10 bg-black/20 p-5"><IconComponent className="h-5 w-5 text-white" /><h3 className="mt-4 font-semibold text-white">{title}</h3><p className="mt-2 text-sm leading-6 text-white/48">{text}</p></article>)}</div><p className="mt-6 rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] p-4 text-sm leading-6 text-amber-50/76">{copy.security.note}</p></div>
      </section>

      <section id="pricing" className="relative z-10 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl"><SectionHeading eyebrow={copy.pricing.eyebrow} title={copy.pricing.title} subtitle={copy.pricing.subtitle} /><div className="mt-10 grid gap-4 lg:grid-cols-4">{copy.pricing.plans.map((plan) => <article key={plan.name} className={`flex rounded-[1.75rem] border p-6 ${plan.highlighted ? 'border-white/35 bg-white text-black shadow-[0_24px_90px_rgba(255,255,255,.12)]' : 'border-white/10 bg-white/[0.035] text-white'}`}><div className="flex flex-1 flex-col"><div className="flex items-center justify-between gap-4"><h3 className="text-xl font-semibold">{plan.name}</h3>{plan.highlighted ? <span className="rounded-full bg-black px-3 py-1 text-xs font-bold text-white">{copy.pricing.popular}</span> : plan.enterprise ? <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-white/60">{copy.pricing.consultive}</span> : null}</div><p className={`mt-3 text-sm leading-6 ${plan.highlighted ? 'text-black/58' : 'text-white/52'}`}>{plan.text}</p><p className="mt-6 text-4xl font-semibold tracking-[-0.04em]">{plan.price}<span className={`text-sm font-normal ${plan.highlighted ? 'text-black/50' : 'text-white/42'}`}>{plan.period}</span></p><ul className={`mt-6 space-y-2 text-sm ${plan.highlighted ? 'text-black/64' : 'text-white/54'}`}>{plan.features.map((feature) => <li key={feature} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0" /> {feature}</li>)}</ul><Link href={planHref(activeLocale, plan)} className={`mt-auto inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-bold ${plan.highlighted ? 'bg-black text-white hover:bg-zinc-800' : 'border border-white/15 bg-white/[0.04] text-white hover:bg-white/10'}`}>{plan.cta} <ChevronRight className="h-4 w-4" /></Link></div></article>)}</div><p className="mt-6 text-xs leading-6 text-white/38">{copy.pricing.note}</p></div>
      </section>

      <section className="relative z-10 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-[2rem] border border-cyan-200/15 bg-cyan-300/[0.045] p-7 md:p-10"><div className="grid gap-8 lg:grid-cols-[.9fr_1.1fr] lg:items-center"><SectionHeading eyebrow={copy.enterprise.eyebrow} title={copy.enterprise.title} subtitle={copy.enterprise.subtitle} /><div><ul className="grid gap-3 sm:grid-cols-2">{copy.enterprise.bullets.map((item) => <li key={item} className="flex gap-3 rounded-2xl border border-white/10 bg-black/25 p-4 text-sm leading-6 text-white/64"><Check className="mt-1 h-4 w-4 shrink-0 text-cyan-100" />{item}</li>)}</ul><Link href={contactHref(activeLocale, 'sales')} className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-black hover:bg-zinc-200">{copy.enterprise.cta} <ArrowRight className="h-4 w-4" /></Link></div></div></div>
      </section>

      <section className="relative z-10 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl"><SectionHeading eyebrow={copy.faq.eyebrow} title={copy.faq.title} /><div className="mt-10 space-y-3">{copy.faq.items.map((item) => <details key={item.question} className="group rounded-2xl border border-white/10 bg-white/[0.035] p-5"><summary className="cursor-pointer list-none text-lg font-semibold text-white">{item.question}</summary><p className="mt-3 text-sm leading-7 text-white/56">{item.answer}</p></details>)}</div></div>
      </section>

      <section className="relative z-10 px-4 py-20 sm:px-6 lg:px-8"><div className="mx-auto max-w-5xl rounded-[2rem] border border-white/10 bg-white/[0.05] p-8 text-center md:p-12"><h2 className="text-3xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">{copy.finalCta.title}</h2><p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-white/55">{copy.finalCta.subtitle}</p><div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Link href={signupHref(activeLocale)} className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-4 text-base font-bold text-black hover:bg-zinc-200">{copy.finalCta.primary} <ChevronRight className="h-4 w-4" /></Link><Link href={contactHref(activeLocale, 'demo')} className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/[0.04] px-7 py-4 text-base font-bold text-white hover:bg-white/10">{copy.finalCta.secondary}</Link></div></div></section>

      <div className="relative z-10"><PublicFooter locale={activeLocale} /></div>
    </main>
  );
}
