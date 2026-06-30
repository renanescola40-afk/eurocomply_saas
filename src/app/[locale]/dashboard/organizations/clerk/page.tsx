import Link from 'next/link';
import { defaultLocale, locales, type Locale } from '@/lib/i18n/routing';

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function LegacyOrganizationsPage({ params }: PageProps) {
  const { locale: requestedLocale } = await params;
  const locale = (locales.includes(requestedLocale as Locale) ? requestedLocale : defaultLocale) as Locale;

  return (
    <main className="min-h-screen bg-[#05050A] px-4 py-10 text-white md:px-8">
      <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl shadow-black/20">
        <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">RISCK COMPLY</p>
        <h1 className="mt-3 text-3xl font-black">Fluxo legado retirado</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-300">
          A gestão de organizações agora usa Supabase Auth e o dashboard principal de organizações.
        </p>
        <Link
          href={`/${locale}/dashboard/organizations`}
          className="mt-6 inline-flex rounded-full bg-white px-5 py-2 text-sm font-bold text-black transition hover:bg-zinc-200"
        >
          Abrir organizações
        </Link>
      </div>
    </main>
  );
}
