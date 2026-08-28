import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { PublicFooter } from '@/components/marketing/public-footer';
import { ProviderDeployerChecker } from '@/components/marketing/tools/provider-deployer-checker';
import { getSiteUrl } from '@/lib/seo/public-metadata';

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (locale !== 'en') return { robots: { index: false, follow: false } };
  const url = `${getSiteUrl()}/en/tools/provider-vs-deployer`;
  return {
    title: 'AI Act Provider vs Deployer Checker | RISCK COMPLY',
    description: 'Map factual provider and deployer signals under the EU AI Act before routing ambiguous role questions to qualified legal review.',
    alternates: { canonical: url, languages: { en: url, 'x-default': url } },
    openGraph: { title: 'AI Act Provider vs Deployer Checker | RISCK COMPLY', description: 'A free role-signal mapping tool for AI governance teams.', url, type: 'website', siteName: 'RISCK COMPLY' },
  };
}

export default async function ProviderVsDeployerPage({ params }: PageProps) {
  const { locale } = await params;
  if (locale !== 'en') notFound();

  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto max-w-5xl px-6 pb-10 pt-20">
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Free AI Act role-mapping tool</p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-6xl">Provider vs deployer: map the facts before the legal conclusion</h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">Article 3 distinguishes providers from deployers using factual concepts such as developing or commissioning an AI system, placing it on the market or putting it into service under a name or trademark, and using an AI system under an organization’s authority.</p>
        <div className="mt-6 rounded-2xl border bg-muted/40 p-4 text-sm leading-6 text-muted-foreground">This checker surfaces role signals only. Real value chains can be mixed, system-specific or affected by facts not asked here, so ambiguous cases should be reviewed by qualified counsel.</div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16"><ProviderDeployerChecker /></section>

      <section className="mx-auto max-w-5xl px-6 pb-20">
        <div className="rounded-[2rem] border bg-card p-7 md:p-9">
          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Authoritative definitions</p>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">Article 3 of Regulation (EU) 2024/1689 defines a provider and a deployer. The Commission’s Article 50 Q&A also explains these roles in transparency scenarios.</p>
          <div className="mt-4 flex flex-col gap-3 text-sm">
            <a className="font-semibold underline underline-offset-4" href="https://eur-lex.europa.eu/eli/reg/2024/1689/oj" target="_blank" rel="noreferrer">EUR-Lex — Regulation (EU) 2024/1689, Article 3</a>
            <a className="font-semibold underline underline-offset-4" href="https://digital-strategy.ec.europa.eu/en/faqs/transparency-obligations-under-article-50-ai-act" target="_blank" rel="noreferrer">European Commission — Article 50 provider/deployer Q&A</a>
          </div>
        </div>
      </section>
      <PublicFooter locale="en" />
    </main>
  );
}
