import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { defaultLocale, locales, type Locale } from '@/lib/i18n/routing';

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function LegacyOrganizationsPage({ params }: PageProps) {
  const { locale: requestedLocale } = await params;
  const locale = (locales.includes(requestedLocale as Locale) ? requestedLocale : defaultLocale) as Locale;

  return (
    <main className="min-h-0 bg-transparent text-white">
      <div className="w-full space-y-6">
        <header className="border-b border-slate-800 pb-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-400">RISCK COMPLY</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-white">Fluxo legado retirado</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            A gestão de organizações agora usa Supabase Auth e o dashboard principal de organizações.
          </p>
        </header>

        <section className="rounded-xl border border-slate-800 bg-[#0b121e] p-5 sm:p-6">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-slate-100">Gestão centralizada de organizações</p>
            <p className="mt-1 text-sm leading-6 text-slate-400">
              Continue no dashboard de organizações para gerir o espaço de trabalho com a experiência atual do produto.
            </p>
            <Link
              href={`/${locale}/dashboard/organizations`}
              className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
            >
              Abrir organizações
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
