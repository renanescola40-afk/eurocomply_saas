import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Layers3, ShieldCheck, Workflow } from 'lucide-react';

import { PublicFooter } from '@/components/marketing/public-footer';
import { getSafeLocale, makePublicMetadata } from '@/lib/seo/public-metadata';

type AboutPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: AboutPageProps): Promise<Metadata> {
  const { locale: requestedLocale } = await params;
  const locale = getSafeLocale(requestedLocale);
  return makePublicMetadata({
    locale,
    path: '/about',
    title: 'About RISCK COMPLY | AI Governance Operations',
    description: 'Learn how RISCK COMPLY approaches operational AI governance through structured inventory, ownership, evidence, review and accountable workflows.',
  });
}

export default async function AboutPage({ params }: AboutPageProps) {
  const { locale: requestedLocale } = await params;
  const locale = getSafeLocale(requestedLocale);
  const pt = locale === 'pt';

  const principles = pt
    ? [
        ['Estrutura antes do ruído', 'Organize sistemas de IA, responsáveis, riscos e evidências num modelo operacional compreensível.'],
        ['Evidência ligada à operação', 'Mantenha documentos, decisões e registos próximos dos fluxos de governança que lhes dão contexto.'],
        ['Responsabilidade visível', 'Clarifique quem é responsável por cada sistema, ação e processo de revisão.'],
        ['Revisão contínua', 'Apoie uma cadência de governança que pode ser acompanhada, atualizada e preparada para análise.'],
      ]
    : [
        ['Structure before noise', 'Organize AI systems, accountable owners, risks and evidence in an operating model teams can understand.'],
        ['Evidence connected to operations', 'Keep documents, decisions and supporting records close to the governance workflows that give them context.'],
        ['Accountability made visible', 'Clarify who owns each system, action and review process.'],
        ['Continuous review', 'Support a governance cadence that can be tracked, updated and prepared for review.'],
      ];

  return (
    <main className="min-h-screen bg-[#050913] text-white">
      <header className="border-b border-slate-800/80 bg-[#050913]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href={`/${locale}`} aria-label="RISCK COMPLY home" className="shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
            <Image src="/brand/risck-comply-wordmark.svg" alt="RISCK COMPLY" width={210} height={44} priority className="h-9 w-auto" />
          </Link>
          <div className="flex items-center gap-2">
            <Link href={`/${locale}/pricing`} className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:text-white sm:inline-flex">{pt ? 'Preços' : 'Pricing'}</Link>
            <Link href={`/${locale}/login`} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:text-white">{pt ? 'Entrar' : 'Log in'}</Link>
            <Link href={`/${locale}/book-demo`} className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500">{pt ? 'Marcar Demo' : 'Book a Demo'}</Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-slate-800/80 px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-0 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-blue-600/[0.08] blur-3xl" />
        <div className="relative mx-auto max-w-7xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">{pt ? 'SOBRE A RISCK COMPLY' : 'ABOUT RISCK COMPLY'}</p>
          <h1 className="mt-5 max-w-5xl text-5xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
            {pt ? 'Governança de IA precisa de um sistema operacional.' : 'AI governance needs an operating system.'}
          </h1>
          <p className="mt-7 max-w-3xl text-lg leading-8 text-slate-400">
            {pt
              ? 'A RISCK COMPLY foi concebida para ajudar equipas a transformar inventário, risco, evidências, responsabilidades e revisão num processo operacional mais claro e controlado.'
              : 'RISCK COMPLY is designed to help teams turn AI inventory, risk, evidence, accountability and review into a clearer, more controlled operating process.'}
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href={`/${locale}/book-demo`} className="inline-flex h-12 items-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-500">
              {pt ? 'Conhecer a plataforma' : 'Explore the platform'} <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link href={`/${locale}/trust`} className="inline-flex h-12 items-center gap-2 rounded-lg border border-slate-700 px-5 text-sm font-semibold text-slate-200 hover:border-blue-400/40 hover:text-white">
              {pt ? 'Ver arquitetura de confiança' : 'Review trust architecture'}
            </Link>
          </div>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 lg:px-8 lg:py-28" aria-labelledby="about-principles">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr] lg:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">{pt ? 'PRINCÍPIOS DO PRODUTO' : 'PRODUCT PRINCIPLES'}</p>
              <h2 id="about-principles" className="mt-4 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
                {pt ? 'Menos dispersão. Mais controlo.' : 'Less fragmentation. More control.'}
              </h2>
              <p className="mt-5 max-w-md text-base leading-7 text-slate-400">
                {pt
                  ? 'O produto é estruturado em torno de operações verificáveis, responsabilidade clara e preparação de evidências — não em promessas de conformidade automática.'
                  : 'The product is structured around verifiable operations, clear accountability and evidence preparation — not promises of automatic compliance.'}
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {principles.map(([title, body], index) => {
                const Icon = [Layers3, Workflow, ShieldCheck, CheckCircle2][index];
                return (
                  <article key={title} className="rounded-2xl border border-slate-800 bg-[#0b1422] p-6">
                    <Icon className="h-5 w-5 text-blue-400" aria-hidden="true" />
                    <h3 className="mt-8 text-xl font-semibold">{title}</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-400">{body}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-800/80 bg-[#080d16] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">{pt ? 'PARA EQUIPAS SOB PRESSÃO REAL' : 'FOR TEAMS UNDER REAL PRESSURE'}</p>
            <h2 className="mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
              {pt ? 'Preparado para conversas com liderança, clientes e procurement.' : 'Built for leadership, customer and procurement conversations.'}
            </h2>
          </div>
          <div className="rounded-2xl border border-slate-700/80 bg-[#0d1624] p-7">
            <p className="text-sm leading-7 text-slate-300">
              {pt
                ? 'A RISCK COMPLY ajuda a organizar informação e evidências para revisão interna e externa. Não substitui aconselhamento jurídico, não certifica conformidade e não garante resultados regulamentares.'
                : 'RISCK COMPLY helps organize information and evidence for internal and external review. It does not replace legal counsel, certify compliance or guarantee regulatory outcomes.'}
            </p>
          </div>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 rounded-2xl border border-blue-400/20 bg-blue-500/[0.06] p-8 sm:p-10 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">{pt ? 'Veja como a operação funciona na prática.' : 'See how the operating model works in practice.'}</h2>
            <p className="mt-3 text-sm leading-7 text-slate-400">{pt ? 'Explore a experiência pública ou marque uma demonstração para analisar os fluxos relevantes para a sua equipa.' : 'Explore the public product experience or book a demonstration to review the workflows relevant to your team.'}</p>
          </div>
          <Link href={`/${locale}`} className="inline-flex h-12 shrink-0 items-center gap-2 rounded-lg bg-white px-5 text-sm font-semibold text-slate-950 hover:bg-slate-200">
            {pt ? 'Explorar o produto' : 'Explore the product'} <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

      <PublicFooter locale={locale} />
    </main>
  );
}
