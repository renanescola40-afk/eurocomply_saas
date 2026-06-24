import Link from 'next/link';
import { notFound } from 'next/navigation';

import { PublicFooter } from '@/components/marketing/public-footer';
import { isSupportedLocale } from '@/lib/i18n/locales';

export default async function TrustCenterPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();

  return (
    <main className="min-h-screen bg-[#0A0A0F] text-white">
      <section className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <Link href={`/${locale}`} className="text-sm text-white/70 hover:text-white">Risck comply</Link>
          <p className="mt-10 text-sm font-semibold uppercase tracking-[0.24em] text-blue-200">Trust Center</p>
          <h1 className="mt-4 max-w-5xl text-5xl font-semibold tracking-[-0.05em]">Security, privacy and operational transparency without compliance washing.</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">Risck comply publishes current controls, open gaps and procurement-ready documentation so enterprise buyers can evaluate the platform honestly.</p>
          <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-sm leading-7 text-slate-300">
            Claims are tied to implementation status: implemented, evidence pending, designed to support or planned. Risck comply does not currently claim SOC 2 or ISO 27001 certification.
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-6 pb-16 md:grid-cols-2 lg:grid-cols-3">
        <Link href={`/${locale}/security`} className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 hover:bg-white/[0.07]"><h2 className="text-xl font-semibold">Security overview</h2><p className="mt-3 text-sm leading-6 text-slate-400">Auth, RBAC, RLS, audit logs, audit chain, encryption in transit and incident response boundaries.</p></Link>
        <Link href={`/${locale}/data-processing`} className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 hover:bg-white/[0.07]"><h2 className="text-xl font-semibold">Data protection</h2><p className="mt-3 text-sm leading-6 text-slate-400">Data categories, retention posture, provider-managed safeguards and subprocessor review.</p></Link>
        <Link href={`/${locale}/subprocessors`} className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 hover:bg-white/[0.07]"><h2 className="text-xl font-semibold">Subprocessors</h2><p className="mt-3 text-sm leading-6 text-slate-400">Infrastructure and operational providers that must be verified before contract disclosure.</p></Link>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-6 pb-20 md:grid-cols-2">
        <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-6"><h2 className="text-2xl font-semibold">Evidence-bound trust summary</h2><ul className="mt-5 space-y-3 text-sm leading-6 text-slate-300"><li>• Supabase Auth and server-side session checks protect private workspace routes.</li><li>• Organization roles and permissions support RBAC, with implementation scope documented.</li><li>• Supabase RLS migrations are designed to support tenant isolation; live target evidence is required for production claims.</li><li>• Audit logs and audit-chain integrity controls exist; external immutability is not claimed.</li><li>• Continuity and recovery commitments require provider evidence before contractual promises.</li></ul></article>
        <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-6"><h2 className="text-2xl font-semibold">Procurement checklist</h2><ul className="mt-5 space-y-3 text-sm leading-6 text-slate-300"><li>• Validate customer data categories and use case.</li><li>• Confirm enabled providers and subprocessors.</li><li>• Attach release evidence for public routes, trust docs and security gates.</li><li>• Confirm retention, support and continuity commitments in the signed agreement.</li><li>• Use designed-to-support wording for evidence-dependent capabilities.</li></ul></article>
      </section>

      <PublicFooter locale={locale} />
    </main>
  );
}
