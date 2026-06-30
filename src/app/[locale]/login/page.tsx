'use client';

import { Suspense, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/integrations/supabase/client';
import { normalizePublicAuthErrorCode } from '@/lib/auth/public-errors';
import { getBillingPlan } from '@/lib/billing/plans';
import { locales, type Locale } from '@/lib/i18n/routing';

const errors = {
  en: {
    missing_oauth_code: 'The sign-in request expired. Please try again.',
    auth_configuration_unavailable: 'Authentication is temporarily unavailable. Please try again later.',
    auth_exchange_failed: 'Could not complete sign-in. Please try again.',
    email_sign_in_failed: 'Could not complete sign-in. Please check your details and try again.',
  },
  pt: {
    missing_oauth_code: 'O pedido de entrada expirou. Tente novamente.',
    auth_configuration_unavailable: 'A autenticação está temporariamente indisponível. Tente novamente mais tarde.',
    auth_exchange_failed: 'Não foi possível concluir a entrada. Tente novamente.',
    email_sign_in_failed: 'Não foi possível concluir a entrada. Verifique os dados e tente novamente.',
  },
} as const;

function successHref(locale: string, planId?: string | null) {
  const plan = getBillingPlan(planId)?.id;
  return plan ? `/${locale}/onboarding?plan=${encodeURIComponent(plan)}` : `/${locale}/onboarding`;
}

function safeNext(next: string | null, locale: string, planId?: string | null) {
  const fallback = successHref(locale, planId);
  const value = next?.trim();
  if (!value || value.length > 240 || value.startsWith('//') || value.includes('://')) return fallback;
  const allowed = [`/${locale}/onboarding`, `/${locale}/dashboard/organizations`, `/${locale}/checkout`];
  return allowed.some((path) => value === path || value.startsWith(`${path}/`) || value.startsWith(`${path}?`)) ? value : fallback;
}

function signupHref(locale: string, planId: string | null, nextPath: string) {
  const params = new URLSearchParams();
  const plan = getBillingPlan(planId)?.id;
  if (plan) params.set('plan', plan);
  params.set('next', nextPath);
  return `/${locale}/signup?${params.toString()}`;
}

function copy(locale: Locale) {
  return locale === 'pt'
    ? {
        title: 'Entrar na RISCK COMPLY', subtitle: 'Acesse o seu workspace de compliance de IA.', google: 'Continuar com Google', divider: 'ou entre com email', email: 'Email profissional', password: 'Senha', submit: 'Entrar com segurança', loading: 'A entrar...', noAccount: 'Ainda não tem conta?', create: 'Criar conta', home: 'Voltar à landing', contact: 'Falar com suporte', fallback: 'Não foi possível entrar. Verifique os dados e tente novamente.', unavailable: 'A autenticação está temporariamente indisponível. Contacte o suporte ou tente novamente mais tarde.',
      }
    : {
        title: 'Sign in to RISCK COMPLY', subtitle: 'Access your AI compliance workspace.', google: 'Continue with Google', divider: 'or sign in with email', email: 'Work email', password: 'Password', submit: 'Sign in securely', loading: 'Signing in...', noAccount: 'No account yet?', create: 'Create account', home: 'Back to landing', contact: 'Contact support', fallback: 'Could not sign in. Check your details and try again.', unavailable: 'Authentication is temporarily unavailable. Please contact support or try again later.',
      };
}

function AuthShell({ children, activeLocale }: { children: React.ReactNode; activeLocale: Locale }) {
  return (
    <main className="min-h-screen overflow-hidden bg-[#050505] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.22),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.14),transparent_32%)]" />
      <div className="relative mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 gap-8 px-5 py-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-8">
        <section className="hidden lg:block">
          <Link href={`/${activeLocale}`} className="inline-flex rounded-full border border-white/10 bg-white/8 px-4 py-2 text-sm font-semibold tracking-wide text-white/90">RISCK COMPLY</Link>
          <div className="mt-16 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.34em] text-blue-200/80">AI ACT READINESS</p>
            <h1 className="mt-5 text-5xl font-semibold tracking-[-0.05em] text-white xl:text-6xl">{activeLocale === 'pt' ? 'Entre no cockpit de compliance da sua empresa.' : 'Enter your company compliance cockpit.'}</h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-white/62">{activeLocale === 'pt' ? 'Organize inventário de IA, riscos, evidências e documentos num fluxo seguro.' : 'Manage AI inventory, risks, evidence and documents in a secure workflow.'}</p>
          </div>
        </section>
        <section className="flex items-center justify-center">
          <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-2xl backdrop-blur-xl">
            <Link href={`/${activeLocale}`} className="mb-6 block text-center text-sm font-semibold text-white lg:hidden">RISCK COMPLY</Link>
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}

function LoginForm({ activeLocale, afterSignInUrl, signUpUrl, publicErrorCode }: { activeLocale: Locale; afterSignInUrl: string; signUpUrl: string; publicErrorCode: keyof typeof errors.en | null }) {
  const router = useRouter();
  const text = copy(activeLocale);
  const messages = activeLocale === 'pt' ? errors.pt : errors.en;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleGoogleSignIn() {
    setIsSubmitting(true);
    setFormError(null);
    const redirectTo = new URL(`/${activeLocale}/auth/callback`, window.location.origin);
    redirectTo.searchParams.set('next', afterSignInUrl);
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectTo.toString() } });
    if (error) {
      setFormError(text.unavailable);
      setIsSubmitting(false);
    }
  }

  async function handleEmailSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setFormError(messages.email_sign_in_failed);
      setIsSubmitting(false);
      return;
    }
    router.replace(afterSignInUrl);
    router.refresh();
  }

  return (
    <AuthShell activeLocale={activeLocale}>
      <div className="text-center"><p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-200/80">Secure access</p><h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">{text.title}</h1><p className="mt-3 text-sm leading-6 text-white/56">{text.subtitle}</p></div>
      {(publicErrorCode || formError) ? <div className="mt-5 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-100" role="alert">{formError ?? messages[publicErrorCode!]}</div> : null}
      <button type="button" onClick={handleGoogleSignIn} disabled={isSubmitting} className="mt-6 flex w-full items-center justify-center rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60">{isSubmitting ? text.loading : text.google}</button>
      <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-[0.24em] text-white/35"><span className="h-px flex-1 bg-white/10" />{text.divider}<span className="h-px flex-1 bg-white/10" /></div>
      <form onSubmit={handleEmailSignIn} className="space-y-4">
        <label className="block text-sm font-medium text-white/70">{text.email}<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-blue-300/60" placeholder="you@company.com" /></label>
        <label className="block text-sm font-medium text-white/70">{text.password}<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-blue-300/60" /></label>
        <button type="submit" disabled={isSubmitting} className="w-full rounded-2xl bg-blue-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60">{isSubmitting ? text.loading : text.submit}</button>
      </form>
      <p className="mt-6 text-center text-sm text-white/50">{text.noAccount} <Link href={signUpUrl} className="font-semibold text-white hover:text-blue-200">{text.create}</Link></p>
    </AuthShell>
  );
}

function LoginPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params.locale as string) || 'pt';
  const activeLocale = (locales.includes(locale as Locale) ? locale : 'pt') as Locale;
  const requestedPlanId = searchParams.get('plan');
  const afterSignInUrl = safeNext(searchParams.get('next'), activeLocale, requestedPlanId);
  const signUpUrl = signupHref(activeLocale, requestedPlanId, afterSignInUrl);
  const publicErrorCode = searchParams.has('error') ? normalizePublicAuthErrorCode(searchParams.get('error'), 'email_sign_in_failed') : null;
  return <LoginForm activeLocale={activeLocale} afterSignInUrl={afterSignInUrl} signUpUrl={signUpUrl} publicErrorCode={publicErrorCode} />;
}

export default function LoginPage() {
  return <Suspense fallback={<main className="min-h-screen bg-[#050505]" />}><LoginPageContent /></Suspense>;
}
