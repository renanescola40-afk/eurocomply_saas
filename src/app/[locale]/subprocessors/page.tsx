import Link from 'next/link';

import { isSupportedLocale, type Locale } from '@/lib/i18n/locales';

const subprocessors = [
  { name: 'Vercel', purpose: 'Application hosting, deployment and edge delivery', location: 'Global infrastructure' },
  { name: 'Supabase', purpose: 'Database, authentication and private object storage', location: 'Configured project region' },
  { name: 'Stripe', purpose: 'Subscription billing, checkout and customer portal', location: 'Global payments infrastructure' },
  { name: 'Sentry', purpose: 'Application monitoring, error tracking and diagnostics', location: 'Configured account region' },
];

export default async function SubprocessorsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isSupportedLocale(rawLocale) ? rawLocale : 'en';

  return (
    <main className="min-h-screen bg-[#0A0A0F] px-6 py-24 text-[#E0E0E0]">
      <div className="mx-auto max-w-4xl space-y-8">
        <Link href={`/${locale}`} className="text-sm text-white/60 hover:text-white">EuroComply</Link>
        <header className="space-y-4">
          <p className="text-sm uppercase tracking-[0.3em] text-white/45">Trust</p>
          <h1 className="text-4xl font-semibold tracking-tight text-white md:text-6xl">Subprocessors</h1>
          <p className="max-w-2xl text-lg leading-8 text-white/65">EuroComply may use the following subprocessors to operate hosting, authentication, billing, storage and monitoring for production customers.</p>
        </header>
        <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
          <div className="grid grid-cols-[1fr_1.4fr_1fr] border-b border-white/10 px-6 py-4 text-sm font-semibold uppercase tracking-[0.2em] text-white/45">
            <span>Provider</span>
            <span>Purpose</span>
            <span>Region</span>
          </div>
          {subprocessors.map((item) => (
            <div key={item.name} className="grid grid-cols-[1fr_1.4fr_1fr] gap-4 border-b border-white/10 px-6 py-5 text-sm text-white/70 last:border-b-0">
              <strong className="text-white">{item.name}</strong>
              <span>{item.purpose}</span>
              <span>{item.location}</span>
            </div>
          ))}
        </section>
        <p className="text-sm leading-6 text-white/50">This list should be reviewed before enterprise contracting and updated whenever a material production subprocessor changes.</p>
      </div>
    </main>
  );
}
