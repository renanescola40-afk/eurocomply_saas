'use client';

import { FormEvent, useState } from 'react';

const inputClass = 'h-11 w-full rounded-2xl border border-white/10 bg-black/35 px-4 text-sm text-white outline-none placeholder:text-white/25 focus:border-blue-200/45';
const labelClass = 'space-y-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/50';
const buttonClass = 'inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50';

function defaultExpiry() {
  const date = new Date();
  date.setDate(date.getDate() + 90);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function EnterpriseScimToken() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function issueToken(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    const form = new FormData(event.currentTarget);
    const organizationId = String(form.get('organizationId') ?? '').trim();
    const identityConnectionId = String(form.get('identityConnectionId') ?? '').trim();
    const expiresValue = String(form.get('expiresAt') ?? '');
    const expiresAt = new Date(expiresValue);

    try {
      if (Number.isNaN(expiresAt.getTime())) throw new Error('invalid_scim_token_expiry');
      const response = await fetch(
        `/api/platform/organizations/${encodeURIComponent(organizationId)}/scim-tokens`,
        {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            identityConnectionId: identityConnectionId || null,
            expiresAt: expiresAt.toISOString(),
          }),
        },
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof body.error === 'string' ? body.error : `http_${response.status}`);
      }
      setResult(body);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'scim_token_creation_failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 shadow-2xl">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-200/70">SCIM provisioning</p>
      <h2 className="mt-3 text-2xl font-semibold text-white">Issue an organization-scoped SCIM token</h2>
      <p className="mt-2 max-w-4xl text-sm leading-6 text-white/55">
        The plaintext token is displayed once. Store it in the customer identity provider and use the base URL <code>/api/scim/v2</code>.
        Token creation requires the negotiated SCIM entitlement and may be tied to a verified SAML/OIDC connection.
      </p>

      <form className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4" onSubmit={issueToken}>
        <label className={`${labelClass} md:col-span-2`}>
          Organization ID
          <input className={inputClass} name="organizationId" placeholder="Organization UUID" required />
        </label>
        <label className={`${labelClass} md:col-span-2`}>
          Identity connection ID
          <input className={inputClass} name="identityConnectionId" placeholder="Optional verified SAML/OIDC connection UUID" />
        </label>
        <label className={`${labelClass} md:col-span-2`}>
          Expires at
          <input className={inputClass} defaultValue={defaultExpiry()} name="expiresAt" required type="datetime-local" />
        </label>
        <div className="flex items-end md:col-span-2">
          <button className={buttonClass} disabled={loading} type="submit">
            {loading ? 'Issuing…' : 'Issue token'}
          </button>
        </div>
      </form>

      {error || result ? (
        <pre className={`mt-5 max-h-96 overflow-auto rounded-2xl border p-4 text-xs leading-6 ${error ? 'border-red-400/20 bg-red-500/10 text-red-100' : 'border-amber-300/25 bg-amber-300/10 text-amber-50'}`}>
          {error ?? JSON.stringify(result, null, 2)}
        </pre>
      ) : null}
    </section>
  );
}
