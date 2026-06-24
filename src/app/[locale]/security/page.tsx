import Link from 'next/link';
import { notFound } from 'next/navigation';

import { PublicFooter } from '@/components/marketing/public-footer';
import { isSupportedLocale } from '@/lib/i18n/locales';

const sections = [
  { title: 'Identity and access', description: 'Authentication is handled through Supabase Auth and protected application routes.', items: ['Session-based access controls', 'Protected dashboard routes', 'Server-side user checks', 'Responsible disclosure: renansilva2002@gmail.com'] },
  { title: 'RBAC and tenant boundaries', description: 'Organization access is role-based and designed to work with database isolation controls.', items: ['Owner, admin, editor, member and viewer roles', 'Server-side permission checks', 'RLS migrations and validation evidence', 'Legacy flows must be scoped honestly'] },
  { title: 'Audit logs and audit chain', description: 'Critical operations are intended to create audit events and release evidence.', items: ['Audit event code paths', 'Sanitized metadata', 'SHA-256 hash-chain integrity controls', 'No external immutability claim without separate evidence'] },
  { title: 'Managed safeguards', description: 'Customer-facing traffic is designed to use HTTPS/TLS through managed hosting and provider APIs.', items: ['Encryption in transit through managed providers', 'Provider-managed safeguards at rest', 'Sensitive configuration remains server-side', 'Provider evidence required for stronger commitments'] },
  { title: 'Incident response and continuity', description: 'Operational workflows are documented, but maturity claims are bounded by current evidence.', items: ['Triage and containment workflow', 'Customer communication path', 'Continuity evidence required before recovery commitments', 'No 24/7 staffed monitoring claim'] },
  { title: 'Current non-claims', description: 'Risck comply does not currently claim SOC 2 or ISO 27001 certification.', items: ['Use designed-to-support language', 'Attach evidence before stronger claims', 'Review subprocessors and retention before contract disclosure'] },
];

type Props = { params: Promise<{ locale: string }> };

export default async function SecurityPage({ params }: Props) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();

  return (
    <main className="min-h-screen bg-[#0A0A0F] text-white">
      <section className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <Link href={`/${locale}/trust`} className="text-sm text-white/70 hover:text-white">← Back to Trust Center</Link>
          <h1 className="mt-8 max-w-4xl text-5xl font-semibold tracking-[-0.05em]">Security at Risck comply</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">Current controls and evidence boundaries for enterprise buyers. This page avoids unsupported compliance claims and uses designed-to-support wording where evidence is pending.</p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-6 pb-20 md:grid-cols-2">
        {sections.map((section) => (
          <article key={section.title} className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <h2 className="text-xl font-semibold">{section.title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">{section.description}</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-300">
              {section.items.map((item) => <li key={item}>• {item}</li>)}
            </ul>
          </article>
        ))}
      </section>

      <PublicFooter locale={locale} />
    </main>
  );
}
