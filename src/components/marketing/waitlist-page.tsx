'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Building2,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Database,
  FileCheck2,
  FileText,
  Fingerprint,
  Layers3,
  LockKeyhole,
  Menu,
  Radar,
  ShieldCheck,
  Sparkles,
  Users,
  Workflow,
  X,
} from 'lucide-react';
import { useState } from 'react';

import { LanguageSwitcher } from '@/components/i18n/language-switcher';
import { PublicFooter } from '@/components/marketing/public-footer';
import { LOCALE_META, locales, type Locale } from '@/lib/i18n/routing';

type Feature = { title: string; description: string; icon: typeof ShieldCheck };

type LandingCopy = {
  nav: { platform: string; workflows: string; security: string; pricing: string; login: string; signup: string };
  eyebrow: string;
  title: string;
  subtitle: string;
  primaryCta: string;
  secondaryCta: string;
  trust: string[];
  sourceEyebrow: string;
  sourceTitle: string;
  sourceText: string;
  workflowEyebrow: string;
  workflowTitle: string;
  workflowText: string;
  securityEyebrow: string;
  securityTitle: string;
  securityText: string;
  finalTitle: string;
  finalText: string;
  features: Feature[];
  workflowSteps: string[];
};

const feature = (title: string, description: string, icon: typeof ShieldCheck): Feature => ({ title, description, icon });

const en: LandingCopy = {
  nav: { platform: 'Platform', workflows: 'Workflows', security: 'Security', pricing: 'Pricing', login: 'Sign in', signup: 'Create account' },
  eyebrow: 'AI governance operations for European teams',
  title: 'Turn AI governance into evidence ready for review.',
  subtitle: 'Bring AI inventory, risk assessments, evidence, policies, owners and activity history into one controlled workspace for compliance, security, legal and procurement teams.',
  primaryCta: 'Create account',
  secondaryCta: 'Explore the platform',
  trust: ['Organization workspaces', 'Role-based access', 'Activity history', 'Evidence workflows'],
  sourceEyebrow: 'One operational source of truth',
  sourceTitle: 'Know what AI is used, who owns it and what needs attention.',
  sourceText: 'Replace scattered spreadsheets and inbox threads with structured records, clear ownership and reviewable governance workflows.',
  workflowEyebrow: 'From discovery to review',
  workflowTitle: 'A practical operating flow for AI governance.',
  workflowText: 'Move every system through a clear path without turning governance into a maze of disconnected documents.',
  securityEyebrow: 'Controlled by design',
  securityTitle: 'Built for teams that need traceability, access control and clean evidence.',
  securityText: 'RISCK COMPLY supports professional governance operations. It does not replace legal counsel or guarantee regulatory outcomes.',
  finalTitle: 'Make AI governance easier to operate and easier to review.',
  finalText: 'Create your workspace and start organizing systems, responsibilities, risks and evidence in one place.',
  features: [
    feature('AI system inventory', 'Register systems, use cases, providers, departments, countries and data context.', Database),
    feature('Risk assessments', 'Capture risk signals, review status and structured assessment context.', Radar),
    feature('Evidence packs', 'Organize documents, decisions and supporting records for review.', ClipboardCheck),
    feature('Policies and documents', 'Prepare and maintain governance documentation in one workspace.', FileText),
    feature('Owners and tasks', 'Assign accountability and keep follow-up work visible across teams.', Users),
    feature('Activity history', 'Keep governance actions and evidence changes traceable over time.', ShieldCheck),
  ],
  workflowSteps: ['Discover', 'Register', 'Assess', 'Assign', 'Document', 'Review', 'Monitor'],
};

const pt: LandingCopy = {
  nav: { platform: 'Plataforma', workflows: 'Workflows', security: 'Segurança', pricing: 'Preços', login: 'Entrar', signup: 'Criar conta' },
  eyebrow: 'Operações de governança de IA para equipas europeias',
  title: 'Transforme governança de IA em evidência pronta para revisão.',
  subtitle: 'Reúna inventário de IA, avaliações de risco, evidências, políticas, responsáveis e histórico de atividade num workspace controlado para equipas de compliance, segurança, jurídico e procurement.',
  primaryCta: 'Criar conta',
  secondaryCta: 'Explorar a plataforma',
  trust: ['Workspaces por organização', 'Controlo por função', 'Histórico de atividade', 'Workflows de evidência'],
  sourceEyebrow: 'Uma fonte operacional de verdade',
  sourceTitle: 'Saiba que IA é utilizada, quem é responsável e o que exige atenção.',
  sourceText: 'Substitua folhas de cálculo dispersas e conversas por email por registos estruturados, responsabilidades claras e workflows de governança preparados para revisão.',
  workflowEyebrow: 'Da descoberta à revisão',
  workflowTitle: 'Um fluxo prático para operar governança de IA.',
  workflowText: 'Conduza cada sistema por um processo claro sem transformar governança num labirinto de documentos desligados.',
  securityEyebrow: 'Controlo desde a base',
  securityTitle: 'Criado para equipas que precisam de rastreabilidade, controlo de acesso e evidência organizada.',
  securityText: 'A RISCK COMPLY apoia operações profissionais de governança. Não substitui aconselhamento jurídico nem garante resultados regulatórios.',
  finalTitle: 'Torne a governança de IA mais simples de operar e de rever.',
  finalText: 'Crie o seu workspace e comece a organizar sistemas, responsáveis, riscos e evidências num único lugar.',
  features: [
    feature('Inventário de sistemas de IA', 'Registe sistemas, casos de uso, fornecedores, departamentos, países e contexto de dados.', Database),
    feature('Avaliações de risco', 'Registe sinais de risco, estado de revisão e contexto estruturado de avaliação.', Radar),
    feature('Packs de evidência', 'Organize documentos, decisões e registos de suporte para revisão.', ClipboardCheck),
    feature('Políticas e documentos', 'Prepare e mantenha documentação de governança num único workspace.', FileText),
    feature('Responsáveis e tarefas', 'Atribua responsabilidades e mantenha o acompanhamento visível entre equipas.', Users),
    feature('Histórico de atividade', 'Mantenha ações de governança e alterações de evidência rastreáveis ao longo do tempo.', ShieldCheck),
  ],
  workflowSteps: ['Descobrir', 'Registar', 'Avaliar', 'Atribuir', 'Documentar', 'Rever', 'Monitorizar'],
};

const copyByLocale: Record<Locale, LandingCopy> = { en, pt, es: en, fr: en, it: en, de: en };

function ProductPreview({ locale }: { locale: Locale }) {
  const isPt = locale === 'pt';
  return (
    <div className="relative mx-auto w-full max-w-[680px] rounded-[2rem] border border-white/15 bg-[#071017]/90 p-3 shadow-[0_40px_120px_rgba(0,0,0,.65)] backdrop-blur-2xl">
      <div className="overflow-hidden rounded-[1.45rem] border border-white/10 bg-[#09131c]">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-emerald-300" /><span className="text-xs font-semibold text-white/70">RISCK COMPLY</span></div>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">{isPt ? 'Workspace ativo' : 'Active workspace'}</span>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-[1.4fr_.8fr]">
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
            <div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-[0.2em] text-cyan-100/55">{isPt ? 'Governança de IA' : 'AI governance'}</p><h3 className="mt-2 text-lg font-semibold text-white">{isPt ? 'Visão operacional' : 'Operational overview'}</h3></div><BarChart3 className="h-5 w-5 text-cyan-100/70" /></div>
            <div className="mt-5 grid grid-cols-3 gap-2">
              {[['24', isPt ? 'Sistemas' : 'Systems'], ['08', isPt ? 'Em revisão' : 'In review'], ['17', isPt ? 'Evidências' : 'Evidence']].map(([value, label]) => <div key={label} className="rounded-xl border border-white/10 bg-black/20 p-3"><p className="text-2xl font-semibold text-white">{value}</p><p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-white/38">{label}</p></div>)}
            </div>
            <div className="mt-4 space-y-2">
              {[
                [isPt ? 'Assistente de suporte' : 'Support assistant', isPt ? 'Risco limitado' : 'Limited risk', '82%'],
                [isPt ? 'Triagem de candidatos' : 'Candidate screening', isPt ? 'Revisão necessária' : 'Review required', '64%'],
                [isPt ? 'Análise documental' : 'Document analysis', isPt ? 'Em acompanhamento' : 'Monitoring', '91%'],
              ].map(([name, status, score]) => <div key={name} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.025] px-3 py-3"><div><p className="text-sm font-medium text-white/85">{name}</p><p className="mt-1 text-xs text-white/38">{status}</p></div><span className="text-sm font-semibold text-emerald-100">{score}</span></div>)}
            </div>
          </div>
          <div className="space-y-3">
            <div className="rounded-2xl border border-emerald-200/15 bg-emerald-300/[0.055] p-4"><FileCheck2 className="h-5 w-5 text-emerald-100" /><p className="mt-4 text-sm font-semibold text-white">{isPt ? 'Pack de evidência' : 'Evidence pack'}</p><p className="mt-2 text-xs leading-5 text-white/45">{isPt ? 'Decisões, responsáveis e documentos organizados para revisão.' : 'Decisions, owners and documents organized for review.'}</p></div>
            <div className="rounded-2xl border border-cyan-200/15 bg-cyan-300/[0.045] p-4"><Workflow className="h-5 w-5 text-cyan-100" /><p className="mt-4 text-sm font-semibold text-white">{isPt ? 'Próximas ações' : 'Next actions'}</p><div className="mt-3 space-y-2">{[isPt ? 'Validar responsável' : 'Validate owner', isPt ? 'Rever risco' : 'Review risk', isPt ? 'Anexar política' : 'Attach policy'].map((item) => <div key={item} className="flex items-center gap-2 text-xs text-white/48"><CheckCircle2 className="h-3.5 w-3.5 text-cyan-100/65" />{item}</div>)}</div></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureMarquee({ features }: { features: Feature[] }) {
  const items = [...features, ...features];
  return (
    <div className="relative overflow-hidden border-y border-white/10 bg-white/[0.025] py-4 [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
      <div className="flex w-max animate-[marquee_34s_linear_infinite] gap-3 motion-reduce:animate-none">
        {items.map(({ title, icon: Icon }, index) => <div key={`${title}-${index}`} aria-hidden={index >= features.length} className="flex items-center gap-3 rounded-full border border-white/10 bg-[#0a141b]/90 px-4 py-2.5 text-sm text-white/68"><Icon className="h-4 w-4 text-cyan-100/70" /><span>{title}</span></div>)}
      </div>
    </div>
  );
}

export function WaitlistPage({ locale }: { locale: string }) {
  const activeLocale = (locales.includes(locale as Locale) ? locale : 'en') as Locale;
  const copy = copyByLocale[activeLocale] ?? en;
  const localeName = LOCALE_META[activeLocale].nativeName ?? LOCALE_META[activeLocale].name;
  const [menuOpen, setMenuOpen] = useState(false);
  const loginHref = `/${activeLocale}/login`;
  const signupHref = `/${activeLocale}/signup`;
  const pricingHref = `/${activeLocale}/pricing`;

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#040707] text-white">
      <style>{`@keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}`}</style>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#040707]/78 backdrop-blur-2xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8" aria-label="Primary navigation">
          <Link href={`/${activeLocale}`} className="flex items-center gap-3" aria-label="RISCK COMPLY home"><Image src="/brand/risck-comply-wordmark.svg?v=20260801" alt="RISCK COMPLY" width={180} height={44} className="h-10 w-auto" priority unoptimized /></Link>
          <div className="hidden items-center gap-7 text-sm text-white/56 lg:flex"><a href="#platform" className="transition hover:text-white">{copy.nav.platform}</a><a href="#workflows" className="transition hover:text-white">{copy.nav.workflows}</a><a href="#security" className="transition hover:text-white">{copy.nav.security}</a><Link href={pricingHref} className="transition hover:text-white">{copy.nav.pricing}</Link></div>
          <div className="hidden items-center gap-3 lg:flex"><span className="sr-only">{localeName}</span><LanguageSwitcher currentLocale={activeLocale} variant="dark" compact /><Link href={loginHref} className="rounded-full px-4 py-2.5 text-sm font-semibold text-white/72 transition hover:bg-white/[0.06] hover:text-white">{copy.nav.login}</Link><Link href={signupHref} className="group inline-flex items-center gap-2 rounded-full border border-emerald-100/30 bg-[linear-gradient(180deg,#eafff5,#b9f6d5)] px-5 py-2.5 text-sm font-bold text-[#07110c] shadow-[0_12px_40px_rgba(52,211,153,.18),inset_0_1px_0_rgba(255,255,255,.9)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_50px_rgba(52,211,153,.25)]">{copy.nav.signup}<ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></Link></div>
          <button type="button" className="rounded-xl border border-white/10 p-2 text-white lg:hidden" aria-expanded={menuOpen} aria-controls="mobile-nav" onClick={() => setMenuOpen((value) => !value)}>{menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
        </nav>
        {menuOpen ? <div id="mobile-nav" className="border-t border-white/10 bg-[#07100f] px-4 py-4 lg:hidden"><div className="grid gap-2"><a href="#platform" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-3 text-white/72">{copy.nav.platform}</a><a href="#workflows" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-3 text-white/72">{copy.nav.workflows}</a><a href="#security" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-3 text-white/72">{copy.nav.security}</a><Link href={pricingHref} className="rounded-xl px-3 py-3 text-white/72">{copy.nav.pricing}</Link><div className="mt-2 flex items-center gap-2"><LanguageSwitcher currentLocale={activeLocale} variant="dark" compact /><Link href={loginHref} className="flex-1 rounded-xl border border-white/10 px-4 py-3 text-center text-sm font-semibold">{copy.nav.login}</Link><Link href={signupHref} className="flex-1 rounded-xl bg-emerald-100 px-4 py-3 text-center text-sm font-bold text-black">{copy.nav.signup}</Link></div></div></div> : null}
      </header>

      <section className="relative isolate min-h-[820px] overflow-hidden px-4 pb-20 pt-32 sm:px-6 lg:px-8 lg:pt-40" aria-labelledby="landing-title">
        <video className="absolute inset-0 -z-30 h-full w-full object-cover opacity-35 motion-reduce:hidden" autoPlay muted loop playsInline preload="metadata" aria-hidden="true"><source src="/marketing/risck-comply-enterprise-hero.webm" type="video/webm" /><source src="/marketing/risck-comply-enterprise-hero.mp4" type="video/mp4" /></video>
        <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_72%_30%,rgba(16,185,129,.20),transparent_30rem),radial-gradient(circle_at_12%_18%,rgba(14,165,233,.22),transparent_34rem),linear-gradient(90deg,rgba(4,7,7,.98)_0%,rgba(4,9,12,.86)_45%,rgba(4,7,7,.72)_100%)]" />
        <div className="absolute inset-0 -z-10 tech-grid opacity-20" />
        <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[.92fr_1.08fr] lg:items-center">
          <div className="max-w-3xl"><div className="inline-flex items-center gap-2 rounded-full border border-cyan-100/15 bg-cyan-100/[0.06] px-4 py-2 text-sm font-medium text-cyan-50/78"><Sparkles className="h-4 w-4" />{copy.eyebrow}</div><h1 id="landing-title" className="mt-7 text-5xl font-semibold leading-[1.01] tracking-[-0.065em] sm:text-6xl lg:text-7xl">{copy.title}</h1><p className="mt-7 max-w-2xl text-lg leading-8 text-white/62 sm:text-xl">{copy.subtitle}</p><div className="mt-9 flex flex-col gap-3 sm:flex-row"><Link href={signupHref} className="group inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-100/30 bg-[linear-gradient(180deg,#edfff7,#b8f7d6)] px-6 py-4 text-sm font-bold text-[#07110c] shadow-[0_16px_55px_rgba(52,211,153,.20),inset_0_1px_0_rgba(255,255,255,.95)] transition hover:-translate-y-0.5">{copy.primaryCta}<ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></Link><a href="#platform" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.055] px-6 py-4 text-sm font-semibold text-white transition hover:bg-white/[0.09]">{copy.secondaryCta}<ChevronRight className="h-4 w-4" /></a></div><div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs text-white/42">{copy.trust.map((item) => <span key={item} className="inline-flex items-center gap-2"><BadgeCheck className="h-3.5 w-3.5 text-emerald-100/70" />{item}</span>)}</div></div>
          <ProductPreview locale={activeLocale} />
        </div>
      </section>

      <FeatureMarquee features={copy.features} />

      <section id="platform" className="px-4 py-24 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><div className="max-w-3xl"><p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-100/55">{copy.sourceEyebrow}</p><h2 className="mt-5 text-4xl font-semibold tracking-[-0.05em] sm:text-6xl">{copy.sourceTitle}</h2><p className="mt-6 text-lg leading-8 text-white/55">{copy.sourceText}</p></div><div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{copy.features.map(({ title, description, icon: Icon }) => <article key={title} className="group rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,.055),rgba(255,255,255,.025))] p-6 transition hover:-translate-y-1 hover:border-cyan-100/20"><div className="inline-flex rounded-2xl border border-white/10 bg-black/20 p-3 text-cyan-100"><Icon className="h-5 w-5" /></div><h3 className="mt-6 text-xl font-semibold">{title}</h3><p className="mt-3 text-sm leading-7 text-white/48">{description}</p></article>)}</div></div></section>

      <section id="workflows" className="border-y border-white/10 bg-white/[0.02] px-4 py-24 sm:px-6 lg:px-8"><div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.8fr_1.2fr] lg:items-center"><div><p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-100/55">{copy.workflowEyebrow}</p><h2 className="mt-5 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">{copy.workflowTitle}</h2><p className="mt-6 text-lg leading-8 text-white/52">{copy.workflowText}</p></div><div className="grid gap-3 sm:grid-cols-2">{copy.workflowSteps.map((step, index) => <div key={step} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-black/20 p-4"><span className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-100/15 bg-emerald-200/[0.07] text-sm font-semibold text-emerald-100">{String(index + 1).padStart(2, '0')}</span><span className="font-medium text-white/78">{step}</span></div>)}</div></div></section>

      <section id="security" className="px-4 py-24 sm:px-6 lg:px-8"><div className="mx-auto grid max-w-7xl gap-10 rounded-[2.25rem] border border-white/10 bg-[radial-gradient(circle_at_80%_15%,rgba(16,185,129,.12),transparent_30rem),linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.02))] p-7 sm:p-10 lg:grid-cols-[1fr_.85fr] lg:p-14"><div><p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-100/55">{copy.securityEyebrow}</p><h2 className="mt-5 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">{copy.securityTitle}</h2><p className="mt-6 max-w-3xl text-base leading-8 text-white/52">{copy.securityText}</p></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">{[[Fingerprint, activeLocale === 'pt' ? 'Controlo de acesso por função' : 'Role-based access'], [Building2, activeLocale === 'pt' ? 'Isolamento por organização' : 'Organization isolation'], [LockKeyhole, activeLocale === 'pt' ? 'Rotas e sessões protegidas' : 'Protected routes and sessions'], [Layers3, activeLocale === 'pt' ? 'Histórico e rastreabilidade' : 'History and traceability']].map(([Icon, label]) => { const ItemIcon = Icon as typeof ShieldCheck; return <div key={String(label)} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-4"><ItemIcon className="h-5 w-5 text-emerald-100/75" /><span className="text-sm font-medium text-white/68">{String(label)}</span></div>; })}</div></div></section>

      <section className="px-4 pb-24 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl rounded-[2.25rem] border border-emerald-100/15 bg-[linear-gradient(135deg,rgba(10,48,40,.9),rgba(5,18,22,.95))] p-8 text-center shadow-[0_35px_100px_rgba(0,0,0,.35)] sm:p-14"><h2 className="mx-auto max-w-4xl text-4xl font-semibold tracking-[-0.05em] sm:text-6xl">{copy.finalTitle}</h2><p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-white/58">{copy.finalText}</p><div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row"><Link href={signupHref} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4 text-sm font-bold text-black transition hover:-translate-y-0.5 hover:bg-emerald-50">{copy.primaryCta}<ArrowRight className="h-4 w-4" /></Link><Link href={loginHref} className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/[0.05] px-6 py-4 text-sm font-semibold text-white transition hover:bg-white/[0.09]">{copy.nav.login}</Link></div></div></section>
      <PublicFooter locale={activeLocale} />
    </main>
  );
}
