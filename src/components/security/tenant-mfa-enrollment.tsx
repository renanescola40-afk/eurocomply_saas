'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { createClient } from '@/lib/supabase/browser';

type Props = {
  locale: string;
  nextPath: string;
};

type Mode = 'loading' | 'enroll' | 'challenge' | 'verified' | 'error';

export function TenantMfaEnrollment({ locale, nextPath }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [mode, setMode] = useState<Mode>('loading');
  const [factorId, setFactorId] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');

  const copy = locale === 'pt'
    ? {
        title: 'Autenticação multifator obrigatória',
        body: 'Este workspace exige MFA. Use uma aplicação autenticadora para continuar.',
        scan: 'Leia o QR code ou introduza esta chave na sua aplicação autenticadora.',
        existing: 'Introduza o código da sua aplicação autenticadora.',
        verify: 'Verificar e continuar',
        working: 'A verificar…',
        backup: 'Depois de entrar, adicione um segundo fator TOTP como recuperação.',
        error: 'Não foi possível concluir o MFA. Tente novamente ou contacte o administrador.',
      }
    : {
        title: 'Multi-factor authentication required',
        body: 'This workspace requires MFA. Use an authenticator app to continue.',
        scan: 'Scan the QR code or enter this key in your authenticator app.',
        existing: 'Enter the code from your authenticator app.',
        verify: 'Verify and continue',
        working: 'Verifying…',
        backup: 'After signing in, add a second TOTP factor as a recovery factor.',
        error: 'MFA could not be completed. Try again or contact your administrator.',
      };

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (cancelled) return;

      if (!assurance.error && assurance.data?.currentLevel === 'aal2') {
        setMode('verified');
        router.replace(nextPath);
        router.refresh();
        return;
      }

      const listed = await supabase.auth.mfa.listFactors();
      if (cancelled) return;

      if (listed.error) {
        setMessage(copy.error);
        setMode('error');
        return;
      }

      const verifiedTotp = listed.data?.totp?.find((factor) => factor.status === 'verified');
      if (verifiedTotp) {
        setFactorId(verifiedTotp.id);
        setMode('challenge');
        return;
      }

      const enrollment = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'RISCK COMPLY workspace MFA',
      });

      if (cancelled) return;

      if (enrollment.error || !enrollment.data?.id || !enrollment.data.totp) {
        setMessage(copy.error);
        setMode('error');
        return;
      }

      setFactorId(enrollment.data.id);
      setQrCode(enrollment.data.totp.qr_code);
      setSecret(enrollment.data.totp.secret);
      setMode('enroll');
    })();

    return () => {
      cancelled = true;
    };
  }, [copy.error, nextPath, router, supabase]);

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = code.replace(/\s+/g, '');
    if (!factorId || !/^\d{6}$/.test(normalized)) return;

    setMessage(copy.working);
    const result = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code: normalized,
    });

    if (result.error) {
      setMessage(copy.error);
      return;
    }

    const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assurance.error || assurance.data?.currentLevel !== 'aal2') {
      setMessage(copy.error);
      return;
    }

    setMode('verified');
    router.replace(nextPath);
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl items-center px-6 py-12">
      <section className="w-full rounded-2xl border border-border bg-background p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">{copy.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{copy.body}</p>

        {mode === 'loading' ? <p className="mt-6 text-sm">{copy.working}</p> : null}

        {mode === 'enroll' ? (
          <div className="mt-6 space-y-4">
            <p className="text-sm">{copy.scan}</p>
            {qrCode ? (
              // Supabase Auth returns the enrollment QR as a data URL/SVG payload.
              // It contains only the current user's temporary TOTP enrollment secret.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrCode} alt="TOTP enrollment QR code" className="mx-auto h-56 w-56 rounded-lg bg-white p-3" />
            ) : null}
            {secret ? (
              <code className="block overflow-x-auto rounded-lg bg-muted p-3 text-xs">{secret}</code>
            ) : null}
          </div>
        ) : null}

        {mode === 'challenge' ? <p className="mt-6 text-sm">{copy.existing}</p> : null}

        {(mode === 'enroll' || mode === 'challenge') ? (
          <form onSubmit={verify} className="mt-4 space-y-3">
            <label className="block text-sm font-medium" htmlFor="mfa-code">Authenticator code</label>
            <input
              id="mfa-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              maxLength={6}
              className="w-full rounded-lg border border-input bg-background px-3 py-2"
              placeholder="123456"
            />
            <button
              type="submit"
              disabled={!/^\d{6}$/.test(code.replace(/\s+/g, ''))}
              className="w-full rounded-lg bg-foreground px-4 py-2 font-medium text-background disabled:opacity-50"
            >
              {copy.verify}
            </button>
            <p className="text-xs text-muted-foreground">{copy.backup}</p>
          </form>
        ) : null}

        {message ? <p className="mt-4 text-sm" role="status">{message}</p> : null}
      </section>
    </main>
  );
}
