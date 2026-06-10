import Link from 'next/link';
import {
  Award,
  Bell,
  Building2,
  CalendarDays,
  Check,
  ChevronRight,
  FileText,
  Globe2,
  Layers,
  Lock,
  Server,
  ShieldCheck,
  TrendingUp,
  Users,
} from 'lucide-react';
import { PublicFooter } from '@/components/marketing/public-footer';
import { LOCALE_META, locales, type Locale } from '@/lib/i18n/routing';

const plans = [
  {
    name: 'Essential',
    price: '€49',
    period: '/mês',
    text: 'Plano de acesso para microempresas, consultores e equipas pequenas que querem sair do Excel sem medo.',
    cta: 'Começar Essential',
    features: ['1 país fiscal', '1 utilizador', 'Calendário legal básico', 'Notícias regulatórias básicas', 'Perfil da empresa', 'Até 10 documentos', 'Matriz de riscos simples', 'Notificações básicas'],
  },
  {
    name: 'Professional',
    price: '€149',
    period: '/mês',
    text: 'Para PMEs com obrigações reais, documentos, riscos e prazos que precisam de controlo consistente.',
    cta: 'Assinar Professional',
    features: ['Até 2 países fiscais', 'Calendário com IA', 'Documentos controlados', 'Versionamento', 'Matriz de riscos completa', 'Log de auditoria', 'Relatórios básicos', 'Até 3 utilizadores'],
  },
  {
    name: 'Business',
    price: '€399',
    period: '/mês',
    text: 'Para empresas em crescimento europeu com operação multi-país, equipa interna e reporting executivo.',
    cta: 'Assinar Business',
    highlighted: true,
    features: ['Até 5 países fiscais', 'NIFs por país', 'Workflows de aprovação', 'Relatórios executivos', 'Audit packs', 'Notícias IA por país', 'Matriz RACI', 'Até 10 utilizadores'],
  },
  {
    name: 'Enterprise',
    price: 'Desde €990',
    period: '/mês',
    text: 'Plano consultivo para empresas reguladas, grupos, fintechs, healthtechs e fornecedores B2B enterprise.',
    cta: 'Falar com vendas',
    enterprise: true,
    features: ['Países ilimitados', 'Utilizadores avançados', 'Permissões por função', 'Relatórios white-label', 'Onboarding assistido', 'SLA e suporte prioritário', 'Módulos DORA, NIS2, ISO 27001 e AI Act', 'Trilha de auditoria completa'],
  },
];

const securityItems = [
  ['Criptografia ponta a ponta', ShieldCheck],
  ['GDPR Compliant', Lock],
  ['Log de auditoria imutável', FileText],
  ['Isolamento multi-empresa', Building2],
  ['Autenticação segura', ShieldCheck],
  ['Vercel + Supabase', Server],
  ['ISO 27001 em preparação', Award],
  ['Testes de penetração anuais', Lock],
] as const;

const featureCards = [
  ['Calendário com IA', 'Nunca mais perca um prazo fiscal. Alertas automáticos de novas obrigações.', CalendarDays],
  ['Notícias multilíngues', 'Notícias de compliance em PT, FR, ES e EN, sempre atualizadas por IA.', Globe2],
  ['Matriz de riscos', 'Identifique, avalie e mitigue riscos antes que virem multas.', TrendingUp],
  ['Convite de funcionários', 'Time todo alinhado com acessos e responsabilidades. Disponível no Enterprise.', Users],
  ['Múltiplos NIFs por país', 'Expanda para França, Alemanha e Itália sem dores fiscais.', Layers],
  ['Log de auditoria', 'Toda ação registrada. Pronto para fiscalização, clientes e auditorias.', FileText],
] as const;

const comparisonRows = [
  ['Empresas', '1', 'Até 3', 'Até 10', 'Ilimitadas'],
  ['Funcionários', '1', 'Até 3', 'Até 10', 'Avançado'],
  ['Países fiscais', '1', 'Até 2', 'Até 5', 'Ilimitados'],
  ['NIFs múltiplos', 'Não incluído', 'Limitado', 'Incluído', 'Avançado'],
  ['Calendário IA', 'Básico', 'Incluído', 'Avançado', 'Avançado'],
  ['Notícias IA', 'Básicas', 'Incluído', 'Por país/categoria', 'Multilíngue avançado'],
  ['Matriz de riscos', 'Simples', 'Completa', 'Avançada', 'Enterprise'],
  ['Log de auditoria', 'Não incluído', 'Incluído', 'Completo', 'Completo + exportável'],
  ['Convite de funcionários', 'Não incluído', 'Não incluído', 'Incluído', 'Incluído com permissões'],
  ['Suporte', 'Padrão', 'Padrão', 'Prioritário', 'SLA + onboarding'],
];

function href(locale: Locale, path: string) {
  return `/${locale}${path}`;
}

export function EnterpriseHome({ locale }: { locale: string }) {
  const activeLocale = (locales.includes(locale as Locale) ? locale : 'en') as Locale;
  const meta = LOCALE_META[activeLocale];
  const localeName = meta.nativeName ?? meta.name;

  return (
    <main className="min-h-screen scroll-smooth bg-[#0A0A0F] text-[#E0E0E0]">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#0A0A0F]/70 backdrop-blur-2xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href={`/${activeLocale}`} className="flex items-center gap-3 text-sm font-semibold tracking-tight text-white">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-300/30 bg-cyan-300/10 text-cyan-100">EC</span>
            <span className="text-lg">EuroComply</span>
          </Link>
          <div className="hidden items-center gap-8 text-sm text-zinc-300 lg:flex">
            <a href="#features" className="transition hover:text-white">Funcionalidades</a>
            <a href="#security" className="transition hover:text-white">Segurança</a>
            <a href="#plans" className="transition hover:text-white">Planos</a>
            <span className="text-zinc-500">{localeName}</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href={href(activeLocale, '/login')} className="hidden rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 sm:inline-flex">Entrar</Link>
            <Link href={href(activeLocale, '/signup')} className="rounded-full bg-cyan-300 px-5 py-2.5 text-sm font-bold text-slate-950 shadow-[0_0_40px_rgba(0,229,255,.25)] transition hover:-translate-y-0.5 hover:bg-white">Assinar agora</Link>
          </div>
        </nav>
      </header>

      <section className="relative isolate min-h-screen overflow-hidden pt-24">
        <video className="absolute inset-0 -z-30 hidden h-full w-full object-cover opacity-70 md:block" autoPlay muted loop playsInline poster="https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=2400&q=90">
          <source src="https://videos.pexels.com/video-files/3209828/3209828-uhd_2560_1440_25fps.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 -z-30 bg-[url('https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=2400&q=90')] bg-cover bg-center md:hidden" />
        <div className="absolute inset-0 -z-20 bg-[linear-gradient(105deg,rgba(10,10,15,.98)_0%,rgba(10,10,15,.88)_46%,rgba(10,10,15,.38)_100%)]" />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_30%,rgba(0,229,255,.20),transparent_32%),radial-gradient(circle_at_70%_20%,rgba(124,58,237,.24),transparent_28%),linear-gradient(to_bottom,transparent_0%,#0A0A0F_94%)]" />

        <div className="mx-auto grid max-w-7xl gap-16 px-6 pb-28 pt-24 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-white/5 px-4 py-2 text-sm font-medium text-cyan-100 shadow-2xl backdrop-blur-xl">
              <ShieldCheck className="h-4 w-4" /> European compliance intelligence platform
            </div>
            <h1 className="mt-8 max-w-4xl text-5xl font-semibold leading-[1.02] tracking-[-0.06em] text-white sm:text-6xl lg:text-7xl">
              Compliance que acelera seu negócio. Não atrasa.
            </h1>
            <p className="mt-7 max-w-3xl text-lg leading-8 text-zinc-300 sm:text-xl">
              Empresas que usam EuroComply reduzem riscos fiscais em 73% e economizam 40h/mês em burocracia.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href={href(activeLocale, '/signup')} className="inline-flex items-center justify-center gap-2 rounded-full bg-cyan-300 px-7 py-4 text-base font-bold text-slate-950 shadow-[0_0_50px_rgba(0,229,255,.25)] transition hover:-translate-y-1 hover:bg-white">Assinar Agora <ChevronRight className="h-4 w-4" /></Link>
              <a href="#demo" className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-7 py-4 text-base font-bold text-white backdrop-blur transition hover:-translate-y-1 hover:bg-white/10">Ver demonstração</a>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-[#13131A]/70 p-5 shadow-2xl backdrop-blur-2xl">
            <div className="rounded-[1.5rem] border border-white/10 bg-black/35 p-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.26em] text-zinc-500">Executive cockpit</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Compliance status</h2>
                </div>
                <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-100">Live</span>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {[["73%", "risco fiscal reduzido"], ["40h", "poupadas por mês"], ["12k", "euros em multas evitadas"], ["8", "obrigações próximas"]].map(([value, label]) => (
                  <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                    <p className="text-3xl font-semibold text-white">{value}</p>
                    <p className="mt-2 text-sm text-zinc-500">{label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 space-y-3">
                {["Novo prazo fiscal identificado para França", "Política aprovada e registrada no log de auditoria", "Relatório executivo pronto para revisão"].map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-300">
                    <Check className="h-4 w-4 text-cyan-200" /> {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="security" className="overflow-hidden border-y border-white/10 bg-[#0D0D14] py-14">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="text-center text-3xl font-semibold tracking-tight text-white">Segurança que sua empresa exige</h2>
        </div>
        <div className="mt-10 flex w-max animate-[security-marquee_28s_linear_infinite] gap-4 px-6">
          {[...securityItems, ...securityItems].map(([label, Icon], index) => (
            <div key={`${label}-${index}`} className="flex min-w-[280px] items-center gap-3 rounded-2xl border border-white/10 bg-[#13131A] px-5 py-4 text-sm text-zinc-300">
              <Icon className="h-5 w-5 text-cyan-200" />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-6 py-28">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-200">Funcionalidades</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">O que você ganha assinando o EuroComply</h2>
        </div>
        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {featureCards.map(([title, description, Icon]) => (
            <article key={title} className="group rounded-3xl border border-[#2A2A35] bg-[#13131A] p-7 transition hover:-translate-y-1 hover:border-cyan-300/30 hover:bg-[#171722]">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-100">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-7 text-xl font-semibold text-white">{title}</h3>
              <p className="mt-3 min-h-20 text-sm leading-6 text-zinc-400">{description}</p>
              <a href="#plans" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-cyan-200 transition group-hover:gap-3">Saiba mais <ChevronRight className="h-4 w-4" /></a>
            </article>
          ))}
        </div>
      </section>

      <section id="demo" className="relative isolate overflow-hidden px-6 py-28">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_70%_30%,rgba(124,58,237,.30),transparent_30%),radial-gradient(circle_at_20%_60%,rgba(0,229,255,.16),transparent_30%)]" />
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-2 lg:items-center">
          <div className="rounded-[2rem] border border-white/10 bg-[#13131A]/80 p-5 shadow-2xl">
            <div className="rounded-[1.4rem] bg-black p-5 font-mono text-sm leading-7 text-zinc-300">
              <p className="text-cyan-200">const protection = await EuroComply.monitor();</p>
              <p>riskMatrix.evaluate(company, jurisdictions);</p>
              <p>auditLog.write('policy.approved');</p>
              <p>calendarAI.detectNewDeadlines('EU');</p>
              <p className="text-violet-300">deploy.status = 'zero-downtime';</p>
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-violet-200">Infraestrutura</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">Nossa equipe trabalha 24/7 para proteger seus dados.</h2>
            <p className="mt-6 text-lg leading-8 text-zinc-300">Atualizações em tempo real, arquitetura multi-tenant isolada e operação preparada para empresas que não podem falhar em auditorias, contratos e expansão europeia.</p>
            <a href="#security" className="mt-8 inline-flex rounded-full border border-white/15 bg-white/5 px-7 py-4 font-bold text-white transition hover:-translate-y-1 hover:bg-white/10">Conheça nossa infraestrutura</a>
          </div>
        </div>
      </section>

      <section id="plans" className="mx-auto max-w-7xl px-6 py-28">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-200">Planos e preços</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">Escolha o plano certo para sua empresa</h2>
          <p className="mx-auto mt-5 max-w-3xl text-lg text-zinc-400">Entre por €49. Escale quando compliance virar operação séria.</p>
        </div>
        <div className="mt-14 grid gap-5 lg:grid-cols-4">
          {plans.map((plan) => (
            <article key={plan.name} className={`relative rounded-3xl border bg-[#13131A] p-7 transition hover:-translate-y-1 ${plan.highlighted ? 'border-cyan-300/50 shadow-[0_0_70px_rgba(0,229,255,.16)]' : plan.enterprise ? 'border-amber-300/45 shadow-[0_0_70px_rgba(251,191,36,.12)]' : 'border-[#2A2A35]'}`}>
              {plan.highlighted ? <div className="absolute -top-4 left-7 rounded-full border border-cyan-300/40 bg-cyan-300 px-4 py-2 text-xs font-bold text-slate-950">Melhor equilíbrio</div> : null}
              {plan.enterprise ? <div className="absolute -top-4 left-7 rounded-full border border-amber-300/40 bg-amber-300 px-4 py-2 text-xs font-bold text-slate-950">Plano consultivo</div> : null}
              <h3 className="text-2xl font-semibold text-white">{plan.name}</h3>
              <p className="mt-4 min-h-28 text-sm leading-6 text-zinc-400">{plan.text}</p>
              <div className="mt-7 flex items-end gap-1">
                <span className="text-4xl font-semibold tracking-tight text-white">{plan.price}</span>
                <span className="pb-1.5 text-zinc-500">{plan.period}</span>
              </div>
              <Link href={href(activeLocale, plan.enterprise ? '/contact' : '/signup')} className={`mt-7 inline-flex w-full justify-center rounded-2xl px-5 py-4 font-bold transition hover:-translate-y-0.5 ${plan.highlighted ? 'bg-cyan-300 text-slate-950 hover:bg-white' : plan.enterprise ? 'bg-amber-300 text-slate-950 hover:bg-white' : 'border border-white/15 bg-white/5 text-white hover:bg-white/10'}`}>{plan.cta}</Link>
              <ul className="mt-7 space-y-3">
                {plan.features.map((feature) => <li key={feature} className="flex gap-3 text-sm text-zinc-300"><Check className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200" />{feature}</li>)}
              </ul>
            </article>
          ))}
        </div>

        <div className="mt-12 overflow-x-auto rounded-3xl border border-[#2A2A35] bg-[#13131A]">
          <div className="min-w-[920px]">
            <div className="grid grid-cols-5 border-b border-[#2A2A35] bg-white/[0.03] text-sm font-semibold text-white">
              <div className="p-4">Comparativo</div><div className="p-4">Essential</div><div className="p-4">Professional</div><div className="p-4">Business</div><div className="p-4">Enterprise</div>
            </div>
            {comparisonRows.map(([label, essential, professional, business, enterprise]) => (
              <div key={label} className="grid grid-cols-5 border-b border-white/5 text-sm text-zinc-400 last:border-b-0">
                <div className="p-4 text-zinc-200">{label}</div><div className="p-4">{essential}</div><div className="p-4">{professional}</div><div className="p-4 text-white">{business}</div><div className="p-4 text-amber-100">{enterprise}</div>
              </div>
            ))}
          </div>
        </div>
        <p className="mx-auto mt-8 max-w-4xl text-center text-lg font-medium leading-8 text-white">Essential reduz a barreira de entrada. Professional captura PMEs com obrigações reais. Business vende operação, equipa e expansão europeia. Enterprise preserva valor premium para empresas reguladas e multi-país.</p>
      </section>

      <section className="px-6 py-28">
        <div className="mx-auto max-w-6xl rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(0,229,255,.14),rgba(124,58,237,.18),rgba(19,19,26,1))] p-10 text-center shadow-2xl sm:p-16">
          <h2 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">O compliance não precisa ser um pesadelo. Deixe com quem entende.</h2>
          <Link href={href(activeLocale, '/signup')} className="mt-9 inline-flex rounded-full bg-cyan-300 px-9 py-5 text-lg font-bold text-slate-950 shadow-[0_0_50px_rgba(0,229,255,.25)] transition hover:-translate-y-1 hover:bg-white">Assinar EuroComply agora</Link>
          <p className="mt-5 text-sm text-zinc-400">Teste grátis por 14 dias. Sem compromisso.</p>
        </div>
      </section>

      <PublicFooter locale={activeLocale} />
    </main>
  );
}
