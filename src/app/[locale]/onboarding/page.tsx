import { unstable_noStore as noStore } from 'next/cache';
import { redirect } from 'next/navigation';

import { OnboardingRuntimeBoundary as B2BOnboardingFlowRuntimeBoundary } from '@/components/onboarding/onboarding-runtime-boundary';
import { getBillingPlan } from '@/lib/billing/plans';
import { locales, type Locale } from '@/lib/i18n/routing';
import { toOnboardingMutationFailure, type OnboardingMutationResult } from '@/lib/onboarding/action-failure';
import type { OnboardingActivationInput, OnboardingDraftInput } from '@/lib/onboarding/activation';
import { getOnboardingPlanIntent } from '@/lib/onboarding/plan-intent';
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

function getBillingRecoveryPath(locale: Locale, planId?: string) {
  const query = new URLSearchParams({ onboarding: 'completed' });
  const plan = getBillingPlan(planId);

  if (plan) {
    query.set('plan', plan.id);
  }

  return `/${locale}/dashboard/organizations/billing?${query.toString()}`;
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
  const requestedPlan = getOnboardingPlanIntent(resolvedSearchParams.plan);
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${safeLocale}/login?next=${encodeURIComponent(`/${safeLocale}/onboarding${planQuery}`)}`);
  }

  const initialState = await getOnboardingActivationState(user.id);

  if (initialState.organization?.isOnboardingCompleted) {
    redirect(getBillingRecoveryPath(safeLocale, resolvedSearchParams.plan));
  }

  async function saveDraftFromOnboarding(input: OnboardingDraftInput): Promise<OnboardingMutationResult> {
    'use server';

    const currentUser = await getCurrentUser();

    if (!currentUser) {
      redirect(`/${safeLocale}/login?next=${encodeURIComponent(`/${safeLocale}/onboarding${planQuery}`)}`);
    }

    try {
      const result = await saveOnboardingDraft(input);
      return { ok: true, ...result };
    } catch (error) {
      return toOnboardingMutationFailure(error, safeLocale, 'save');
    }
  }

  async function completeActivationFromOnboarding(input: OnboardingActivationInput): Promise<OnboardingMutationResult> {
    'use server';

    const currentUser = await getCurrentUser();

    if (!currentUser) {
      redirect(`/${safeLocale}/login?next=${encodeURIComponent(`/${safeLocale}/onboarding${planQuery}`)}`);
    }

    try {
      const result = await completeOnboardingActivation(input, safeLocale);
      return { ok: true, ...result };
    } catch (error) {
      return toOnboardingMutationFailure(error, safeLocale, 'complete');
    }
  }

  return (
    <main className="min-h-screen bg-[#03070b]">
      <B2BOnboardingFlowRuntimeBoundary
        locale={safeLocale}
        requestedPlan={requestedPlan}
        initialState={initialState}
        onSaveDraft={saveDraftFromOnboarding}
        onComplete={completeActivationFromOnboarding}
      />
    </main>
  );
}
