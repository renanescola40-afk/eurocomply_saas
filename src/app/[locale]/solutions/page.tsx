import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight } from 'lucide-react';

import { PublicFooter } from '@/components/marketing/public-footer';
import { getSiteUrl } from '@/lib/seo/public-metadata';
import { getSolutionPages, getSolutionPath } from '@/lib/seo/solution-pages';

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (locale !== 'en') return { robots: { index: false, follow: false } };

  const url = `${getSiteUrl()}/en/solutions`;
  const title = 'AI Governance & EU AI Act Software Solutions | RISCK COMPLY';
  const description = 'Explore RISCK COMPLY solutions for EU AI Act compliance operations, enterprise AI governance and governed AI inventory management.';
  return {
    title,
    description,
    alternates: { canonical: url, languages: { en: url, 'x-default': url } },
    openGraph: { title, description, url, type: 'website', siteName: 'RISCK COMPLY' },
  };
}

export default async function SolutionsPage({ params }: PageProps) {
  const { locale } = await params;
  if (locale !== 'en') notFound();

  const pages = getSolutionPages();

  return (
    <main className="min-h-screen bg-[#050913] text-white">
      <header className="border-b border-white/10 bg-[#050913]/95">
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-4 lg:px-8" aria-label="Primary navigation">
          <Link href="/en" aria-label="RISCK COMPLY home">
            <Image src="/brand/risck-comply-wordmark.svg" alt="RISCK COMPLY" width={180} height={44} className="h-10 w-auto" priority />
          </Link>
          <div className="hidden items-center gap-6 text-sm text-white/65 md:flex">
            <Link href="/en/tools" className="transition hover:text-white">Free tools</Link>
            <Link href="/en/resources" className="transition hover:text-white">Resources</Link>
            <Link href="/en/pricing" className="transition hover:text-white">Pricing</Link>
            <Link href="/en/signup" data-cta-id="solutions-hub-signup" className="rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white transition hover:bg-blue-500">Create account</Link>
          </div>
        </nav>
      </header>

      <section className="border-b border-white/10 px-5 py-20 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-300/70">AI governance solutions</p>
          <h1 className="mt-6 max-w-4xl text-4xl font-semibold tracking-[-0.04em] sm:text-6xl lg:text-7xl">Operational software for governed enterprise AI</h1>
          <p className="mt-7 max-w-3xl text-lg leading-8 text-white/62 sm:text-xl">Explore focused solution pages for the jobs buyers actually search for: EU AI Act compliance operations, enterprise AI governance and maintainable AI inventory management.</p>
        </div>
      </section>

      <section className="px-5 py-18 lg:px-8 lg:py-24">
        <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-3">
          {pages.map((page) => (
            <article key={page.key} className="flex flex-col rounded-xl border border-slate-800/80 bg-[#0d1522] p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300/65">{page.eyebrow}</p>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight">{page.title}</h2>
              <p className="mt-4 flex-1 text-sm leading-7 text-white/58">{page.description}</p>
              <Link href={getSolutionPath(page.key)} data-cta-id={`solutions-hub-${page.key}`} className="group mt-7 inline-flex items-center gap-2 text-sm font-bold text-blue-300 transition hover:text-blue-200">
                Explore solution <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="px-5 pb-14 lg:px-8 lg:pb-20">
        <div className="mx-auto max-w-6xl rounded-xl border border-white/10 bg-white/[0.03] p-8 sm:p-10">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Start with a free governance assessment</h2>
          <p className="mt-4 max-w-3xl leading-7 text-white/58">Use the public readiness, Article 50, provider/deployer and governance-maturity tools to structure the question first, then move ongoing ownership and evidence into the platform.</p>
          <Link href="/en/tools" data-cta-id="solutions-hub-tools" className="group mt-7 inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-5 py-3 font-semibold text-white/80 transition hover:bg-white/[0.08] hover:text-white">
            Browse free tools <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </div>
      </section>

      <PublicFooter locale="en" />
    </main>
  );
}
