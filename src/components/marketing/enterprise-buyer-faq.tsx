import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

export function EnterpriseBuyerFaq({ locale }: { locale: string }) {
  const pt = locale === 'pt';
  const questions = pt ? [
    { q: 'O que posso organizar na RISCK COMPLY?', a: 'A plataforma reúne inventário de sistemas de IA, avaliações estruturadas, responsáveis, ações e documentação de suporte em workspaces de governança.' },
    { q: 'A plataforma garante conformidade com o EU AI Act?', a: 'Não. A RISCK COMPLY apoia processos de governança e preparação de evidências. As obrigações e decisões jurídicas dependem do contexto de cada organização e devem ser avaliadas por profissionais competentes.' },
    { q: 'Posso conhecer o produto antes de escolher um plano?', a: 'Sim. Esta página apresenta uma pré-visualização ilustrativa dos principais fluxos. Também pode solicitar uma demonstração para analisar o encaixe com a sua organização.' },
    { q: 'Como posso conhecer as opções comerciais?', a: 'Consulte os planos publicados ou solicite uma demonstração para discutir as necessidades da sua equipa. As funcionalidades e condições aplicáveis dependem do plano escolhido.' },
  ] : [
    { q: 'What can my team manage with RISCK COMPLY?', a: 'The platform brings AI system inventory, structured assessments, accountable owners, actions and supporting records together in governance workspaces.' },
    { q: 'Does RISCK COMPLY guarantee compliance with the EU AI Act?', a: 'No. RISCK COMPLY supports governance operations and evidence preparation. Legal obligations and conclusions depend on your organization\'s circumstances and require qualified review.' },
    { q: 'Can I explore the product before choosing a plan?', a: 'Yes. This page includes an illustrative product preview. You can also request a demonstration to assess how the workflows fit your organization.' },
    { q: 'Where can I compare commercial options?', a: 'Review the published plans or request a demo to discuss your team\'s needs. Available capabilities and terms depend on the selected plan.' },
  ];
  return (
    <section aria-labelledby="public-faq-title" className="border-t border-slate-800/80 bg-[#050913] px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:gap-20">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-400">{pt ? 'RESPOSTAS CLARAS' : 'CLEAR ANSWERS'}</p>
          <h2 id="public-faq-title" className="mt-4 text-4xl font-semibold tracking-[-0.045em] text-white sm:text-5xl">{pt ? 'Conheça o produto com confiança.' : 'Make an informed decision.'}</h2>
          <p className="mt-5 max-w-md text-base leading-7 text-slate-400">{pt ? 'Governança de IA exige clareza. Veja o que a plataforma apoia e onde começa a análise da sua equipa.' : 'AI governance requires clarity. Understand what the platform supports and where your team\'s own review begins.'}</p>
          <Link href={`/${locale}/book-demo`} className="mt-7 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-blue-300 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-300">{pt ? 'Solicitar demonstração' : 'Request a demonstration'}<ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link>
        </div>
        <div className="divide-y divide-slate-800 rounded-2xl border border-slate-800 bg-[#0b1422] px-5 sm:px-8">
          {questions.map((item) => <details key={item.q} className="group py-6">
            <summary className="cursor-pointer list-none pr-8 text-base font-semibold leading-7 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-300 [&::-webkit-details-marker]:hidden">{item.q}<span aria-hidden="true" className="float-right text-blue-400 group-open:rotate-45">+</span></summary>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400">{item.a}</p>
          </details>)}
        </div>
      </div>
    </section>
  );
}
