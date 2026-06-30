'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function OAuthCompletePage() {
  const params = useParams<{ locale?: string }>();
  const locale = params?.locale ?? 'pt';

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050505] px-4 text-white">
      <div className="w-full max-w-sm rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 text-center shadow-2xl backdrop-blur-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-200/80">RISCK COMPLY</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">Autenticação atualizada</h1>
        <p className="mt-3 text-sm leading-6 text-white/56">
          Este fluxo legado foi substituído pelo callback seguro do Supabase.
        </p>
        <Link
          href={`/${locale}/onboarding`}
          className="mt-6 inline-flex rounded-full bg-white px-5 py-2 text-sm font-bold text-black transition hover:bg-zinc-200"
        >
          Continuar
        </Link>
      </div>
    </main>
  );
}
