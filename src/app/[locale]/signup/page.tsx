'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { SignUp } from '@clerk/nextjs';
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

function getSignInHref(locale: string, planId?: string) {
  const baseHref = `/${locale}/login`;
  return planId ? `${baseHref}?plan=${encodeURIComponent(planId)}` : baseHref;
}

function SignupPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params.locale as string) || 'pt';
  const activeLocale = (locales.includes(locale as Locale) ? locale : 'pt') as Locale;
  const selectedPlanId = normalizePlanId(searchParams.get('plan'));
  const selectedPlan = selectedPlanId ? getBillingPlan(selectedPlanId) : undefined;
  const continuationHref = getSafeSignupContinuation(activeLocale, searchParams.get('next'), selectedPlan?.id);
  const signInUrl = getSignInHref(activeLocale, selectedPlan?.id);

  return (
    <main className="min-h-screen bg-[#050505] px-4 py-8 text-white">
      <section className="mx-auto mt-16 max-w-md rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 shadow-2xl">
        <Link href={`/${activeLocale}`} className="mb-6 block text-center text-sm font-semibold text-white">
          RISCK COMPLY
        </Link>
        {selectedPlan ? (
          <div className="mb-4 rounded-2xl border border-blue-300/20 bg-blue-400/10 p-4 text-sm text-blue-50">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-200/80">
              {activeLocale === 'pt' ? 'Plano selecionado' : 'Selected plan'}
            </p>
            <p className="mt-2 text-xl font-semibold tracking-tight">{selectedPlan.name}</p>
          </div>
        ) : null}
        <div className="rounded-[1.5rem] bg-white p-2 text-black">
          <SignUp
            routing="hash"
            signInUrl={signInUrl}
            fallbackRedirectUrl={continuationHref}
            forceRedirectUrl={continuationHref}
          />
        </div>
        <Link href={signInUrl} className="mt-5 block text-center text-sm font-medium text-white/55 transition hover:text-white">
          {activeLocale === 'pt' ? 'Já tem conta? Entrar' : 'Already have an account? Sign in'}
        </Link>
      </section>
    </main>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#050505]" />}>
      <SignupPageContent />
    </Suspense>
  );
}
