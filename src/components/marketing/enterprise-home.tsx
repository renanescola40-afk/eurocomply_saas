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
  Layers,
  Lock,
  Network,
  Server,
  ShieldCheck,
  ShieldAlert,
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
  ['Criptografia ponta a ponta', ShieldCheck, 'Dados sensíveis protegidos em trânsito e repouso.'],
  ['GDPR Compliant', Lock, 'Fluxos alinhados com privacidade e direitos do titular.'],
  ['Log de auditoria imutável', FileText, 'Toda ação crítica fica registrada para fiscalização.'],
  ['Isolamento multi-empresa', Building2, 'Separação rígida de dados entre organizações.'],
  ['Autenticação segura', Fingerprint, 'Sessões protegidas com Supabase Auth e políticas RLS.'],
  ['Infraestrutura Vercel + Supabase', Server, 'Deploy global, banco gerenciado e segurança server-side.'],
  ['Políticas RLS por organização', Database, 'Acesso baseado em membership e contexto empresarial.'],
  ['Controle de permissões', KeyRound, 'Perfis e roles para operações sensíveis.'],
  ['Monitoramento de eventos', Bell, 'Alertas para atividades, aprovações e prazos críticos.'],
  ['Backups e continuidade planejados', Network, 'Roadmap de resiliência para operações enterprise.'],
  ['ISO 27001 em preparação', Award, 'Programa de maturidade e governança de segurança.'],
  ['Testes de penetração anuais', ShieldAlert, 'Controlo previsto no plano de segurança enterprise.'],
] as const;

const featureCards = [
  ['Calendário com IA', 'Nunca mais perca um prazo fiscal. Alertas automáticos de novas obrigações.', CalendarDays],
  ['Notícias multilíngues', 'Notícias de compliance em PT, FR, ES e EN, sempre atualizadas por IA.', Globe2],
  ['Matriz de riscos', 'Identifique, avalie e mitigue riscos antes que virem multas.', TrendingUp],
  ['Convite de funcionários', 'Time todo alinhado com acessos e responsabilidades. Disponível no Enterprise.', Users],
  ['Múltiplos NIFs por país', 'Expanda para França, Alemanha e Itália sem dores fiscais.', Layers],
  ['Log de auditoria', 'Toda ação registrada. Pronto para fiscalização, clientes e auditorias.', FileText],
] as const;

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
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-white">EC</span>
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
            <Link href={href(activeLocale, '/signup')} className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-black shadow-[0_0_40px_rgba(255,255,255,.18)] transition hover:-translate-y-0.5 hover:bg-zinc-200">Assinar agora</Link>
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
              <ShieldCheck className="h-4 w-4" /> European compliance intelligence platform
            </div>
            <h1 className="mt-8 max-w-4xl text-5xl font-semibold leading-[1.02] tracking-[-0.06em] text-white sm:text-6xl lg:text-7xl">
              Compliance que acelera seu negócio. Não atrasa.
            </h1>
            <p className="mt-7 max-w-3xl text-lg leading-8 text-zinc-300 sm:text-xl">
              Empresas que usam EuroComply reduzem riscos fiscais em 73% e economizam 40h/mês em burocracia.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href={href(activeLocale, '/signup')} className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-4 text-base font-bold text-black shadow-[0_0_50px_rgba(255,255,255,.18)] transition hover:-translate-y-1 hover:bg-zinc-200">Assinar Agora <ChevronRight className="h-4 w-4" /></Link>
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
                <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white">Live</span>
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
          <p className="text-center text-sm font-semibold uppercase tracking-[0.24em] text-zinc-500">Security architecture</p>
          <h2 className="mt-4 text-center text-3xl font-semibold tracking-tight text-white sm:text-4xl">Segurança que sua empresa exige</h2>
          <p className="mx-auto mt-4 max-w-3xl text-center text-sm leading-6 text-zinc-500">Controles já aplicados na plataforma e camadas adicionais planejadas para clientes Business e Enterprise.</p>
        </div>
        <div className="group mt-10 flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
          <div className="flex min-w-full shrink-0 animate-[security-marquee-right_28s_linear_infinite] gap-4 pr-4 group-hover:[animation-play-state:paused]">
            {[...securityItems, ...securityItems].map(([label, Icon, description], index) => (
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
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-500">Funcionalidades</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">O que você ganha assinando o EuroComply</h2>
        </div>
        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {featureCards.map(([title, description, Icon]) => (
            <article key={title} className="rounded-3xl border border-[#2A2A35] bg-[#13131A] p-7 transition hover:-translate-y-1 hover:border-white/25 hover:bg-[#171720]">
              <Icon className="h-7 w-7 text-white" />
              <h3 className="mt-6 text-xl font-semibold text-white">{title}</h3>
              <p className="mt-4 min-h-24 leading-7 text-zinc-400">{description}</p>
              <a href="#plans" className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-white">Saiba mais <ChevronRight className="h-4 w-4" /></a>
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
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-500">Infraestrutura</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">Nossa equipe trabalha para proteger seus dados e reduzir risco operacional.</h2>
            <p className="mt-6 text-lg leading-8 text-zinc-400">Atualizações contínuas, arquitetura server-side, autenticação segura e isolamento por organização para empresas que tratam compliance como infraestrutura crítica.</p>
            <a href="#security" className="mt-8 inline-flex rounded-full border border-white/15 px-7 py-4 font-bold text-white transition hover:-translate-y-1 hover:bg-white/10">Conheça nossa infraestrutura</a>
          </div>
        </div>
      </section>

      <section id="plans" className="mx-auto max-w-7xl px-6 py-28">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-500">Planos</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">Escolha o plano certo para sua empresa</h2>
          <p className="mx-auto mt-5 max-w-3xl text-lg text-zinc-400">Quanto você está perdendo por não ter uma operação de compliance estruturada?</p>
        </div>
        <div className="mt-14 grid gap-5 lg:grid-cols-4">
          {plans.map((plan) => (
            <article key={plan.name} className={`group relative rounded-3xl border p-7 transition duration-300 hover:-translate-y-2 hover:bg-white hover:text-black hover:shadow-[0_30px_90px_rgba(255,255,255,.14)] ${plan.highlighted ? 'border-white bg-white text-black shadow-[0_0_90px_rgba(255,255,255,.12)]' : 'border-[#2A2A35] bg-[#13131A] text-white'}`}>
              {plan.highlighted ? <span className="rounded-full border border-black/10 bg-black px-3 py-1 text-xs font-bold text-white">Melhor equilíbrio</span> : null}
              {plan.enterprise ? <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold text-white transition group-hover:border-black/10 group-hover:bg-black group-hover:text-white">Consultivo premium</span> : null}
              <h3 className={`mt-5 text-2xl font-semibold ${plan.highlighted ? 'text-black' : 'text-white group-hover:text-black'}`}>{plan.name}</h3>
              <p className={`mt-4 min-h-28 text-sm leading-6 ${plan.highlighted ? 'text-zinc-700' : 'text-zinc-400 group-hover:text-zinc-700'}`}>{plan.text}</p>
              <div className="mt-7 flex items-end gap-1">
                <span className={`text-4xl font-semibold tracking-tight transition duration-300 group-hover:scale-105 ${plan.highlighted ? 'text-black' : 'text-white group-hover:text-black'}`}>{plan.price}</span>
                <span className={`pb-1.5 ${plan.highlighted ? 'text-zinc-600' : 'text-zinc-500 group-hover:text-zinc-600'}`}>{plan.period}</span>
              </div>
              <Link href={href(activeLocale, plan.enterprise ? '/contact' : '/signup')} className={`mt-7 inline-flex w-full justify-center rounded-2xl px-5 py-4 font-bold transition hover:-translate-y-0.5 ${plan.highlighted ? 'bg-black text-white hover:bg-zinc-800' : 'border border-white/15 bg-white/5 text-white hover:border-black hover:bg-black hover:text-white group-hover:border-black/10 group-hover:bg-black group-hover:text-white'}`}>{plan.cta}</Link>
              <ul className="mt-7 space-y-3">
                {plan.features.map((feature) => <li key={feature} className={`flex gap-3 text-sm ${plan.highlighted ? 'text-zinc-800' : 'text-zinc-300 group-hover:text-zinc-800'}`}><Check className={`mt-0.5 h-4 w-4 shrink-0 ${plan.highlighted ? 'text-black' : 'text-white group-hover:text-black'}`} />{feature}</li>)}
              </ul>
            </article>
          ))}
        </div>

        <p className="mx-auto mt-10 max-w-4xl text-center text-lg font-medium leading-8 text-white">Essential reduz a barreira de entrada. Professional captura PMEs com obrigações reais. Business vende operação, equipa e expansão europeia. Enterprise preserva valor premium para empresas reguladas e multi-país.</p>
      </section>

      <section className="px-6 py-28">
        <div className="mx-auto max-w-6xl rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,.12),rgba(19,19,26,1))] p-10 text-center shadow-2xl sm:p-16">
          <h2 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">O compliance não precisa ser um pesadelo. Deixe com quem entende.</h2>
          <Link href={href(activeLocale, '/signup')} className="mt-9 inline-flex rounded-full bg-white px-9 py-5 text-lg font-bold text-black shadow-[0_0_50px_rgba(255,255,255,.18)] transition hover:-translate-y-1 hover:bg-zinc-200">Assinar EuroComply agora</Link>
          <p className="mt-5 text-sm text-zinc-400">Teste grátis por 14 dias. Sem compromisso.</p>
        </div>
      </section>

      <style>{`
        @keyframes security-marquee-right {
          from { transform: translateX(-50%); }
          to { transform: translateX(0); }
        }
      `}</style>
      <PublicFooter locale={activeLocale} />
    </main>
  );
}
