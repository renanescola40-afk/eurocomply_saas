import { unstable_noStore as noStore } from 'next/cache';
import { redirect } from 'next/navigation';

import { B2BOnboardingFlow } from '@/components/onboarding/b2b-onboarding-flow';
import { getBillingPlan } from '@/lib/billing/plans';
import { locales, type Locale } from '@/lib/i18n/routing';
import type { OnboardingActivationInput, OnboardingDraftInput } from '@/lib/onboarding/activation';
import { completeOnboardingActivation, saveOnboardingDraft } from '@/server/actions/onboarding';
import { getCurrentUser } from '@/server/queries/auth';
import { getOnboardingActivationState } from '@/server/queries/onboarding';

type OnboardingSearchParams = {
  plan?: string;
};

type OnboardingPageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<OnboardingSearchParams>;
};

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

function getSafeLocale(locale: string): Locale {
  return (locales.includes(locale as Locale) ? locale : 'en') as Locale;
}

function getPlanQuery(planId?: string) {
  const plan = getBillingPlan(planId);
  return plan ? `?plan=${encodeURIComponent(plan.id)}` : '';
}

export default async function OnboardingPage({ params, searchParams }: OnboardingPageProps) {
  noStore();

  const emptySearchParams: OnboardingSearchParams = {};
  const [{ locale }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams ?? Promise.resolve(emptySearchParams),
  ]);
  const safeLocale = getSafeLocale(locale);
  const planQuery = getPlanQuery(resolvedSearchParams.plan);
  const requestedPlan = getBillingPlan(resolvedSearchParams.plan)?.id ?? resolvedSearchParams.plan ?? null;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${safeLocale}/login?next=${encodeURIComponent(`/${safeLocale}/onboarding${planQuery}`)}`);
  }

  const initialState = await getOnboardingActivationState(user.id);

  if (initialState.organization?.onboardingStatus === 'completed') {
    redirect(`/${safeLocale}/dashboard/organizations${planQuery}`);
  }

  async function saveDraftFromOnboarding(input: OnboardingDraftInput) {
    'use server';

    const currentUser = await getCurrentUser();

    if (!currentUser) {
      redirect(`/${safeLocale}/login?next=${encodeURIComponent(`/${safeLocale}/onboarding${planQuery}`)}`);
    }

    return saveOnboardingDraft(input, { id: currentUser.id, email: currentUser.email });
  }

  async function completeActivationFromOnboarding(input: OnboardingActivationInput) {
    'use server';

    const currentUser = await getCurrentUser();

    if (!currentUser) {
      redirect(`/${safeLocale}/login?next=${encodeURIComponent(`/${safeLocale}/onboarding${planQuery}`)}`);
    }

    return completeOnboardingActivation(input, { id: currentUser.id, email: currentUser.email }, safeLocale);
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.18),_transparent_34rem),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.09),_transparent_30rem),linear-gradient(180deg,#050505_0%,#080b12_46%,#050505_100%)] px-4 py-8 text-foreground sm:px-6 lg:px-8">
      <div className="pointer-events-none fixed inset-0 tech-grid opacity-25" />
      <div className="relative mx-auto max-w-7xl space-y-8">
        <div className="max-w-3xl">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-blue-100/70">RISCK COMPLY onboarding</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-5xl">Turn signup into AI compliance readiness.</h1>
          <p className="mt-4 text-base leading-7 text-slate-300">
            Configure the company, register the first AI system, generate an initial readiness score and create the first documents and tasks without blocking the user unnecessarily.
          </p>
        </div>

        <B2BOnboardingFlow
          locale={safeLocale}
          requestedPlan={requestedPlan}
          initialState={initialState}
          onSaveDraft={saveDraftFromOnboarding}
          onComplete={completeActivationFromOnboarding}
        />
      </div>
    </main>
  );
}
