import Link from 'next/link';

import { isSupportedLocale, type Locale } from '@/lib/i18n/locales';

export default async function DpaPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isSupportedLocale(rawLocale) ? rawLocale : 'en';

  return (
    <main className="min-h-screen bg-[#0A0A0F] px-6 py-24 text-[#E0E0E0]">
      <div className="mx-auto max-w-4xl space-y-8">
        <Link href={`/${locale}`} className="text-sm text-white/60 hover:text-white">EuroComply</Link>
        <header className="space-y-4">
          <p className="text-sm uppercase tracking-[0.3em] text-white/45">DPA</p>
          <h1 className="text-4xl font-semibold tracking-tight text-white md:text-6xl">Data Processing Addendum</h1>
          <p className="max-w-2xl text-lg leading-8 text-white/65">This production draft describes processor obligations for customer-controlled personal data processed inside EuroComply.</p>
        </header>
        <section className="space-y-5 rounded-3xl border border-white/10 bg-white/[0.03] p-8 leading-7 text-white/70">
          <h2 className="text-2xl font-semibold text-white">Roles</h2>
          <p>The customer acts as controller for personal data uploaded to the platform. EuroComply acts as processor when operating the service on behalf of the customer.</p>
          <h2 className="text-2xl font-semibold text-white">Processing instructions</h2>
          <p>EuroComply processes customer data only to provide the contracted service, maintain security, support billing, deliver notifications and comply with lawful obligations.</p>
          <h2 className="text-2xl font-semibold text-white">Security measures</h2>
          <p>Measures include authenticated access, organization isolation, private document storage, audit trails, role-aware access, secure infrastructure configuration and operational monitoring.</p>
          <h2 className="text-2xl font-semibold text-white">Subprocessors</h2>
          <p>Approved subprocessors are listed on the Subprocessors page. Material changes should be communicated to enterprise customers according to the commercial agreement.</p>
          <h2 className="text-2xl font-semibold text-white">Deletion and return</h2>
          <p>Upon termination, customers may request export or deletion review according to the plan, legal retention duties and administrator controls.</p>
        </section>
      </div>
    </main>
  );
}
