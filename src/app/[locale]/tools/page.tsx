import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { PublicFooter } from '@/components/marketing/public-footer';
import { getSiteUrl } from '@/lib/seo/public-metadata';

type ToolsPageProps = {
  params: Promise<{ locale: string }>;
};

const tools = [
  {
    href: '/en/tools/ai-act-readiness',
    title: 'EU AI Act Readiness Assessment',
    description:
      'Score eight operational governance dimensions across inventory, accountability, provider/deployer role mapping, risk review, transparency, oversight, vendor governance and evidence.',
    cta: 'Run the readiness assessment',
    ctaId: 'tool-ai-act-readiness-start',
  },
  {
    href: '/en/tools/article-50-transparency',
    title: 'Article 50 Transparency Checker',
    description:
      'Map direct AI interaction, synthetic-content and deployer scenarios that may require a transparency review without turning an automated tool into legal advice.',
    cta: 'Open the Article 50 checker',
    ctaId: 'tool-article-50-transparency-open',
  },
  {
    href: '/en/tools/provider-vs-deployer',
    title: 'Provider vs Deployer Checker',
    description:
      'Structure provider and deployer role signals under Article 3 before routing ambiguous or mixed value-chain questions to qualified legal review.',
    cta: 'Map provider and deployer signals',
    ctaId: 'tool-provider-vs-deployer-open',
  },
  {
    href: '/en/tools/ai-governance-maturity',
    title: 'AI Governance Maturity Assessment',
    description:
      'Assess governance model, inventory, risk decisions, evidence readiness, vendor governance and monitoring across six operating dimensions.',
    cta: 'Assess governance maturity',
    ctaId: 'tool-ai-governance-maturity-open',
  },
] as const;

export async function generateMetadata({ params }: ToolsPageProps): Promise<Metadata> {
  const { locale } = await params;
  if (locale !== 'en') return { robots: { index: false, follow: false } };

  const url = `${getSiteUrl()}/en/tools`;
  return {
    title: 'Free AI Governance Tools | RISCK COMPLY',
    description:
      'Free operational AI governance tools for EU AI Act readiness, Article 50 transparency, provider/deployer role mapping and governance maturity.',
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
        <div className="grid gap-5 md:grid-cols-2">
          {tools.map((tool) => (
            <article key={tool.href} className="flex flex-col rounded-[2rem] border bg-card p-7 md:p-9">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Available now</p>
              <h2 className="mt-3 text-2xl font-bold tracking-tight">{tool.title}</h2>
              <p className="mt-4 flex-1 text-sm leading-7 text-muted-foreground">{tool.description}</p>
              <div className="mt-7">
                <Link
                  href={tool.href}
                  data-cta-id={tool.ctaId}
                  className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  {tool.cta}
                </Link>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-8 rounded-3xl border bg-muted/30 p-6">
          <h2 className="text-xl font-semibold">Need the supporting guidance?</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Browse RISCK COMPLY resources for practical AI governance and EU AI Act readiness guidance, then move evidence and ownership into the platform when the work becomes operational.
          </p>
          <Link
            href="/en/resources"
            data-cta-id="tool-resources"
            className="mt-5 inline-flex h-11 items-center justify-center rounded-full border px-5 text-sm font-semibold hover:bg-muted"
          >
            Browse resources
          </Link>
        </div>
      </section>

      <PublicFooter locale="en" />
    </main>
  );
}
