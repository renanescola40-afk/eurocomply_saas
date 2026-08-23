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
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { getOrganizationBillingAuthority } from '@/server/queries/subscription';

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
  const query = new URLSearchParams({ onboarding: 'payment_required' });
  const plan = getBillingPlan(planId);

  if (plan) {
    query.set('plan', plan.id);
  }

  return `/${locale}/dashboard/organizations/billing?${query.toString()}`;
}

async function requireLicensedOnboardingPageAccess(input: {
  organizationId: string;
  locale: Locale;
  planId?: string;
}) {
  let authority: Awaited<ReturnType<typeof getOrganizationBillingAuthority>>;

  try {
    authority = await getOrganizationBillingAuthority(input.organizationId);
  } catch {
    redirect(`/${input.locale}/pricing?billing=billing_authority_unavailable`);
  }

  if (!authority.licensed) {
    redirect(getBillingRecoveryPath(input.locale, input.planId));
  }

  return authority;
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

  // Commercial authority is a door guard, not an onboarding-state attribute.
  // Resolve the tenant with the same canonical organization resolver used by
  // product APIs and enforce payment before loading any operational onboarding
  // state. This prevents a degraded/partial onboarding projection from being
  // interpreted as "no organization" and accidentally rendering product setup.
  const organization = await getCurrentOrganizationForUser(user.id);
  if (organization?.id) {
    await requireLicensedOnboardingPageAccess({
      organizationId: organization.id,
      locale: safeLocale,
      planId: resolvedSearchParams.plan,
    });
  }

  const initialState = await getOnboardingActivationState(user.id);

  if (initialState.organization?.isOnboardingCompleted) {
    redirect(`/${safeLocale}/dashboard`);
  }

  async function saveDraftFromOnboarding(input: OnboardingDraftInput): Promise<OnboardingMutationResult> {
    'use server';

    const currentUser = await getCurrentUser();

    if (!currentUser) {
      redirect(`/${safeLocale}/login?next=${encodeURIComponent(`/${safeLocale}/onboarding${planQuery}`)}`);
    }

    let result: Awaited<ReturnType<typeof saveOnboardingDraft>>;
    try {
      result = await saveOnboardingDraft(input);
    } catch (error) {
      return toOnboardingMutationFailure(error, safeLocale, 'save');
    }

    // A successful pre-license draft creates/updates purchase context only. Do
    // not let the same browser request continue deeper into operational steps.
    await requireLicensedOnboardingPageAccess({
      organizationId: result.organizationId,
      locale: safeLocale,
      planId: input.selectedPlan,
    });

    return { ok: true, ...result };
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
