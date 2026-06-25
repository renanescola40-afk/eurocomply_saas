import { ClerkOrganizationPanel } from '@/components/auth/ClerkOrganizationPanel';
import { defaultLocale, locales, type Locale } from '@/lib/i18n/routing';

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function ClerkOrganizationsPage({ params }: PageProps) {
  const { locale: requestedLocale } = await params;
  const locale = (locales.includes(requestedLocale as Locale) ? requestedLocale : defaultLocale) as Locale;

  return (
    <main className="min-h-screen bg-[#05050A] px-4 py-10 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 rounded-3xl border border-white/10 bg-white/[0.02] p-6">
          <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">RISCK COMPLY</p>
          <h1 className="mt-3 text-3xl font-black">Enterprise identity setup</h1>
          <p className="mt-2 max-w-3xl text-sm text-zinc-300">
            Esta página liga o dashboard ao modelo de Organizations do Clerk. Próximo passo depois do deploy: persistir o ID da organização no Supabase e aplicar RLS por organização.
          </p>
          <p className="mt-3 text-xs text-zinc-500">Locale ativo: {locale}</p>
        </div>

        <ClerkOrganizationPanel />
      </div>
    </main>
  );
}
