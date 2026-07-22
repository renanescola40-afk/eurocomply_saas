'use client';

import { FormEvent, useState } from 'react';

const inputClass = 'h-11 w-full rounded-2xl border border-white/10 bg-black/35 px-4 text-sm text-white outline-none placeholder:text-white/25 focus:border-blue-200/45';
const labelClass = 'space-y-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/50';
const buttonClass = 'inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50';

async function readJson(response: Response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof body.error === 'string' ? body.error : `http_${response.status}`);
  }
  return body as Record<string, unknown>;
}

export function EnterpriseSsoConnection() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function configure(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setResult(null);
    setError(null);

    const form = new FormData(event.currentTarget);
    const organizationId = String(form.get('organizationId') ?? '').trim();
    const connectionId = String(form.get('connectionId') ?? '').trim();

    try {
      const response = await fetch(
        `/api/platform/organizations/${encodeURIComponent(organizationId)}/sso-connections`,
        {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            connectionId: connectionId || null,
            supabaseProviderId: String(form.get('supabaseProviderId') ?? '').trim(),
            issuer: String(form.get('issuer') ?? '').trim(),
            metadataUrl: String(form.get('metadataUrl') ?? '').trim(),
            verifiedDomain: String(form.get('verifiedDomain') ?? '').trim().toLowerCase(),
            defaultRole: String(form.get('defaultRole') ?? 'editor'),
            defaultSeatType: String(form.get('defaultSeatType') ?? 'full'),
            enforceSso: form.get('enforceSso') === 'on',
            autoProvision: form.get('autoProvision') === 'on',
          }),
        },
      );
      setResult(await readJson(response));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'enterprise_sso_configuration_failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 shadow-2xl">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-200/70">Enterprise identity</p>
      <h2 className="mt-3 text-2xl font-semibold text-white">Configure a Supabase SAML provider binding</h2>
      <p className="mt-2 max-w-4xl text-sm leading-6 text-white/55">
        Bind the provider UUID created in Supabase Auth to one verified customer domain. The callback rejects SAML sessions that do not match this provider/domain pair or an active SSO entitlement.
      </p>

      <form className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4" onSubmit={configure}>
        <label className={`${labelClass} md:col-span-2`}>
          Organization ID
          <input className={inputClass} name="organizationId" placeholder="Organization UUID" required />
        </label>
        <label className={`${labelClass} md:col-span-2`}>
          Existing connection ID
          <input className={inputClass} name="connectionId" placeholder="Optional connection UUID for updates" />
        </label>
        <label className={`${labelClass} md:col-span-2`}>
          Supabase SSO provider ID
          <input className={inputClass} name="supabaseProviderId" placeholder="Provider UUID from Supabase Auth SSO" required />
        </label>
        <label className={`${labelClass} md:col-span-2`}>
          Verified login domain
          <input className={inputClass} name="verifiedDomain" placeholder="company.com" required />
        </label>
        <label className={`${labelClass} md:col-span-2`}>
          SAML issuer
          <input className={inputClass} name="issuer" placeholder="https://idp.example.com/entity-id" required />
        </label>
        <label className={`${labelClass} md:col-span-2`}>
          Metadata URL
          <input className={inputClass} name="metadataUrl" placeholder="https://idp.example.com/metadata.xml" required type="url" />
        </label>
        <label className={labelClass}>
          Default role
          <select className={inputClass} defaultValue="editor" name="defaultRole">
            <option value="admin">admin</option>
            <option value="editor">editor</option>
            <option value="viewer">viewer</option>
          </select>
        </label>
        <label className={labelClass}>
          Default seat
          <select className={inputClass} defaultValue="full" name="defaultSeatType">
            <option value="full">full</option>
            <option value="participant">participant</option>
            <option value="viewer">viewer</option>
          </select>
        </label>
        <fieldset className="grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 md:col-span-2">
          <legend className="px-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/50">Provisioning policy</legend>
          <label className="flex items-center gap-3 text-sm text-white/70">
            <input className="size-4 rounded border-white/20 bg-black" defaultChecked name="autoProvision" type="checkbox" />
            Automatically consume a licensed seat on first SSO login
          </label>
          <label className="flex items-center gap-3 text-sm text-white/70">
            <input className="size-4 rounded border-white/20 bg-black" name="enforceSso" type="checkbox" />
            Mark the connection as enforced for the organization
          </label>
        </fieldset>
        <div className="md:col-span-2 xl:col-span-4">
          <button className={buttonClass} disabled={loading} type="submit">
            {loading ? 'Configuring…' : 'Configure SAML connection'}
          </button>
        </div>
      </form>

      {error || result ? (
        <pre className={`mt-5 max-h-96 overflow-auto rounded-2xl border p-4 text-xs leading-6 ${error ? 'border-red-400/20 bg-red-500/10 text-red-100' : 'border-emerald-400/20 bg-emerald-500/10 text-emerald-50'}`}>
          {error ?? JSON.stringify(result, null, 2)}
        </pre>
      ) : null}
    </section>
  );
}
