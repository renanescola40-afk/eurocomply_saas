'use client';

import { FormEvent, useState } from 'react';

const inputClass = 'h-11 w-full rounded-2xl border border-white/10 bg-black/35 px-4 text-sm text-white outline-none placeholder:text-white/25 focus:border-blue-200/45';
const labelClass = 'space-y-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/50';
const buttonClass = 'inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50';
const secondaryButtonClass = 'inline-flex h-11 items-center justify-center rounded-full border border-white/15 px-5 text-sm font-semibold text-white/75 transition hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-50';

async function readJson(response: Response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof body.error === 'string' ? body.error : `http_${response.status}`);
  }
  return body as Record<string, unknown>;
}

export function EnterpriseBulkImport() {
  const [organizationId, setOrganizationId] = useState('');
  const [jobId, setJobId] = useState('');
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function createJob(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    const form = new FormData(event.currentTarget);
    const idempotencyKey = String(form.get('idempotencyKey') ?? '').trim()
      || `platform-csv-${Date.now()}`;

    try {
      const response = await fetch(
        `/api/platform/organizations/${encodeURIComponent(organizationId.trim())}/provisioning-jobs`,
        {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            csv: String(form.get('csv') ?? ''),
            defaultRole: String(form.get('defaultRole') ?? 'viewer'),
            defaultSeatType: String(form.get('defaultSeatType') ?? 'viewer'),
            idempotencyKey,
          }),
        },
      );
      const body = await readJson(response);
      setResult(body);
      if (typeof body.jobId === 'string') setJobId(body.jobId);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'enterprise_import_failed');
    } finally {
      setLoading(false);
    }
  }

  async function refreshStatus() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/platform/organizations/${encodeURIComponent(organizationId.trim())}/provisioning-jobs?jobId=${encodeURIComponent(jobId.trim())}`,
        { credentials: 'same-origin', cache: 'no-store' },
      );
      setResult(await readJson(response));
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : 'enterprise_import_status_failed');
    } finally {
      setLoading(false);
    }
  }

  async function runAction(action: 'process' | 'cancel') {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/platform/provisioning-jobs/actions', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(action === 'process'
          ? { action, batchSize: 50 }
          : { action, jobId: jobId.trim() }),
      });
      setResult(await readJson(response));
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'enterprise_import_action_failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 shadow-2xl">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-200/70">Bulk provisioning</p>
      <h2 className="mt-3 text-2xl font-semibold text-white">Queue up to 10,000 CSV invitations</h2>
      <p className="mt-2 max-w-4xl text-sm leading-6 text-white/55">
        Required header: <code>email</code>. Optional headers: <code>role</code> and <code>seat_type</code>.
        Jobs are persisted, idempotent and processed in leased batches through the same transactional seat checks as individual invitations.
      </p>

      <form className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4" onSubmit={createJob}>
        <label className={`${labelClass} md:col-span-2`}>
          Organization ID
          <input
            className={inputClass}
            onChange={(event) => setOrganizationId(event.target.value)}
            placeholder="Organization UUID"
            required
            value={organizationId}
          />
        </label>
        <label className={labelClass}>
          Default role
          <select className={inputClass} defaultValue="viewer" name="defaultRole">
            <option value="admin">admin</option>
            <option value="editor">editor</option>
            <option value="viewer">viewer</option>
          </select>
        </label>
        <label className={labelClass}>
          Default seat
          <select className={inputClass} defaultValue="viewer" name="defaultSeatType">
            <option value="full">full</option>
            <option value="participant">participant</option>
            <option value="viewer">viewer</option>
          </select>
        </label>
        <label className={`${labelClass} md:col-span-2 xl:col-span-4`}>
          CSV
          <textarea
            className="min-h-56 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 font-mono text-xs leading-6 text-white outline-none placeholder:text-white/25 focus:border-blue-200/45"
            defaultValue={'email,role,seat_type\nuser@example.com,editor,participant'}
            name="csv"
            required
          />
        </label>
        <label className={`${labelClass} md:col-span-2`}>
          Idempotency key
          <input className={inputClass} name="idempotencyKey" placeholder="contract-2026-batch-01" />
        </label>
        <div className="flex items-end gap-3 md:col-span-2">
          <button className={buttonClass} disabled={loading} type="submit">
            {loading ? 'Queuing…' : 'Queue import'}
          </button>
        </div>
      </form>

      <div className="mt-6 grid gap-4 md:grid-cols-[1fr_auto_auto_auto]">
        <input
          aria-label="Provisioning job ID"
          className={inputClass}
          onChange={(event) => setJobId(event.target.value)}
          placeholder="Provisioning job UUID"
          value={jobId}
        />
        <button
          className={secondaryButtonClass}
          disabled={loading || !organizationId.trim() || !jobId.trim()}
          onClick={refreshStatus}
          type="button"
        >
          Refresh job
        </button>
        <button
          className={buttonClass}
          disabled={loading}
          onClick={() => runAction('process')}
          type="button"
        >
          Run 50 rows
        </button>
        <button
          className={secondaryButtonClass}
          disabled={loading || !jobId.trim()}
          onClick={() => runAction('cancel')}
          type="button"
        >
          Cancel job
        </button>
      </div>

      {error || result ? (
        <pre className={`mt-5 max-h-96 overflow-auto rounded-2xl border p-4 text-xs leading-6 ${error ? 'border-red-400/20 bg-red-500/10 text-red-100' : 'border-emerald-400/20 bg-emerald-500/10 text-emerald-50'}`}>
          {error ?? JSON.stringify(result, null, 2)}
        </pre>
      ) : null}
    </section>
  );
}
