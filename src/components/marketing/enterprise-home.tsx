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
  cta: { start: string; trust: string; learnMore: string };
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
  heroSubtitle: 'Risck comply helps European teams centralize evidence, risks, vendors, roles and audit trails while keeping security claims tied to documented implementation.',
  cta: { start: 'Subscribe now', trust: 'Review Trust Center', learnMore: 'Learn more' },
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
      ['Supabase Auth', KeyRound, 'Protected sessions and server-side user checks for private routes.'],
      ['Vercel + Supabase architecture', Server, 'Managed hosting, database, authentication and storage configuration.'],
      ['Organization-level RLS', Database, 'RLS evidence must pass against the target Supabase project before production claims.'],
      ['Permission controls', Users, 'Owner, admin, editor, member and viewer roles map to explicit permissions.'],
      ['Operational monitoring posture', Network, 'Logging and release evidence are tracked; 24/7 staffed monitoring is not claimed.'],
      ['Trust documentation', ShieldAlert, 'SOC 2, ISO 27001 and pentest are disclosed as not currently completed.'],
    ],
  },
  features: {
    eyebrow: 'Features',
    title: 'What teams operate in Risck comply',
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
    note: 'Enterprise security commitments depend on the signed agreement and available evidence. Risck comply does not currently claim SOC 2, ISO 27001 certification, completed third-party pentesting or tested backup restore.',
    plans: [
      { name: 'Essential', planKey: 'essential', price: '€49', period: '/month', text: 'Entry plan for small teams moving evidence and deadlines out of spreadsheets.', cta: 'Start Essential', features: ['1 fiscal country', '1 user', 'Basic legal calendar', 'Basic regulatory news', 'Company profile', 'Up to 10 documents', 'Simple risk matrix', 'Basic notifications'] },
      { name: 'Professional', planKey: 'professional', price: '€149', period: '/month', text: 'For SMEs with real obligations, documents, risks and review cycles.', cta: 'Choose Professional', features: ['Up to 2 fiscal countries', 'Compliance calendar', 'Controlled documents', 'Versioning', 'Risk matrix', 'Audit events', 'Basic reports', 'Up to 3 users'] },
      { name: 'Business', planKey: 'business', price: '€399', period: '/month', text: 'For companies growing across Europe with teams, approvals and reporting needs.', cta: 'Choose Business', highlighted: true, features: ['Up to 5 fiscal countries', 'Tax IDs by country', 'Approval workflows', 'Executive reports', 'Audit packs', 'Country-specific news', 'RACI matrix', 'Up to 10 users'] },
      { name: 'Enterprise', price: 'From €990', period: '/month', text: 'Consultive plan for regulated companies and B2B vendors that need procurement support.', cta: 'Talk to sales', enterprise: true, features: ['Expanded limits', 'Advanced users', 'Role-based permissions', 'Trust documentation packet', 'Assisted onboarding', 'Support terms by agreement', 'DPA and subprocessor review', 'Security questionnaire support'] },
    ],
  },
  finalCta: { title: 'Give buyers evidence they can evaluate, not claims they have to decode.', button: 'Subscribe to Risck comply', subtitle: 'Review the Trust Center before procurement.' },
};

const portugueseCopy: LandingCopy = {
  ...englishCopy,
  nav: { features: 'Funcionalidades', security: 'Segurança', plans: 'Planos', trust: 'Trust Center', login: 'Entrar', subscribe: 'Assinar agora' },
  badge: 'Plataforma europeia de operações de compliance',
  heroTitle: 'Evidências, riscos e fornecedores sem surpresas em procurement.',
  heroSubtitle: 'O Risck comply ajuda equipas europeias a centralizar evidências, riscos, fornecedores, papéis e trilhas de auditoria mantendo claims de segurança ligados à implementação documentada.',
  cta: { start: 'Assinar agora', trust: 'Ver Trust Center', learnMore: 'Saiba mais' },
  cockpit: { eyebrow: 'Cockpit executivo', title: 'Workspace de compliance', live: 'Vista do workspace', metrics: [['RBAC', 'acesso por função'], ['RLS', 'desenho de isolamento'], ['Auditoria', 'eventos rastreáveis'], ['Docs', 'pacote enterprise']], events: ['Política aprovada e registada como evento de auditoria', 'Risco de fornecedor pronto para revisão', 'Resposta de questionário de segurança requer validação de evidência'] },
  security: { ...englishCopy.security, eyebrow: 'Arquitetura de segurança', title: 'Postura de segurança com limites honestos de evidência', subtitle: 'Controlos implementados na plataforma e lacunas de roadmap/evidência claramente divulgadas para procurement enterprise.' },
  features: { ...englishCopy.features, eyebrow: 'Funcionalidades', title: 'O que as equipas operam no Risck comply' },
  infrastructure: { ...englishCopy.infrastructure, eyebrow: 'Infraestrutura', title: 'Arquitetura desenhada para apoiar avaliação enterprise.', cta: 'Abrir visão de segurança' },
  pricing: { ...englishCopy.pricing, eyebrow: 'Planos', title: 'Escolha o plano certo para a sua empresa', subtitle: 'Comece com workflows operacionais e evolua para materiais de procurement enterprise.', popular: 'Melhor equilíbrio', consultive: 'Avaliação enterprise', note: 'Compromissos enterprise dependem do contrato assinado e da evidência disponível. O Risck comply não afirma SOC 2, certificação ISO 27001, pentest terceiro concluído ou restore de backup testado.' },
  finalCta: { title: 'Dê aos compradores evidência avaliável, não claims para decifrar.', button: 'Assinar Risck comply', subtitle: 'Revise o Trust Center antes do procurement.' },
};

const spanishCopy: LandingCopy = {
  ...englishCopy,
  nav: { features: 'Funcionalidades', security: 'Seguridad', plans: 'Planes', trust: 'Trust Center', login: 'Iniciar sesión', subscribe: 'Suscribirse ahora' },
  badge: 'Plataforma europea de operaciones de compliance',
  heroTitle: 'Evidencias, riesgos y proveedores sin sorpresas de procurement.',
  heroSubtitle: 'Risck comply ayuda a equipos europeos a centralizar evidencias, riesgos, proveedores, roles y trazas de auditoría manteniendo los claims de seguridad ligados a implementación documentada.',
  cta: { start: 'Suscribirse ahora', trust: 'Revisar Trust Center', learnMore: 'Más información' },
  features: { ...englishCopy.features, eyebrow: 'Funcionalidades', title: 'Qué operan los equipos en Risck comply' },
  pricing: { ...englishCopy.pricing, eyebrow: 'Planes', title: 'Elige el plan adecuado para tu empresa', note: 'Los compromisos enterprise dependen del contrato firmado y de la evidencia disponible. Risck comply no afirma SOC 2, certificación ISO 27001, pentest tercero completado ni restore de backup probado.' },
  finalCta: { title: 'Entrega a los compradores evidencia evaluable, no claims difíciles de descifrar.', button: 'Suscribirse a Risck comply', subtitle: 'Revisa el Trust Center antes del procurement.' },
};

const frenchCopy: LandingCopy = {
  ...englishCopy,
  nav: { features: 'Fonctionnalités', security: 'Sécurité', plans: 'Offres', trust: 'Trust Center', login: 'Connexion', subscribe: 'Souscrire' },
  heroSubtitle: 'Risck comply aide les équipes européennes à centraliser preuves, risques, fournisseurs, rôles et traces d’audit tout en liant les claims sécurité à l’implémentation documentée.',
  features: { ...englishCopy.features, eyebrow: 'Fonctionnalités', title: 'Ce que les équipes opèrent dans Risck comply' },
  pricing: { ...englishCopy.pricing, eyebrow: 'Offres', note: 'Les engagements enterprise dépendent du contrat signé et des preuves disponibles. Risck comply ne revendique pas SOC 2, certification ISO 27001, pentest tiers finalisé ni restauration de backup testée.' },
  finalCta: { title: 'Donnez aux acheteurs des preuves évaluables, pas des claims à décoder.', button: 'Souscrire à Risck comply', subtitle: 'Consultez le Trust Center avant le procurement.' },
};

const italianCopy: LandingCopy = {
  ...englishCopy,
  nav: { features: 'Funzionalità', security: 'Sicurezza', plans: 'Piani', trust: 'Trust Center', login: 'Accedi', subscribe: 'Abbonati ora' },
  heroSubtitle: 'Risck comply aiuta i team europei a centralizzare evidenze, rischi, fornitori, ruoli e audit trail mantenendo i claim di sicurezza collegati all’implementazione documentata.',
  features: { ...englishCopy.features, eyebrow: 'Funzionalità', title: 'Cosa gestiscono i team in Risck comply' },
  pricing: { ...englishCopy.pricing, eyebrow: 'Piani', note: 'Gli impegni enterprise dipendono dal contratto firmato e dalle evidenze disponibili. Risck comply non afferma SOC 2, certificazione ISO 27001, pentest di terze parti completato o restore backup testato.' },
  finalCta: { title: 'Dai ai buyer evidenze valutabili, non claim da decifrare.', button: 'Abbonati a Risck comply', subtitle: 'Consulta il Trust Center prima del procurement.' },
};

const germanCopy: LandingCopy = {
  ...englishCopy,
  nav: { features: 'Funktionen', security: 'Sicherheit', plans: 'Pläne', trust: 'Trust Center', login: 'Anmelden', subscribe: 'Jetzt abonnieren' },
  heroSubtitle: 'Risck comply hilft europäischen Teams, Evidenz, Risiken, Lieferanten, Rollen und Audit Trails zu zentralisieren und Security Claims an dokumentierte Umsetzung zu binden.',
  features: { ...englishCopy.features, eyebrow: 'Funktionen', title: 'Was Teams in Risck comply betreiben' },
  pricing: { ...englishCopy.pricing, eyebrow: 'Pläne', note: 'Enterprise Security Commitments hängen vom unterschriebenen Vertrag und verfügbarer Evidenz ab. Risck comply behauptet derzeit weder SOC 2 noch ISO 27001 Zertifizierung, abgeschlossenen Drittanbieter-Pentest oder getestete Backup-Wiederherstellung.' },
  finalCta: { title: 'Geben Sie Käufern bewertbare Evidenz statt Claims zum Entschlüsseln.', button: 'Risck comply abonnieren', subtitle: 'Prüfen Sie das Trust Center vor dem Procurement.' },
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
          <Link href={`/${activeLocale}`} className="flex items-center gap-3" aria-label="Risck comply home">
            <Image src="/brand/risck-comply-wordmark.svg" alt="Risck comply" width={180} height={44} className="h-10 w-auto object-contain" priority />
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

await risckComply.procurement.review({
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
