'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function OAuthCompletePage() {
  const params = useParams<{ locale?: string }>();
  const locale = params?.locale ?? 'pt';

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080e18] px-4 py-8 text-white">
      <section className="w-full max-w-sm rounded-xl border border-slate-800 bg-[#0b121e] p-6 text-center sm:p-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-400">RISCK COMPLY</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-100">Autenticação atualizada</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Este fluxo legado foi substituído pelo callback seguro do Supabase.
        </p>
        <Link
          href={`/${locale}/onboarding`}
          className="mt-6 inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
        >
          Continuar
        </Link>
      </section>
    </main>
  );
}
