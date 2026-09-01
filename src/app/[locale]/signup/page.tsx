'use client';

import { Suspense, useState, type FormEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

import { useAuth } from '@/hooks/useAuth';
import { BILLING_PLANS, getBillingPlan } from '@/lib/billing/plans';
import { getCommercialSurfaceCopy } from '@/lib/i18n/commercial-surface-copy';
import { locales, type Locale } from '@/lib/i18n/routing';

function getOnboardingHref(locale: string, planId?: string) {
  const baseHref = `/${locale}/onboarding`;
  return planId ? `${baseHref}?plan=${encodeURIComponent(planId)}` : baseHref;
}

function normalizePlanId(planId: string | null) {
  return getBillingPlan(planId)?.id;
}

function isAllowedLocalizedContinuation(path: string, locale: string) {
  return [`/${locale}/onboarding`, `/${locale}/checkout`].some(
    (allowedPath) => path === allowedPath || path.startsWith(`${allowedPath}/`) || path.startsWith(`${allowedPath}?`),
  );
}

function getSafeSignupContinuation(locale: string, nextPath: string | null, planId?: string) {
  const fallbackHref = getOnboardingHref(locale, planId);
  const normalizedNext = nextPath?.trim();

  if (!normalizedNext) return fallbackHref;
  if (normalizedNext.length > 240 || normalizedNext.startsWith('//') || normalizedNext.includes('://')) return fallbackHref;
  if (!isAllowedLocalizedContinuation(normalizedNext, locale)) return fallbackHref;
  return normalizedNext;
}

function getPlanContinuationHref(nextPath: string, planId: string) {
  const encodedPlan = encodeURIComponent(planId);

  if (/([?&])plan=/.test(nextPath)) {
    return nextPath.replace(/([?&])plan=[^&]*/, `$1plan=${encodedPlan}`);
  }

  return `${nextPath}${nextPath.includes('?') ? '&' : '?'}plan=${encodedPlan}`;
}

function getSignInHref(locale: string, planId?: string, nextPath?: string) {
  const params = new URLSearchParams();
  if (planId) params.set('plan', planId);
  if (nextPath) params.set('next', nextPath);
  const query = params.toString();
  return `/${locale}/login${query ? `?${query}` : ''}`;
}

function getSignupPlanHref(locale: string, planId: string, nextPath: string) {
  const params = new URLSearchParams({ plan: planId, next: nextPath });
  return `/${locale}/signup?${params.toString()}`;
}

function getSalesLedHref(locale: string, planId: string) {
  return `/${locale}/contact?intent=sales&plan=${encodeURIComponent(planId)}`;
}

function getPlanPriceLabel(plan: (typeof BILLING_PLANS)[number], activeLocale: Locale) {
  const copy = getCommercialSurfaceCopy(activeLocale).signup;
  if (plan.priceMonthly != null) return `€${new Intl.NumberFormat(activeLocale).format(plan.priceMonthly)}${copy.month}`;
  if (plan.startingPriceMonthly != null) return `${copy.from} €${new Intl.NumberFormat(activeLocale).format(plan.startingPriceMonthly)}${copy.month}`;
  return copy.contactSales;
}

function SignupChrome({ children, activeLocale }: { children: React.ReactNode; activeLocale: Locale }) {
  const text = getCommercialSurfaceCopy(activeLocale).signup;

  return (
    <main className="min-h-screen overflow-hidden bg-[#07101a] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.20),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(124,58,237,0.10),transparent_32%)]" />
      <div className="relative mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 gap-8 px-5 py-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-8">
        <section className="hidden lg:block">
          <Link href={`/${activeLocale}`} aria-label="RISCK COMPLY" className="inline-flex rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70">
            <Image src="/brand/risck-comply-wordmark.svg" alt="RISCK COMPLY" width={164} height={32} priority className="h-6 w-auto" />
          </Link>
          <div className="mt-16 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.34em] text-blue-200/80">{text.sideEyebrow}</p>
            <h1 className="mt-5 text-5xl font-semibold tracking-[-0.05em] text-white xl:text-6xl">{text.sideTitle}</h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-white/62">{text.sideBody}</p>
          </div>
        </section>

        <section className="flex items-center justify-center">
          <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-[#0a1320]/88 p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
            <Link href={`/${activeLocale}`} aria-label="RISCK COMPLY" className="mb-6 flex justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70 lg:hidden">
              <Image src="/brand/risck-comply-wordmark.svg" alt="RISCK COMPLY" width={164} height={32} priority className="h-6 w-auto" />
            </Link>
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}

function SignupHeader({ activeLocale, title, subtitle }: { activeLocale: Locale; title: string; subtitle: string }) {
  const text = getCommercialSurfaceCopy(activeLocale).signup;
  return (
    <div className="text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-200/80">{text.eyebrow}</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">{title}</h1>
      <p className="mt-3 text-sm leading-6 text-white/56">{subtitle}</p>
    </div>
  );
}

function SelectedPlanCard({ activeLocale, selectedPlan }: { activeLocale: Locale; selectedPlan: NonNullable<ReturnType<typeof getBillingPlan>> }) {
  const text = getCommercialSurfaceCopy(activeLocale).signup;

  return (
    <div className="mt-5 rounded-2xl border border-blue-300/20 bg-blue-400/10 p-4 text-sm text-blue-50">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-200/80">{text.selectedPlan}</p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <p className="text-xl font-semibold tracking-tight">{selectedPlan.name}</p>
        <p className="text-right text-sm font-semibold text-blue-100">{getPlanPriceLabel(selectedPlan, activeLocale)}</p>
      </div>
    </div>
  );
}

function PlanSelection({ activeLocale, planSelectionNextHref, signInUrl }: { activeLocale: Locale; planSelectionNextHref: string; signInUrl: string }) {
  const text = getCommercialSurfaceCopy(activeLocale).signup;

  return (
    <SignupChrome activeLocale={activeLocale}>
      <SignupHeader activeLocale={activeLocale} title={text.choosePlanTitle} subtitle={text.choosePlanSubtitle} />
      <div className="mt-6 grid gap-3">
        {BILLING_PLANS.map((plan) => {
          const nextWithPlan = getPlanContinuationHref(planSelectionNextHref, plan.id);
          const href = plan.salesLed ? getSalesLedHref(activeLocale, plan.id) : getSignupPlanHref(activeLocale, plan.id, nextWithPlan);

          return (
            <Link key={plan.id} href={href} className="rounded-2xl border border-white/10 bg-black/30 p-4 transition hover:border-blue-300/60 hover:bg-blue-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-white">{plan.name}</p>
                  <p className="mt-1 text-xs leading-5 text-white/50">{plan.features[0]}</p>
                </div>
                <p className="text-right text-xl font-bold text-blue-100">{getPlanPriceLabel(plan, activeLocale)}</p>
              </div>
              <span className="mt-3 inline-flex text-sm font-semibold text-blue-200">{plan.salesLed ? text.salesLed : text.selectPlan} →</span>
            </Link>
          );
        })}
      </div>
      <p className="mt-6 text-center text-sm text-white/50">
        {text.haveAccount}{' '}
        <Link href={signInUrl} className="rounded-md font-semibold text-white hover:text-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200">{text.signIn}</Link>
      </p>
    </SignupChrome>
  );
}

type SignupAuthFormProps = {
  activeLocale: Locale;
  selectedPlan: NonNullable<ReturnType<typeof getBillingPlan>>;
  continuationHref: string;
  signInUrl: string;
};

function SignupAuthForm({ activeLocale, selectedPlan, continuationHref, signInUrl }: SignupAuthFormProps) {
  const router = useRouter();
  const { loading, user, signInWithGoogle, signUpWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [secret, setSecret] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const text = getCommercialSurfaceCopy(activeLocale).signup;

  async function handleProvider() {
    if (loading) {
      setFormError(text.authLoading);
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    const result = await signInWithGoogle({ next: continuationHref });
    if (result.error) {
      setFormError(text.authExchangeFailed);
      setIsSubmitting(false);
    }
  }

  async function handleEmailSignUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) {
      setFormError(text.authLoading);
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    const result = await signUpWithEmail(email, secret, { requested_plan: selectedPlan.id, next: continuationHref });
    if (result.error) {
      setFormError(text.fallbackError);
      setIsSubmitting(false);
      return;
    }

    if (user) {
      router.replace(continuationHref);
      return;
    }

    setPendingVerification(true);
    setIsSubmitting(false);
  }

  return (
    <SignupChrome activeLocale={activeLocale}>
      <SignupHeader activeLocale={activeLocale} title={pendingVerification ? text.verifyTitle : text.title} subtitle={pendingVerification ? text.verifySubtitle : text.subtitle} />
      <SelectedPlanCard activeLocale={activeLocale} selectedPlan={selectedPlan} />

      {formError ? <div className="mt-5 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-100" role="alert">{formError}</div> : null}

      {pendingVerification ? (
        <Link href={signInUrl} className="mt-6 flex w-full items-center justify-center rounded-2xl bg-blue-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200">{text.signIn}</Link>
      ) : (
        <>
          <button type="button" onClick={handleProvider} disabled={isSubmitting} className="mt-6 flex w-full items-center justify-center rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60">{isSubmitting ? text.loading : text.google}</button>
          <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-[0.24em] text-white/35"><span className="h-px flex-1 bg-white/10" />{text.divider}<span className="h-px flex-1 bg-white/10" /></div>
          <form onSubmit={handleEmailSignUp} className="space-y-4">
            <label className="block text-sm font-medium text-white/70">{text.email}<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-blue-300/60 focus-visible:ring-2 focus-visible:ring-blue-200/40" placeholder="you@company.com" /></label>
            <label className="block text-sm font-medium text-white/70">{text.password}<input type="password" value={secret} onChange={(event) => setSecret(event.target.value)} required minLength={8} autoComplete="new-password" className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-blue-300/60 focus-visible:ring-2 focus-visible:ring-blue-200/40" /></label>
            <button type="submit" disabled={isSubmitting} className="w-full rounded-2xl bg-blue-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60">{isSubmitting ? text.loading : text.submit}</button>
          </form>
        </>
      )}
    </SignupChrome>
  );
}

function SalesLedPlanHandoff({ activeLocale, selectedPlan, signInUrl }: { activeLocale: Locale; selectedPlan: NonNullable<ReturnType<typeof getBillingPlan>>; signInUrl: string }) {
  const text = getCommercialSurfaceCopy(activeLocale).signup;

  return (
    <SignupChrome activeLocale={activeLocale}>
      <SignupHeader activeLocale={activeLocale} title={text.salesLedTitle} subtitle={text.salesLedSubtitle} />
      <SelectedPlanCard activeLocale={activeLocale} selectedPlan={selectedPlan} />
      <Link href={getSalesLedHref(activeLocale, selectedPlan.id)} className="mt-6 flex w-full items-center justify-center rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200">{text.salesLed}</Link>
      <p className="mt-6 text-center text-sm text-white/50">{text.haveAccount}{' '}<Link href={signInUrl} className="rounded-md font-semibold text-white hover:text-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200">{text.signIn}</Link></p>
    </SignupChrome>
  );
}

function SignupContent() {
  const params = useParams<{ locale: string }>();
  const searchParams = useSearchParams();
  const locale = params?.locale ?? 'pt';
  const activeLocale = (locales.includes(locale as Locale) ? locale : 'pt') as Locale;
  const selectedPlanId = normalizePlanId(searchParams.get('plan'));
  const continuationHref = getSafeSignupContinuation(activeLocale, searchParams.get('next'), selectedPlanId);
  const signInUrl = getSignInHref(activeLocale, selectedPlanId, continuationHref);

  if (!selectedPlanId) {
    return <PlanSelection activeLocale={activeLocale} planSelectionNextHref={continuationHref} signInUrl={signInUrl} />;
  }

  const selectedPlan = getBillingPlan(selectedPlanId);
  if (!selectedPlan) {
    return <PlanSelection activeLocale={activeLocale} planSelectionNextHref={continuationHref} signInUrl={signInUrl} />;
  }

  if (selectedPlan.salesLed) {
    return <SalesLedPlanHandoff activeLocale={activeLocale} selectedPlan={selectedPlan} signInUrl={signInUrl} />;
  }

  return <SignupAuthForm activeLocale={activeLocale} selectedPlan={selectedPlan} continuationHref={continuationHref} signInUrl={signInUrl} />;
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#07101a]" aria-busy="true" />}>
      <SignupContent />
    </Suspense>
  );
}