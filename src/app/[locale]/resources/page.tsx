import type { Metadata } from 'next';
import Link from 'next/link';
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
  },
  {
    title: 'AI governance evidence checklist',
    description: 'Track AI systems, owners, risk signals, policy coverage, evidence status and review history before buyer review starts.',
    type: 'Checklist',
    href: '/en/signup',
    cta: 'Use templates in RISCK COMPLY',
    ctaId: 'resource-signup',
  },
  {
    title: 'Vendor review playbook',
    description: 'Prioritize vendors by data access, risk level, DPA status, subprocessors and review cadence.',
    type: 'Playbook',
    href: '/en/signup',
    cta: 'Use templates in RISCK COMPLY',
    ctaId: 'resource-signup',
  },
  {
    title: 'Executive compliance report guide',
    description: 'Turn operational metrics into leadership review score, trends, risks and next best actions.',
    type: 'Guide',
    href: '/en/book-demo',
    cta: 'Book a governance demo',
    ctaId: 'resource-book-demo',
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
    <main className="min-h-screen bg-background">
      <section className="mx-auto max-w-5xl px-6 py-20">
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Resources</p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-6xl">Operational AI governance resources</h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">
          Practical tools and guides for teams moving from scattered AI governance files to a controlled evidence operating cadence.
        </p>
        <Link
          href="/en/tools"
          data-cta-id="resource-free-tool"
          className="mt-7 inline-flex h-11 items-center justify-center rounded-full border px-5 text-sm font-semibold hover:bg-muted"
        >
          Browse free AI governance tools
        </Link>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-6 pb-20 md:grid-cols-2">
        {resources.map((resource) => (
          <article key={resource.title} className="flex min-h-64 flex-col rounded-3xl border bg-card p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{resource.type}</p>
            <h2 className="mt-3 text-2xl font-semibold">{resource.title}</h2>
            <p className="mt-4 flex-1 text-sm leading-6 text-muted-foreground">{resource.description}</p>
            <Link
              href={resource.href}
              data-cta-id={resource.ctaId}
              className="mt-6 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              {resource.cta}
            </Link>
          </article>
        ))}
      </section>

      <PublicFooter locale="en" />
    </main>
  );
}
