import Link from 'next/link';
import { PublicFooter } from '@/components/marketing/public-footer';

const landingCopy = {
  en: {
    nav: { product: 'Platform', pricing: 'Pricing', security: 'Security', login: 'Sign in', cta: 'Start free' },
    hero: {
      eyebrow: 'European compliance operating system',
      title: 'Board-ready compliance operations for ambitious European teams.',
      subtitle: 'EuroComply gives fintech, SaaS and B2B companies a premium system to manage GDPR evidence, vendors, risks, tasks, templates, billing and executive reports from one secure multi-tenant workspace.',
      primary: 'Start your workspace',
      secondary: 'View pricing',
      trust: ['GDPR-ready evidence', 'Private document storage', 'Executive reports', 'Vendor risk register'],
    },
    metrics: { score: 'Compliance score', posture: 'Board ready', risks: 'Open risks', vendors: 'High-risk vendors', docs: 'Missing documents', actions: 'Next best actions' },
    sections: {
      platform: 'One command center for compliance work',
      platformSub: 'Replace scattered spreadsheets with a real operating layer for evidence, third parties, risk and executive reporting.',
      proof: 'Built to feel enterprise before you are enterprise',
      pricing: 'Simple pricing with enterprise expansion',
      pricingSub: 'Start lean, then expand as your evidence library, vendors and team grow.',
      how: 'From scattered compliance to operating rhythm',
      faq: 'Questions before you start',
    },
    features: [
      ['Executive dashboard', 'Compliance score, domain scorecards, trends, top risks and next best actions in one premium view.'],
      ['Evidence vault', 'Securely manage policies, DPIAs, vendor agreements and audit files with private storage and signed downloads.'],
      ['Vendor risk', 'Track suppliers, DPA status, data access level, review status and high-risk exposure.'],
      ['Board reports', 'Generate maturity scorecards, printable reports, CSV exports and operational recommendations.'],
      ['Templates to action', 'Turn GDPR, vendor, security and incident templates into tasks or evidence documents.'],
      ['Billing and controls', 'Stripe checkout, customer portal, plan gates, team invitations and audit logs built in.'],
    ],
    proof: ['Multi-tenant architecture', 'Rate limiting and security headers', 'Audit logs', 'Sentry-ready observability', 'CSV and PDF-ready reports', 'Private storage workflow'],
    steps: ['Create your organization', 'Generate work from premium templates', 'Upload evidence and assign owners', 'Review vendors and risks', 'Export board-ready reports'],
    plans: [
      { name: 'Starter', price: '€49', target: 'For founders and solo compliance owners', cta: 'Start Starter', features: ['3 users', '50 documents', '25 vendors', '25 risks', 'Executive dashboard'] },
      { name: 'Growth', price: '€149', target: 'For growing SaaS and fintech teams', cta: 'Start Growth', featured: true, features: ['10 users', '250 documents', '100 vendors', '100 risks', 'Premium templates and reports'] },
      { name: 'Business', price: '€399', target: 'For teams preparing serious customer reviews', cta: 'Start Business', features: ['30 users', '1,000 documents', '500 vendors', '500 risks', 'Advanced reporting and alerts'] },
      { name: 'Enterprise', price: 'Custom', target: 'For regulated teams and consulting rollouts', cta: 'Talk to us', features: ['Custom limits', 'SSO roadmap', 'Custom DPA', 'Audit exports', 'Priority support'] },
    ],
    faq: [
      ['Is EuroComply legal advice?', 'No. It is an operational compliance system for evidence, risks, vendors and reporting. Legal interpretation should be reviewed by qualified counsel.'],
      ['Who should use it first?', 'European SaaS, fintech, agencies and B2B companies that need a professional compliance operating layer before buying heavy enterprise GRC.'],
      ['Why these prices?', 'The tiers anchor against the operational value of avoiding manual compliance chaos, while staying accessible for early European teams.'],
      ['Can we expand later?', 'Yes. The product is designed to start simple and grow into enterprise workflows such as SSO, advanced RBAC, exports and external webhooks.'],
    ],
  },
  pt: {
    nav: { product: 'Plataforma', pricing: 'Preços', security: 'Segurança', login: 'Entrar', cta: 'Começar grátis' },
    hero: {
      eyebrow: 'Sistema operacional de compliance europeu',
      title: 'Compliance com aparência board-ready para equipas europeias ambiciosas.',
      subtitle: 'O EuroComply dá a fintechs, SaaS e empresas B2B um sistema premium para gerir evidências GDPR, vendors, riscos, tarefas, templates, billing e relatórios executivos num workspace multi-tenant seguro.',
      primary: 'Criar workspace',
      secondary: 'Ver preços',
      trust: ['Evidências GDPR', 'Storage privado', 'Relatórios executivos', 'Vendor risk register'],
    },
    metrics: { score: 'Compliance score', posture: 'Board ready', risks: 'Riscos abertos', vendors: 'Vendors high-risk', docs: 'Docs em falta', actions: 'Next best actions' },
    sections: {
      platform: 'Um command center para compliance',
      platformSub: 'Substitua spreadsheets soltas por uma camada operacional real para evidências, terceiros, risco e reporting executivo.',
      proof: 'Criado para parecer enterprise antes de você ser enterprise',
      pricing: 'Preço simples com expansão enterprise',
      pricingSub: 'Comece leve e expanda conforme crescem evidências, vendors e equipa.',
      how: 'De compliance espalhado para ritmo operacional',
      faq: 'Perguntas antes de começar',
    },
    features: [
      ['Dashboard executivo', 'Score de compliance, scorecards por área, trends, top risks e next best actions numa visão premium.'],
      ['Evidence vault', 'Gerencie policies, DPIAs, contratos de vendor e ficheiros de auditoria com storage privado e signed downloads.'],
      ['Vendor risk', 'Acompanhe fornecedores, DPA status, data access level, review status e exposição high-risk.'],
      ['Board reports', 'Gere maturity scorecards, reports imprimíveis, CSV exports e recomendações operacionais.'],
      ['Templates para ação', 'Transforme templates GDPR, vendor, security e incident em tasks ou evidence documents.'],
      ['Billing e controlos', 'Stripe checkout, customer portal, plan gates, team invitations e audit logs já integrados.'],
    ],
    proof: ['Arquitetura multi-tenant', 'Rate limiting e security headers', 'Audit logs', 'Observability pronta para Sentry', 'Reports CSV e PDF-ready', 'Fluxo de storage privado'],
    steps: ['Crie sua organização', 'Gere trabalho a partir de templates premium', 'Carregue evidências e atribua owners', 'Revise vendors e riscos', 'Exporte reports board-ready'],
    plans: [
      { name: 'Starter', price: '€49', target: 'Para founders e responsáveis de compliance solo', cta: 'Começar Starter', features: ['3 utilizadores', '50 documentos', '25 vendors', '25 riscos', 'Dashboard executivo'] },
      { name: 'Growth', price: '€149', target: 'Para SaaS e fintechs em crescimento', cta: 'Começar Growth', featured: true, features: ['10 utilizadores', '250 documentos', '100 vendors', '100 riscos', 'Templates e reports premium'] },
      { name: 'Business', price: '€399', target: 'Para equipas preparando reviews sérias de clientes', cta: 'Começar Business', features: ['30 utilizadores', '1.000 documentos', '500 vendors', '500 riscos', 'Reporting avançado e alertas'] },
      { name: 'Enterprise', price: 'Custom', target: 'Para equipas reguladas e consultorias', cta: 'Falar connosco', features: ['Limites custom', 'SSO roadmap', 'Custom DPA', 'Audit exports', 'Suporte prioritário'] },
    ],
    faq: [
      ['É aconselhamento jurídico?', 'Não. É um sistema operacional de compliance para evidências, riscos, vendors e reporting. Interpretação legal deve ser validada por advogado.'],
      ['Quem deve usar primeiro?', 'SaaS, fintechs, agências e empresas B2B europeias que precisam parecer profissionais antes de comprar GRC enterprise pesado.'],
      ['Por que estes preços?', 'As tiers ancoram no valor de evitar caos manual de compliance, mas continuam acessíveis para equipas europeias iniciais.'],
      ['Dá para expandir depois?', 'Sim. O produto foi desenhado para começar simples e evoluir para SSO, RBAC avançado, exports e webhooks externos.'],
    ],
  },
} as const;

type LocaleKey = keyof typeof landingCopy;

type LandingCopy = typeof landingCopy.en;

function getCopy(locale: string): LandingCopy {
  return (landingCopy[locale as LocaleKey] ?? landingCopy.en) as LandingCopy;
}

const languageLabels = [
  ['en', 'EN'],
  ['pt', 'PT'],
  ['es', 'ES'],
  ['fr', 'FR'],
  ['it', 'IT'],
  ['de', 'DE'],
];

export default function HomePage({ params }: { params: { locale: string } }) {
  const copy = getCopy(params.locale);

  return (
    <main className="min-h-screen bg-[#05060a] text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#05060a]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href={`/${params.locale}`} className="flex items-center gap-3 text-lg font-bold tracking-tight">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-950">EC</span>
            EuroComply
          </Link>
          <nav className="hidden items-center gap-2 text-sm md:flex">
            <a href="#platform" className="rounded-full px-4 py-2 text-slate-300 hover:bg-white/10 hover:text-white">{copy.nav.product}</a>
            <a href="#pricing" className="rounded-full px-4 py-2 text-slate-300 hover:bg-white/10 hover:text-white">{copy.nav.pricing}</a>
            <a href="#security" className="rounded-full px-4 py-2 text-slate-300 hover:bg-white/10 hover:text-white">{copy.nav.security}</a>
          </nav>
          <div className="flex items-center gap-2 text-sm">
            <div className="hidden gap-1 lg:flex">
              {languageLabels.map(([locale, label]) => (
                <Link key={locale} href={`/${locale}`} className={`rounded-full px-2 py-1 text-xs ${params.locale === locale ? 'bg-white text-slate-950' : 'text-slate-400 hover:bg-white/10 hover:text-white'}`}>{label}</Link>
              ))}
            </div>
            <Link href={`/${params.locale}/login`} className="rounded-full border border-white/15 px-4 py-2 font-medium hover:bg-white/10">{copy.nav.login}</Link>
            <Link href={`/${params.locale}/signup`} className="rounded-full bg-white px-4 py-2 font-semibold text-slate-950 hover:bg-slate-100">{copy.nav.cta}</Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute right-0 top-28 h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-28">
          <div>
            <p className="inline-flex rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-blue-200">{copy.hero.eyebrow}</p>
            <h1 className="mt-6 max-w-5xl text-5xl font-semibold tracking-[-0.06em] md:text-7xl xl:text-8xl">{copy.hero.title}</h1>
            <p className="mt-7 max-w-3xl text-lg leading-8 text-slate-300">{copy.hero.subtitle}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href={`/${params.locale}/signup`} className="inline-flex h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-bold text-slate-950 hover:bg-slate-100">{copy.hero.primary}</Link>
              <a href="#pricing" className="inline-flex h-12 items-center justify-center rounded-full border border-white/15 px-6 text-sm font-bold text-white hover:bg-white/10">{copy.hero.secondary}</a>
            </div>
            <div className="mt-8 flex flex-wrap gap-2">
              {copy.hero.trust.map((item) => <span key={item} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">{item}</span>)}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-4 shadow-2xl backdrop-blur-xl">
            <div className="rounded-[1.5rem] border border-white/10 bg-slate-950 p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{copy.metrics.score}</p>
                  <p className="mt-2 text-6xl font-bold text-emerald-300">82%</p>
                </div>
                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-sm font-semibold text-emerald-200">{copy.metrics.posture}</span>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {[[copy.metrics.risks, '7'], [copy.metrics.vendors, '3'], [copy.metrics.docs, '5'], [copy.metrics.actions, '4']].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</p>
                    <p className="mt-2 text-2xl font-semibold">{value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-sm font-semibold">Board pack generated</p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full w-[82%] rounded-full bg-emerald-300" /></div>
                <p className="mt-3 text-xs text-slate-400">Executive report • Risk register • Vendor review • Evidence appendix</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="platform" className="border-y border-white/10 bg-white/[0.03] py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-200">{copy.sections.platform}</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">{copy.sections.platformSub}</h2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {copy.features.map(([title, description]) => (
              <article key={title} className="rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-xl transition hover:-translate-y-0.5 hover:border-blue-300/30">
                <h3 className="text-xl font-semibold">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-400">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="security" className="mx-auto grid max-w-7xl gap-10 px-6 py-20 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-200">{copy.sections.proof}</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">Enterprise signals your buyers expect.</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {copy.proof.map((item) => <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm font-medium text-slate-200">{item}</div>)}
        </div>
      </section>

      <section id="pricing" className="border-y border-white/10 bg-white/[0.03] py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-200">{copy.sections.pricing}</p>
              <h2 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">{copy.sections.pricingSub}</h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-slate-400">Prices are shown monthly. Annual contracts can use two months free as a conversion lever.</p>
          </div>
          <div className="mt-10 grid gap-4 lg:grid-cols-4">
            {copy.plans.map((plan) => (
              <article key={plan.name} className={`relative rounded-3xl border p-6 shadow-xl ${plan.featured ? 'border-blue-300 bg-white text-slate-950' : 'border-white/10 bg-slate-950 text-white'}`}>
                {plan.featured && <span className="absolute right-5 top-5 rounded-full bg-slate-950 px-3 py-1 text-xs font-bold text-white">Most popular</span>}
                <h3 className="text-2xl font-semibold">{plan.name}</h3>
                <p className={`mt-2 text-sm ${plan.featured ? 'text-slate-600' : 'text-slate-400'}`}>{plan.target}</p>
                <p className="mt-6 text-5xl font-bold">{plan.price}</p>
                {plan.price !== 'Custom' && <p className={`mt-1 text-sm ${plan.featured ? 'text-slate-500' : 'text-slate-500'}`}>/ month</p>}
                <ul className={`mt-6 space-y-3 text-sm ${plan.featured ? 'text-slate-700' : 'text-slate-300'}`}>
                  {plan.features.map((feature) => <li key={feature}>• {feature}</li>)}
                </ul>
                <Link href={`/${params.locale}/signup`} className={`mt-6 inline-flex h-11 w-full items-center justify-center rounded-full text-sm font-bold ${plan.featured ? 'bg-slate-950 text-white hover:bg-slate-800' : 'bg-white text-slate-950 hover:bg-slate-100'}`}>{plan.cta}</Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-20 md:grid-cols-2">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-200">{copy.sections.how}</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight">A premium workflow, not another spreadsheet.</h2>
        </div>
        <ol className="space-y-4">
          {copy.steps.map((step, index) => (
            <li key={step} className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-slate-950">{index + 1}</span>
              <span className="pt-1 font-medium text-slate-200">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 md:p-10">
          <h2 className="text-4xl font-semibold tracking-tight">{copy.sections.faq}</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {copy.faq.map(([question, answer]) => (
              <article key={question}>
                <h3 className="font-semibold">{question}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <PublicFooter locale={params.locale} />
    </main>
  );
}
