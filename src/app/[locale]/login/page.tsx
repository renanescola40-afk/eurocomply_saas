'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { SignIn } from '@clerk/nextjs';
import { LanguageSwitcher } from '@/components/i18n/language-switcher';
import { locales, type Locale } from '@/lib/i18n/routing';

const copy = {
  en: {
    eyebrow: 'Secure access',
    title: 'Sign in to RISCK COMPLY',
    subtitle: 'Access your compliance workspace with Clerk-secured authentication.',
    signup: 'Create an account',
  },
  pt: {
    eyebrow: 'Acesso seguro',
    title: 'Entrar no RISCK COMPLY',
    subtitle: 'Aceda ao seu workspace de compliance com autenticação segura via Clerk.',
    signup: 'Criar conta',
  },
} as const;

function getDashboardHref(locale: string) {
  return `/${locale}/dashboard/organizations`;
}

function getSafeNextPath(next: string | null, locale: string) {
  if (!next || next.includes('://') || next.startsWith('//')) {
    return getDashboardHref(locale);
  }

  if (!next.startsWith(`/${locale}/dashboard`)) {
    return getDashboardHref(locale);
  }

  return next;
}

export default function LoginPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params.locale as string) || 'pt';
  const activeLocale = (locales.includes(locale as Locale) ? locale : 'en') as Locale;
  const pageCopy = activeLocale === 'pt' ? copy.pt : copy.en;
  const afterSignInUrl = getSafeNextPath(searchParams.get('next'), activeLocale);

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(37,99,235,0.24),transparent_34rem)]" />
      <div className="fixed right-5 top-5 z-20">
        <LanguageSwitcher currentLocale={activeLocale} variant="dark" compact />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-md items-center px-5 py-10">
        <div className="w-full rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-7 shadow-2xl backdrop-blur-xl">
          <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black">
            <Image src="/brand/risck-comply-icon.svg" alt="RISCK COMPLY" width={48} height={48} className="h-12 w-12 object-contain" priority />
          </div>

          <div className="mb-6 text-center">
            <p className="text-xs uppercase tracking-[0.28em] text-white/36">{pageCopy.eyebrow}</p>
            <h1 className="mt-2 text-2xl font-semibold">{pageCopy.title}</h1>
            <p className="mt-2 text-sm text-white/50">{pageCopy.subtitle}</p>
          </div>

          <div className="flex justify-center">
            <SignIn
              routing="path"
              path={`/${activeLocale}/login`}
              signUpUrl={`/${activeLocale}/signup`}
              fallbackRedirectUrl={afterSignInUrl}
              forceRedirectUrl={afterSignInUrl}
              appearance={{
                elements: {
                  rootBox: 'w-full',
                  card: 'w-full bg-white text-black shadow-none',
                },
              }}
            />
          </div>

          <Link href={`/${activeLocale}/signup`} className="mt-5 block text-center text-sm text-white/50 hover:text-white">
            {pageCopy.signup}
          </Link>
        </div>
      </div>
    </main>
  );
}
