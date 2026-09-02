'use client';

import { useState } from 'react';

type ConnectionStatus = {
  configuration?: {
    accessTokenConfigured?: boolean;
    accessTokenSource?: 'environment' | 'vault' | null;
    clientIdConfigured?: boolean;
    clientSecretConfigured?: boolean;
    organizationVanityName?: string;
    apiVersionConfigured?: boolean;
    apiVersionValid?: boolean;
  };
  token?: {
    checked?: boolean;
    active?: boolean;
    expiresAt?: number | null;
    scopes?: string[];
    hasRequiredScopes?: boolean;
  } | null;
  organizationResolution?: {
    resolved?: boolean;
    source?: string | null;
    vanityName?: string;
    checked?: boolean;
    httpStatus?: number | null;
    errorCode?: string | null;
  } | null;
  organizationRead?: {
    checked?: boolean;
    ok?: boolean;
    httpStatus?: number | null;
  } | null;
  requiredScopes?: readonly string[];
  readyForControlledTest?: boolean;
};

type Props = {
  oauthOutcome?: string | null;
};

const OUTCOME_COPY: Record<string, string> = {
  oauth_saved: 'LinkedIn authorization was verified and the managed credential was stored.',
  oauth_denied: 'LinkedIn authorization was cancelled or denied.',
  oauth_state_invalid: 'The OAuth state check failed. Start a new LinkedIn authorization.',
  oauth_code_missing: 'LinkedIn did not return an authorization code. Start a new authorization.',
  oauth_scope_invalid: 'The LinkedIn token is missing one or more required organization scopes.',
};

function formatExpiry(epochSeconds: number | null | undefined) {
  if (!epochSeconds || !Number.isFinite(epochSeconds)) return 'Not reported';
  return new Date(epochSeconds * 1000).toLocaleString();
}

function StatusPill({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium',
        ok
          ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
          : 'border-white/10 bg-white/5 text-white/55',
      ].join(' ')}
    >
      {children}
    </span>
  );
}

export function LinkedInMarketingConnection({ oauthOutcome }: Props) {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function verifyConnection() {
    setChecking(true);
    setError(null);

    try {
      const response = await fetch('/api/platform/marketing/linkedin/status', {
        method: 'GET',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });

      const payload = await response.json().catch(() => null) as ConnectionStatus | { error?: string } | null;
      if (!response.ok) {
        const code = payload && 'error' in payload ? payload.error : null;
        throw new Error(code || `status_${response.status}`);
      }

      setStatus(payload as ConnectionStatus);
    } catch (cause) {
      setStatus(null);
      setError(cause instanceof Error ? cause.message : 'connection_check_failed');
    } finally {
      setChecking(false);
    }
  }

  const outcomeCopy = oauthOutcome ? OUTCOME_COPY[oauthOutcome] : null;
  const ready = status?.readyForControlledTest === true;
  const scopes = status?.token?.scopes ?? [];

  return (
    <section className="rounded-2xl border border-white/10 bg-black/30 p-5 shadow-2xl shadow-black/20 backdrop-blur-sm md:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-200/70">
            LinkedIn Marketing Operator
          </p>
          <h2 className="text-xl font-semibold tracking-tight text-white">
            Managed company-page connection
          </h2>
          <p className="text-sm leading-6 text-white/55">
            Authorize RISCK COMPLY through LinkedIn OAuth, keep rotating credentials server-side in Vault,
            and verify the connection before any controlled test post is allowed.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <a
            href="/api/platform/marketing/linkedin/oauth/start"
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90"
          >
            Connect LinkedIn
          </a>
          <button
            type="button"
            onClick={verifyConnection}
            disabled={checking}
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {checking ? 'Checking…' : 'Verify connection'}
          </button>
        </div>
      </div>

      {outcomeCopy ? (
        <div className="mt-4 rounded-xl border border-blue-300/15 bg-blue-300/5 px-4 py-3 text-sm text-blue-100/80">
          {outcomeCopy}
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-xl border border-amber-300/15 bg-amber-300/5 px-4 py-3 text-sm text-amber-100/80">
          Connection verification did not complete: {error}
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        <StatusPill ok={ready}>{ready ? 'Ready for controlled test' : 'Controlled test blocked'}</StatusPill>
        <StatusPill ok={status?.token?.active === true}>Token active</StatusPill>
        <StatusPill ok={status?.token?.hasRequiredScopes === true}>Required scopes</StatusPill>
        <StatusPill ok={status?.organizationResolution?.resolved === true}>Organization resolved</StatusPill>
        <StatusPill ok={status?.organizationRead?.ok === true}>Organization read</StatusPill>
      </div>

      {status ? (
        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
            <dt className="text-white/40">Credential source</dt>
            <dd className="mt-1 font-medium text-white/80">
              {status.configuration?.accessTokenSource === 'vault'
                ? 'Supabase Vault'
                : status.configuration?.accessTokenSource === 'environment'
                  ? 'Environment fallback'
                  : 'Not configured'}
            </dd>
          </div>
          <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
            <dt className="text-white/40">Page vanity</dt>
            <dd className="mt-1 font-medium text-white/80">
              {status.configuration?.organizationVanityName || 'risck-comply'}
            </dd>
          </div>
          <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
            <dt className="text-white/40">Token expiry</dt>
            <dd className="mt-1 font-medium text-white/80">{formatExpiry(status.token?.expiresAt)}</dd>
          </div>
          <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
            <dt className="text-white/40">Granted scopes</dt>
            <dd className="mt-1 break-words font-medium text-white/80">
              {scopes.length > 0 ? scopes.join(', ') : 'Not verified'}
            </dd>
          </div>
        </dl>
      ) : (
        <p className="mt-5 text-xs leading-5 text-white/35">
          Status is loaded only on demand. No provider request is made just by opening this console.
        </p>
      )}
    </section>
  );
}
