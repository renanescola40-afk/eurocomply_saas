'use client';

import { Suspense, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { getBillingPlan } from '@/lib/billing/plans';
import { normalizePublicAuthErrorCode, type PublicAuthErrorCode } from '@/lib/auth/public-errors';
import { locales, type Locale } from '@/lib/i18n/routing';

const publicErrors = {
  missing_oauth_code: 'Could not complete sign-in. Please try again.',
  auth_configuration_unavailable: 'Sign-in is temporarily unavailable. Please try again later.',
  auth_exchange_failed: 'Could not complete sign-in. Please try again.',
  email_sign_in_failed: 'Could not sign in. Check your details and try again.',
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

function copy(locale: Locale) {
  return locale === 'pt'
    ? {
        title: 'Entrar na RISCK COMPLY',
        subtitle: 'Acesse o seu workspace de compliance de IA.',
        google: 'Continuar com Google',
        divider: 'ou entre com email',
        email: 'Email profissional',
        password: 'Senha',
        submit: 'Entrar com segurança',
        loading: 'A entrar...',
        createPrompt: 'Ainda não tem conta?',
        create: 'Criar conta',
        authLoading: 'A autenticação ainda está a carregar. Tente novamente dentro de alguns segundos.',
        failed: 'Não foi possível entrar. Verifique os dados e tente novamente.',
      }
    : {
        title: 'Sign in to RISCK COMPLY',
        subtitle: 'Access your AI compliance workspace.',
        google: 'Continue with Google',
        divider: 'or sign in with email',
        email: 'Work email',
        password: 'Password',
        submit: 'Sign in securely',
        loading: 'Signing in...',
        createPrompt: 'No account yet?',
        create: 'Create account',
        authLoading: 'Authentication is still loading. Please try again in a moment.',
        failed: 'Could not sign in. Check your details and try again.',
      };
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
  const text = copy(locale);
  const { loading, signInWithEmail, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [secret, setSecret] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(publicErrorCode ? publicErrors[publicErrorCode] : null);

  async function handleProvider() {
    if (loading) {
      setError(text.authLoading);
      return;
    }
    setBusy(true);
    setError(null);
    const result = await signInWithGoogle({ next: afterSignInUrl });
    if (result.error) {
      setError(publicErrors.auth_exchange_failed);
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
    const result = await signInWithEmail(email, secret);
    if (result.error) {
      setError(publicErrors.email_sign_in_failed);
      setBusy(false);
      return;
    }
    router.replace(afterSignInUrl);
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#050505] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,.16),transparent_34rem),radial-gradient(circle_at_top_right,rgba(34,197,94,.1),transparent_30rem)]" />
      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <section className="grid w-full gap-8 rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 shadow-2xl shadow-black/40 backdrop-blur md:grid-cols-[1fr_0.9fr] md:p-8">
          <div className="flex flex-col justify-between rounded-[1.5rem] border border-white/10 bg-black/35 p-6">
            <div>
              <Link href={`/${locale}`} className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-200/70">
                RISCK COMPLY
              </Link>
              <h1 className="mt-10 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">{text.title}</h1>
              <p className="mt-4 max-w-md text-base leading-7 text-white/65">{text.subtitle}</p>
            </div>
            <div className="mt-10 rounded-2xl border border-cyan-200/15 bg-cyan-300/[0.07] p-4 text-sm leading-6 text-cyan-50/75">
              Protected workspaces use organization-scoped access, onboarding checks and no-store dashboard responses.
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-[#080b12] p-6">
            {error ? <div className="mb-4 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div> : null}
            <button type="button" onClick={handleProvider} disabled={busy || loading} className="w-full rounded-full border border-white/15 bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60">
              {text.google}
            </button>
            <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-white/35">
              <span className="h-px flex-1 bg-white/10" /> {text.divider} <span className="h-px flex-1 bg-white/10" />
            </div>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <label className="block text-sm font-medium text-white/70">
                {text.email}
                <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" required className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-cyan-200/50" />
              </label>
              <label className="block text-sm font-medium text-white/70">
                {text.password}
                <input value={secret} onChange={(event) => setSecret(event.target.value)} type="password" autoComplete="current-password" required className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-cyan-200/50" />
              </label>
              <button type="submit" disabled={busy || loading} className="w-full rounded-full bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60">
                {busy ? text.loading : text.submit}
              </button>
            </form>
            <p className="mt-6 text-center text-sm text-white/55">
              {text.createPrompt}{' '}
              <Link href={createAccountUrl} className="font-semibold text-cyan-200 hover:text-cyan-100">
                {text.create}
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#050505]" />}>
      <LoginContent />
    </Suspense>
  );
}
