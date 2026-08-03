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

  if (initialState.organization?.isOnboardingCompleted) {
    redirect(`/${safeLocale}/dashboard/organizations${planQuery}`);
  }

  async function saveDraftFromOnboarding(input: OnboardingDraftInput) {
    'use server';

    const currentUser = await getCurrentUser();

    if (!currentUser) {
      redirect(`/${safeLocale}/login?next=${encodeURIComponent(`/${safeLocale}/onboarding${planQuery}`)}`);
    }

    return saveOnboardingDraft(input);
  }

  async function completeActivationFromOnboarding(input: OnboardingActivationInput) {
    'use server';

    const currentUser = await getCurrentUser();

    if (!currentUser) {
      redirect(`/${safeLocale}/login?next=${encodeURIComponent(`/${safeLocale}/onboarding${planQuery}`)}`);
    }

    return completeOnboardingActivation(input, safeLocale);
  }

  return (
    <main className="min-h-screen bg-[#03070b]">
      <B2BOnboardingFlow
        locale={safeLocale}
        requestedPlan={requestedPlan}
        initialState={initialState}
        onSaveDraft={saveDraftFromOnboarding}
        onComplete={completeActivationFromOnboarding}
      />
    </main>
  );
}
