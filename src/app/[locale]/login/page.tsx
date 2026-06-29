'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { SignIn } from '@clerk/nextjs';
import { LanguageSwitcher } from '@/components/i18n/language-switcher';
import { normalizePublicAuthErrorCode } from '@/lib/auth/public-errors';
import { locales, type Locale } from '@/lib/i18n/routing';

const copy = {
  en: {
    eyebrow: 'Secure access',
    title: 'Sign in to RISCK COMPLY',
    subtitle: 'Continue to your audit-ready workspace with tenant isolated data, GDPR aligned controls and role-based access.',
    signup: 'Create an account',
    home: 'Back to public site',
    panelTitle: 'Enterprise control room',
    panelSubtitle: 'Designed for European compliance teams that need clean evidence, clear ownership and procurement-safe trust copy.',
    assurances: ['Audit-ready evidence trails', 'Tenant isolated workspace model', 'GDPR aligned privacy workflows', 'Role-based access for teams'],
    publicErrors: {
      missing_oauth_code: 'The sign-in request expired. Please try again.',
      auth_configuration_unavailable: 'Authentication is temporarily unavailable. Please try again later.',
      auth_exchange_failed: 'We could not complete sign-in. Please try again.',
      email_sign_in_failed: 'We could not complete email sign-in. Please try again.',
    },
  },
  pt: {
    eyebrow: 'Acesso seguro',
    title: 'Entrar no RISCK COMPLY',
    subtitle: 'Continue para o seu workspace audit-ready com dados tenant isolated, controlos GDPR aligned e role-based access.',
    signup: 'Criar conta',
    home: 'Voltar ao site público',
    panelTitle: 'Sala de controlo enterprise',
    panelSubtitle: 'Desenhado para equipas europeias de compliance que precisam de evidência limpa, ownership claro e linguagem segura para procurement.',
    assurances: ['Trilhas de evidência audit-ready', 'Modelo de workspace tenant isolated', 'Workflows de privacidade GDPR aligned', 'Role-based access para equipas'],
    publicErrors: {
      missing_oauth_code: 'O pedido de entrada expirou. Tente novamente.',
      auth_configuration_unavailable: 'A autenticação está temporariamente indisponível. Tente novamente mais tarde.',
      auth_exchange_failed: 'Não foi possível concluir a entrada. Tente novamente.',
      email_sign_in_failed: 'Não foi possível concluir a entrada por email. Tente novamente.',
    },
  },
} as const;

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
  const pageCopy = activeLocale === 'pt' ? copy.pt : copy.en;
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
