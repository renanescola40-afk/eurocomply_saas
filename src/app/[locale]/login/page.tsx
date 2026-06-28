'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { SignIn } from '@clerk/nextjs';
import { Building2, CheckCircle2, LockKeyhole, ShieldCheck } from 'lucide-react';
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

  if (!next || next.includes('://') || next.startsWith('//')) {
    return fallback;
  }

  if (!next.startsWith(`/${locale}/dashboard`) && !next.startsWith(`/${locale}/onboarding`)) {
    return fallback;
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
  const publicErrorCode = searchParams.has('error')
    ? normalizePublicAuthErrorCode(searchParams.get('error'), 'email_sign_in_failed')
    : null;

  return (
    <main className="min-h-screen overflow-hidden bg-[#050505] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(37,99,235,0.24),transparent_30rem),radial-gradient(circle_at_82%_18%,rgba(16,185,129,0.12),transparent_26rem),linear-gradient(180deg,#050505_0%,#080b12_55%,#050505_100%)]" />
      <div className="pointer-events-none fixed inset-0 tech-grid opacity-35" />

      <header className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
        <Link href={`/${activeLocale}`} className="flex items-center gap-3" aria-label="RISCK COMPLY home">
          <Image src="/brand/risck-comply-wordmark.svg" alt="RISCK COMPLY" width={176} height={44} className="h-10 w-auto object-contain" priority />
        </Link>
        <div className="flex items-center gap-3">
          <LanguageSwitcher currentLocale={activeLocale} variant="dark" compact />
          <Link href={`/${activeLocale}`} className="hidden rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white/70 transition hover:border-white/20 hover:text-white sm:inline-flex">
            {pageCopy.home}
          </Link>
        </div>
      </header>

      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-92px)] max-w-7xl items-center gap-8 px-4 pb-10 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
        <section className="hidden lg:block">
          <div className="premium-card rounded-[2rem] p-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-white/55">
              <ShieldCheck className="h-4 w-4 text-white" />
              {pageCopy.eyebrow}
            </div>
            <h2 className="mt-6 max-w-xl text-4xl font-semibold tracking-[-0.045em] text-white">{pageCopy.panelTitle}</h2>
            <p className="mt-4 max-w-xl text-sm leading-6 text-white/55">{pageCopy.panelSubtitle}</p>

            <div className="mt-8 grid gap-3">
              {pageCopy.assurances.map((item, index) => {
                const icons = [CheckCircle2, Building2, LockKeyhole, ShieldCheck];
                const Icon = icons[index] ?? CheckCircle2;
                return (
                  <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-white/74">
                    <span className="rounded-xl bg-white/10 p-2 text-white"><Icon className="h-4 w-4" /></span>
                    {item}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[29rem] lg:mx-0 lg:ml-auto">
          <div className="premium-card rounded-[2rem] p-5 shadow-2xl sm:p-7">
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black shadow-xl">
              <Image src="/brand/risck-comply-icon.svg" alt="RISCK COMPLY" width={56} height={56} className="h-14 w-14 object-contain" priority />
            </div>

            <div className="mb-6 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/38">{pageCopy.eyebrow}</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em]">{pageCopy.title}</h1>
              <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-white/56">{pageCopy.subtitle}</p>
            </div>

            {publicErrorCode ? (
              <div className="mb-4 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-100" role="alert">
                {pageCopy.publicErrors[publicErrorCode]}
              </div>
            ) : null}

            <div className="rounded-[1.5rem] bg-white p-2 text-black shadow-[0_20px_70px_rgba(0,0,0,.45)]">
              <SignIn
                routing="hash"
                signUpUrl={`/${activeLocale}/signup`}
                fallbackRedirectUrl={afterSignInUrl}
                forceRedirectUrl={afterSignInUrl}
                appearance={{
                  elements: {
                    rootBox: 'w-full',
                    card: 'w-full bg-white text-black shadow-none border-0',
                    headerTitle: 'text-2xl font-semibold tracking-tight',
                    headerSubtitle: 'text-sm text-slate-500',
                    formButtonPrimary: 'rounded-xl bg-slate-950 text-white hover:bg-slate-800',
                    formFieldInput: 'rounded-xl border-slate-200 focus:ring-slate-950',
                    footerActionLink: 'text-slate-950 font-semibold',
                  },
                }}
              />
            </div>

            <Link href={`/${activeLocale}/signup`} className="mt-5 block text-center text-sm font-medium text-white/55 transition hover:text-white">
              {pageCopy.signup}
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
