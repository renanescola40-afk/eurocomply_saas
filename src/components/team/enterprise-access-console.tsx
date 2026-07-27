'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { STEP_UP_TOKEN_HEADER, StepUpMfaDialog } from '@/components/security/step-up-mfa-dialog';

type Snapshot = {
  id: string;
  success_rate?: number | null;
  p50_duration_ms?: number | null;
  p95_duration_ms?: number | null;
  oldest_pending_age_seconds?: number | null;
  dead_letter_count?: number | null;
  processed_members?: number | null;
  failed_members?: number | null;
  compensated_members?: number | null;
  window_ended_at?: string | null;
};

type RuntimeAlert = {
  id: string;
  alert_type?: string | null;
  severity?: string | null;
  status?: string | null;
  first_seen_at?: string | null;
  last_seen_at?: string | null;
  details?: Record<string, unknown> | null;
};

type ExportJob = {
  id: string;
  format?: string | null;
  status?: string | null;
  row_count?: number | null;
  byte_size?: number | null;
  sha256?: string | null;
  created_at?: string | null;
  expires_at?: string | null;
};

type RuntimeDashboard = {
  snapshots: Snapshot[];
  alerts: RuntimeAlert[];
  exports: ExportJob[];
  nextCursor?: string | null;
};

type SeatContentionSummary = {
  recent?: Array<Record<string, unknown>>;
  totals?: Record<string, number>;
  [key: string]: unknown;
};

type PendingMutation =
  | { kind: 'acknowledge'; alertId: string }
  | { kind: 'resolve'; alertId: string; reason: string }
  | { kind: 'export'; format: 'csv' | 'jsonl' };

function asNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function formatPercent(value: unknown) {
  const number = asNumber(value);
  return `${number.toFixed(number % 1 === 0 ? 0 : 1)}%`;
}

function formatDuration(value: unknown) {
  const milliseconds = asNumber(value);
  if (milliseconds < 1000) return `${Math.round(milliseconds)} ms`;
  return `${(milliseconds / 1000).toFixed(1)} s`;
}

function formatAge(value: unknown) {
  const seconds = asNumber(value);
  if (seconds < 60) return `${Math.round(seconds)} s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  return `${(seconds / 3600).toFixed(1)} h`;
}

function formatDate(value?: string | null) {
  if (!value) return 'Not available';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not available' : date.toLocaleString();
}

function statusClass(status?: string | null) {
  if (status === 'completed' || status === 'resolved') return 'border-emerald-300/20 bg-emerald-400/10 text-emerald-100';
  if (status === 'dead_letter' || status === 'open') return 'border-red-300/20 bg-red-400/10 text-red-100';
  if (status === 'acknowledged' || status === 'processing') return 'border-amber-300/20 bg-amber-400/10 text-amber-100';
  return 'border-white/10 bg-white/[0.04] text-white/70';
}

async function readJson<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => null) as T | null;
  if (!response.ok || !body) {
    const message = body && typeof body === 'object' && 'error' in body
      ? String((body as Record<string, unknown>).error)
      : 'Access operations request failed.';
    throw new Error(message);
  }
  return body;
}

export function EnterpriseAccessConsole() {
  const [dashboard, setDashboard] = useState<RuntimeDashboard | null>(null);
  const [contention, setContention] = useState<SeatContentionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingMutation, setPendingMutation] = useState<PendingMutation | null>(null);
  const [resolutionReason, setResolutionReason] = useState<Record<string, string>>({});

  const load = useCallback(async (quiet = false) => {
    quiet ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const [runtimeResponse, contentionResponse] = await Promise.all([
        fetch('/api/team/access-runtime?limit=25', { credentials: 'same-origin', cache: 'no-store' }),
        fetch('/api/team/seat-contention', { credentials: 'same-origin', cache: 'no-store' }),
      ]);
      const runtimeBody = await readJson<{ dashboard: RuntimeDashboard }>(runtimeResponse);
      const contentionBody = await readJson<{ summary: SeatContentionSummary }>(contentionResponse);
      setDashboard(runtimeBody.dashboard);
      setContention(contentionBody.summary);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Access operations data is unavailable.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const latestSnapshot = dashboard?.snapshots?.[0] ?? null;
  const openAlerts = dashboard?.alerts ?? [];
  const exportJobs = dashboard?.exports ?? [];
  const contentionTotals = contention?.totals ?? {};

  const healthLabel = useMemo(() => {
    if (!latestSnapshot) return 'Awaiting runtime evidence';
    if (asNumber(latestSnapshot.dead_letter_count) > 0) return 'Action required';
    if (asNumber(latestSnapshot.success_rate) < 95) return 'Degraded';
    return 'Healthy';
  }, [latestSnapshot]);

  async function runMutation(token: string) {
    const mutation = pendingMutation;
    if (!mutation) return;
    const payload = mutation.kind === 'export'
      ? { operation: 'export', format: mutation.format }
      : mutation.kind === 'acknowledge'
        ? { action: 'acknowledge', alertId: mutation.alertId }
        : { action: 'resolve', alertId: mutation.alertId, reason: mutation.reason };

    try {
      const response = await fetch('/api/team/access-runtime', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          [STEP_UP_TOKEN_HEADER]: token,
        },
        body: JSON.stringify(payload),
      });
      await readJson<Record<string, unknown>>(response);
      setPendingMutation(null);
      await load(true);
    } catch (mutationError) {
      setPendingMutation(null);
      setError(mutationError instanceof Error ? mutationError.message : 'Access operation failed.');
    }
  }

  return (
    <section className="space-y-6" aria-labelledby="enterprise-access-console-title">
      <div className="flex flex-col gap-4 rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-6 shadow-2xl shadow-black/20 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-200/70">Enterprise identity operations</p>
          <h2 id="enterprise-access-console-title" className="mt-2 text-2xl font-semibold tracking-tight text-white">Access Operations Center</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">
            Review group reconciliation health, seat contention, dead-letter alerts and signed export evidence from one tenant-scoped console.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${healthLabel === 'Healthy' ? statusClass('completed') : healthLabel === 'Degraded' ? statusClass('acknowledged') : statusClass('open')}`}>
            {healthLabel}
          </span>
          <button type="button" onClick={() => void load(true)} disabled={refreshing} className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/[0.09] disabled:opacity-50">
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {error ? (
        <div role="alert" className="rounded-2xl border border-red-300/20 bg-red-400/10 p-4 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-4" role="status" aria-label="Loading access operations">
          {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-28 animate-pulse rounded-3xl bg-white/[0.05]" />)}
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              ['Success rate', formatPercent(latestSnapshot?.success_rate), 'Target ≥95%'],
              ['p95 duration', formatDuration(latestSnapshot?.p95_duration_ms), 'End-to-end access operation'],
              ['Oldest pending', formatAge(latestSnapshot?.oldest_pending_age_seconds), 'Warning at 15 minutes'],
              ['Dead letters', String(asNumber(latestSnapshot?.dead_letter_count)), 'Zero unreviewed tolerated'],
            ].map(([label, value, hint]) => (
              <article key={label} className="rounded-[1.5rem] border border-white/10 bg-black/20 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">{label}</p>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-white">{value}</p>
                <p className="mt-2 text-xs text-white/45">{hint}</p>
              </article>
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <article className="rounded-[1.75rem] border border-white/10 bg-black/20 p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-white">Operational alerts</h3>
                  <p className="mt-1 text-sm text-white/50">Acknowledge ownership or resolve with durable evidence.</p>
                </div>
                <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/60">{openAlerts.length} active</span>
              </div>
              <div className="mt-5 space-y-3">
                {openAlerts.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-white/45">No active access-runtime alerts.</div>
                ) : openAlerts.map((alert) => (
                  <div key={alert.id} className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">{alert.alert_type ?? 'Access runtime alert'}</p>
                        <p className="mt-1 text-xs text-white/45">Last seen {formatDate(alert.last_seen_at)}</p>
                      </div>
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(alert.status)}`}>{alert.status ?? 'open'}</span>
                    </div>
                    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                      {alert.status === 'open' ? (
                        <button type="button" onClick={() => setPendingMutation({ kind: 'acknowledge', alertId: alert.id })} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/[0.06]">Acknowledge</button>
                      ) : null}
                      <input
                        value={resolutionReason[alert.id] ?? ''}
                        onChange={(event) => setResolutionReason((current) => ({ ...current, [alert.id]: event.target.value }))}
                        placeholder="Resolution reason"
                        aria-label={`Resolution reason for ${alert.alert_type ?? 'alert'}`}
                        className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white placeholder:text-white/30"
                      />
                      <button
                        type="button"
                        disabled={(resolutionReason[alert.id] ?? '').trim().length < 3}
                        onClick={() => setPendingMutation({ kind: 'resolve', alertId: alert.id, reason: (resolutionReason[alert.id] ?? '').trim() })}
                        className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-black disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Resolve
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-[1.75rem] border border-white/10 bg-black/20 p-6">
              <h3 className="text-lg font-semibold text-white">Seat contention</h3>
              <p className="mt-1 text-sm text-white/50">Serialized capacity decisions and stale-version conflicts.</p>
              <dl className="mt-5 grid grid-cols-2 gap-3">
                {Object.entries(contentionTotals).slice(0, 6).map(([key, value]) => (
                  <div key={key} className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
                    <dt className="text-xs capitalize text-white/45">{key.replaceAll('_', ' ')}</dt>
                    <dd className="mt-2 text-2xl font-semibold text-white">{value}</dd>
                  </div>
                ))}
              </dl>
              {Object.keys(contentionTotals).length === 0 ? <p className="mt-5 rounded-2xl border border-dashed border-white/10 p-5 text-sm text-white/45">No seat contention evidence recorded.</p> : null}
              <div className="mt-5 rounded-2xl border border-white/10 bg-blue-400/[0.06] p-4 text-xs leading-5 text-blue-100/70">
                Final-seat reservations are serialized inside PostgreSQL. Capacity exhaustion and contract-version conflicts are recorded without oversubscribing the tenant.
              </div>
            </article>
          </div>

          <article className="rounded-[1.75rem] border border-white/10 bg-black/20 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">Evidence exports</h3>
                <p className="mt-1 text-sm text-white/50">Create asynchronous CSV or JSONL evidence with SHA-256 and 24-hour expiry.</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setPendingMutation({ kind: 'export', format: 'csv' })} className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black">Export CSV</button>
                <button type="button" onClick={() => setPendingMutation({ kind: 'export', format: 'jsonl' })} className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/[0.06]">Export JSONL</button>
              </div>
            </div>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.14em] text-white/35"><tr><th className="pb-3">Created</th><th className="pb-3">Format</th><th className="pb-3">Status</th><th className="pb-3">Rows</th><th className="pb-3">Integrity</th><th className="pb-3">Expires</th></tr></thead>
                <tbody className="divide-y divide-white/5">
                  {exportJobs.map((job) => (
                    <tr key={job.id}>
                      <td className="py-3 text-white/65">{formatDate(job.created_at)}</td>
                      <td className="py-3 font-medium uppercase text-white">{job.format ?? 'csv'}</td>
                      <td className="py-3"><span className={`rounded-full border px-2.5 py-1 text-xs ${statusClass(job.status)}`}>{job.status ?? 'pending'}</span></td>
                      <td className="py-3 text-white/65">{job.row_count ?? '—'}</td>
                      <td className="py-3 font-mono text-xs text-white/45">{job.sha256 ? `${job.sha256.slice(0, 12)}…` : 'Pending'}</td>
                      <td className="py-3 text-white/65">{formatDate(job.expires_at)}</td>
                    </tr>
                  ))}
                  {exportJobs.length === 0 ? <tr><td colSpan={6} className="py-8 text-center text-white/40">No export jobs yet.</td></tr> : null}
                </tbody>
              </table>
            </div>
          </article>
        </>
      )}

      <StepUpMfaDialog
        action="manage_team"
        open={Boolean(pendingMutation)}
        title="Verify Enterprise access operation"
        description="Alert lifecycle changes and evidence exports require MFA or enterprise identity verification."
        onCancel={() => setPendingMutation(null)}
        onToken={runMutation}
      />
    </section>
  );
}
