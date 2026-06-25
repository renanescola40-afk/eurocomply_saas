'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { SignUp } from '@clerk/nextjs';
import { LanguageSwitcher } from '@/components/i18n/language-switcher';
import { locales, type Locale } from '@/lib/i18n/routing';
import { BILLING_PLANS, getBillingPlan } from '@/lib/billing/plans';

const signupCopy = {
  en: {
    eyebrow: 'RISCK COMPLY',
    title: 'Create your compliance workspace',
    subtitle: 'Start with Clerk-secured sign-up and continue onboarding with the right plan.',
    login: 'Already have an account? Sign in',
    selectedPlan: 'Selected plan',
    planHelp: 'This plan stays in the sign-up continuation URL so checkout/onboarding can continue with the right package.',
  },
  pt: {
    eyebrow: 'RISCK COMPLY',
    title: 'Crie o seu workspace de compliance',
    subtitle: 'Comece com registo seguro via Clerk e continue o onboarding com o plano certo.',
    login: 'Já tem conta? Entrar',
    selectedPlan: 'Plano selecionado',
    planHelp: 'Este plano fica na URL de continuação para o checkout/onboarding continuar com o pacote certo.',
  },
} as const;

function getDashboardHref(locale: string, planId?: string) {
  const baseHref = `/${locale}/dashboard/organizations`;
  return planId ? `${baseHref}?plan=${encodeURIComponent(planId)}` : baseHref;
}

function normalizePlanId(planId: string | null) {
  return getBillingPlan(planId)?.id ?? 'professional';
}

function getSafeSignupContinuation(locale: string, nextPath: string | null, planId: string) {
  const fallbackHref = getDashboardHref(locale, planId);
  const normalizedNext = nextPath?.trim();

  if (!normalizedNext) return fallbackHref;
  if (normalizedNext.length > 240 || normalizedNext.startsWith('//') || normalizedNext.includes('://')) return fallbackHref;
  if (!normalizedNext.startsWith(`/${locale}/dashboard`)) return fallbackHref;
  return normalizedNext;
}

export default function SignupPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params.locale as string) || 'pt';
  const activeLocale = (locales.includes(locale as Locale) ? locale : 'en') as Locale;
  const pageCopy = activeLocale === 'pt' ? signupCopy.pt : signupCopy.en;
  const selectedPlanId = normalizePlanId(searchParams.get('plan'));
  const requestedNext = searchParams.get('next');
  const selectedPlan = useMemo(() => getBillingPlan(selectedPlanId) ?? BILLING_PLANS[1], [selectedPlanId]);
  const continuationHref = useMemo(
    () => getSafeSignupContinuation(activeLocale, requestedNext, selectedPlan.id),
    [activeLocale, requestedNext, selectedPlan.id],
  );

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(37,99,235,0.24),transparent_34rem)]" />
      <div className="fixed right-5 top-5 z-20">
        <LanguageSwitcher currentLocale={activeLocale} variant="dark" compact />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-md items-center px-5 py-10">
        <div className="w-full rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-7 shadow-2xl backdrop-blur-xl">
          <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black">
            <Image src="/brand/risck-comply-icon.svg" alt="RISCK COMPLY" width={48} height={48} className="h-12 w-12 object-contain" priority />
          </div>

          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.28em] text-white/36">{pageCopy.eyebrow}</p>
            <h1 className="mt-2 text-2xl font-semibold">{pageCopy.title}</h1>
            <p className="mt-2 text-sm text-white/50">{pageCopy.subtitle}</p>
          </div>

          <div className="mt-6 rounded-2xl border border-blue-300/20 bg-blue-400/10 p-4 text-sm text-blue-100">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-200/80">{pageCopy.selectedPlan}</p>
            <div className="mt-2 flex items-baseline justify-between gap-3">
              <p className="text-lg font-semibold">{selectedPlan.name}</p>
              <p className="font-bold">€{selectedPlan.priceMonthly}/mo</p>
            </div>
            <p className="mt-2 text-xs leading-5 text-blue-100/70">{pageCopy.planHelp}</p>
          </div>

          <div className="mt-6 flex justify-center">
            <SignUp
              routing="path"
              path={`/${activeLocale}/signup`}
              signInUrl={`/${activeLocale}/login?next=${encodeURIComponent(continuationHref)}`}
              fallbackRedirectUrl={continuationHref}
              forceRedirectUrl={continuationHref}
              appearance={{
                elements: {
                  rootBox: 'w-full',
                  card: 'w-full bg-white text-black shadow-none',
                },
              }}
            />
          </div>

          <Link href={`/${activeLocale}/login?next=${encodeURIComponent(continuationHref)}`} className="mt-5 block text-center text-sm text-white/50 hover:text-white">
            {pageCopy.login}
          </Link>
        </div>
      </div>
    </main>
  );
}
