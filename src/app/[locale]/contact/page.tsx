import Link from 'next/link';
import { PublicFooter } from '@/components/marketing/public-footer';

type ContactPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function ContactPage({ params }: ContactPageProps) {
  const { locale } = await params;

  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto grid max-w-6xl gap-10 px-6 py-20 lg:grid-cols-[1fr_0.9fr] lg:items-start">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Contact</p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-6xl">Talk to Risck comply</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
            For early access, onboarding help, partnerships or security questions, contact the team and include your organization size, compliance goals and timeline.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href={`/${locale}/pricing`} className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              View pricing
            </Link>
            <Link href={`/${locale}/trust`} className="inline-flex h-11 items-center justify-center rounded-md border px-6 text-sm font-medium hover:bg-muted">
              View trust center
            </Link>
          </div>
        </div>

        <aside className="rounded-3xl border bg-card p-6 shadow-sm">
          <h2 className="text-2xl font-semibold">What to include</h2>
          <ul className="mt-5 space-y-3 text-sm leading-6 text-muted-foreground">
            <li>• Company size and region.</li>
            <li>• Current compliance drivers: GDPR, ISO 27001, vendor reviews, audit readiness.</li>
            <li>• Number of vendors, documents and team members.</li>
            <li>• Whether you need founder-led onboarding or migration support.</li>
          </ul>
        </aside>
      </section>

      <PublicFooter locale={locale} />
    </main>
  );
}
