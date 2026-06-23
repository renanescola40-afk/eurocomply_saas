import Link from 'next/link';

import { isSupportedLocale, type Locale } from '@/lib/i18n/locales';

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isSupportedLocale(rawLocale) ? rawLocale : 'en';

  return (
    <main className="min-h-screen bg-[#0A0A0F] px-6 py-24 text-[#E0E0E0]">
      <div className="mx-auto max-w-4xl space-y-8">
        <Link href={`/${locale}`} className="text-sm text-white/60 hover:text-white">Risck comply</Link>
        <header className="space-y-4">
          <p className="text-sm uppercase tracking-[0.3em] text-white/45">Privacy</p>
          <h1 className="text-4xl font-semibold tracking-tight text-white md:text-6xl">Privacy Policy</h1>
          <p className="max-w-2xl text-lg leading-8 text-white/65">This production draft explains how Risck comply handles account, organization, billing and compliance data for European business customers.</p>
        </header>
        <section className="space-y-5 rounded-3xl border border-white/10 bg-white/[0.03] p-8 leading-7 text-white/70">
          <h2 className="text-2xl font-semibold text-white">Data we process</h2>
          <p>Risck comply processes account identifiers, organization details, billing metadata, compliance documents, vendor records, audit events, notifications and user actions required to operate the service.</p>
          <h2 className="text-2xl font-semibold text-white">Purpose</h2>
          <p>We use data to provide authentication, organization isolation, compliance workflows, legal calendars, audit trails, exports, subscription management and customer support.</p>
          <h2 className="text-2xl font-semibold text-white">Security</h2>
          <p>Access is protected through authentication, server-side organization checks, private storage, audit logging and role-aware feature access.</p>
          <h2 className="text-2xl font-semibold text-white">Your rights</h2>
          <p>European users may request access, correction, export or deletion review through the application or by contacting the organization administrator.</p>
          <h2 className="text-2xl font-semibold text-white">Subprocessors</h2>
          <p>Risck comply may use infrastructure and operational subprocessors where configured by the production operator.</p>
        </section>
      </div>
    </main>
  );
}
