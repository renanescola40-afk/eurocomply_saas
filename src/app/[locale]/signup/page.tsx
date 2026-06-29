'use client';

import { Suspense, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useSignUp } from '@clerk/nextjs';
import { BILLING_PLANS, getBillingPlan } from '@/lib/billing/plans';
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
  if (!normalizedNext.startsWith(`/${locale}/onboarding`) && !normalizedNext.startsWith(`/${locale}/checkout`)) return fallbackHref;
  return normalizedNext;
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

function getClerkErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error && 'errors' in error) {
    const clerkError = error as { errors?: Array<{ longMessage?: string; message?: string }> };
    const firstError = clerkError.errors?.[0];
    return firstError?.longMessage ?? firstError?.message ?? fallback;
  }

  return fallback;
}

function SignupPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isLoaded, signUp, setActive } = useSignUp();
  const locale = (params.locale as string) || 'pt';
  const activeLocale = (locales.includes(locale as Locale) ? locale : 'pt') as Locale;
  const selectedPlanId = normalizePlanId(searchParams.get('plan'));
  const selectedPlan = selectedPlanId ? getBillingPlan(selectedPlanId) : undefined;
  const continuationHref = getSafeSignupContinuation(activeLocale, searchParams.get('next'), selectedPlan?.id);
  const planSelectionNextHref = getOnboardingHref(activeLocale, selectedPlan?.id ?? BILLING_PLANS[1]?.id);
  const signInUrl = getSignInHref(activeLocale, selectedPlan?.id, continuationHref);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const copy = activeLocale === 'pt'
    ? {
        title: 'Criar conta RISCK COMPLY',
        subtitle: 'Escolha um plano antes de criar a conta. Depois guiamos você pelo onboarding da empresa.',
        choosePlanTitle: 'Escolha o plano da nova conta',
        choosePlanSubtitle: 'Toda conta nova precisa começar com um plano selecionado para o billing e o onboarding ficarem alinhados.',
        selectPlan: 'Selecionar plano',
        selectedPlan: 'Plano selecionado',
        google: 'Criar conta com Google',
        divider: 'ou crie com email',
        email: 'Email profissional',
        password: 'Senha',
        submit: 'Criar conta',
        loading: 'A criar...',
        verifyTitle: 'Verifique o seu email',
        verifySubtitle: 'Enviámos um código para confirmar a conta.',
        code: 'Código de verificação',
        verify: 'Confirmar e continuar',
        haveAccount: 'Já tem conta?',
        signIn: 'Entrar',
        fallbackError: 'Não foi possível criar a conta. Tente novamente.',
      }
    : {
        title: 'Create your RISCK COMPLY account',
        subtitle: 'Choose a plan before creating the account. Then we guide you through company onboarding.',
        choosePlanTitle: 'Choose the new account plan',
        choosePlanSubtitle: 'Every new account must start with a selected plan so billing and onboarding stay aligned.',
        selectPlan: 'Select plan',
        selectedPlan: 'Selected plan',
        google: 'Create account with Google',
        divider: 'or create with email',
        email: 'Work email',
        password: 'Password',
        submit: 'Create account',
        loading: 'Creating...',
        verifyTitle: 'Verify your email',
        verifySubtitle: 'We sent you a code to confirm your account.',
        code: 'Verification code',
        verify: 'Confirm and continue',
        haveAccount: 'Already have an account?',
        signIn: 'Sign in',
        fallbackError: 'Could not create the account. Please try again.',
      };

  async function handleGoogleSignUp() {
    if (!isLoaded || !selectedPlan) return;
    setFormError(null);
    await signUp.authenticateWithRedirect({
      strategy: 'oauth_google',
      redirectUrl: `/${activeLocale}/oauth/complete`,
      redirectUrlComplete: continuationHref,
    });
  }

  async function handleEmailSignUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isLoaded || !selectedPlan) return;
    setIsSubmitting(true);
    setFormError(null);

    try {
      const result = await signUp.create({ emailAddress: email, password });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.replace(continuationHref);
        return;
      }

      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPendingVerification(true);
    } catch (error) {
      setFormError(getClerkErrorMessage(error, copy.fallbackError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerifyEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isLoaded || !selectedPlan) return;
    setIsSubmitting(true);
    setFormError(null);

    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.replace(continuationHref);
        return;
      }
      setFormError(copy.fallbackError);
    } catch (error) {
      setFormError(getClerkErrorMessage(error, copy.fallbackError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#050505] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.22),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.14),transparent_32%)]" />
      <div className="relative mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 gap-8 px-5 py-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-8">
        <section className="hidden lg:block">
          <Link href={`/${activeLocale}`} className="inline-flex rounded-full border border-white/10 bg-white/8 px-4 py-2 text-sm font-semibold tracking-wide text-white/90">
            RISCK COMPLY
          </Link>
          <div className="mt-16 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.34em] text-blue-200/80">AI ACT ONBOARDING</p>
            <h1 className="mt-5 text-5xl font-semibold tracking-[-0.05em] text-white xl:text-6xl">
              {activeLocale === 'pt' ? 'Comece com plano, organização e onboarding na ordem certa.' : 'Start with plan, organization and onboarding in the right order.'}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-white/62">
              {activeLocale === 'pt'
                ? 'Contas novas escolhem o plano primeiro, criam a conta e entram no onboarding para configurar a empresa.'
                : 'New accounts choose a plan first, create the account and enter onboarding to configure the company.'}
            </p>
          </div>
        </section>

        <section className="flex items-center justify-center">
          <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-2xl backdrop-blur-xl">
            <Link href={`/${activeLocale}`} className="mb-6 block text-center text-sm font-semibold text-white lg:hidden">
              RISCK COMPLY
            </Link>
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-200/80">Secure signup</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
                {!selectedPlan ? copy.choosePlanTitle : pendingVerification ? copy.verifyTitle : copy.title}
              </h1>
              <p className="mt-3 text-sm leading-6 text-white/56">
                {!selectedPlan ? copy.choosePlanSubtitle : pendingVerification ? copy.verifySubtitle : copy.subtitle}
              </p>
            </div>

            {!selectedPlan ? (
              <div className="mt-6 grid gap-3">
                {BILLING_PLANS.map((plan) => (
                  <Link
                    key={plan.id}
                    href={getSignupPlanHref(activeLocale, plan.id, planSelectionNextHref.replace(/plan=[^&]+/, `plan=${encodeURIComponent(plan.id)}`))}
                    className="rounded-2xl border border-white/10 bg-black/30 p-4 transition hover:border-blue-300/60 hover:bg-blue-500/10"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-white">{plan.name}</p>
                        <p className="mt-1 text-xs leading-5 text-white/50">{plan.features[0]}</p>
                      </div>
                      <p className="text-right text-xl font-bold text-blue-100">€{plan.priceMonthly}<span className="text-xs font-normal text-white/45">/mo</span></p>
                    </div>
                    <span className="mt-3 inline-flex text-sm font-semibold text-blue-200">{copy.selectPlan} →</span>
                  </Link>
                ))}
              </div>
            ) : (
              <>
                <div className="mt-5 rounded-2xl border border-blue-300/20 bg-blue-400/10 p-4 text-sm text-blue-50">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-200/80">{copy.selectedPlan}</p>
                  <p className="mt-2 text-xl font-semibold tracking-tight">{selectedPlan.name}</p>
                </div>

                {formError ? (
                  <div className="mt-5 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-100" role="alert">
                    {formError}
                  </div>
                ) : null}

                {!pendingVerification ? (
                  <>
                    <button
                      type="button"
                      onClick={handleGoogleSignUp}
                      disabled={!isLoaded || isSubmitting}
                      className="mt-6 flex w-full items-center justify-center rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {copy.google}
                    </button>
                    <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-[0.24em] text-white/35">
                      <span className="h-px flex-1 bg-white/10" />{copy.divider}<span className="h-px flex-1 bg-white/10" />
                    </div>
                    <form onSubmit={handleEmailSignUp} className="space-y-4">
                      <label className="block text-sm font-medium text-white/70">
                        {copy.email}
                        <input
                          type="email"
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          required
                          autoComplete="email"
                          className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-blue-300/60"
                          placeholder="you@company.com"
                        />
                      </label>
                      <label className="block text-sm font-medium text-white/70">
                        {copy.password}
                        <input
                          type="password"
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          required
                          minLength={8}
                          autoComplete="new-password"
                          className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-blue-300/60"
                        />
                      </label>
                      <button
                        type="submit"
                        disabled={!isLoaded || isSubmitting}
                        className="w-full rounded-2xl bg-blue-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isSubmitting ? copy.loading : copy.submit}
                      </button>
                    </form>
                  </>
                ) : (
                  <form onSubmit={handleVerifyEmail} className="mt-6 space-y-4">
                    <label className="block text-sm font-medium text-white/70">
                      {copy.code}
                      <input
                        type="text"
                        value={code}
                        onChange={(event) => setCode(event.target.value)}
                        required
                        inputMode="numeric"
                        className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-blue-300/60"
                      />
                    </label>
                    <button
                      type="submit"
                      disabled={!isLoaded || isSubmitting}
                      className="w-full rounded-2xl bg-blue-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSubmitting ? copy.loading : copy.verify}
                    </button>
                  </form>
                )}
              </>
            )}

            <p className="mt-6 text-center text-sm text-white/50">
              {copy.haveAccount}{' '}
              <Link href={signInUrl} className="font-semibold text-white hover:text-blue-200">
                {copy.signIn}
              </Link>
            </p>
          </div>
        </section>
      </div>
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
