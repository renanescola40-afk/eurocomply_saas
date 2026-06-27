import { PublicFooter } from '@/components/marketing/public-footer';

const principles = [
  'Organization-first multi-tenant compliance operations.',
  'Evidence and audit trails treated as product primitives.',
  'Practical GDPR, vendor, risk and security workflows for lean teams.',
  'Billing, limits and observability built into the SaaS from day one.',
];

type AboutPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function AboutPage({ params }: AboutPageProps) {
  const { locale } = await params;

  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto max-w-5xl px-6 py-20">
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">About Risck comply</p>
        <h1 className="mt-4 max-w-4xl text-4xl font-bold tracking-tight md:text-6xl">
          Compliance operations for teams that need repeatable proof.
        </h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">
          Risck comply helps growing European companies move compliance work out of scattered spreadsheets and into a secure operational workspace for tasks, documents, vendors, risks and executive reporting.
        </p>
      </section>

      <section className="border-y bg-muted/30 py-16">
        <div className="mx-auto grid max-w-6xl gap-6 px-6 md:grid-cols-2">
          {principles.map((principle) => (
            <article key={principle} className="rounded-2xl border bg-background p-6">
              <p className="text-lg font-semibold">{principle}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-20">
        <div className="rounded-3xl border bg-card p-8 md:p-10">
          <h2 className="text-3xl font-bold">Built for V1 buyers</h2>
          <p className="mt-4 leading-7 text-muted-foreground">
            The product focuses on the workflows early customers actually need: clear ownership, evidence readiness, vendor review, risk visibility, billing control and printable executive reporting.
          </p>
        </div>
      </section>

      <PublicFooter locale={locale} />
    </main>
  );
}
