import Link from 'next/link';
import { PublicFooter } from '@/components/marketing/public-footer';
import { LOCALE_META, locales, type Locale } from '@/lib/i18n/routing';

type Plan = { name: string; price: string; text: string; features: string[]; highlighted?: boolean };

const plans: Plan[] = [
  { name: 'Essential', price: '€49/mês', text: 'Entrada acessível para microempresas que querem sair do Excel sem comprar uma suite enterprise.', features: ['1 país fiscal', '1 utilizador', 'Calendário legal básico', 'Até 10 documentos', 'Notícias regulatórias essenciais'] },
  { name: 'Professional', price: '€149/mês', text: 'Para PMEs que já precisam controlar prazos, riscos, documentos e evidências com consistência.', features: ['Até 2 países fiscais', 'Calendário legal com IA', 'Matriz de riscos completa', 'Log de auditoria', 'Relatórios básicos', 'Até 3 utilizadores'] },
  { name: 'Business', price: '€399/mês', text: 'Para empresas em crescimento europeu que precisam de workflows, equipa e reporting executivo.', highlighted: true, features: ['Até 5 países fiscais', 'Documentos com versionamento', 'Workflow de aprovação', 'Audit packs', 'Matriz RACI', 'Até 10 utilizadores'] },
  { name: 'Enterprise', price: 'Desde €990/mês', text: 'Para empresas reguladas, multi-país ou fornecedores B2B que precisam provar confiança em auditorias e contratos grandes.', features: ['Países fiscais ilimitados', 'Relatórios white-label', 'Permissões avançadas', 'Suporte prioritário', 'SLA e onboarding', 'DORA/NIS2/ISO/AI Act'] },
];

const benefits = [
  ['⏱️', '40h/mês poupadas', 'Calendário IA e documentos controlados reduzem burocracia repetitiva.'],
  ['💶', 'Evite multas', 'Matriz de riscos e prazos legais ajudam a evitar penalidades de €10k+.'],
  ['🔐', 'Auditoria rastreável', 'Toda ação crítica fica registada para clientes, board e auditores.'],
  ['🌍', 'Expansão europeia', 'NIF, SIRET, CIF, Partita IVA, Steuernummer e outros IDs fiscais.'],
  ['👥', 'Time alinhado', 'Enterprise permite convidar funcionários e distribuir responsabilidades.'],
  ['📰', 'Informação em tempo real', 'Notícias europeias de compliance por país e categoria.'],
];

const security = [
  ['🔒', 'Dados sensíveis protegidos'], ['🇪🇺', 'GDPR Compliant'], ['🧑‍⚖️', 'Log de auditoria'], ['🚫', 'Isolamento multi-empresa'], ['🔐', 'Supabase Auth + RLS'], ['☁️', 'Vercel + Supabase'], ['📋', 'ISO 27001 em preparação'], ['🛡️', 'Arquitetura defensiva']
];

function href(locale: Locale, path: string) { return `/${locale}${path}`; }

export function EnterpriseHome({ locale }: { locale: string }) {
  const activeLocale = (locales.includes(locale as Locale) ? locale : 'en') as Locale;
  const meta = LOCALE_META[activeLocale];
  const localeName = meta.nativeName ?? meta.name;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,.45),transparent_32%),radial-gradient(circle_at_80%_0%,rgba(16,185,129,.25),transparent_28%),linear-gradient(135deg,#020617,#0f172a_45%,#020617)]" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(110deg,rgba(2,6,23,.92),rgba(15,23,42,.70),rgba(2,6,23,.95))]" />

        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
          <Link href={`/${activeLocale}`} className="flex items-center gap-3 font-bold"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-950">EC</span>EuroComply</Link>
          <div className="flex items-center gap-3 text-sm"><span className="hidden text-white/50 sm:inline">{localeName}</span><Link href={href(activeLocale, '/pricing')} className="hidden text-white/70 hover:text-white sm:inline">Preços</Link><Link href={href(activeLocale, '/login')} className="rounded-full border border-white/15 px-4 py-2 hover:bg-white/10">Entrar</Link></div>
        </nav>

        <div className="mx-auto grid max-w-7xl gap-12 px-6 pb-28 pt-16 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
          <div>
            <div className="inline-flex rounded-full border border-emerald-300/25 bg-emerald-300/10 px-4 py-2 text-sm font-semibold text-emerald-100">Sistema europeu de compliance com IA</div>
            <h1 className="mt-8 text-5xl font-black tracking-[-0.06em] sm:text-6xl lg:text-7xl">A sua empresa europeia está mesmo em compliance — ou a acumular risco escondido?</h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-200">O EuroComply une prazos legais, documentos controlados, matriz de riscos, NIFs europeus, log de auditoria, notícias regulatórias e colaboração Enterprise num cockpit pronto para board, clientes e auditorias.</p>
            <p className="mt-5 text-lg font-semibold text-amber-200">Assine e a sua empresa ganha mais segurança para ganhar mais dinheiro.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Link href={href(activeLocale, '/signup')} className="rounded-full bg-emerald-300 px-7 py-4 text-center font-black text-slate-950 shadow-2xl shadow-emerald-500/25 transition hover:-translate-y-0.5 hover:bg-emerald-200">Começar teste grátis</Link><Link href={href(activeLocale, '/pricing')} className="rounded-full border border-white/15 px-7 py-4 text-center font-black transition hover:-translate-y-0.5 hover:bg-white/10">Ver planos</Link></div>
            <div className="mt-8 inline-flex rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm text-white/80">🔥 Mais de 342 empresas europeias já confiam no EuroComply</div>
          </div>
          <div className="rounded-[2rem] border border-white/15 bg-white/[0.08] p-5 shadow-2xl backdrop-blur-xl">
            <div className="rounded-[1.5rem] bg-slate-950/70 p-5"><div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-[0.22em] text-white/40">AI compliance command</p><h2 className="mt-1 text-2xl font-bold">Board-ready em minutos</h2></div><span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-bold text-emerald-200">Live</span></div><div className="mt-6 grid gap-3 sm:grid-cols-2">{[['78%', 'políticas aprovadas'], ['5', 'prazos legais próximos'], ['€12k', 'multas evitáveis/ano'], ['40h', 'burocracia poupada/mês']].map(([v,l]) => <div key={l} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4"><p className="text-3xl font-black text-emerald-200">{v}</p><p className="mt-1 text-sm text-white/55">{l}</p></div>)}</div><div className="mt-5 space-y-3">{['Calendário IA encontrou novo prazo fiscal em França', 'Log de auditoria registou aprovação de política', 'Notícia CNPD adicionada ao feed executivo'].map((item) => <div key={item} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/75">✓ {item}</div>)}</div></div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20"><p className="text-sm font-bold uppercase tracking-[0.22em] text-emerald-300">O que a sua empresa ganha</p><h2 className="mt-3 max-w-3xl text-4xl font-black tracking-tight">Menos ansiedade regulatória. Mais velocidade comercial.</h2><div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{benefits.map(([icon,title,text]) => <div key={title} className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-xl transition hover:-translate-y-1 hover:bg-white/[0.07]"><div className="text-4xl">{icon}</div><h3 className="mt-5 text-xl font-bold">{title}</h3><p className="mt-3 text-sm leading-6 text-white/60">{text}</p></div>)}</div></section>

      <section className="relative isolate overflow-hidden px-6 py-24">
        <div className="absolute inset-0 -z-10 bg-black" />
        <div className="absolute left-1/2 top-0 -z-10 h-[40rem] w-[80%] -translate-x-1/2 rounded-full bg-blue-700/30 blur-3xl" />
        <div className="absolute inset-x-0 top-0 -z-10 h-96 bg-[linear-gradient(to_right,#ffffff17_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0d_1px,transparent_1px)] bg-[size:70px_80px] [mask-image:radial-gradient(50%_50%,white,transparent)]" />
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-blue-300">Planos</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight">Entre por €49. Escale quando compliance virar operação séria.</h2>
            <p className="mx-auto mt-4 max-w-3xl text-white/60">Essential reduz a barreira de entrada. Professional e Business capturam equipas em crescimento. Enterprise preserva o valor premium para organizações reguladas e multi-país.</p>
          </div>
          <div className="mt-8 flex justify-center">
            <div className="rounded-full border border-blue-500/40 bg-neutral-900 p-1 text-sm font-semibold text-white shadow-2xl shadow-blue-900/30">
              <span className="inline-flex rounded-full bg-gradient-to-t from-blue-500 to-blue-600 px-6 py-3 shadow-lg shadow-blue-700/30">Monthly</span>
              <span className="inline-flex px-6 py-3 text-gray-300">Yearly soon</span>
            </div>
          </div>
          <div className="mt-12 grid gap-6 lg:grid-cols-4">
            {plans.map((plan) => (
              <div key={plan.name} className={`relative rounded-[1.6rem] border border-neutral-800 bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-950 p-7 text-white shadow-2xl transition hover:-translate-y-1 ${plan.highlighted ? 'z-20 shadow-[0px_-13px_220px_0px_rgba(37,99,235,.55)] ring-1 ring-blue-500/50' : 'z-10'}`}>
                {plan.highlighted ? <div className="absolute -top-4 left-6 rounded-full bg-gradient-to-t from-blue-500 to-blue-600 px-4 py-2 text-xs font-black text-white shadow-lg shadow-blue-800/40">⭐ Melhor equilíbrio para empresas europeias</div> : null}
                <h3 className="text-3xl font-semibold">{plan.name}</h3>
                <div className="mt-6 flex items-baseline"><span className="text-4xl font-semibold">{plan.price}</span></div>
                <p className="mt-4 min-h-20 text-sm leading-6 text-gray-300">{plan.text}</p>
                <Link href={href(activeLocale, '/pricing')} className={`mt-6 block w-full rounded-xl p-4 text-center text-lg font-bold transition hover:-translate-y-0.5 ${plan.highlighted ? 'border border-blue-500 bg-gradient-to-t from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-800/40' : 'border border-neutral-800 bg-gradient-to-t from-neutral-950 to-neutral-700 text-white shadow-lg shadow-neutral-950'}`}>{plan.name === 'Enterprise' ? 'Falar com vendas' : plan.name === 'Essential' ? 'Começar por €49' : 'Assinar agora'}</Link>
                <div className="mt-6 border-t border-neutral-700 pt-5">
                  <h4 className="mb-3 text-sm font-medium text-white">Inclui:</h4>
                  <ul className="space-y-2">
                    {plan.features.map((feature) => <li key={feature} className="flex items-center gap-2 text-sm text-gray-300"><span className="h-2.5 w-2.5 rounded-full bg-neutral-500" />{feature}</li>)}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-20 text-slate-950"><div className="mx-auto max-w-7xl px-6"><p className="text-sm font-black uppercase tracking-[0.22em] text-blue-700">Segurança para decisores B2B</p><h2 className="mt-3 max-w-3xl text-4xl font-black tracking-tight">Confiança antes do contrato. Evidência antes da auditoria.</h2><div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">{security.map(([icon,title]) => <div key={title} className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm"><div className="text-3xl">{icon}</div><h3 className="mt-4 font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">Arquitetura pensada para dados empresariais sensíveis, auditoria e separação multi-tenant.</p></div>)}</div></div></section>

      <section className="mx-auto max-w-7xl px-6 py-20"><div className="grid gap-6 lg:grid-cols-3">{[['“Reduzimos nosso tempo de compliance em 65% no primeiro mês.”','CFO, Tech Lisboa'],['“O EuroComply permitiu expandir para França e Alemanha sem dores de cabeça fiscal.”','Head Legal, Paris'],['“Finalmente temos documentos, riscos e auditoria na mesma narrativa executiva.”','COO, Berlin SaaS']].map(([quote,role]) => <figure key={role} className="rounded-3xl border border-white/10 bg-white/[0.04] p-7"><blockquote className="text-xl font-semibold leading-8">{quote}</blockquote><figcaption className="mt-5 text-sm text-white/50">— {role}</figcaption></figure>)}</div><div className="mt-16 rounded-[2rem] border border-emerald-300/20 bg-emerald-300/10 p-8 text-center shadow-2xl"><h2 className="text-4xl font-black tracking-tight">Compliance não é custo. É alavancagem.</h2><p className="mx-auto mt-4 max-w-2xl text-white/70">Transforme compliance em prova comercial, velocidade operacional e confiança para fechar negócios maiores na Europa.</p><Link href={href(activeLocale, '/signup')} className="mt-8 inline-flex rounded-full bg-white px-8 py-4 font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-emerald-100">Começar agora</Link></div></section>

      <PublicFooter locale={activeLocale} />
    </main>
  );
}
