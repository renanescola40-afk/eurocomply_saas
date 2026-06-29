import Image from 'next/image';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronRight,
  ClipboardCheck,
  Database,
  FileText,
  Scale,
  SearchCheck,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

import { LanguageSwitcher } from '@/components/i18n/language-switcher';
import { PublicFooter } from '@/components/marketing/public-footer';
import { BILLING_PLANS } from '@/lib/billing/plans';
import { LOCALE_META, locales, type Locale } from '@/lib/i18n/routing';

type Icon = typeof ShieldCheck;
type SectionCard = { title: string; text: string; icon: Icon };
type PlanMessaging = { tagline: string; cta: string; badge?: string };

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
  modules: { eyebrow: string; title: string; subtitle: string; cards: SectionCard[] };
  security: { eyebrow: string; title: string; subtitle: string; items: SectionCard[]; note: string };
  pricing: {
    eyebrow: string;
    title: string;
    subtitle: string;
    popular: string;
    period: string;
    note: string;
    salesTitle: string;
    salesText: string;
    salesCta: string;
    planMessaging: Record<string, PlanMessaging>;
  };
  finalCta: { title: string; subtitle: string; primary: string; secondary: string };
};

function iconCard(title: string, text: string, icon: Icon): SectionCard {
  return { title, text, icon };
}

const en: LandingCopy = {
  nav: { problem: 'Problem', platform: 'Platform', security: 'Security', pricing: 'Pricing', login: 'Log in', demo: 'Book demo' },
  badge: 'EU AI Act readiness workspace for European B2B teams',
  heroTitle: 'Turn scattered AI use into board-ready governance evidence.',
  heroSubtitle: 'RISCK COMPLY helps European teams map AI systems, classify risk, assign owners, generate policies and prepare evidence packs for AI Act readiness — without claiming legal guarantees or replacing counsel.',
  urgency: 'EU AI Act obligations are moving from legal memos into operating evidence. Buyers now expect a controlled record of what AI is used, who owns it, what risk it carries and what evidence exists.',
  buyerNote: 'Built for founders, CTOs, compliance officers, legal teams and security-conscious B2B buyers.',
  cta: { primary: 'Start Growth checkout', secondary: 'Book demo', waitlist: 'Join waitlist', sales: 'Talk to sales' },
  proof: ['AI inventory', 'risk classification', 'evidence packs', 'policy generator', 'audit trail'],
  problem: {
    eyebrow: 'The problem',
    title: 'AI compliance fails when evidence lives in chats, decks and forgotten spreadsheets.',
    subtitle: 'Enterprise buyers do not only ask whether you use AI. They ask where it is used, who approved it, how risk was assessed and which policies prove governance maturity.',
    cards: [
      iconCard('Unknown AI footprint', 'Teams adopt AI across product, support, HR and operations before compliance has a reliable inventory.', SearchCheck),
      iconCard('Risk without ownership', 'High-impact workflows need clear owners, rationale and follow-up actions — not a vague status column.', ShieldAlert),
      iconCard('Documents without traceability', 'Policies lose value when they are not connected to systems, evidence, owners and review history.', FileText),
    ],
  },
  modules: {
    eyebrow: 'Platform',
    title: 'A practical readiness operating system, not legal theatre.',
    subtitle: 'A clean workflow for registering AI systems, classifying risk and generating maintainable governance assets.',
    cards: [
      iconCard('AI system registry', 'Capture use case, department, provider, data context, owner and country in one workspace.', Database),
      iconCard('Risk classification', 'Turn AI Act readiness signals into prioritized actions and accountable owners.', Scale),
      iconCard('Evidence generation', 'Create policies, evidence packs and audit-ready summaries linked to the inventory.', ClipboardCheck),
    ],
  },
  security: {
    eyebrow: 'Security posture',
    title: 'Designed for buyers who ask hard questions before they pay.',
    subtitle: 'Billing, authentication and governance workflows are separated so sensitive provider data never lives in the browser.',
    items: [
      iconCard('Stripe-hosted checkout', 'Payment details are handled by Stripe Checkout, not collected inside the application UI.', ShieldCheck),
      iconCard('Workspace-linked subscriptions', 'Every checkout session is connected to the organization and synchronized by signed webhooks.', Database),
      iconCard('Audit-friendly flow', 'Billing mutations require server-side organization context, RBAC and step-up verification.', Sparkles),
    ],
    note: 'RISCK COMPLY supports readiness operations. It does not provide legal advice, certification or a compliance guarantee.',
  },
  pricing: {
    eyebrow: 'Pricing',
    title: 'Self-serve plans now match the Stripe billing catalog exactly.',
    subtitle: 'The public plan buttons route through the secure checkout page using canonical plan ids: Starter, Growth and Enterprise.',
    popular: 'Most chosen',
    period: '/month',
    note: 'Prices shown here are the app billing catalog prices. Stripe Price IDs stay server-side and are never exposed to the browser.',
    salesTitle: 'Need procurement terms?',
    salesText: 'For custom procurement, assisted rollout, security review or support terms, talk to sales instead of self-serve checkout.',
    salesCta: 'Talk to sales',
    planMessaging: {
      starter: { tagline: 'For small teams replacing spreadsheets with a controlled AI compliance workspace.', cta: 'Start Starter' },
      growth: { tagline: 'For SaaS, fintech and HR teams preparing structured AI Act readiness evidence.', cta: 'Start Growth', badge: 'Most chosen' },
      enterprise: { tagline: 'For regulated teams that need expanded limits, long audit retention and priority support.', cta: 'Start Enterprise' },
    },
  },
  finalCta: { title: 'Build the AI governance layer before buyers ask for it.', subtitle: 'Start with a controlled inventory, evidence packs and a Stripe-backed subscription flow that is ready for serious B2B buyers.', primary: 'Start checkout', secondary: 'Book demo' },
};

const pt: LandingCopy = {
  ...en,
  nav: { problem: 'Problema', platform: 'Plataforma', security: 'Segurança', pricing: 'Preços', login: 'Entrar', demo: 'Marcar demo' },
  badge: 'Workspace de AI Act readiness para equipas B2B europeias',
  heroTitle: 'Transforme o uso disperso de IA em evidência de governança pronta para compradores.',
  heroSubtitle: 'RISCK COMPLY ajuda equipas europeias a mapear sistemas de IA, classificar risco, atribuir owners, gerar políticas e preparar evidence packs — sem prometer garantia legal nem substituir aconselhamento jurídico.',
  urgency: 'As obrigações do EU AI Act estão a sair dos memorandos jurídicos e a entrar na operação. Compradores esperam evidência controlada: que IA é usada, quem é responsável, qual é o risco e que documentação existe.',
  buyerNote: 'Criado para founders, CTOs, compliance officers, equipas jurídicas e compradores B2B focados em segurança.',
  cta: { primary: 'Iniciar checkout Growth', secondary: 'Marcar demo', waitlist: 'Entrar na lista', sales: 'Falar com vendas' },
  problem: {
    eyebrow: 'O problema',
    title: 'Compliance de IA falha quando a evidência vive em chats, decks e folhas de cálculo esquecidas.',
    subtitle: 'Compradores enterprise querem saber onde a IA é usada, quem aprovou, como o risco foi avaliado e quais políticas provam maturidade de governança.',
    cards: [
      iconCard('Uso de IA invisível', 'Equipas adotam IA em produto, suporte, RH e operações antes de compliance ter um inventário fiável.', SearchCheck),
      iconCard('Risco sem ownership', 'Workflows sensíveis precisam de owners, racional e próximas ações — não apenas uma coluna vaga de status.', ShieldAlert),
      iconCard('Documentos sem rastreabilidade', 'Políticas perdem valor quando não estão ligadas a sistemas, evidências, owners e histórico de revisão.', FileText),
    ],
  },
  modules: {
    ...en.modules,
    eyebrow: 'Plataforma',
    title: 'Um sistema operacional de readiness, não teatro jurídico.',
    subtitle: 'Um fluxo limpo para registrar sistemas de IA, classificar risco e gerar ativos de governança mantíveis.',
  },
  security: {
    ...en.security,
    eyebrow: 'Postura de segurança',
    title: 'Desenhado para compradores que fazem perguntas difíceis antes de pagar.',
    note: 'RISCK COMPLY apoia operações de readiness. Não fornece aconselhamento jurídico, certificação ou garantia de compliance.',
  },
  pricing: {
    ...en.pricing,
    eyebrow: 'Preços',
    title: 'Os planos self-serve agora batem exatamente com o catálogo Stripe.',
    subtitle: 'Os botões públicos usam os planos canónicos: Starter, Growth e Enterprise.',
    period: '/mês',
    note: 'Os preços vêm do catálogo interno da aplicação. Stripe Price IDs ficam apenas no servidor e nunca aparecem no browser.',
    salesTitle: 'Precisa de procurement?',
    salesText: 'Para rollout assistido, revisão de segurança ou termos personalizados, fale com vendas em vez de checkout self-serve.',
    salesCta: 'Falar com vendas',
    planMessaging: {
      starter: { tagline: 'Para equipas pequenas que querem substituir folhas de cálculo por um workspace controlado.', cta: 'Começar Starter' },
      growth: { tagline: 'Para SaaS, fintech e HR teams a preparar evidências estruturadas de AI Act readiness.', cta: 'Começar Growth', badge: 'Mais escolhido' },
      enterprise: { tagline: 'Para equipas reguladas que precisam de limites maiores, retenção longa e suporte prioritário.', cta: 'Começar Enterprise' },
    },
  },
  finalCta: { title: 'Construa a camada de governança de IA antes dos compradores pedirem.', subtitle: 'Comece com inventário controlado, evidence packs e um fluxo Stripe pronto para B2B sério.', primary: 'Iniciar checkout', secondary: 'Marcar demo' },
};

const landingCopy: Record<Locale, LandingCopy> = {
  en,
  pt,
  es: en,
  fr: en,
  it: en,
  de: en,
};

function href(locale: Locale, path: string) {
  return `/${locale}${path}`;
}

function checkoutHref(locale: Locale, planId: string) {
  return href(locale, `/checkout?plan=${encodeURIComponent(planId)}`);
}

function signupHref(locale: Locale, planId = 'growth') {
  const next = `/${locale}/checkout?plan=${encodeURIComponent(planId)}`;
  return href(locale, `/signup?plan=${encodeURIComponent(planId)}&next=${encodeURIComponent(next)}`);
}

function contactHref(locale: Locale, intent: 'demo' | 'sales') {
  return href(locale, `/contact?intent=${intent}`);
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
  const copy = landingCopy[activeLocale] ?? landingCopy.en;
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
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-cyan-300/[0.06] px-4 py-2 text-sm font-medium text-cyan-50/82"><ShieldCheck className="h-4 w-4" /> {copy.badge}</div>
            <h1 className="mt-8 max-w-5xl text-5xl font-semibold leading-[1.02] tracking-[-0.067em] text-white sm:text-6xl lg:text-7xl">{copy.heroTitle}</h1>
            <p className="mt-7 max-w-3xl text-lg leading-8 text-white/66 sm:text-xl">{copy.heroSubtitle}</p>
            <div className="mt-6 rounded-3xl border border-amber-300/20 bg-amber-300/[0.06] p-4 text-sm leading-6 text-amber-50/78"><AlertTriangle className="mr-2 inline h-4 w-4" />{copy.urgency}</div>
            <div className="mt-6 flex flex-wrap gap-2">{copy.proof.map((item) => <span key={item} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white/52">{item}</span>)}</div>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href={signupHref(activeLocale, 'growth')} className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-4 text-base font-bold text-black shadow-[0_0_50px_rgba(255,255,255,.18)] transition hover:bg-zinc-200">{copy.cta.primary} <ChevronRight className="h-4 w-4" /></Link>
              <Link href={contactHref(activeLocale, 'demo')} className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/[0.04] px-7 py-4 text-base font-bold text-white backdrop-blur transition hover:bg-white/10">{copy.cta.secondary}</Link>
              <Link href={signupHref(activeLocale, 'starter')} className="inline-flex items-center justify-center rounded-full border border-cyan-200/20 bg-cyan-300/[0.06] px-7 py-4 text-base font-bold text-cyan-50 transition hover:bg-cyan-300/10">{copy.cta.waitlist}</Link>
            </div>
            <p className="mt-5 max-w-2xl text-xs leading-6 text-white/42">{copy.buyerNote}</p>
          </div>

          <div className="premium-card rounded-[2rem] p-5 shadow-2xl">
            <div className="rounded-[1.5rem] border border-white/10 bg-black/35 p-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.26em] text-white/35">Live checkout path</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Billing readiness panel</h2>
                </div>
                <span className="rounded-full border border-emerald-200/25 bg-emerald-300/10 px-3 py-1 text-xs font-semibold text-emerald-100">Stripe hosted</span>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"><p className="text-3xl font-semibold text-white">3</p><p className="mt-2 text-sm text-white/42">canonical paid plans</p></div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"><p className="text-3xl font-semibold text-white">0</p><p className="mt-2 text-sm text-white/42">public price IDs exposed</p></div>
              </div>
              <div className="mt-6 space-y-3">
                {['Pricing CTA → /checkout?plan=<canonical-id>', 'Checkout API enforces organization, RBAC and step-up', 'Stripe webhook synchronizes the subscription after confirmation'].map((item) => <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-6 text-white/62"><Check className="mt-1 h-4 w-4 shrink-0 text-cyan-100" /> {item}</div>)}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="problem" className="relative z-10 border-y border-white/10 bg-white/[0.02] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl"><SectionHeading {...copy.problem} /><div className="mt-10 grid gap-4 md:grid-cols-3">{copy.problem.cards.map(({ title, text, icon: IconComponent }) => <article key={title} className="premium-card premium-card-hover rounded-[1.75rem] p-6"><IconComponent className="h-6 w-6 text-cyan-100" /><h3 className="mt-5 text-xl font-semibold text-white">{title}</h3><p className="mt-3 text-sm leading-6 text-white/54">{text}</p></article>)}</div></div>
      </section>

      <section id="platform" className="relative z-10 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl"><SectionHeading {...copy.modules} /><div className="mt-10 grid gap-4 md:grid-cols-3">{copy.modules.cards.map(({ title, text, icon: IconComponent }) => <article key={title} className="premium-card premium-card-hover rounded-[1.75rem] p-6"><div className="w-fit rounded-2xl bg-white/10 p-3 text-white"><IconComponent className="h-5 w-5" /></div><h3 className="mt-5 text-xl font-semibold text-white">{title}</h3><p className="mt-3 text-sm leading-6 text-white/52">{text}</p></article>)}</div></div>
      </section>

      <section id="security" className="relative z-10 border-y border-white/10 bg-white/[0.02] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl"><SectionHeading eyebrow={copy.security.eyebrow} title={copy.security.title} subtitle={copy.security.subtitle} /><div className="mt-10 grid gap-4 md:grid-cols-3">{copy.security.items.map(({ title, text, icon: IconComponent }) => <article key={title} className="rounded-3xl border border-white/10 bg-black/20 p-5"><IconComponent className="h-5 w-5 text-white" /><h3 className="mt-4 font-semibold text-white">{title}</h3><p className="mt-2 text-sm leading-6 text-white/48">{text}</p></article>)}</div><p className="mt-6 rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] p-4 text-sm leading-6 text-amber-50/76">{copy.security.note}</p></div>
      </section>

      <section id="pricing" className="relative z-10 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeading eyebrow={copy.pricing.eyebrow} title={copy.pricing.title} subtitle={copy.pricing.subtitle} />
          <div className="mt-10 grid gap-4 lg:grid-cols-4">
            {BILLING_PLANS.map((plan) => {
              const messaging = copy.pricing.planMessaging[plan.id] ?? copy.pricing.planMessaging.growth;
              const isHighlighted = plan.id === 'growth';

              return (
                <article key={plan.id} className={`flex rounded-[1.75rem] border p-6 ${isHighlighted ? 'border-white/35 bg-white text-black shadow-[0_24px_90px_rgba(255,255,255,.12)]' : 'border-white/10 bg-white/[0.035] text-white'}`}>
                  <div className="flex flex-1 flex-col">
                    <div className="flex items-center justify-between gap-4">
                      <h3 className="text-xl font-semibold">{plan.name}</h3>
                      {messaging.badge ? <span className={`rounded-full px-3 py-1 text-xs font-bold ${isHighlighted ? 'bg-black text-white' : 'border border-white/10 text-white/60'}`}>{messaging.badge}</span> : null}
                    </div>
                    <p className={`mt-3 text-sm leading-6 ${isHighlighted ? 'text-black/58' : 'text-white/52'}`}>{messaging.tagline}</p>
                    <p className="mt-6 text-4xl font-semibold tracking-[-0.04em]">€{plan.priceMonthly}<span className={`text-sm font-normal ${isHighlighted ? 'text-black/50' : 'text-white/42'}`}>{copy.pricing.period}</span></p>
                    <ul className={`mt-6 space-y-2 text-sm ${isHighlighted ? 'text-black/64' : 'text-white/54'}`}>{plan.features.map((feature) => <li key={feature} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0" /> {feature}</li>)}</ul>
                    <Link href={checkoutHref(activeLocale, plan.id)} className={`mt-auto inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-bold ${isHighlighted ? 'bg-black text-white hover:bg-zinc-800' : 'border border-white/15 bg-white/[0.04] text-white hover:bg-white/10'}`}>{messaging.cta} <ChevronRight className="h-4 w-4" /></Link>
                  </div>
                </article>
              );
            })}
            <article className="flex rounded-[1.75rem] border border-cyan-200/20 bg-cyan-300/[0.055] p-6 text-white">
              <div className="flex flex-1 flex-col">
                <h3 className="text-xl font-semibold">{copy.pricing.salesTitle}</h3>
                <p className="mt-3 text-sm leading-6 text-white/58">{copy.pricing.salesText}</p>
                <div className="mt-6 rounded-2xl border border-white/10 bg-black/25 p-4 text-sm text-white/60">Security review · DPA · assisted onboarding · support terms</div>
                <Link href={contactHref(activeLocale, 'sales')} className="mt-auto inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-black hover:bg-zinc-200">{copy.pricing.salesCta} <ArrowRight className="h-4 w-4" /></Link>
              </div>
            </article>
          </div>
          <p className="mt-6 text-xs leading-6 text-white/38">{copy.pricing.note}</p>
        </div>
      </section>

      <section className="relative z-10 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-[2rem] border border-cyan-200/15 bg-cyan-300/[0.045] p-7 md:p-10">
          <div className="grid gap-8 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
            <SectionHeading eyebrow="Ready" title={copy.finalCta.title} subtitle={copy.finalCta.subtitle} />
            <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
              <Link href={signupHref(activeLocale, 'growth')} className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-black hover:bg-zinc-200">{copy.finalCta.primary} <ChevronRight className="h-4 w-4" /></Link>
              <Link href={contactHref(activeLocale, 'demo')} className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-6 py-3 text-sm font-bold text-white hover:bg-white/10">{copy.finalCta.secondary} <ArrowRight className="h-4 w-4" /></Link>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter locale={activeLocale} />
    </main>
  );
}
