import Link from 'next/link';
import { ArrowRight, ClipboardList, FileCheck2, ShieldCheck, Workflow } from 'lucide-react';

type Props = { locale: string };

export function EnterpriseProductJourney({ locale }: Props) {
  const pt = locale === 'pt';
  const steps = pt ? [
    { number: '01', title: 'Conheça o seu universo de IA', body: 'Registe sistemas, responsáveis e informações do ciclo de vida num inventário estruturado.' },
    { number: '02', title: 'Transforme riscos em trabalho claro', body: 'Organize avaliações, justificações e ações para revisão pelas equipas responsáveis.' },
    { number: '03', title: 'Mantenha as evidências ligadas às decisões', body: 'Reúna documentos e registos de suporte para processos de governança e revisão.' },
  ] : [
    { number: '01', title: 'Know your AI landscape', body: 'Keep systems, accountable owners and lifecycle context in a structured inventory.' },
    { number: '02', title: 'Turn risks into accountable work', body: 'Organize assessments, rationale and follow-up actions for the right teams to review.' },
    { number: '03', title: 'Connect evidence to decisions', body: 'Keep documents and supporting records organized for governance and review workflows.' },
  ];
  const icons = [ClipboardList, Workflow, FileCheck2];
  return (
    <section aria-labelledby="journey-heading" className="relative overflow-hidden border-t border-slate-800/80 bg-[#080e19] px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
      <div className="pointer-events-none absolute -top-32 right-0 h-96 w-96 rounded-full bg-blue-600/[0.08] blur-3xl" aria-hidden="true" />
      <div className="relative mx-auto max-w-7xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-400">{pt ? 'DA VISIBILIDADE À EVIDÊNCIA' : 'FROM VISIBILITY TO EVIDENCE'}</p>
        <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_0.8fr] lg:items-end">
          <h2 id="journey-heading" className="max-w-3xl text-4xl font-semibold tracking-[-0.045em] text-white sm:text-5xl">{pt ? 'Governança de IA que avança com o seu negócio.' : 'AI governance that moves with your business.'}</h2>
          <p className="max-w-xl text-base leading-7 text-slate-400">{pt ? 'Veja como as principais operações se ligam num único espaço de trabalho — antes de decidir qual o plano adequado.' : 'See how the core workflows connect in one workspace, before deciding which plan fits your team.'}</p>
        </div>
        <ol className="mt-12 grid gap-4 md:grid-cols-3">
          {steps.map((step, index) => {
            const Icon = icons[index];
            return (
              <li key={step.number} className="group relative rounded-2xl border border-slate-700/70 bg-[#0c1625] p-6 transition-colors duration-200 hover:border-blue-400/50 sm:p-8">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs tracking-widest text-blue-400">{step.number} / 03</span>
                  <Icon className="h-5 w-5 text-blue-400" aria-hidden="true" />
                </div>
                <h3 className="mt-10 text-xl font-semibold tracking-tight text-white">{step.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-400">{step.body}</p>
              </li>
            );
          })}
        </ol>
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Link href={`/${locale}/book-demo`} className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-300">
            {pt ? 'Conhecer a plataforma' : 'Explore the platform'} <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link href={`/${locale}/pricing`} className="inline-flex min-h-12 items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-slate-300 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300">
            {pt ? 'Ver planos' : 'View pricing'} <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        <p className="mt-5 inline-flex items-center gap-2 text-xs text-slate-500"><ShieldCheck className="h-4 w-4" aria-hidden="true" />{pt ? 'Capacidades descritas com base nos fluxos documentados do produto. Resultados regulamentares não são garantidos.' : 'Capabilities reflect documented product workflows. Regulatory outcomes are not guaranteed.'}</p>
      </div>
    </section>
  );
}
