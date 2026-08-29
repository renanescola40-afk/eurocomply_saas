'use client';

import { Suspense, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

import { EnterpriseSsoLogin } from '@/components/auth/enterprise-sso-login';
import { useAuth } from '@/hooks/useAuth';
import { normalizePublicAuthErrorCode, type PublicAuthErrorCode } from '@/lib/auth/public-errors';
import { getBillingPlan } from '@/lib/billing/plans';
import { getCommercialSurfaceCopy } from '@/lib/i18n/commercial-surface-copy';
import { locales, type Locale } from '@/lib/i18n/routing';

const publicErrors = {
  missing_oauth_code: 'Could not complete sign-in. Please try again.',
  auth_configuration_unavailable: 'Sign-in is temporarily unavailable. Please try again later.',
  auth_exchange_failed: 'Could not complete sign-in. Please try again.',
  email_sign_in_failed: 'Could not sign in. Check your details and try again.',
  enterprise_sso_connection_not_found: 'Your organization SSO connection is not available. Contact your administrator.',
  enterprise_sso_not_entitled: 'Enterprise SSO is not active for this organization.',
  enterprise_sso_preprovisioning_required: 'Your account must be provisioned by your organization before signing in.',
  enterprise_sso_capacity_reached: 'Your organization has reached its licensed user capacity. Contact an administrator.',
  enterprise_sso_access_denied: 'Enterprise SSO access was denied for this account.',
  enterprise_sso_unavailable: 'Enterprise SSO is temporarily unavailable. Try again later.',
} satisfies Record<PublicAuthErrorCode, string>;

function successHref(locale: string, planId?: string | null) {
  const base = `/${locale}/onboarding`;
  const plan = getBillingPlan(planId)?.id;
  return plan ? `${base}?plan=${encodeURIComponent(plan)}` : base;
}

function safeNext(next: string | null, locale: string, planId?: string | null) {
  const fallback = successHref(locale, planId);
  const value = next?.trim();
  if (!value || value.length > 240 || value.startsWith('//') || value.includes('://')) return fallback;
  const allowed = [`/${locale}/onboarding`, `/${locale}/dashboard/organizations`, `/${locale}/dashboard/observability`, `/${locale}/checkout`];
  return allowed.some((path) => value === path || value.startsWith(`${path}/`) || value.startsWith(`${path}?`)) ? value : fallback;
}

function signUpHref(locale: string, planId: string | null, nextPath: string) {
  const params = new URLSearchParams({ next: nextPath });
  const plan = getBillingPlan(planId)?.id;
  if (plan) params.set('plan', plan);
  return `/${locale}/signup?${params.toString()}`;
}

function recoveryLabel(locale: Locale, localizedLabel: string) {
  if (localizedLabel.trim()) return localizedLabel;
  return locale === 'pt' ? 'Esqueceu a senha?' : 'Forgot your password?';
}

function LoginContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const localeParam = (params.locale as string) || 'pt';
  const locale = (locales.includes(localeParam as Locale) ? localeParam : 'pt') as Locale;
  const planId = searchParams.get('plan');
  const afterSignInUrl = safeNext(searchParams.get('next'), locale, planId);
  const createAccountUrl = signUpHref(locale, planId, afterSignInUrl);
  const publicErrorCode = searchParams.get('error') ? normalizePublicAuthErrorCode(searchParams.get('error')) : null;
  const text = getCommercialSurfaceCopy(locale).login;
  const forgotLabel = recoveryLabel(locale, text.forgot);
  const { loading, signInWithEmail, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [secret, setSecret] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(publicErrorCode ? publicErrors[publicErrorCode] : null);

  async function handleProvider() {
    if (loading || busy) {
      if (loading) setError(text.authLoading);
      return;
    }

    setBusy(true);
    setError(null);
    const result = await signInWithGoogle({ next: afterSignInUrl });
    if (result.error) {
      setError(text.googleFailed);
      setBusy(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) {
      setError(text.authLoading);
      return;
    }

    setBusy(true);
    setError(null);
    const result = await signInWithEmail(email.trim().toLowerCase(), secret);
    if (result.error) {
      setError(text.failed);
      setBusy(false);
      return;
    }
    router.replace(afterSignInUrl);
  }

  const inputClass = 'mt-2 w-full rounded-xl border border-white/[0.09] bg-black/20 px-4 py-3 text-white outline-none transition placeholder:text-white/28 focus:border-blue-400/45 focus-visible:ring-2 focus-visible:ring-blue-400/45';

  return (
    <main className="min-h-screen overflow-hidden bg-[#07101a] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(37,99,235,.16),transparent_34rem),radial-gradient(circle_at_82%_76%,rgba(59,130,246,.08),transparent_30rem)]" />
      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <section className="grid w-full overflow-hidden rounded-[1.75rem] border border-white/[0.09] bg-[#0a1320]/92 shadow-2xl shadow-black/35 md:grid-cols-[1.04fr_0.96fr]" aria-labelledby="login-title">
          <div className="flex min-h-[36rem] flex-col justify-between border-b border-white/[0.07] bg-[#0d1522] p-7 md:border-b-0 md:border-r md:p-9">
            <div>
              <Link href={`/${locale}`} className="inline-flex rounded-md text-sm font-semibold uppercase tracking-[0.24em] text-white/84 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">RISCK COMPLY</Link>
              <div className="mt-14 inline-flex items-center rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-200">{text.badge}</div>
              <h1 id="login-title" className="mt-5 max-w-lg text-4xl font-semibold tracking-[-0.05em] text-white sm:text-5xl">{text.title}</h1>
              <p className="mt-4 max-w-md text-base leading-7 text-white/58">{text.subtitle}</p>
            </div>
            <div className="mt-10 border-t border-white/[0.07] pt-5 text-sm leading-6 text-white/42">{text.accessNote}</div>
          </div>

          <div className="flex items-center bg-[#09111d] p-6 md:p-9">
            <div className="w-full">
              <div className="mb-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-300/60">Secure workspace access</p>
                <p className="mt-2 text-sm leading-6 text-white/42">Use your organization identity or approved account credentials.</p>
              </div>
              {error ? <div className="mb-4 rounded-xl border border-red-400/20 bg-red-500/[0.08] px-4 py-3 text-sm text-red-100" role="alert">{error}</div> : null}
              <button type="button" onClick={handleProvider} disabled={busy || loading} className="w-full rounded-xl border border-white/15 bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-60">{busy ? text.loading : text.google}</button>
              <EnterpriseSsoLogin locale={locale} next={afterSignInUrl} />
              <div className="my-6 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/28"><span className="h-px flex-1 bg-white/[0.08]" /> {text.divider} <span className="h-px flex-1 bg-white/[0.08]" /></div>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <label className="block text-sm font-medium text-white/62">{text.email}<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" required className={inputClass} /></label>
                <label className="block text-sm font-medium text-white/62">{text.password}<input value={secret} onChange={(event) => setSecret(event.target.value)} type="password" autoComplete="current-password" required className={inputClass} /></label>
                <div className="flex justify-end"><Link href={`/${locale}/recuperar-senha`} className="rounded-md text-sm font-semibold text-blue-300 hover:text-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">{forgotLabel}</Link></div>
                <button type="submit" disabled={busy || loading} className="w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70 disabled:cursor-not-allowed disabled:opacity-60">{busy ? text.loading : text.submit}</button>
              </form>
              <p className="mt-6 text-center text-sm text-white/46">{text.createPrompt}{' '}<Link href={createAccountUrl} className="rounded-md font-semibold text-blue-300 hover:text-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">{text.create}</Link></p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#07101a]" aria-busy="true" />}>
      <LoginContent />
    </Suspense>
  );
}
