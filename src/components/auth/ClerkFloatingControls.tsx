'use client';

import Link from 'next/link';
import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs';

type ClerkFloatingControlsProps = {
  locale: string;
};

function getSafeLocale(locale: string) {
  return locale || 'pt';
}

export function ClerkFloatingControls({ locale }: ClerkFloatingControlsProps) {
  const safeLocale = getSafeLocale(locale);
  const onboardingUrl = `/${safeLocale}/onboarding`;
  const professionalOnboardingUrl = `/${safeLocale}/onboarding?plan=professional`;
  const dashboardUrl = `/${safeLocale}/dashboard/organizations`;
  const signInUrl = `/${safeLocale}/login?next=${encodeURIComponent(onboardingUrl)}`;
  const signUpUrl = `/${safeLocale}/signup?plan=professional&next=${encodeURIComponent(professionalOnboardingUrl)}`;

  return (
    <div className="fixed bottom-5 left-5 z-[80] flex items-center gap-2 rounded-full border border-white/10 bg-black/70 p-2 shadow-2xl shadow-black/40 backdrop-blur-xl print:hidden">
      <SignedOut>
        <Link href={signInUrl} className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10">
          Entrar
        </Link>
        <Link href={signUpUrl} className="rounded-full bg-white px-4 py-2 text-xs font-bold text-black transition hover:bg-zinc-200">
          Criar conta
        </Link>
      </SignedOut>

      <SignedIn>
        <Link
          href={dashboardUrl}
          className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
        >
          Dashboard
        </Link>
        <UserButton />
      </SignedIn>
    </div>
  );
}
