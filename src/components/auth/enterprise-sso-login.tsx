'use client';

import { FormEvent, useState } from 'react';

import { supabase } from '@/integrations/supabase/client';

function callbackUrl(locale: string, next: string) {
  const url = new URL('/auth/callback', window.location.origin);
  url.searchParams.set('locale', locale);
  if (next.startsWith(`/${locale}/`) && !next.includes('://') && !next.startsWith('//')) {
    url.searchParams.set('next', next);
  }
  return url.toString();
}

export function EnterpriseSsoLogin({ locale, next }: { locale: string; next: string }) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startSso(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const normalized = email.trim().toLowerCase();
      const domain = normalized.split('@')[1] ?? '';
      if (!domain || !domain.includes('.') || domain.length > 253) {
        throw new Error('invalid_work_email');
      }

      const { data, error: providerError } = await supabase.auth.signInWithSSO({
        domain,
        options: { redirectTo: callbackUrl(locale, next) },
      });

      if (providerError || !data?.url) throw new Error('enterprise_sso_unavailable');
      window.location.assign(data.url);
    } catch {
      setError(locale === 'pt'
        ? 'Não foi possível iniciar o SSO. Confirme o email profissional ou contacte o administrador da empresa.'
        : 'Could not start SSO. Confirm your work email or contact your organization administrator.');
      setBusy(false);
    }
  }

  return (
    <div className="mt-5 rounded-2xl border border-blue-400/15 bg-blue-500/[0.055] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200/70">
        {locale === 'pt' ? 'Acesso Enterprise' : 'Enterprise access'}
      </p>
      <p className="mt-2 text-sm leading-6 text-white/55">
        {locale === 'pt'
          ? 'Use o email profissional para entrar pelo SAML SSO configurado pela sua empresa.'
          : 'Use your work email to sign in through your organization’s configured SAML SSO.'}
      </p>
      <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={startSso}>
        <input
          aria-label={locale === 'pt' ? 'Email profissional para SSO' : 'Work email for SSO'}
          autoComplete="email"
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-blue-300/50 focus-visible:ring-2 focus-visible:ring-blue-400/40"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="name@company.com"
          required
          type="email"
          value={email}
        />
        <button
          className="rounded-xl border border-blue-300/25 bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={busy}
          type="submit"
        >
          {busy
            ? (locale === 'pt' ? 'A redirecionar…' : 'Redirecting…')
            : (locale === 'pt' ? 'Entrar com SSO' : 'Sign in with SSO')}
        </button>
      </form>
      {error ? <p className="mt-3 text-sm text-red-200" role="alert">{error}</p> : null}
    </div>
  );
}