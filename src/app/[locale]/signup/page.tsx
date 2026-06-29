'use client';

import Link from 'next/link';
import { SignUp } from '@clerk/nextjs';
import { getBillingPlan } from '@/lib/billing/plans';

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
  const activeLocale = 'pt';
  const selectedPlanId = normalizePlanId(null);
  const selectedPlan = selectedPlanId ? getBillingPlan(selectedPlanId) : undefined;
  const continuationHref = getSafeSignupContinuation(activeLocale, null, selectedPlan?.id);
  const signInUrl = getSignInHref(activeLocale, selectedPlan?.id);

  return (
    <main className="min-h-screen bg-[#050505] px-4 py-8 text-white">
      <section className="mx-auto mt-16 max-w-md rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 shadow-2xl">
        <Link href={`/${activeLocale}`} className="mb-6 block text-center text-sm font-semibold text-white">
          RISCK COMPLY
        </Link>
        <div className="rounded-[1.5rem] bg-white p-2 text-black">
          <SignUp
            routing="hash"
            signInUrl={signInUrl}
            fallbackRedirectUrl={continuationHref}
            forceRedirectUrl={continuationHref}
          />
        </div>
        <Link href={signInUrl} className="mt-5 block text-center text-sm font-medium text-white/55 transition hover:text-white">
          Sign in
        </Link>
      </section>
    </main>
  );
}
