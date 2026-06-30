'use client';

import { useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/integrations/supabase/client';
import { defaultLocale, locales, type Locale } from '@/lib/i18n/routing';

function resolveLocale(value: string | undefined): Locale {
  return (value && locales.includes(value as Locale) ? value : defaultLocale) as Locale;
}

function safeNextPath(value: string | null, locale: Locale) {
  const fallback = `/${locale}/onboarding`;
  const next = value?.trim();
  if (!next || next.length > 240 || next.startsWith('//') || next.includes('://')) return fallback;
  const allowed = [`/${locale}/onboarding`, `/${locale}/dashboard/organizations`, `/${locale}/checkout`];
  return allowed.some((path) => next === path || next.startsWith(`${path}/`) || next.startsWith(`${path}?`)) ? next : fallback;
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = resolveLocale(params.locale as string | undefined);

  useEffect(() => {
    let cancelled = false;

    async function completeAuth() {
      const code = searchParams.get('code');
      if (!code) {
        router.replace(`/${locale}/login?error=missing_oauth_code`);
        return;
      }

      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (cancelled) return;

      if (error) {
        router.replace(`/${locale}/login?error=auth_exchange_failed`);
        return;
      }

      router.replace(safeNextPath(searchParams.get('next'), locale));
      router.refresh();
    }

    void completeAuth();

    return () => {
      cancelled = true;
    };
  }, [locale, router, searchParams]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050505] px-4 text-white">
      <div className="w-full max-w-sm rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 text-center shadow-2xl backdrop-blur-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-200/80">RISCK COMPLY</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">A concluir autenticação...</h1>
        <p className="mt-3 text-sm leading-6 text-white/56">Estamos a validar o acesso com segurança.</p>
      </div>
    </main>
  );
}
