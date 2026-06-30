'use client';

import { Suspense, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { getBillingPlan } from '@/lib/billing/plans';
import { normalizePublicAuthErrorCode, type PublicAuthErrorCode } from '@/lib/auth/public-errors';
import { locales, type Locale } from '@/lib/i18n/routing';

function successHref(locale: string, planId?: string | null) {
  const base = `/${locale}/onboarding`;
  const plan = getBillingPlan(planId)?.id;
  return plan ? `${base}?plan=${encodeURIComponent(plan)}` : base;
}

function safeNext(next: string | null, locale: string, planId?: string | null) {
  const fallback = successHref(locale, planId);
  const value = next?.trim();
  if (!value || value.length > 240 || value.startsWith('//') || value.includes('://')) return fallback;
  const allowed = [`/${locale}/onboarding`, `/${locale}/dashboard/organizations`, `/${locale}/checkout`];
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

function publicErrors(locale: Locale): Record<PublicAuthErrorCode, string> {
  const text = copy(locale);
  return {
    missing_oauth_code: text.failed,
    auth_configuration_unavailable: text.failed,
    auth_exchange_failed: text.failed,
    email_sign_in_failed: text.failed,
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
  const text = copy(locale);
  const authErrorCode = normalizePublicAuthErrorCode(searchParams.get('error'), 'email_sign_in_failed');
  const initialError = searchParams.get('error') ? publicErrors(locale)[authErrorCode] : null;
  const { loading, signInWithEmail, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [secret, setSecret] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(initialError);

  async function handleProvider() {
    if (loading) {
      setError(text.authLoading);
      return;
    }
    setBusy(true);
    setError(null);
    const result = await signInWithGoogle({ next: afterSignInUrl });
    if (result.error) {
      setError(publicErrors(locale).auth_exchange_failed);
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
      setError(publicErrors(locale).email_sign_in_failed);
      setBusy(false);
      return;
    }
    router.replace(afterSignInUrl);
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#050505] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.22),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.14),transparent_32%)]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-5 py-6 lg:px-8">
        <section className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-2xl backdrop-blur-xl">
          <Link href={`/${locale}`} className="mb-6 block text-center text-sm font-semibold text-white">
            RISCK COMPLY
          </Link>
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-200/80">Secure access</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">{text.title}</h1>
            <p className="mt-3 text-sm leading-6 text-white/56">{text.subtitle}</p>
          </div>

          {error ? <div className="mt-5 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-100" role="alert">{error}</div> : null}

          <button type="button" onClick={handleProvider} disabled={busy} className="mt-6 flex w-full items-center justify-center rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60">
            {busy ? text.loading : text.google}
          </button>

          <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-[0.24em] text-white/35">
            <span className="h-px flex-1 bg-white/10" />{text.divider}<span className="h-px flex-1 bg-white/10" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block text-sm font-medium text-white/70">
              {text.email}
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-blue-300/60" placeholder="you@company.com" />
            </label>
            <label className="block text-sm font-medium text-white/70">
              {text.password}
              <input type="password" value={secret} onChange={(event) => setSecret(event.target.value)} required autoComplete="current-password" className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-blue-300/60" />
            </label>
            <button type="submit" disabled={busy} className="w-full rounded-2xl bg-blue-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60">
              {busy ? text.loading : text.submit}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-white/50">
            {text.createPrompt}{' '}
            <Link href={createAccountUrl} className="font-semibold text-white hover:text-blue-200">{text.create}</Link>
          </p>
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
