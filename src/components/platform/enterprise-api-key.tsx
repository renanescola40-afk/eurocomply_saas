'use client';

import { FormEvent, useState } from 'react';

const inputClass = 'h-11 w-full rounded-2xl border border-white/10 bg-black/35 px-4 text-sm text-white outline-none placeholder:text-white/25 focus:border-blue-200/45';
const labelClass = 'space-y-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/50';
const buttonClass = 'inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50';

export function EnterpriseApiKey() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function issue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setResult(null);
    setError(null);

    const form = new FormData(event.currentTarget);
    const organizationId = String(form.get('organizationId') ?? '').trim();
    const expiresAt = new Date(String(form.get('expiresAt') ?? '')).toISOString();

    try {
      const response = await fetch(
        `/api/platform/organizations/${encodeURIComponent(organizationId)}/api-keys`,
        {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            serviceAccountName: String(form.get('serviceAccountName') ?? '').trim(),
            description: String(form.get('description') ?? '').trim() || null,
            scopes: ['users:provision'],
            expiresAt,
          }),
        },
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof body.error === 'string' ? body.error : `http_${response.status}`);
      }
      setResult(body);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'enterprise_api_key_creation_failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 shadow-2xl">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-200/70">Enterprise API</p>
      <h2 className="mt-3 text-2xl font-semibold text-white">Issue a show-once provisioning credential</h2>
      <p className="mt-2 max-w-4xl text-sm leading-6 text-white/55">
        The token is bound to one organization and the `users:provision` scope. The external API accepts an existing Supabase user ID, role, seat type and idempotency key; it never accepts an organization ID in the payload.
      </p>

      <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={issue}>
        <label className={labelClass}>
          Organization ID
          <input className={inputClass} name="organizationId" placeholder="Organization UUID" required />
        </label>
        <label className={labelClass}>
          Service account name
          <input className={inputClass} name="serviceAccountName" placeholder="HR provisioning integration" required />
        </label>
        <label className={labelClass}>
          Expires at
          <input className={inputClass} name="expiresAt" required type="datetime-local" />
        </label>
        <label className={labelClass}>
          Description
          <input className={inputClass} name="description" placeholder="Owner and approved integration purpose" />
        </label>
        <div className="md:col-span-2">
          <button className={buttonClass} disabled={loading} type="submit">
            {loading ? 'Issuing…' : 'Issue API credential'}
          </button>
        </div>
      </form>

      {error || result ? (
        <pre className={`mt-5 max-h-96 overflow-auto rounded-2xl border p-4 text-xs leading-6 ${error ? 'border-red-400/20 bg-red-500/10 text-red-100' : 'border-amber-300/20 bg-amber-300/10 text-amber-50'}`}>
          {error ?? JSON.stringify(result, null, 2)}
        </pre>
      ) : null}
    </section>
  );
}
