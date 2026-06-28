'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { SignUp } from '@clerk/nextjs';
import { LanguageSwitcher } from '@/components/i18n/language-switcher';
import { getBillingPlan } from '@/lib/billing/plans';
import { locales, type Locale } from '@/lib/i18n/routing';

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

export default function SignupPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params.locale as string) || 'pt';
  const activeLocale = (locales.includes(locale as Locale) ? locale : 'en') as Locale;
  const selectedPlanId = normalizePlanId(searchParams.get('plan'));
  const requestedNext = searchParams.get('next');
  const continuationHref = getSafeSignupContinuation(activeLocale, requestedNext, selectedPlanId);
  const signInUrl = `/${activeLocale}/login`;

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
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/38">RISCK COMPLY</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Create your compliance workspace</h1>
          <p className="mt-3 text-sm leading-6 text-white/56">Start with secure signup and continue onboarding.</p>
        </div>
        <div className="rounded-[1.5rem] bg-white p-2 text-black">
          <SignUp
            routing="hash"
            signInUrl={signInUrl}
            fallbackRedirectUrl={continuationHref}
            forceRedirectUrl={continuationHref}
          />
        </div>
        <Link href={signInUrl} className="mt-5 block text-center text-sm font-medium text-white/55 transition hover:text-white">
          Already have an account? Sign in
        </Link>
      </section>
    </main>
  );
}
