'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

type AuthFloatingControlsProps = {
  locale: string;
};

function getSafeLocale(locale: string) {
  return locale || 'pt';
}

export function AuthFloatingControls({ locale }: AuthFloatingControlsProps) {
  const safeLocale = getSafeLocale(locale);
  const pathname = usePathname();
  const { user, loading, signOut } = useAuth();
  const onboardingUrl = `/${safeLocale}/onboarding`;
  const professionalOnboardingUrl = `/${safeLocale}/onboarding?plan=professional`;
  const dashboardUrl = `/${safeLocale}/dashboard/organizations`;
  const signInUrl = `/${safeLocale}/login?next=${encodeURIComponent(onboardingUrl)}`;
  const signUpUrl = `/${safeLocale}/signup?plan=professional&next=${encodeURIComponent(professionalOnboardingUrl)}`;

  if (pathname === `/${safeLocale}/login` || pathname === `/${safeLocale}/signup` || pathname === `/${safeLocale}/oauth/complete`) {
    return null;
  }

  return (
    <div className="fixed bottom-5 left-5 z-[80] flex items-center gap-2 rounded-full border border-white/10 bg-black/70 p-2 shadow-2xl shadow-black/40 backdrop-blur-xl print:hidden">
      {loading ? (
        <span className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold text-white/60">
          Verificando sessão…
        </span>
      ) : user ? (
        <>
          <Link
            href={dashboardUrl}
            className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
          >
            Dashboard
          </Link>
          <button
            type="button"
            onClick={() => void signOut()}
            className="rounded-full bg-white px-4 py-2 text-xs font-bold text-black transition hover:bg-zinc-200"
          >
            Sair
          </button>
        </>
      ) : (
        <>
          <Link href={signInUrl} className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10">
            Entrar
          </Link>
          <Link href={signUpUrl} className="rounded-full bg-white px-4 py-2 text-xs font-bold text-black transition hover:bg-zinc-200">
            Criar conta
          </Link>
        </>
      )}
    </div>
  );
}
