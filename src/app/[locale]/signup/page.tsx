'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { SignUp } from '@clerk/nextjs';
import { ArrowRight, CheckCircle2, LockKeyhole, ShieldCheck } from 'lucide-react';
import { LanguageSwitcher } from '@/components/i18n/language-switcher';
import { locales, type Locale } from '@/lib/i18n/routing';
import { BILLING_PLANS, getBillingPlan } from '@/lib/billing/plans';

const signupCopy = {
  en: {
    eyebrow: 'RISCK COMPLY',
    title: 'Create your compliance workspace',
    subtitle: 'Start with Clerk-secured sign-up and continue onboarding with the right plan, access model and evidence baseline.',
    login: 'Already have an account? Sign in',
    home: 'Back to public site',
    selectedPlan: 'Selected plan',
    planHelp: 'This plan stays in the sign-up continuation URL so checkout/onboarding can continue with the right package.',
    checklistTitle: 'Prepared for enterprise onboarding',
    checklist: ['Audit-ready setup path', 'Tenant isolated organization model', 'GDPR aligned account controls', 'Role-based access from day one'],
    reviewPlan: 'Review plan after signup',
  },
  pt: {
    eyebrow: 'RISCK COMPLY',
    title: 'Crie o seu workspace de compliance',
    subtitle: 'Comece com registo seguro via Clerk e continue o onboarding com o plano, modelo de acesso e baseline de evidência certos.',
    login: 'Já tem conta? Entrar',
    home: 'Voltar ao site público',
    selectedPlan: 'Plano selecionado',
    planHelp: 'Este plano fica na URL de continuação para o checkout/onboarding continuar com o pacote certo.',
    checklistTitle: 'Preparado para onboarding enterprise',
    checklist: ['Setup audit-ready', 'Modelo organizacional tenant isolated', 'Controlos de conta GDPR aligned', 'Role-based access desde o primeiro dia'],
    reviewPlan: 'Rever plano depois do registo',
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

function getSignInHref(locale: string, continuationHref: string) {
  const baseHref = `/${locale}/login`;
  return `${baseHref}?next=${encodeURIComponent(continuationHref)}`;
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
  const signInUrl = useMemo(
    () => getSignInHref(activeLocale, continuationHref),
    [activeLocale, continuationHref],
  );

  return (
    <main className="min-h-screen overflow-hidden bg-[#050505] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(37,99,235,0.22),transparent_30rem),radial-gradient(circle_at_82%_18%,rgba(16,185,129,0.12),transparent_28rem),linear-gradient(180deg,#050505_0%,#080b12_54%,#050505_100%)]" />
      <div className="pointer-events-none fixed inset-0 tech-grid opacity-35" />

      <header className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
        <Link href={`/${activeLocale}`} className="flex items-center gap-3" aria-label="RISCK COMPLY home">
          <Image src="/brand/risck-comply-wordmark.svg" alt="RISCK COMPLY" width={176} height={44} className="h-10 w-auto object-contain" priority />
        </Link>
        <div className="flex items-center gap-3">
          <LanguageSwitcher currentLocale={activeLocale} variant="dark" compact />
          <Link href={`/${activeLocale}`} className="hidden rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white/70 transition hover:border-white/20 hover:text-white sm:inline-flex">
            {pageCopy.home}
          </Link>
        </div>
      </header>

      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-92px)] max-w-7xl items-center gap-8 px-4 pb-10 sm:px-6 lg:grid-cols-[1fr_1fr] lg:px-8">
        <section className="mx-auto w-full max-w-[29rem] lg:mx-0">
          <div className="premium-card rounded-[2rem] p-5 shadow-2xl sm:p-7">
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black shadow-xl">
              <Image src="/brand/risck-comply-icon.svg" alt="RISCK COMPLY" width={56} height={56} className="h-14 w-14 object-contain" priority />
            </div>

            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/38">{pageCopy.eyebrow}</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em]">{pageCopy.title}</h1>
              <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-white/56">{pageCopy.subtitle}</p>
            </div>

            {selectedPlan ? (
              <div className="mt-6 rounded-2xl border border-blue-300/20 bg-blue-400/10 p-4 text-sm text-blue-50">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-200/80">{pageCopy.selectedPlan}</p>
                    <p className="mt-2 text-xl font-semibold tracking-tight">{selectedPlan.name}</p>
                  </div>
                  <p className="rounded-full bg-white px-3 py-1 text-sm font-bold text-slate-950">€{selectedPlan.priceMonthly}/mo</p>
                </div>
                <p className="mt-3 text-xs leading-5 text-blue-100/70">{pageCopy.planHelp}</p>
              </div>
            ) : null}

            <div className="mt-6 rounded-[1.5rem] bg-white p-2 text-black shadow-[0_20px_70px_rgba(0,0,0,.45)]">
              <SignUp
                routing="hash"
                signInUrl={signInUrl}
                fallbackRedirectUrl={continuationHref}
                forceRedirectUrl={continuationHref}
                appearance={{
                  elements: {
                    rootBox: 'w-full',
                    card: 'w-full bg-white text-black shadow-none border-0',
                    headerTitle: 'text-2xl font-semibold tracking-tight',
                    headerSubtitle: 'text-sm text-slate-500',
                    formButtonPrimary: 'rounded-xl bg-slate-950 text-white hover:bg-slate-800',
                    formFieldInput: 'rounded-xl border-slate-200 focus:ring-slate-950',
                    footerActionLink: 'text-slate-950 font-semibold',
                  },
                }}
              />
            </div>

            <Link href={signInUrl} className="mt-5 block text-center text-sm font-medium text-white/55 transition hover:text-white">
              {pageCopy.login}
            </Link>
          </div>
        </section>

        <section className="hidden lg:block">
          <div className="premium-card rounded-[2rem] p-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-white/55">
              <ShieldCheck className="h-4 w-4 text-white" />
              {pageCopy.checklistTitle}
            </div>
            <div className="mt-8 grid gap-4">
              {pageCopy.checklist.map((item, index) => {
                const icons = [CheckCircle2, LockKeyhole, ShieldCheck, ArrowRight];
                const Icon = icons[index] ?? CheckCircle2;
                return (
                  <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
                    <div className="flex items-start gap-3">
                      <span className="rounded-xl bg-white/10 p-2 text-white"><Icon className="h-4 w-4" /></span>
                      <div>
                        <p className="font-semibold text-white">{item}</p>
                        <p className="mt-1 text-xs leading-5 text-white/45">{pageCopy.reviewPlan}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
