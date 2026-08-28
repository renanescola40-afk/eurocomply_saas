import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { PublicFooter } from '@/components/marketing/public-footer';
import { getSiteUrl } from '@/lib/seo/public-metadata';

type ToolsPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: ToolsPageProps): Promise<Metadata> {
  const { locale } = await params;
  if (locale !== 'en') return { robots: { index: false, follow: false } };

  const url = `${getSiteUrl()}/en/tools`;
  return {
    title: 'Free AI Governance Tools | RISCK COMPLY',
    description: 'Free operational AI governance tools for EU AI Act readiness, AI inventory, transparency, accountability and evidence workflows.',
    alternates: { canonical: url, languages: { en: url, 'x-default': url } },
    openGraph: {
      title: 'Free AI Governance Tools | RISCK COMPLY',
      description: 'Practical readiness tools for European teams building operational AI governance.',
      url,
      type: 'website',
      siteName: 'RISCK COMPLY',
    },
  };
}

export default async function ToolsPage({ params }: ToolsPageProps) {
  const { locale } = await params;
  if (locale !== 'en') notFound();

  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto max-w-5xl px-6 py-20">
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Free tools</p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-6xl">Operational AI governance tools for European teams</h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">
          Use focused tools to structure AI governance questions before moving the work into a controlled operating system. Results are readiness-oriented and do not replace legal review.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <article className="rounded-[2rem] border bg-card p-7 md:p-9">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Available now</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight">EU AI Act Readiness Assessment</h2>
          <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
            Score eight operational governance dimensions across inventory, accountability, provider/deployer role mapping, risk review, transparency, oversight, vendor governance and evidence.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/en/tools/ai-act-readiness"
              data-cta-id="tool-ai-act-readiness-start"
              className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Run the free assessment
            </Link>
            <Link
              href="/en/resources"
              data-cta-id="tool-resources"
              className="inline-flex h-11 items-center justify-center rounded-full border px-5 text-sm font-semibold hover:bg-muted"
            >
              Browse resources
            </Link>
          </div>
        </article>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {[
            ['Article 50 Transparency Checker', 'Map scenarios that may need a transparency review without turning an automated tool into legal advice.'],
            ['Provider vs Deployer Checker', 'Structure role facts and counterparties before qualified legal interpretation.'],
            ['AI Governance Maturity Assessment', 'Assess operating maturity across ownership, evidence, review cadence and monitoring.'],
          ].map(([title, description]) => (
            <article key={title} className="rounded-3xl border bg-card p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Planned</p>
              <h2 className="mt-3 text-xl font-semibold">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
            </article>
          ))}
        </div>
      </section>

      <PublicFooter locale="en" />
    </main>
  );
}
