import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { PublicFooter } from '@/components/marketing/public-footer';
import { Article50Checker } from '@/components/marketing/tools/article-50-checker';
import { getSiteUrl } from '@/lib/seo/public-metadata';

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (locale !== 'en') return { robots: { index: false, follow: false } };
  const url = `${getSiteUrl()}/en/tools/article-50-transparency`;
  return {
    title: 'Article 50 Transparency Checker | EU AI Act | RISCK COMPLY',
    description: 'Map AI Act Article 50 transparency scenarios for direct AI interaction, synthetic content, deepfakes and related deployer use cases.',
    alternates: { canonical: url, languages: { en: url, 'x-default': url } },
    openGraph: { title: 'Article 50 Transparency Checker | RISCK COMPLY', description: 'A free scenario-mapping tool for Article 50 transparency review.', url, type: 'website', siteName: 'RISCK COMPLY' },
  };
}

export default async function Article50TransparencyPage({ params }: PageProps) {
  const { locale } = await params;
  if (locale !== 'en') notFound();

  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto max-w-5xl px-6 pb-10 pt-20">
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Free Article 50 tool</p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-6xl">Article 50 transparency scenario checker</h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">Map operational scenarios that may need transparency review. The tool intentionally routes uncertainty to clarification instead of pretending to make a legal determination.</p>
        <div className="mt-6 rounded-2xl border bg-muted/40 p-4 text-sm leading-6 text-muted-foreground">The European Commission published final Article 50 transparency guidelines on 20 July 2026. Article 50 transparency obligations apply from 2 August 2026 to certain providers, deployers, systems and uses — not to every use of AI in the same way.</div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16"><Article50Checker /></section>

      <section className="mx-auto max-w-5xl px-6 pb-20">
        <div className="rounded-[2rem] border bg-card p-7 md:p-9">
          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Authoritative sources</p>
          <div className="mt-4 flex flex-col gap-3 text-sm">
            <a className="font-semibold underline underline-offset-4" href="https://digital-strategy.ec.europa.eu/en/library/guidelines-transparency-obligations-providers-and-deployers-ai-systems" target="_blank" rel="noreferrer">European Commission — Article 50 transparency guidelines</a>
            <a className="font-semibold underline underline-offset-4" href="https://digital-strategy.ec.europa.eu/en/faqs/transparency-obligations-under-article-50-ai-act" target="_blank" rel="noreferrer">European Commission — Article 50 questions and answers</a>
            <a className="font-semibold underline underline-offset-4" href="https://eur-lex.europa.eu/eli/reg/2024/1689/oj" target="_blank" rel="noreferrer">EUR-Lex — Regulation (EU) 2024/1689</a>
          </div>
        </div>
      </section>
      <PublicFooter locale="en" />
    </main>
  );
}
