'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { SignIn } from '@clerk/nextjs';
import { LanguageSwitcher } from '@/components/i18n/language-switcher';
import { locales, type Locale } from '@/lib/i18n/routing';

function getAuthSuccessHref(locale: string) {
  return `/${locale}/onboarding`;
}

function getSafeNextPath(next: string | null, locale: string) {
  const fallback = getAuthSuccessHref(locale);
  const normalizedNext = next?.trim();

  if (!normalizedNext || normalizedNext.length > 240 || normalizedNext.includes('://') || normalizedNext.startsWith('//')) {
    return fallback;
  }

  if (!normalizedNext.startsWith(`/${locale}/onboarding`)) {
    return fallback;
  }

  return normalizedNext;
}

export default function LoginPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params.locale as string) || 'pt';
  const activeLocale = (locales.includes(locale as Locale) ? locale : 'en') as Locale;
  const afterSignInUrl = getSafeNextPath(searchParams.get('next'), activeLocale);
  const signUpUrl = `/${activeLocale}/signup`;

  return (
    <main className="min-h-screen bg-[#050505] px-4 py-8 text-white">
      <header className="mx-auto flex max-w-7xl items-center justify-between">
        <Link href={`/${activeLocale}`} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black">
          RISCK COMPLY
        </Link>
        <LanguageSwitcher currentLocale={activeLocale} variant="dark" compact />
      </header>
      <section className="mx-auto mt-16 max-w-md rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 shadow-2xl">
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/38">Secure access</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Sign in to RISCK COMPLY</h1>
          <p className="mt-3 text-sm leading-6 text-white/56">Continue to your audit-ready workspace.</p>
        </div>
        <div className="rounded-[1.5rem] bg-white p-2 text-black">
          <SignIn
            routing="hash"
            signUpUrl={signUpUrl}
            fallbackRedirectUrl={afterSignInUrl}
            forceRedirectUrl={afterSignInUrl}
          />
        </div>
        <Link href={signUpUrl} className="mt-5 block text-center text-sm font-medium text-white/55 transition hover:text-white">
          Create an account
        </Link>
      </section>
    </main>
  );
}
