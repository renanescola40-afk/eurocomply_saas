'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { SignUp } from '@clerk/nextjs';
import { LanguageSwitcher } from '@/components/i18n/language-switcher';
import { getBillingPlan } from '@/lib/billing/plans';
import { locales, type Locale } from '@/lib/i18n/routing';

const signupCopy = {
  en: {
    title: 'Create your compliance workspace',
    subtitle: 'Start with Clerk-secured sign-up and continue onboarding with the right plan.',
    login: 'Already have an account? Sign in',
    selectedPlan: 'Selected plan',
    planHelp: 'This plan stays available when you switch to sign in.',
  },
  pt: {
    title: 'Crie o seu workspace de compliance',
    subtitle: 'Comece com registo seguro e continue o onboarding com o plano certo.',
    login: 'Já tem conta? Entrar',
    selectedPlan: 'Plano selecionado',
    planHelp: 'Este plano continua disponível quando muda para entrada.',
  },
} as const;

function getOnboardingHref(locale: string, planId?: string) {
  const baseHref = `/${locale}/onboarding`;
  return planId ? `${baseHref}?plan=${encodeURIComponent(planId)}` : baseHref;
}

function normalizePlanId(planId: string | null) {
  return getBillingPlan(planId)?.id;
}

function getSafeSignupContinuation(locale: string, nextPath: string | null, planId?: string) {
  const fallbackHref = getOnboardingHref(locale, planId);
  const normalizedNext = nextPath?.trim();

  if (!normalizedNext) return fallbackHref;
  if (normalizedNext.length > 240 || normalizedNext.startsWith('//') || normalizedNext.includes('://')) return fallbackHref;
  if (!normalizedNext.startsWith(`/${locale}/onboarding`)) return fallbackHref;
  return normalizedNext;
}

function getSignInHref(locale: string, planId?: string) {
  const baseHref = `/${locale}/login`;
  return planId ? `${baseHref}?plan=${encodeURIComponent(planId)}` : baseHref;
}

export default function SignupPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params.locale as string) || 'pt';
  const activeLocale = (locales.includes(locale as Locale) ? locale : 'en') as Locale;
  const pageCopy = activeLocale === 'pt' ? signupCopy.pt : signupCopy.en;
  const selectedPlanId = normalizePlanId(searchParams.get('plan'));
  const requestedNext = searchParams.get('next');
  const selectedPlan = useMemo(() => selectedPlanId ? getBillingPlan(selectedPlanId) : undefined, [selectedPlanId]);
  const continuationHref = useMemo(
    () => getSafeSignupContinuation(activeLocale, requestedNext, selectedPlan?.id),
    [activeLocale, requestedNext, selectedPlan?.id],
  );
  const signInUrl = getSignInHref(activeLocale, selectedPlan?.id);

  return (
    <main className="min-h-screen bg-[#050505] px-4 py-8 text-white">
      <header className="mx-auto flex max-w-7xl items-center justify-between">
        <Link href={`/${activeLocale}`} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black">
          RISCK COMPLY
        </Link>
        <LanguageSwitcher currentLocale={activeLocale} variant="dark" compact />
      </header>

      <section className="mx-auto mt-16 max-w-md rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 shadow-2xl">
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight">{pageCopy.title}</h1>
          <p className="mt-3 text-sm leading-6 text-white/56">{pageCopy.subtitle}</p>
        </div>

        {selectedPlan ? (
          <div className="mt-6 rounded-2xl border border-blue-300/20 bg-blue-400/10 p-4 text-sm text-blue-50">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-200/80">{pageCopy.selectedPlan}</p>
            <p className="mt-2 text-xl font-semibold tracking-tight">{selectedPlan.name}</p>
            <p className="mt-3 text-xs leading-5 text-blue-100/70">{pageCopy.planHelp}</p>
          </div>
        ) : null}

        <div className="mt-6 rounded-[1.5rem] bg-white p-2 text-black">
          <SignUp
            routing="hash"
            signInUrl={signInUrl}
            fallbackRedirectUrl={continuationHref}
            forceRedirectUrl={continuationHref}
          />
        </div>

        <Link href={signInUrl} className="mt-5 block text-center text-sm font-medium text-white/55 transition hover:text-white">
          {pageCopy.login}
        </Link>
      </section>
    </main>
  );
}
