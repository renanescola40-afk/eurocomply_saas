import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, CheckCircle2, ChevronRight } from 'lucide-react';

import { PublicFooter } from '@/components/marketing/public-footer';
import { getSiteUrl } from '@/lib/seo/public-metadata';
import { getSolutionPage, getSolutionPages, getSolutionPath } from '@/lib/seo/solution-pages';

type PageProps = {
  params: Promise<{ locale: string; solution: string }>;
};

export function generateStaticParams() {
  return getSolutionPages().map((page) => ({ locale: 'en', solution: page.key }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, solution } = await params;
  const page = getSolutionPage(solution);

  if (locale !== 'en' || !page) return { robots: { index: false, follow: false } };

  const url = `${getSiteUrl()}${getSolutionPath(page.key)}`;
  return {
    title: page.metaTitle,
    description: page.description,
    alternates: { canonical: url, languages: { en: url, 'x-default': url } },
    openGraph: {
      title: page.metaTitle,
      description: page.description,
      url,
      type: 'website',
      siteName: 'RISCK COMPLY',
    },
    twitter: {
      card: 'summary_large_image',
      title: page.metaTitle,
      description: page.description,
    },
  };
}

export default async function SolutionPage({ params }: PageProps) {
  const { locale, solution } = await params;
  const page = getSolutionPage(solution);
  if (locale !== 'en' || !page) notFound();

  const siteUrl = getSiteUrl();
  const canonicalUrl = `${siteUrl}${getSolutionPath(page.key)}`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        '@id': `${siteUrl}/#software`,
        name: 'RISCK COMPLY',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        url: siteUrl,
        description: page.description,
      },
      {
        '@type': 'WebPage',
        '@id': `${canonicalUrl}#webpage`,
        url: canonicalUrl,
        name: page.title,
        description: page.description,
        inLanguage: 'en',
        isPartOf: { '@id': `${siteUrl}/#website` },
        about: { '@id': `${siteUrl}/#software` },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/en` },
          { '@type': 'ListItem', position: 2, name: 'Solutions', item: `${siteUrl}/en/solutions` },
          { '@type': 'ListItem', position: 3, name: page.eyebrow, item: canonicalUrl },
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: page.faq.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer },
        })),
      },
    ],
  };

  return (
    <main className="min-h-screen bg-[#050913] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }}
      />

      <header className="border-b border-white/10 bg-[#050913]/95">
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-4 lg:px-8" aria-label="Primary navigation">
          <Link href="/en" aria-label="RISCK COMPLY home">
            <Image src="/brand/risck-comply-wordmark.svg" alt="RISCK COMPLY" width={180} height={44} className="h-10 w-auto" priority />
          </Link>
          <div className="hidden items-center gap-6 text-sm text-white/65 md:flex">
            <Link href="/en/solutions" className="transition hover:text-white">Solutions</Link>
            <Link href="/en/tools" className="transition hover:text-white">Free tools</Link>
            <Link href="/en/pricing" className="transition hover:text-white">Pricing</Link>
            <Link href="/en/signup" data-cta-id="solution-header-signup" className="rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white transition hover:bg-blue-500">Create account</Link>
          </div>
        </nav>
      </header>

      <section className="border-b border-white/10 px-5 py-20 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-5xl">
          <nav aria-label="Breadcrumb" className="mb-8 flex flex-wrap items-center gap-2 text-sm text-white/45">
            <Link href="/en" className="hover:text-white">Home</Link>
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
            <Link href="/en/solutions" className="hover:text-white">Solutions</Link>
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
            <span className="text-white/75">{page.eyebrow}</span>
          </nav>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-300/70">{page.eyebrow}</p>
          <h1 className="mt-6 max-w-4xl text-4xl font-semibold tracking-[-0.04em] sm:text-6xl lg:text-7xl">{page.title}</h1>
          <p className="mt-7 max-w-3xl text-lg leading-8 text-white/62 sm:text-xl">{page.intro}</p>
          <div className="mt-9 rounded-xl border border-blue-400/20 bg-blue-500/[0.07] p-6 sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300/70">Direct answer</p>
            <p className="mt-3 max-w-4xl text-base leading-8 text-white/78">{page.answer}</p>
          </div>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/en/signup" data-cta-id={`solution-${page.key}-signup`} className="group inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 font-bold text-white transition hover:bg-blue-500">
              Create account <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
            <Link href="/en/pricing" data-cta-id={`solution-${page.key}-pricing`} className="rounded-xl border border-white/15 bg-white/[0.04] px-6 py-3.5 font-semibold text-white/80 transition hover:bg-white/[0.08] hover:text-white">See pricing</Link>
          </div>
        </div>
      </section>

      <section className="px-5 py-18 lg:px-8 lg:py-24">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <article className="rounded-xl border border-slate-800/80 bg-[#0d1522] p-7 sm:p-9">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{page.problemTitle}</h2>
            <p className="mt-5 leading-7 text-white/58">{page.problem}</p>
          </article>
          <article className="rounded-xl border border-blue-400/15 bg-blue-500/[0.05] p-7 sm:p-9">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{page.capabilitiesTitle}</h2>
            <ul className="mt-7 grid gap-4 sm:grid-cols-2">
              {page.capabilities.map((capability) => (
                <li key={capability} className="flex gap-3 rounded-lg border border-white/10 bg-slate-950/25 p-4 text-sm leading-6 text-white/68">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-blue-300" aria-hidden="true" />
                  <span>{capability}</span>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.02] px-5 py-18 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">{page.workflowTitle}</h2>
          <ol className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {page.workflow.map((step, index) => (
              <li key={step} className="rounded-xl border border-slate-800/80 bg-[#0d1522] p-6">
                <span className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-300/65">{String(index + 1).padStart(2, '0')}</span>
                <p className="mt-4 leading-7 text-white/75">{step}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="px-5 py-18 lg:px-8 lg:py-24">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-2">
          <article className="rounded-xl border border-slate-800/80 bg-[#0d1522] p-7 sm:p-9">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{page.evidenceTitle}</h2>
            <ul className="mt-7 space-y-3">
              {page.evidence.map((item) => (
                <li key={item} className="flex gap-3 text-sm leading-7 text-white/66">
                  <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-blue-300" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>
          <article className="rounded-xl border border-slate-800/80 bg-[#0d1522] p-7 sm:p-9">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Related RISCK COMPLY capabilities</h2>
            <div className="mt-7 grid gap-3">
              {page.relatedFeatures.map((feature) => (
                <Link key={feature.href} href={feature.href} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-white/72 transition hover:border-blue-400/35 hover:text-white">
                  {feature.label}<ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.02] px-5 py-18 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Frequently asked questions</h2>
          <div className="mt-9 space-y-4">
            {page.faq.map((item) => (
              <article key={item.question} className="rounded-xl border border-slate-800/80 bg-[#0d1522] p-6 sm:p-7">
                <h3 className="text-lg font-semibold">{item.question}</h3>
                <p className="mt-3 leading-7 text-white/58">{item.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-18 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-4xl rounded-xl border border-slate-800/80 bg-[#0d1522] p-7 sm:p-9">
          <h2 className="text-2xl font-semibold">Authoritative sources</h2>
          <p className="mt-3 text-sm leading-7 text-white/55">Use primary legal and Commission sources for the underlying regulatory text and official guidance. RISCK COMPLY product pages explain operational software workflows and are not a substitute for legal advice.</p>
          <div className="mt-5 flex flex-col gap-3">
            {page.sources.map((source) => (
              <a key={source.href} href={source.href} target="_blank" rel="noreferrer" className="text-sm font-semibold text-blue-300 underline underline-offset-4 hover:text-blue-200">{source.label}</a>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 pb-12 lg:px-8 lg:pb-16">
        <div className="mx-auto max-w-6xl rounded-xl border border-blue-400/20 bg-blue-500/[0.06] p-8 sm:p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-300/65">RISCK COMPLY</p>
          <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight sm:text-5xl">Turn AI governance questions into owned, traceable work.</h2>
          <p className="mt-5 max-w-2xl leading-7 text-white/60">Centralize inventory, assessments, evidence, approvals and review history without presenting software output as a legal verdict.</p>
          <Link href="/en/signup" data-cta-id={`solution-${page.key}-final-signup`} className="group mt-8 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 font-bold text-white transition hover:bg-blue-500">
            Create account <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
          <p className="mt-7 max-w-3xl text-xs leading-5 text-white/38">RISCK COMPLY supports governance operations and evidence preparation. It does not provide legal advice, issue certifications or guarantee compliance outcomes.</p>
        </div>
      </section>

      <PublicFooter locale="en" />
    </main>
  );
}
