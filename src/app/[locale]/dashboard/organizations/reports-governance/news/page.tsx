import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getCurrentUser } from '@/server/queries/auth';

export default async function ComplianceNewsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  return (
    <main className="min-h-screen bg-[#f6f3ee] px-6 py-8 text-slate-950">
      <div className="mx-auto max-w-6xl space-y-6">
        <Link href={`/${locale}/dashboard/organizations/reports-governance`} className="text-sm font-semibold text-slate-600 hover:text-slate-950">
          ← Reports & Governance
        </Link>
        <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-amber-700">AI regulatory news</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight">European compliance news</h1>
          <p className="mt-3 max-w-3xl text-slate-600">
            Multilingual regulatory intelligence preview. This protected page is ready for the interactive AI news client.
          </p>
        </section>
        <section className="grid gap-4 md:grid-cols-3">
          {['EUR-Lex update on digital rules', 'CNPD guidance on DPIA', 'CNIL transfer controls'].map((title) => (
            <article key={title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">Compliance</span>
              <h2 className="mt-4 text-xl font-black">{title}</h2>
              <p className="mt-2 text-sm text-slate-600">AI rewritten summary with source attribution, publication date and institution metadata.</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
