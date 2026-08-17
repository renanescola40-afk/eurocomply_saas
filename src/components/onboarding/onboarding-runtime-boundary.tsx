'use client';

import Link from 'next/link';
import { ArrowUpRight, Building2, Headphones } from 'lucide-react';

import { B2BOnboardingFlow } from '@/components/onboarding/b2b-onboarding-flow';
import type {
  OnboardingActivationInitialState,
  OnboardingActivationInput,
  OnboardingActionResult,
  OnboardingDraftInput,
} from '@/lib/onboarding/activation';
import type { OnboardingMutationResult } from '@/lib/onboarding/action-failure';

type Props = {
  locale: string;
  requestedPlan?: string | null;
  initialState: OnboardingActivationInitialState;
  onSaveDraft: (input: OnboardingDraftInput) => Promise<OnboardingMutationResult>;
  onComplete: (input: OnboardingActivationInput) => Promise<OnboardingMutationResult>;
};

function unwrapMutationResult(result: OnboardingMutationResult): OnboardingActionResult {
  if (!result.ok) {
    // The existing onboarding component already renders caught client errors in
    // its accessible alert. Throw only the bounded message returned by the
    // server boundary, never the original provider/database exception.
    throw new Error(result.message);
  }

  return result;
}

function getBillingRecoveryPath(locale: string, selectedPlan: string) {
  const query = new URLSearchParams({
    onboarding: 'completed',
    plan: selectedPlan,
  });

  return `/${locale}/dashboard/organizations/billing?${query.toString()}`;
}

export function OnboardingRuntimeBoundary({
  locale,
  requestedPlan,
  initialState,
  onSaveDraft,
  onComplete,
}: Props) {
  const isPt = locale === 'pt';
  const enterpriseSelected = requestedPlan === 'enterprise';
  const enterprisePath = `/${locale}/contact?intent=enterprise&plan=enterprise&source=onboarding`;

  async function saveDraft(input: OnboardingDraftInput) {
    return unwrapMutationResult(await onSaveDraft(input));
  }

  async function complete(input: OnboardingActivationInput) {
    const result = unwrapMutationResult(await onComplete(input));

    // Commercial authority is established after onboarding. Keep fresh,
    // unlicensed organizations inside the billing-recovery route explicitly
    // allowed by the dashboard licensing boundary instead of sending them to a
    // product route that immediately fail-closes back to pricing.
    return {
      ...result,
      dashboardPath: getBillingRecoveryPath(locale, input.selectedPlan),
    };
  }

  return (
    <>
      <B2BOnboardingFlow
        locale={locale}
        requestedPlan={requestedPlan}
        initialState={initialState}
        onSaveDraft={saveDraft}
        onComplete={complete}
      />

      <Link
        href={enterprisePath}
        aria-label={isPt ? 'Solicitar onboarding assistido para grandes empresas' : 'Request assisted onboarding for enterprise teams'}
        className="group fixed bottom-4 right-4 z-[70] flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-2xl border border-emerald-200/20 bg-[#07120f]/95 px-4 py-3 text-left text-white shadow-[0_20px_60px_rgba(0,0,0,.45)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-emerald-200/40 hover:bg-[#0a1914] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200/70 sm:bottom-6 sm:right-6"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-200/20 bg-emerald-200/[0.08] text-emerald-100">
          {enterpriseSelected ? <Headphones className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
        </span>
        <span className="min-w-0">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-100/60">
            {isPt ? 'Grandes empresas' : 'Enterprise teams'}
          </span>
          <span className="mt-0.5 block truncate text-sm font-semibold text-white">
            {enterpriseSelected
              ? (isPt ? 'Continuar com onboarding assistido' : 'Continue with assisted onboarding')
              : (isPt ? 'Acesso Enterprise facilitado' : 'Enterprise fast-track access')}
          </span>
        </span>
        <ArrowUpRight className="h-4 w-4 shrink-0 text-emerald-100/70 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </Link>
    </>
  );
}
