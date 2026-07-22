'use client';

import { FormEvent, useState } from 'react';

const inputClass = 'h-11 w-full rounded-2xl border border-white/10 bg-black/35 px-4 text-sm text-white outline-none placeholder:text-white/25 focus:border-blue-200/45';
const labelClass = 'space-y-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/50';
const buttonClass = 'inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50';

function slugify(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function EnterpriseOrganizationCreate() {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function createOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const response = await fetch('/api/platform/organizations', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), slug: slug.trim().toLowerCase() }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof body.error === 'string' ? body.error : `http_${response.status}`);
      }
      setResult(body);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'enterprise_organization_creation_failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 shadow-2xl">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-200/70">Enterprise tenant</p>
      <h2 className="mt-3 text-2xl font-semibold text-white">Create the customer organization</h2>
      <p className="mt-2 max-w-4xl text-sm leading-6 text-white/55">
        Creates one isolated logical tenant in the shared application. After creation, use the returned organization ID to provision the negotiated contract and then activate access.
      </p>

      <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={createOrganization}>
        <label className={labelClass}>
          Organization name
          <input
            className={inputClass}
            maxLength={160}
            onChange={(event) => {
              const value = event.target.value;
              setName(value);
              if (!slug || slug === slugify(name)) setSlug(slugify(value));
            }}
            placeholder="Acme Europe S.A."
            required
            value={name}
          />
        </label>
        <label className={labelClass}>
          Tenant slug
          <input
            className={inputClass}
            maxLength={80}
            minLength={3}
            onChange={(event) => setSlug(event.target.value)}
            pattern="[a-z0-9](?:[a-z0-9-]{1,78}[a-z0-9])"
            placeholder="acme-europe"
            required
            value={slug}
          />
        </label>
        <div className="md:col-span-2">
          <button className={buttonClass} disabled={loading} type="submit">
            {loading ? 'Creating…' : 'Create Enterprise tenant'}
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
