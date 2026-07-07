import { PublicFooter } from '@/components/marketing/public-footer';

const principles = [
  'Organization-first AI governance operations for European B2B teams.',
  'Evidence, ownership and audit trails treated as core product primitives.',
  'Risk, vendor, policy and security workflows designed for lean teams under buyer pressure.',
  'Commercial controls, observability and operational readiness built into the SaaS from day one.',
];

type AboutPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function AboutPage({ params }: AboutPageProps) {
  const { locale } = await params;

  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto max-w-5xl px-6 py-20">
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">About RISCK COMPLY</p>
        <h1 className="mt-4 max-w-4xl text-4xl font-bold tracking-tight md:text-6xl">
          The operating layer for AI governance evidence.
        </h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">
          RISCK COMPLY helps growing European companies move AI governance work out of scattered spreadsheets and into a controlled workspace for systems, owners, evidence, policies, vendors, risks and executive reporting.
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
          <h2 className="text-3xl font-bold">Built for serious B2B buyers</h2>
          <p className="mt-4 leading-7 text-muted-foreground">
            The product focuses on the workflows teams need before customer review, procurement diligence and internal leadership requests: clear ownership, readiness signals, evidence status, vendor review, risk visibility and printable executive reporting.
          </p>
        </div>
      </section>

      <PublicFooter locale={locale} />
    </main>
  );
}
