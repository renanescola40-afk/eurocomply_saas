import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { PublicFooter } from '@/components/marketing/public-footer';
import { AiActReadinessAssessment } from '@/components/marketing/tools/ai-act-readiness-assessment';
import { getSiteUrl } from '@/lib/seo/public-metadata';

type ReadinessPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: ReadinessPageProps): Promise<Metadata> {
  const { locale } = await params;
  if (locale !== 'en') return { robots: { index: false, follow: false } };

  const url = `${getSiteUrl()}/en/tools/ai-act-readiness`;
  return {
    title: 'EU AI Act Readiness Assessment | Free Tool | RISCK COMPLY',
    description: 'Assess eight operational AI governance dimensions and get a privacy-safe readiness score with priority actions. No email required.',
    alternates: { canonical: url, languages: { en: url, 'x-default': url } },
    openGraph: {
      title: 'EU AI Act Readiness Assessment | RISCK COMPLY',
      description: 'A free operational AI governance readiness assessment for European teams.',
      url,
      type: 'website',
      siteName: 'RISCK COMPLY',
    },
  };
}

export default async function AiActReadinessPage({ params }: ReadinessPageProps) {
  const { locale } = await params;
  if (locale !== 'en') notFound();

  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto max-w-5xl px-6 pb-10 pt-20">
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Free EU AI Act readiness tool</p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-6xl">EU AI Act readiness starts with operational evidence</h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">
          Assess whether your organization has a workable baseline for AI inventory, accountability, role mapping, risk review, transparency, human oversight, vendor governance and recurring evidence.
        </p>
        <div className="mt-6 rounded-2xl border bg-muted/40 p-4 text-sm leading-6 text-muted-foreground">
          This tool provides an indicative operational readiness score. It does not determine whether the AI Act applies to a specific system, classify an AI system, establish compliance or replace qualified legal advice.
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <AiActReadinessAssessment />
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-20">
        <div className="rounded-[2rem] border bg-card p-7 md:p-9">
          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Official context</p>
          <h2 className="mt-3 text-2xl font-bold">Use the score to organize work, then verify obligations against authoritative sources.</h2>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            Article 50 transparency obligations apply to certain providers, deployers, systems and uses. The European Commission published final Article 50 transparency guidelines on 20 July 2026, and the relevant transparency obligations apply from 2 August 2026. This assessment intentionally does not reduce those rules to a blanket “label all AI” instruction.
          </p>
          <ul className="mt-5 space-y-3 text-sm">
            <li>
              <a className="font-semibold underline underline-offset-4" href="https://digital-strategy.ec.europa.eu/en/library/guidelines-transparency-obligations-providers-and-deployers-ai-systems" target="_blank" rel="noreferrer">European Commission — Article 50 transparency guidelines</a>
            </li>
            <li>
              <a className="font-semibold underline underline-offset-4" href="https://eur-lex.europa.eu/eli/reg/2024/1689/oj" target="_blank" rel="noreferrer">EUR-Lex — Regulation (EU) 2024/1689 (AI Act)</a>
            </li>
          </ul>
        </div>
      </section>

      <PublicFooter locale="en" />
    </main>
  );
}
