import Link from 'next/link';
import { PublicFooter } from '@/components/marketing/public-footer';

const resources = [
  {
    title: 'AI governance evidence checklist',
    description: 'Track AI systems, owners, risk signals, policy coverage, evidence status and review history before buyer review starts.',
    type: 'Checklist',
  },
  {
    title: 'Vendor review playbook',
    description: 'Prioritize vendors by data access, risk level, DPA status, subprocessors and review cadence.',
    type: 'Playbook',
  },
  {
    title: 'Executive compliance report guide',
    description: 'Turn operational metrics into board-ready score, trends, risks and next best actions.',
    type: 'Guide',
  },
];

type ResourcesPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function ResourcesPage({ params }: ResourcesPageProps) {
  const { locale } = await params;

  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto max-w-5xl px-6 py-20">
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Resources</p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-6xl">Enterprise AI governance resources</h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">
          Practical guides and checklists for teams moving from scattered AI governance files to a controlled evidence operating cadence.
        </p>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-6 pb-20 md:grid-cols-3">
        {resources.map((resource) => (
          <article key={resource.title} className="flex min-h-64 flex-col rounded-3xl border bg-card p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{resource.type}</p>
            <h2 className="mt-3 text-2xl font-semibold">{resource.title}</h2>
            <p className="mt-4 flex-1 text-sm leading-6 text-muted-foreground">{resource.description}</p>
            <Link href={`/${locale}/signup`} className="mt-6 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              Use templates in RISCK COMPLY
            </Link>
          </article>
        ))}
      </section>

      <PublicFooter locale={locale} />
    </main>
  );
}
