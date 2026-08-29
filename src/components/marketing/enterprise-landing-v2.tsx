'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, FileCheck2, Menu, Radar, ShieldCheck, Workflow, X } from 'lucide-react';
import { useState } from 'react';

import { LanguageSwitcher } from '@/components/i18n/language-switcher';
import { PublicFooter } from '@/components/marketing/public-footer';
import { locales, type Locale } from '@/lib/i18n/routing';

type LandingCopy = {
  nav: { product: string; solutions: string; resources: string; pricing: string; about: string; login: string; demo: string };
  badge: string;
  titleA: string;
  titleB: string;
  subtitle: string;
  primary: string;
  secondary: string;
  trust: Array<{ title: string; text: string }>;
  platformEyebrow: string;
  platformTitle: string;
  platformText: string;
  features: Array<{ title: string; text: string }>;
  finalTitle: string;
  finalText: string;
};

const en: LandingCopy = {
  nav: { product: 'Product', solutions: 'Solutions', resources: 'Resources', pricing: 'Pricing', about: 'About', login: 'Log in', demo: 'Book a Demo' },
  badge: 'EU AI Act Ready',
  titleA: 'AI Governance', titleB: 'Made Simple.',
  subtitle: 'The all-in-one platform to manage AI risk, organize governance evidence and build a review-ready operating model for European teams.',
  primary: 'Book a Demo', secondary: 'See How It Works',
  trust: [
    { title: 'AI Act workflows', text: 'Structured governance operations for EU AI Act readiness.' },
    { title: 'Controlled by design', text: 'Role-based access, protected sessions and organization isolation.' },
    { title: 'From discovery to review', text: 'From AI inventory to evidence, owners, actions and review.' },
    { title: 'Audit ready', text: 'Traceable activity and evidence preparation for review.' },
  ],
  platformEyebrow: 'Enterprise governance control plane',
  platformTitle: 'One operational source of truth for AI governance.',
  platformText: 'RISCK COMPLY brings inventory, risk, evidence, ownership and follow-up work into one controlled workspace for compliance, security, legal and procurement teams.',
  features: [
    { title: 'AI inventory', text: 'Map systems, providers, departments, owners, countries and lifecycle state.' },
    { title: 'Risk & FRIA', text: 'Structure assessments, attention signals, rationale and remediation work.' },
    { title: 'Evidence vault', text: 'Keep policies, evidence items, decisions and supporting records ready for review.' },
    { title: 'Operational actions', text: 'Assign accountable owners, deadlines and governance work across teams.' },
  ],
  finalTitle: 'Run AI governance like an enterprise operation.',
  finalText: 'Bring your AI systems, risks, responsibilities and evidence into one controlled operating layer.',
};

const pt: LandingCopy = {
  nav: { product: 'Produto', solutions: 'Soluções', resources: 'Recursos', pricing: 'Preços', about: 'Sobre', login: 'Entrar', demo: 'Marcar Demo' },
  badge: 'Preparado para o EU AI Act',
  titleA: 'Governança de IA', titleB: 'Mais Simples.',
  subtitle: 'A plataforma para gerir risco de IA, organizar evidências de governança e criar uma operação preparada para revisão para equipas europeias.',
  primary: 'Marcar Demo', secondary: 'Ver Como Funciona',
  trust: [
    { title: 'Workflows AI Act', text: 'Operações estruturadas de governança para preparação ao EU AI Act.' },
    { title: 'Segurança enterprise', text: 'Acesso por função, sessões protegidas e isolamento por organização.' },
    { title: 'Governança ponta a ponta', text: 'Do inventário de IA às evidências, responsáveis, ações e revisão.' },
    { title: 'Pronto para auditoria', text: 'Atividade rastreável e preparação de evidências para revisão.' },
  ],
  platformEyebrow: 'Plano de controlo de governança enterprise',
  platformTitle: 'Visibilidade pronta para decisão em vez de mais um dashboard cheio de ruído.',
  platformText: 'A RISCK COMPLY reúne inventário, risco, evidências, responsabilidades e acompanhamento num workspace controlado para compliance, segurança, jurídico e procurement.',
  features: [
    { title: 'Inventário de IA', text: 'Mapeie sistemas, fornecedores, departamentos, responsáveis, países e ciclo de vida.' },
    { title: 'Risco & FRIA', text: 'Estruture avaliações, sinais de atenção, fundamentação e remediação.' },
    { title: 'Cofre de evidências', text: 'Mantenha políticas, evidências, decisões e registos preparados para revisão.' },
    { title: 'Ações operacionais', text: 'Atribua responsáveis, prazos e trabalho de governança entre equipas.' },
  ],
  finalTitle: 'Opere governança de IA como uma função enterprise.',
  finalText: 'Reúna sistemas de IA, riscos, responsabilidades e evidências numa única camada operacional controlada.',
};

function safeLocale(value: string): Locale {
  return (locales.includes(value as Locale) ? value : 'en') as Locale;
}

function DashboardPreview({ locale }: { locale: Locale }) {
  const isPt = locale === 'pt';
  const riskRows = [
    ['High', '3', '12%', '↓ 1'],
    ['Medium', '8', '33%', '→'],
    ['Low', '13', '55%', '↑ 1'],
  ];
  const maturity = [
    [isPt ? 'Gestão de risco' : 'Risk management', '90%'],
    [isPt ? 'Governança de dados' : 'Data governance', '85%'],
    [isPt ? 'Transparência' : 'Transparency', '80%'],
    [isPt ? 'Supervisão humana' : 'Human oversight', '75%'],
  ];

  return (
    <div className="relative mx-auto w-full max-w-[760px]">
      <div className="absolute -inset-12 -z-10 rounded-full bg-blue-600/10 blur-3xl" />
      <div className="overflow-hidden rounded-2xl border border-blue-400/20 bg-[#09111d]/95 shadow-[0_40px_120px_rgba(0,0,0,.62)]">
        <div className="flex h-12 items-center gap-3 border-b border-slate-800 px-4">
          <Image src="/brand/risck-comply-wordmark.svg" alt="RISCK COMPLY" width={150} height={30} className="h-6 w-auto" />
          <div className="ml-auto hidden h-7 w-44 rounded-md border border-slate-800 bg-slate-950/60 px-3 text-[9px] leading-7 text-slate-600 sm:block">Search anything...</div>
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600 text-[9px] font-bold text-white">AD</span>
        </div>

        <div className="grid sm:grid-cols-[54px_1fr]">
          <div className="hidden border-r border-slate-800 bg-[#080e18] p-2 sm:block">
            {[0, 1, 2, 3, 4, 5].map((item) => <div key={item} className={`mb-1 flex h-9 items-center justify-center rounded-md ${item === 0 ? 'bg-blue-500/10 text-blue-400' : 'text-slate-700'}`}><span className="h-2.5 w-2.5 rounded-sm border border-current" /></div>)}
          </div>
          <div className="p-4 sm:p-5">
            <p className="text-[10px] uppercase tracking-[0.16em] text-blue-400">{isPt ? 'Resumo executivo' : 'Executive summary'}</p>
            <h3 className="mt-1 text-lg font-semibold text-white">{isPt ? 'Visão Geral da Governança de IA' : 'AI Governance Overview'}</h3>
            <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-5">
              {[
                [isPt ? 'Prontidão' : 'Readiness', '87%'],
                [isPt ? 'Sistemas de IA' : 'AI systems', '24'],
                [isPt ? 'Alta atenção' : 'High attention', '3'],
                [isPt ? 'Ações abertas' : 'Open actions', '7'],
                [isPt ? 'Evidências' : 'Evidence ready', '92%'],
              ].map(([label, value]) => <div key={label} className="rounded-lg border border-slate-800 bg-[#0d1624] p-3"><p className="text-[9px] text-slate-500">{label}</p><p className="mt-2 font-mono text-xl font-semibold text-white tabular-nums">{value}</p></div>)}
            </div>

            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <div className="rounded-lg border border-slate-800 bg-[#0d1624] p-3">
                <p className="text-[10px] font-semibold text-slate-300">{isPt ? 'Distribuição de risco' : 'Risk distribution'}</p>
                <div className="mt-3 overflow-hidden rounded-md border border-slate-800/80 text-[9px]">
                  <div className="grid grid-cols-[1fr_42px_42px_42px] bg-slate-950/50 px-2 py-1.5 uppercase tracking-[0.08em] text-slate-700"><span>Risk</span><span className="text-right">Sys.</span><span className="text-right">%</span><span className="text-right">Trend</span></div>
                  {riskRows.map((row, index) => <div key={row[0]} className="grid grid-cols-[1fr_42px_42px_42px] border-t border-slate-800/70 px-2 py-2 text-slate-500"><span className="flex items-center gap-1.5 text-slate-400"><span className={`h-1.5 w-1.5 rounded-sm ${index === 0 ? 'bg-rose-500' : index === 1 ? 'bg-amber-400' : 'bg-emerald-400'}`} />{row[0]}</span><span className="text-right">{row[1]}</span><span className="text-right">{row[2]}</span><span className="text-right">{row[3]}</span></div>)}
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 bg-[#0d1624] p-3">
                <p className="text-[10px] font-semibold text-slate-300">{isPt ? 'Maturidade de compliance' : 'Compliance maturity'}</p>
                <div className="mt-3 space-y-3">
                  {maturity.map(([label, value], index) => <div key={label}><div className="flex justify-between text-[9px]"><span className="text-slate-500">{label}</span><span className="font-mono text-slate-400">{value}</span></div><div className="mt-1 h-1 rounded-full bg-slate-800"><div className={`h-1 rounded-full ${index === 3 ? 'bg-amber-400' : 'bg-emerald-400'}`} style={{ width: value }} /></div></div>)}
                </div>
              </div>
            </div>

            <div className="mt-3 rounded-lg border border-slate-800 bg-[#0d1624] p-3">
              <div className="flex items-center justify-between"><p className="text-[10px] font-semibold text-slate-300">{isPt ? 'Ações prioritárias' : 'High priority actions'}</p><span className="text-[9px] text-blue-400">{isPt ? 'Ver todas' : 'View all'}</span></div>
              <div className="mt-2 grid grid-cols-[70px_1fr_80px] border-y border-slate-800 py-2 text-[8px] uppercase tracking-[0.08em] text-slate-700"><span>Priority</span><span>Action</span><span>Status</span></div>
              {[[isPt ? 'Alta' : 'High', isPt ? 'Completar avaliação de risco' : 'Complete risk assessment', 'In progress'], [isPt ? 'Média' : 'Medium', isPt ? 'Atualizar controlos de dados' : 'Update data governance controls', 'Open']].map((row, index) => <div key={row[1]} className="grid grid-cols-[70px_1fr_80px] border-b border-slate-800/60 py-2 text-[9px]"><span className={index === 0 ? 'text-rose-400' : 'text-amber-400'}>{row[0]}</span><span className="truncate text-slate-400">{row[1]}</span><span className="text-slate-600">{row[2]}</span></div>)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function EnterpriseLandingV2({ locale: requestedLocale }: { locale: string }) {
  const locale = safeLocale(requestedLocale);
  const text = locale === 'pt' ? pt : en;
  const [mobileOpen, setMobileOpen] = useState(false);
  const demoHref = `/${locale}/book-demo`;
  const loginHref = `/${locale}/login`;
  const signupHref = `/${locale}/signup`;

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#050913] text-white">
      <header className="relative z-50 border-b border-white/[0.06] bg-[#050913]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
          <Link href={`/${locale}`} className="shrink-0" aria-label="RISCK COMPLY home"><Image src="/brand/risck-comply-wordmark.svg" alt="RISCK COMPLY" width={220} height={46} priority className="h-9 w-auto" /></Link>
          <nav className="mx-auto hidden items-center gap-8 text-sm font-medium text-slate-400 lg:flex">
            <a href="#platform" className="transition hover:text-white">{text.nav.product}</a><a href="#solutions" className="transition hover:text-white">{text.nav.solutions}</a><Link href={`/${locale}/resources`} className="transition hover:text-white">{text.nav.resources}</Link><Link href={`/${locale}/pricing`} className="transition hover:text-white">{text.nav.pricing}</Link><Link href={`/${locale}/about`} className="transition hover:text-white">{text.nav.about}</Link>
          </nav>
          <div className="ml-auto hidden items-center gap-3 lg:flex"><LanguageSwitcher currentLocale={locale} /><Link href={loginHref} className="px-3 py-2 text-sm font-medium text-slate-300 hover:text-white">{text.nav.login}</Link><Link href={demoHref} className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_36px_rgba(37,99,235,.24)] transition hover:bg-blue-500">{text.nav.demo}</Link></div>
          <button type="button" aria-label="Open navigation" onClick={() => setMobileOpen(true)} className="ml-auto flex h-10 w-10 items-center justify-center rounded-lg border border-slate-800 text-slate-400 lg:hidden"><Menu className="h-4 w-4" /></button>
        </div>
      </header>

      {mobileOpen ? <div className="fixed inset-0 z-[100] bg-[#050913]/98 p-5 lg:hidden"><div className="flex items-center justify-between"><Image src="/brand/risck-comply-wordmark.svg" alt="RISCK COMPLY" width={200} height={42} className="h-8 w-auto" /><button type="button" onClick={() => setMobileOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-800 text-slate-400"><X className="h-4 w-4" /></button></div><nav className="mt-10 grid gap-2 text-lg"><a href="#platform" onClick={() => setMobileOpen(false)} className="rounded-lg border border-slate-800 px-4 py-3">{text.nav.product}</a><a href="#solutions" onClick={() => setMobileOpen(false)} className="rounded-lg border border-slate-800 px-4 py-3">{text.nav.solutions}</a><Link href={`/${locale}/resources`} className="rounded-lg border border-slate-800 px-4 py-3">{text.nav.resources}</Link><Link href={`/${locale}/pricing`} className="rounded-lg border border-slate-800 px-4 py-3">{text.nav.pricing}</Link><Link href={loginHref} className="mt-3 rounded-lg border border-slate-800 px-4 py-3">{text.nav.login}</Link><Link href={signupHref} className="rounded-lg border border-blue-500/40 px-4 py-3 text-center font-semibold text-blue-200">{locale === 'pt' ? 'Começar' : 'Get Started'}</Link><Link href={demoHref} className="rounded-lg bg-blue-600 px-4 py-3 text-center font-semibold">{text.nav.demo}</Link></nav></div> : null}

      <main>
        <section className="relative overflow-hidden px-4 pb-20 pt-16 sm:px-6 lg:px-8 lg:pb-28 lg:pt-24">
          <div className="pointer-events-none absolute left-[48%] top-16 h-[38rem] w-[38rem] rounded-full bg-blue-600/[0.09] blur-3xl" />
          <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[0.88fr_1.12fr] lg:items-center">
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/[0.08] px-3 py-1.5 text-[11px] font-semibold text-blue-300"><ShieldCheck className="h-3.5 w-3.5" />{text.badge}</div>
              <h1 className="mt-6 text-5xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-6xl xl:text-7xl">{text.titleA}<br /><span className="text-blue-500">{text.titleB}</span></h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-slate-400 sm:text-lg sm:leading-8">{text.subtitle}</p>
              <div className="mt-8 flex flex-wrap gap-3"><Link href={demoHref} className="inline-flex h-12 items-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white shadow-[0_16px_44px_rgba(37,99,235,.25)] transition hover:bg-blue-500">{text.primary}<ArrowRight className="h-4 w-4" /></Link><Link href={signupHref} className="inline-flex h-12 items-center gap-2 rounded-lg border border-blue-500/40 bg-blue-500/[0.08] px-5 text-sm font-semibold text-blue-100 transition hover:border-blue-400 hover:bg-blue-500/[0.14]">{locale === 'pt' ? 'Começar' : 'Get Started'}<ArrowRight className="h-4 w-4" /></Link><a href="#platform" className="inline-flex h-12 items-center gap-2 rounded-lg border border-slate-700 bg-slate-950/30 px-5 text-sm font-semibold text-slate-200 transition hover:border-slate-600 hover:bg-slate-900/60">{text.secondary}<ArrowRight className="h-4 w-4" /></a></div>
              <div className="mt-10 grid gap-4 sm:grid-cols-2"><div className="flex items-center gap-2 text-xs text-slate-500"><CheckCircle2 className="h-4 w-4 text-emerald-400" />{locale === 'pt' ? 'Workspaces por organização' : 'Organization workspaces'}</div><div className="flex items-center gap-2 text-xs text-slate-500"><CheckCircle2 className="h-4 w-4 text-emerald-400" />{locale === 'pt' ? 'Acesso baseado em funções' : 'Role-based access'}</div><div className="flex items-center gap-2 text-xs text-slate-500"><CheckCircle2 className="h-4 w-4 text-emerald-400" />{locale === 'pt' ? 'Histórico de atividade' : 'Activity history'}</div><div className="flex items-center gap-2 text-xs text-slate-500"><CheckCircle2 className="h-4 w-4 text-emerald-400" />{locale === 'pt' ? 'Workflows de evidência' : 'Evidence workflows'}</div></div>
            </div>
            <DashboardPreview locale={locale} />
          </div>
        </section>

        <section className="border-y border-slate-800/80 bg-[#080d16] px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-2 xl:grid-cols-4">{text.trust.map((item, index) => <article key={item.title} className="grid grid-cols-[36px_1fr] gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg border border-blue-400/15 bg-blue-500/[0.06] text-blue-400">{index === 0 ? <Radar className="h-4 w-4" /> : index === 1 ? <ShieldCheck className="h-4 w-4" /> : index === 2 ? <Workflow className="h-4 w-4" /> : <FileCheck2 className="h-4 w-4" />}</span><div><h2 className="text-sm font-semibold text-slate-200">{item.title}</h2><p className="mt-1 text-xs leading-5 text-slate-500">{item.text}</p></div></article>)}</div>
        </section>

        <section id="platform" className="px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
          <div className="mx-auto max-w-7xl"><div className="max-w-4xl"><p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-400">{text.platformEyebrow}</p><h2 className="mt-4 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">{text.platformTitle}</h2><p className="mt-5 max-w-3xl text-base leading-8 text-slate-400">{text.platformText}</p></div><div id="solutions" className="mt-12 grid gap-4 md:grid-cols-2">{text.features.map((feature, index) => <article key={feature.title} className="rounded-xl border border-slate-800 bg-[#0b121e] p-6"><div className="flex items-center justify-between"><span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-400">0{index + 1}</span><ArrowRight className="h-4 w-4 text-slate-700" /></div><h3 className="mt-8 text-xl font-semibold text-white">{feature.title}</h3><p className="mt-3 text-sm leading-7 text-slate-500">{feature.text}</p></article>)}</div></div>
        </section>

        <section className="border-y border-slate-800/80 bg-[#080d16] px-4 py-24 sm:px-6 lg:px-8"><div className="mx-auto flex max-w-7xl flex-col gap-8 lg:flex-row lg:items-center lg:justify-between"><div className="max-w-3xl"><h2 className="text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">{text.finalTitle}</h2><p className="mt-5 text-base leading-8 text-slate-400">{text.finalText}</p></div><Link href={demoHref} className="inline-flex h-12 shrink-0 items-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-500">{text.primary}<ArrowRight className="h-4 w-4" /></Link></div></section>
      </main>

      <PublicFooter locale={locale} />
    </div>
  );
}
