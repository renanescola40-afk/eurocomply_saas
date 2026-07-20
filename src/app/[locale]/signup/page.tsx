'use client';

import { Suspense, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { locales, type Locale } from '@/lib/i18n/routing';

function copy(locale: Locale) {
  return locale === 'pt'
    ? {
        eyebrow: 'LANÇAMENTO EM 1 DE AGOSTO',
        title: 'A sua conta RISCK COMPLY está quase disponível.',
        subtitle: 'A plataforma está em validação privada antes da abertura pública. Todos os caminhos de acesso já estão preparados, mas novas contas serão ativadas apenas no lançamento oficial.',
        google: 'Criar conta com Google',
        divider: 'ou criar com email',
        email: 'Email profissional',
        password: 'Criar senha',
        submit: 'Criar conta',
        haveAccount: 'Já possui acesso privado?',
        signIn: 'Entrar',
        noticeTitle: 'Acesso público abre em 1 de agosto',
        noticeBody: 'Estamos finalizando a experiência, a segurança e os fluxos de onboarding para entregar um ambiente premium desde o primeiro acesso. A criação de contas por Google e email será liberada no lançamento oficial.',
        noticeFooter: 'Obrigado por fazer parte do início da RISCK COMPLY.',
      }
    : {
        eyebrow: 'LAUNCHING AUGUST 1',
        title: 'Your RISCK COMPLY account is almost ready.',
        subtitle: 'The platform is in private validation before public access opens. Every access path is prepared, but new accounts will be activated only on the official launch date.',
        google: 'Create account with Google',
        divider: 'or create with email',
        email: 'Work email',
        password: 'Create password',
        submit: 'Create account',
        haveAccount: 'Already have private access?',
        signIn: 'Sign in',
        noticeTitle: 'Public access opens August 1',
        noticeBody: 'We are completing the product experience, security controls and onboarding flows to deliver a premium environment from the first sign-in. Google and email account creation will open on the official launch date.',
        noticeFooter: 'Thank you for being part of the beginning of RISCK COMPLY.',
      };
}

function SignupContent() {
  const params = useParams<{ locale: string }>();
  const localeParam = params?.locale ?? 'pt';
  const locale = (locales.includes(localeParam as Locale) ? localeParam : 'pt') as Locale;
  const text = copy(locale);
  const [noticeOpen, setNoticeOpen] = useState(false);

  function showLaunchNotice() {
    setNoticeOpen(true);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    showLaunchNotice();
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#050505] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,.22),transparent_34rem),radial-gradient(circle_at_bottom_right,rgba(14,165,233,.14),transparent_30rem)]" />
      <div className="relative mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 gap-8 px-5 py-8 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:px-8">
        <section className="hidden lg:block">
          <Link href={`/${locale}`} className="inline-flex rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-semibold tracking-wide text-white/90">
            RISCK COMPLY
          </Link>
          <div className="mt-16 max-w-2xl">
            <div className="inline-flex rounded-full border border-blue-300/20 bg-blue-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-blue-100">
              {text.eyebrow}
            </div>
            <h1 className="mt-6 text-5xl font-semibold tracking-[-0.05em] text-white xl:text-6xl">{text.title}</h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-white/62">{text.subtitle}</p>
            <div className="mt-8 grid max-w-xl grid-cols-3 gap-3 text-center text-xs font-semibold uppercase tracking-[0.14em] text-white/55">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-4">Secure access</div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-4">Private preview</div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-4">August 1</div>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center">
          <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-2xl backdrop-blur-xl sm:p-8">
            <Link href={`/${locale}`} className="mb-6 block text-center text-sm font-semibold text-white lg:hidden">RISCK COMPLY</Link>
            <p className="text-center text-xs font-semibold uppercase tracking-[0.28em] text-blue-200/80">Secure signup</p>
            <h2 className="mt-3 text-center text-3xl font-semibold tracking-tight text-white">{locale === 'pt' ? 'Criar conta' : 'Create account'}</h2>
            <p className="mt-3 text-center text-sm leading-6 text-white/55">{locale === 'pt' ? 'Todos os métodos estarão disponíveis no lançamento.' : 'All sign-up methods will be available at launch.'}</p>

            {noticeOpen ? (
              <div className="mt-6 rounded-3xl border border-blue-300/25 bg-blue-400/10 p-5 shadow-lg shadow-blue-950/20" role="status">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="inline-flex rounded-full border border-blue-200/20 bg-blue-300/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-100">Private launch</div>
                    <h3 className="mt-4 text-lg font-semibold text-white">{text.noticeTitle}</h3>
                    <p className="mt-2 text-sm leading-6 text-white/65">{text.noticeBody}</p>
                    <p className="mt-4 text-xs font-medium text-blue-100/75">{text.noticeFooter}</p>
                  </div>
                  <button type="button" onClick={() => setNoticeOpen(false)} aria-label="Close" className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/60 transition hover:text-white">×</button>
                </div>
              </div>
            ) : null}

            <button type="button" onClick={showLaunchNotice} className="mt-6 flex w-full items-center justify-center rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-white/90">
              {text.google}
            </button>
            <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-[0.22em] text-white/35">
              <span className="h-px flex-1 bg-white/10" />{text.divider}<span className="h-px flex-1 bg-white/10" />
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block text-sm font-medium text-white/70">
                {text.email}
                <input type="email" required autoComplete="email" className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-blue-300/60" placeholder="you@company.com" />
              </label>
              <label className="block text-sm font-medium text-white/70">
                {text.password}
                <input type="password" required minLength={8} autoComplete="new-password" className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-blue-300/60" />
              </label>
              <button type="submit" className="w-full rounded-2xl bg-blue-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-400">{text.submit}</button>
            </form>
            <p className="mt-6 text-center text-sm text-white/50">
              {text.haveAccount}{' '}
              <Link href={`/${locale}/login`} className="font-semibold text-blue-200 hover:text-blue-100">{text.signIn}</Link>
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
      <SignupContent />
    </Suspense>
  );
}
