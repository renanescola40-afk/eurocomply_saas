import Link from 'next/link';

import { isSupportedLocale, type Locale } from '@/lib/i18n/locales';

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isSupportedLocale(rawLocale) ? rawLocale : 'en';

  return (
    <main className="min-h-screen bg-[#0A0A0F] px-6 py-24 text-[#E0E0E0]">
      <div className="mx-auto max-w-4xl space-y-8">
        <Link href={`/${locale}`} className="text-sm text-white/60 hover:text-white">EuroComply</Link>
        <header className="space-y-4">
          <p className="text-sm uppercase tracking-[0.3em] text-white/45">Terms</p>
          <h1 className="text-4xl font-semibold tracking-tight text-white md:text-6xl">Terms of Service</h1>
          <p className="max-w-2xl text-lg leading-8 text-white/65">These production draft terms define acceptable use, subscriptions and service responsibilities for EuroComply business customers.</p>
        </header>
        <section className="space-y-5 rounded-3xl border border-white/10 bg-white/[0.03] p-8 leading-7 text-white/70">
          <h2 className="text-2xl font-semibold text-white">Service</h2>
          <p>EuroComply provides compliance operations software for European businesses, including calendars, documents, risk workflows, audit logs, notifications, vendor records and subscription-based access controls.</p>
          <h2 className="text-2xl font-semibold text-white">Customer responsibilities</h2>
          <p>Customers are responsible for the accuracy of uploaded data, internal legal decisions, user permissions, payment information and compliance outcomes based on their own business context.</p>
          <h2 className="text-2xl font-semibold text-white">Subscriptions</h2>
          <p>Self-service plans are billed through Stripe where enabled. Enterprise plans may require separate commercial terms, onboarding, service levels and procurement review.</p>
          <h2 className="text-2xl font-semibold text-white">Acceptable use</h2>
          <p>The service may not be used to upload unlawful content, bypass access controls, attack infrastructure, resell unauthorized access or process data in violation of applicable law.</p>
          <h2 className="text-2xl font-semibold text-white">No legal advice</h2>
          <p>EuroComply supports compliance operations but does not replace qualified legal, tax or regulatory advice.</p>
        </section>
      </div>
    </main>
  );
}
