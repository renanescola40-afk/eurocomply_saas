import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, BookOpenCheck, ClipboardCheck, FileSearch2, ShieldCheck } from 'lucide-react';
import { notFound } from 'next/navigation';

import { PublicFooter } from '@/components/marketing/public-footer';
import { getSiteUrl } from '@/lib/seo/public-metadata';

const resources = [
  {
    title: 'EU AI Act Readiness Assessment',
    description: 'Score eight operational AI governance dimensions without submitting names, emails or assessment answers to RISCK COMPLY.',
    type: 'Free tool',
    href: '/en/tools/ai-act-readiness',
    cta: 'Run the free assessment',
    ctaId: 'resource-free-tool',
    icon: ClipboardCheck,
  },
  {
    title: 'AI governance evidence checklist',
    description: 'Track AI systems, owners, risk signals, policy coverage, evidence status and review history before buyer review starts.',
    type: 'Checklist',
    href: '/en/signup',
    cta: 'Use templates in RISCK COMPLY',
    ctaId: 'resource-signup',
    icon: FileSearch2,
  },
  {
    title: 'Vendor review playbook',
    description: 'Prioritize vendors by data access, risk level, DPA status, subprocessors and review cadence.',
    type: 'Playbook',
    href: '/en/signup',
    cta: 'Use templates in RISCK COMPLY',
    ctaId: 'resource-signup',
    icon: ShieldCheck,
  },
  {
    title: 'Executive compliance report guide',
    description: 'Turn operational metrics into leadership review score, trends, risks and next best actions.',
    type: 'Guide',
    href: '/en/book-demo',
    cta: 'Book a governance demo',
    ctaId: 'resource-book-demo',
    icon: BookOpenCheck,
  },
];

type ResourcesPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: ResourcesPageProps): Promise<Metadata> {
  const { locale } = await params;
  if (locale !== 'en') return { robots: { index: false, follow: false } };

  const url = `${getSiteUrl()}/en/resources`;
  return {
    title: 'AI Governance Resources | RISCK COMPLY',
    description: 'Practical AI governance tools, checklists and guides for inventory, evidence, vendor review and EU AI Act readiness.',
    alternates: { canonical: url, languages: { en: url, 'x-default': url } },
    openGraph: {
      title: 'AI Governance Resources | RISCK COMPLY',
      description: 'Practical resources for teams operationalizing AI governance in Europe.',
      url,
      type: 'website',
      siteName: 'RISCK COMPLY',
    },
  };
}

export default async function ResourcesPage({ params }: ResourcesPageProps) {
  const { locale } = await params;
  if (locale !== 'en') notFound();

  return (
    <main className="min-h-screen bg-[#050913] text-white">
      <header className="border-b border-slate-800/80 bg-[#050913]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/en" aria-label="RISCK COMPLY home" className="shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
            <Image src="/brand/risck-comply-wordmark.svg" alt="RISCK COMPLY" width={210} height={44} priority className="h-9 w-auto" />
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/en/pricing" className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:text-white sm:inline-flex">Pricing</Link>
            <Link href="/en/login" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:text-white">Log in</Link>
            <Link href="/en/book-demo" className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500">Book a Demo</Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-slate-800/80 px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div aria-hidden="true" className="pointer-events-none absolute right-[8%] top-10 h-[30rem] w-[30rem] rounded-full bg-blue-600/[0.08] blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_0.85fr] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">AI GOVERNANCE RESOURCES</p>
            <h1 className="mt-5 max-w-5xl text-5xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
              Practical guidance for operational AI governance.
            </h1>
            <p className="mt-7 max-w-3xl text-lg leading-8 text-slate-400">
              Use focused tools and checklists to structure inventory, evidence, vendor review and leadership-ready governance work before it becomes a procurement or regulatory scramble.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/en/tools"
                data-cta-id="resource-free-tool"
                className="inline-flex h-12 items-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
              >
                Browse free tools <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/en/book-demo"
                className="inline-flex h-12 items-center gap-2 rounded-lg border border-slate-700 px-5 text-sm font-semibold text-slate-200 hover:border-blue-400/40 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
              >
                See the operating model
              </Link>
            </div>
          </div>

          <aside className="rounded-2xl border border-slate-800 bg-[#0b1422] p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-400">HOW TO USE THESE</p>
            <p className="mt-4 text-2xl font-semibold leading-tight">Start with the governance gap that is slowing your team down.</p>
            <p className="mt-4 text-sm leading-7 text-slate-400">
              These resources are educational and operational aids. They do not provide legal advice, certify compliance or guarantee regulatory outcomes.
            </p>
          </aside>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 lg:px-8 lg:py-24" aria-labelledby="resource-library-title">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">RESOURCE LIBRARY</p>
            <h2 id="resource-library-title" className="mt-4 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">Move from questions to structured action.</h2>
            <p className="mt-5 text-base leading-7 text-slate-400">
              Each resource focuses on a concrete governance workflow your team can review, document or operationalize.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {resources.map((resource) => {
              const Icon = resource.icon;
              return (
                <article key={resource.title} className="group flex min-h-72 flex-col rounded-2xl border border-slate-800 bg-[#0b1422] p-6 transition-colors hover:border-blue-400/40 sm:p-7">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full border border-blue-400/20 bg-blue-500/[0.06] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-300">{resource.type}</span>
                    <Icon className="h-5 w-5 text-blue-400" aria-hidden="true" />
                  </div>
                  <h3 className="mt-8 text-2xl font-semibold tracking-tight">{resource.title}</h3>
                  <p className="mt-4 flex-1 text-sm leading-7 text-slate-400">{resource.description}</p>
                  <Link
                    href={resource.href}
                    data-cta-id={resource.ctaId}
                    className="mt-7 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-blue-300 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                  >
                    {resource.cta} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-800/80 bg-[#080d16] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_0.8fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">FROM RESOURCE TO WORKFLOW</p>
            <h2 className="mt-4 max-w-4xl text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">Need the controls to live in one operating workspace?</h2>
            <p className="mt-5 max-w-3xl text-base leading-7 text-slate-400">
              RISCK COMPLY brings AI systems, owners, assessments, evidence and follow-up work together so the process does not end in another spreadsheet.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <Link href="/en" className="inline-flex h-12 items-center gap-2 rounded-lg border border-slate-700 px-5 text-sm font-semibold text-slate-200 hover:border-blue-400/40 hover:text-white">Explore the platform</Link>
            <Link href="/en/book-demo" className="inline-flex h-12 items-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-500">Book a Demo <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          </div>
        </div>
      </section>

      <PublicFooter locale="en" />
    </main>
  );
}
