'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { SignIn } from '@clerk/nextjs';
import { normalizePublicAuthErrorCode } from '@/lib/auth/public-errors';
import { getBillingPlan } from '@/lib/billing/plans';
import { locales, type Locale } from '@/lib/i18n/routing';

const publicErrors = {
  en: {
    missing_oauth_code: 'The sign-in request expired. Please try again.',
    auth_configuration_unavailable: 'Authentication is temporarily unavailable. Please try again later.',
    auth_exchange_failed: 'Could not complete sign-in. Please try again.',
    email_sign_in_failed: 'Could not complete sign-in. Please try again.',
  },
  pt: {
    missing_oauth_code: 'O pedido de entrada expirou. Tente novamente.',
    auth_configuration_unavailable: 'A autenticação está temporariamente indisponível. Tente novamente mais tarde.',
    auth_exchange_failed: 'Não foi possível concluir a entrada. Tente novamente.',
    email_sign_in_failed: 'Não foi possível concluir a entrada. Tente novamente.',
  },
} as const;

function getAuthSuccessHref(locale: string, planId?: string | null) {
  const baseHref = `/${locale}/onboarding`;
  const safePlanId = getBillingPlan(planId)?.id;
  return safePlanId ? `${baseHref}?plan=${encodeURIComponent(safePlanId)}` : baseHref;
}

function getSafeNextPath(next: string | null, locale: string, planId?: string | null) {
  const fallback = getAuthSuccessHref(locale, planId);
  const normalizedNext = next?.trim();

  if (!normalizedNext || normalizedNext.length > 240 || normalizedNext.includes('://') || normalizedNext.startsWith('//')) {
    return fallback;
  }

  if (!normalizedNext.startsWith(`/${locale}/onboarding`)) {
    return fallback;
  }

  return normalizedNext;
}

function LoginPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params.locale as string) || 'pt';
  const activeLocale = (locales.includes(locale as Locale) ? locale : 'pt') as Locale;
  const afterSignInUrl = getSafeNextPath(searchParams.get('next'), activeLocale, searchParams.get('plan'));
  const signUpUrl = `/${activeLocale}/signup`;
  const publicErrorCode = searchParams.has('error')
    ? normalizePublicAuthErrorCode(searchParams.get('error'), 'email_sign_in_failed')
    : null;
  const messages = activeLocale === 'pt' ? publicErrors.pt : publicErrors.en;

  return (
    <main className="min-h-screen bg-[#050505] px-4 py-8 text-white">
      <section className="mx-auto mt-16 max-w-md rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 shadow-2xl">
        <Link href={`/${activeLocale}`} className="mb-6 block text-center text-sm font-semibold text-white">
          RISCK COMPLY
        </Link>
        {publicErrorCode ? (
          <div className="mb-4 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-100" role="alert">
            {messages[publicErrorCode]}
          </div>
        ) : null}
        <div className="rounded-[1.5rem] bg-white p-2 text-black">
          <SignIn
            routing="hash"
            signUpUrl={signUpUrl}
            fallbackRedirectUrl={afterSignInUrl}
            forceRedirectUrl={afterSignInUrl}
          />
        </div>
        <Link href={signUpUrl} className="mt-5 block text-center text-sm font-medium text-white/55 transition hover:text-white">
          {activeLocale === 'pt' ? 'Criar conta' : 'Create an account'}
        </Link>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#050505]" />}>
      <LoginPageContent />
    </Suspense>
  );
}
