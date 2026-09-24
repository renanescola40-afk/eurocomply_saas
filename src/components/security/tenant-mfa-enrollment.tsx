'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { supabase } from '@/lib/supabase/client';

type Factor = {
  id: string;
  status?: string;
  friendly_name?: string | null;
  factor_type?: string;
};

export default function TenantMfaEnrollment({ locale, nextPath }: { locale: string; nextPath: string }) {
  const router = useRouter();
  const [factors, setFactors] = useState<Factor[]>([]);
  const [factorId, setFactorId] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('Checking your MFA status…');
  const [error, setError] = useState('');

  const verifiedFactors = useMemo(
    () => factors.filter((factor) => factor.status === 'verified'),
    [factors],
  );

  async function refreshFactors() {
    setLoading(true);
    setError('');
    const { data, error: listError } = await supabase.auth.mfa.listFactors();
    if (listError) {
      setError('Could not read MFA factors.');
      setLoading(false);
      return;
    }

    const totp = (data?.totp ?? []) as Factor[];
    setFactors(totp);
    const verified = totp.find((factor) => factor.status === 'verified');
    setFactorId(verified?.id ?? '');
    setMessage(verified ? 'Enter a code from your authenticator app.' : 'Set up an authenticator app to continue.');
    setLoading(false);
  }

  useEffect(() => {
    void refreshFactors();
  }, []);

  async function enroll() {
    setLoading(true);
    setError('');
    setMessage('Creating your MFA factor…');

    const { data, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'RISCK COMPLY workspace MFA',
    });

    if (enrollError || !data?.id || !data.totp) {
      setError('Could not create an MFA factor.');
      setLoading(false);
      return;
    }

    setFactorId(data.id);
    setQrCode(data.totp.qr_code ?? '');
    setSecret(data.totp.secret ?? '');
    setChallengeId('');
    setMessage('Scan the QR code, then enter the current verification code.');
    setLoading(false);
  }

  async function issueChallenge(selectedFactorId = factorId) {
    if (!selectedFactorId) return null;
    const { data, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: selectedFactorId });
    if (challengeError || !data?.id) {
      setError('Could not start MFA verification.');
      return null;
    }
    setChallengeId(data.id);
    return data.id;
  }

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!factorId || !code.trim()) return;

    setLoading(true);
    setError('');
    const activeChallenge = challengeId || await issueChallenge();
    if (!activeChallenge) {
      setLoading(false);
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: activeChallenge,
      code: code.trim(),
    });

    if (verifyError) {
      setError('Invalid or expired MFA code.');
      setChallengeId('');
      setLoading(false);
      return;
    }

    const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assurance.error || assurance.data?.currentLevel !== 'aal2') {
      setError('MFA was verified but the session did not reach AAL2.');
      setLoading(false);
      return;
    }

    setMessage('MFA verified. Returning to your workspace…');
    router.replace(nextPath || `/${locale}/dashboard/organizations`);
    router.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Workspace security</p>
      <h1 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">Multi-factor authentication required</h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
        This workspace requires an AAL2 session before protected workspace data can be accessed.
      </p>

      <div className="mt-6 space-y-4">
        {message ? <p className="rounded-lg bg-slate-100 p-3 text-sm text-slate-700 dark:bg-slate-900 dark:text-slate-300">{message}</p> : null}
        {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200">{error}</p> : null}

        {!loading && verifiedFactors.length === 0 && !qrCode ? (
          <button
            type="button"
            onClick={enroll}
            className="w-full rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-slate-950"
          >
            Set up authenticator app
          </button>
        ) : null}

        {qrCode ? (
          <div className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <img src={qrCode} alt="MFA enrollment QR code" className="mx-auto h-48 w-48 rounded-lg bg-white p-2" />
            {secret ? <p className="break-all text-xs text-slate-500">Manual key: {secret}</p> : null}
          </div>
        ) : null}

        {factorId ? (
          <form onSubmit={verify} className="space-y-3">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Verification code
              <input
                value={code}
                onChange={(event) => setCode(event.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 tracking-widest dark:border-slate-700 dark:bg-slate-900"
                disabled={loading}
              />
            </label>
            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="w-full rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-slate-950"
            >
              {loading ? 'Verifying…' : 'Verify MFA and continue'}
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
