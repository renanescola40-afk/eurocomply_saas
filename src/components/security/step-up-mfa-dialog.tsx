'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

export type StepUpAction =
  | 'export_data'
  | 'manage_billing'
  | 'manage_team'
  | 'gdpr_delete'
  | 'audit_chain_verify'
  | 'audit_chain_export'
  | 'change_security_settings';

type StepUpFactor = {
  id: string;
  type: string;
  name: string | null;
};

type StepUpTokenResponse = {
  token?: string;
  expiresAt?: string;
  maxAgeMs?: number;
  error?: string;
  message?: string;
  factors?: StepUpFactor[];
  status?: string;
  challengeNonce?: string;
  challengeId?: string;
  factorId?: string;
  provider?: 'supabase_mfa' | 'enterprise_idp';
  requiresCode?: boolean;
};

export const STEP_UP_TOKEN_HEADER = 'x-eurocomply-step-up-token';

export type StepUpMfaDialogProps = {
  action: StepUpAction;
  open: boolean;
  title?: string;
  description?: string;
  onCancel: () => void;
  onToken: (token: string, expiresAt?: string) => void;
};

async function postStepUpChallenge(payload: Record<string, string>) {
  const response = await fetch('/api/security/step-up/challenge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(payload),
  });
  const body = (await response.json().catch(() => ({}))) as StepUpTokenResponse;
  return { response, body };
}

async function postStepUpVerify(payload: Record<string, string>) {
  const response = await fetch('/api/security/step-up/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(payload),
  });
  const body = (await response.json().catch(() => ({}))) as StepUpTokenResponse;
  return { response, body };
}

export function StepUpMfaDialog({
  action,
  open,
  title = 'Security verification required',
  description = 'This action is sensitive. Verify with MFA or your enterprise identity provider before continuing.',
  onCancel,
  onToken,
}: StepUpMfaDialogProps) {
  const [factors, setFactors] = useState<StepUpFactor[]>([]);
  const [factorId, setFactorId] = useState('');
  const [challengeNonce, setChallengeNonce] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [code, setCode] = useState('');
  const [provider, setProvider] = useState<'supabase_mfa' | 'enterprise_idp' | null>(null);
  const [requiresCode, setRequiresCode] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedFactor = useMemo(
    () => factors.find((factor) => factor.id === factorId) ?? null,
    [factorId, factors],
  );

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setMessage(null);
    setCode('');
    setChallengeNonce('');
    setChallengeId('');
    setProvider(null);
    setRequiresCode(true);

    postStepUpChallenge({ action })
      .then(({ body }) => {
        if (cancelled) return;
        if (body.challengeNonce) setChallengeNonce(body.challengeNonce);
        if (body.provider) setProvider(body.provider);
        if (typeof body.requiresCode === 'boolean') setRequiresCode(body.requiresCode);
        if (body.factors?.length) {
          setFactors(body.factors);
          setFactorId(body.factors[0]?.id ?? '');
          setMessage(body.message ?? 'Choose an MFA factor to continue.');
          return;
        }
        if (body.challengeNonce && body.provider === 'enterprise_idp') {
          setMessage(body.message ?? 'Reauthenticate with your enterprise IdP, then verify this session.');
          return;
        }
        setError(body.message ?? body.error ?? 'Step-up verification is not available.');
      })
      .catch(() => {
        if (!cancelled) setError('Could not start security verification.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [action, onToken, open]);

  if (!open) return null;

  async function handleIssueChallenge() {
    if (!factorId) return;
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const payload: Record<string, string> = { action, factorId };
      if (challengeNonce) payload.challengeNonce = challengeNonce;
      const { body } = await postStepUpChallenge(payload);
      if (body.challengeNonce) setChallengeNonce(body.challengeNonce);
      if (body.provider) setProvider(body.provider);
      if (typeof body.requiresCode === 'boolean') setRequiresCode(body.requiresCode);
      if (body.challengeId) {
        setChallengeId(body.challengeId);
        setFactorId(body.factorId ?? factorId);
        setMessage(body.message ?? 'Enter the MFA code for the selected factor.');
      } else {
        setError(body.message ?? body.error ?? 'Could not issue MFA challenge.');
      }
    } catch {
      setError('Could not issue MFA challenge.');
    } finally {
      setLoading(false);
    }
  }

  async function submitVerification(payload: Record<string, string>) {
    const { body } = await postStepUpVerify(payload);
    if (body.token) {
      onToken(body.token, body.expiresAt);
    } else {
      setError(body.message ?? body.error ?? 'Step-up verification failed.');
    }
  }

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!challengeNonce) return;
    if (requiresCode && (!factorId || !challengeId || !code.trim())) return;
    setLoading(true);
    setError(null);

    try {
      const payload: Record<string, string> = { action, challengeNonce };
      if (factorId) payload.factorId = factorId;
      if (challengeId) payload.challengeId = challengeId;
      if (code.trim()) payload.code = code.trim();
      await submitVerification(payload);
    } catch {
      setError('Step-up verification failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyEnterpriseSession() {
    if (!challengeNonce) return;
    setLoading(true);
    setError(null);

    try {
      await submitVerification({ action, challengeNonce });
    } catch {
      setError('Enterprise step-up verification failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-950">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Enterprise step-up</p>
          <h2 className="text-xl font-semibold text-slate-950 dark:text-white">{title}</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">{description}</p>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleVerify}>
          {factors.length > 0 ? (
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              MFA factor
              <select
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                value={factorId}
                onChange={(event) => {
                  setFactorId(event.target.value);
                  setChallengeId('');
                  setCode('');
                }}
                disabled={loading}
              >
                {factors.map((factor) => (
                  <option key={factor.id} value={factor.id}>
                    {factor.name ?? factor.type}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {factorId && !challengeId ? (
            <button
              type="button"
              className="w-full rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-slate-950"
              onClick={handleIssueChallenge}
              disabled={loading || !selectedFactor}
            >
              {loading ? 'Preparing challenge…' : 'Send MFA challenge'}
            </button>
          ) : null}

          {challengeId ? (
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Verification code
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm tracking-widest dark:border-slate-700 dark:bg-slate-900"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                disabled={loading}
              />
            </label>
          ) : null}

          {provider === 'enterprise_idp' && challengeNonce && !requiresCode ? (
            <button
              type="button"
              className="w-full rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-slate-950"
              onClick={handleVerifyEnterpriseSession}
              disabled={loading}
            >
              {loading ? 'Checking session…' : 'Verify enterprise session'}
            </button>
          ) : null}

          {message ? <p className="rounded-lg bg-slate-100 p-3 text-sm text-slate-700 dark:bg-slate-900 dark:text-slate-300">{message}</p> : null}
          {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200">{error}</p> : null}

          <div className="flex justify-end gap-3">
            <button type="button" className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300" onClick={onCancel} disabled={loading}>
              Cancel
            </button>
            {challengeId ? (
              <button type="submit" className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-slate-950" disabled={loading || !code.trim()}>
                {loading ? 'Verifying…' : 'Verify and continue'}
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  );
}
