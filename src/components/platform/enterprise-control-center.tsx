'use client';

import { FormEvent, useState } from 'react';

const CONTRACT_STATUSES = [
  'draft',
  'pending_activation',
  'active',
  'past_due',
  'grace_period',
  'read_only',
  'suspended',
  'expired',
  'terminated',
] as const;

type JsonResult = Record<string, unknown>;

type Props = {
  platformRole: string;
};

function toIsoOrNull(value: string) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

async function readJson(response: Response): Promise<JsonResult> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const code = typeof body.error === 'string' ? body.error : `http_${response.status}`;
    throw new Error(code);
  }
  return body as JsonResult;
}

function ResultPanel({ result, error }: { result: JsonResult | null; error: string | null }) {
  if (!result && !error) return null;

  return (
    <pre
      aria-live="polite"
      className={`mt-5 max-h-80 overflow-auto rounded-2xl border p-4 text-xs leading-6 ${
        error
          ? 'border-red-400/20 bg-red-500/10 text-red-100'
          : 'border-emerald-400/20 bg-emerald-500/10 text-emerald-50'
      }`}
    >
      {error ?? JSON.stringify(result, null, 2)}
    </pre>
  );
}

const inputClass = 'h-11 w-full rounded-2xl border border-white/10 bg-black/35 px-4 text-sm text-white outline-none placeholder:text-white/25 focus:border-blue-200/45';
const labelClass = 'space-y-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/50';
const buttonClass = 'inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50';

export function EnterpriseControlCenter({ platformRole }: Props) {
  const [organizationId, setOrganizationId] = useState('');
  const [usageResult, setUsageResult] = useState<JsonResult | null>(null);
  const [usageError, setUsageError] = useState<string | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);

  const [contractResult, setContractResult] = useState<JsonResult | null>(null);
  const [contractError, setContractError] = useState<string | null>(null);
  const [contractLoading, setContractLoading] = useState(false);

  const [transitionResult, setTransitionResult] = useState<JsonResult | null>(null);
  const [transitionError, setTransitionError] = useState<string | null>(null);
  const [transitionLoading, setTransitionLoading] = useState(false);

  async function loadUsage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUsageLoading(true);
    setUsageError(null);
    setUsageResult(null);

    try {
      const response = await fetch(`/api/platform/organizations/${encodeURIComponent(organizationId.trim())}/usage`, {
        cache: 'no-store',
        credentials: 'same-origin',
      });
      setUsageResult(await readJson(response));
    } catch (error) {
      setUsageError(error instanceof Error ? error.message : 'usage_lookup_failed');
    } finally {
      setUsageLoading(false);
    }
  }

  async function createContract(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setContractLoading(true);
    setContractError(null);
    setContractResult(null);

    const form = new FormData(event.currentTarget);
    const number = (name: string) => Number(form.get(name));
    const enabled = (name: string) => form.get(name) === 'on';

    const payload = {
      organizationId: String(form.get('organizationId') ?? '').trim(),
      contractCode: String(form.get('contractCode') ?? '').trim(),
      currency: String(form.get('currency') ?? 'EUR').trim(),
      annualValueMinor: number('annualValueMinor'),
      startsAt: toIsoOrNull(String(form.get('startsAt') ?? '')),
      endsAt: toIsoOrNull(String(form.get('endsAt') ?? '')),
      renewsAt: toIsoOrNull(String(form.get('renewsAt') ?? '')),
      paymentTermsDays: number('paymentTermsDays'),
      gracePeriodDays: number('gracePeriodDays'),
      memberLimit: number('memberLimit'),
      fullUserLimit: number('fullUserLimit'),
      participantLimit: number('participantLimit'),
      viewerLimit: number('viewerLimit'),
      adminLimit: number('adminLimit'),
      legalEntityLimit: number('legalEntityLimit'),
      aiSystemLimit: number('aiSystemLimit'),
      storageLimitBytes: number('storageLimitBytes'),
      auditRetentionDays: number('auditRetentionDays'),
      ssoEnabled: enabled('ssoEnabled'),
      scimEnabled: enabled('scimEnabled'),
      apiEnabled: enabled('apiEnabled'),
      webhooksEnabled: enabled('webhooksEnabled'),
      customRolesEnabled: enabled('customRolesEnabled'),
      advancedReportsEnabled: enabled('advancedReportsEnabled'),
      prioritySupportEnabled: enabled('prioritySupportEnabled'),
    };

    try {
      const response = await fetch('/api/platform/contracts', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await readJson(response);
      setContractResult(result);
      if (typeof result.organizationId === 'string') setOrganizationId(result.organizationId);
    } catch (error) {
      setContractError(error instanceof Error ? error.message : 'contract_creation_failed');
    } finally {
      setContractLoading(false);
    }
  }

  async function transitionContract(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTransitionLoading(true);
    setTransitionError(null);
    setTransitionResult(null);

    const form = new FormData(event.currentTarget);
    const payload = {
      contractId: String(form.get('contractId') ?? '').trim(),
      expectedStatus: String(form.get('expectedStatus') ?? ''),
      nextStatus: String(form.get('nextStatus') ?? ''),
      reason: String(form.get('reason') ?? '').trim(),
    };

    try {
      const response = await fetch('/api/platform/contracts/status', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setTransitionResult(await readJson(response));
    } catch (error) {
      setTransitionError(error instanceof Error ? error.message : 'contract_transition_failed');
    } finally {
      setTransitionLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-200/70">Authenticated operator</p>
          <p className="mt-2 text-lg font-semibold text-white">{platformRole}</p>
        </div>
        <p className="max-w-2xl text-sm leading-6 text-white/55">
          Every mutation is re-authorized with MFA, rate limiting and database-level role checks. Browser values never grant access by themselves.
        </p>
      </div>

      <section className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 shadow-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-200/70">Organization usage</p>
        <h2 className="mt-3 text-2xl font-semibold text-white">Inspect limits and available seats</h2>
        <form className="mt-6 flex flex-col gap-3 md:flex-row" onSubmit={loadUsage}>
          <input
            aria-label="Organization ID"
            className={inputClass}
            onChange={(event) => setOrganizationId(event.target.value)}
            placeholder="Organization UUID"
            required
            type="text"
            value={organizationId}
          />
          <button className={buttonClass} disabled={usageLoading} type="submit">
            {usageLoading ? 'Loading…' : 'Load usage'}
          </button>
        </form>
        <ResultPanel error={usageError} result={usageResult} />
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 shadow-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-200/70">Negotiated contract</p>
        <h2 className="mt-3 text-2xl font-semibold text-white">Provision Enterprise licensing</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-white/55">
          Contracts start in draft. Activation is a separate audited transition, so creating a record never silently enables customer access.
        </p>
        <form className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4" onSubmit={createContract}>
          <label className={`${labelClass} md:col-span-2`}>
            Organization ID
            <input className={inputClass} defaultValue={organizationId} name="organizationId" required />
          </label>
          <label className={labelClass}>
            Contract code
            <input className={inputClass} name="contractCode" placeholder="EU-2026-0001" required />
          </label>
          <label className={labelClass}>
            Currency
            <input className={inputClass} defaultValue="EUR" maxLength={3} name="currency" required />
          </label>
          <label className={labelClass}>
            Annual value (minor units)
            <input className={inputClass} defaultValue="3000000" min="0" name="annualValueMinor" required type="number" />
          </label>
          <label className={labelClass}>
            Starts at
            <input className={inputClass} name="startsAt" required type="datetime-local" />
          </label>
          <label className={labelClass}>
            Ends at
            <input className={inputClass} name="endsAt" type="datetime-local" />
          </label>
          <label className={labelClass}>
            Renews at
            <input className={inputClass} name="renewsAt" type="datetime-local" />
          </label>
          <label className={labelClass}>
            Payment terms (days)
            <input className={inputClass} defaultValue="30" min="0" name="paymentTermsDays" required type="number" />
          </label>
          <label className={labelClass}>
            Grace period (days)
            <input className={inputClass} defaultValue="14" min="0" name="gracePeriodDays" required type="number" />
          </label>
          <label className={labelClass}>
            Total members
            <input className={inputClass} defaultValue="3000" min="1" name="memberLimit" required type="number" />
          </label>
          <label className={labelClass}>
            Full users
            <input className={inputClass} defaultValue="500" min="0" name="fullUserLimit" required type="number" />
          </label>
          <label className={labelClass}>
            Participants
            <input className={inputClass} defaultValue="2400" min="0" name="participantLimit" required type="number" />
          </label>
          <label className={labelClass}>
            Viewers
            <input className={inputClass} defaultValue="100" min="0" name="viewerLimit" required type="number" />
          </label>
          <label className={labelClass}>
            Administrators
            <input className={inputClass} defaultValue="25" min="1" name="adminLimit" required type="number" />
          </label>
          <label className={labelClass}>
            Legal entities
            <input className={inputClass} defaultValue="5" min="0" name="legalEntityLimit" required type="number" />
          </label>
          <label className={labelClass}>
            AI systems
            <input className={inputClass} defaultValue="1000" min="0" name="aiSystemLimit" required type="number" />
          </label>
          <label className={labelClass}>
            Storage bytes
            <input className={inputClass} defaultValue="1099511627776" min="0" name="storageLimitBytes" required type="number" />
          </label>
          <label className={labelClass}>
            Audit retention days
            <input className={inputClass} defaultValue="2555" min="0" name="auditRetentionDays" required type="number" />
          </label>
          <fieldset className="grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 md:col-span-2 xl:col-span-4 md:grid-cols-3 xl:grid-cols-4">
            <legend className="px-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/50">Entitlements</legend>
            {[
              ['ssoEnabled', 'SSO'],
              ['scimEnabled', 'SCIM'],
              ['apiEnabled', 'API'],
              ['webhooksEnabled', 'Webhooks'],
              ['customRolesEnabled', 'Custom roles'],
              ['advancedReportsEnabled', 'Advanced reports'],
              ['prioritySupportEnabled', 'Priority support'],
            ].map(([name, label]) => (
              <label className="flex items-center gap-3 text-sm text-white/70" key={name}>
                <input className="size-4 rounded border-white/20 bg-black" name={name} type="checkbox" />
                {label}
              </label>
            ))}
          </fieldset>
          <div className="md:col-span-2 xl:col-span-4">
            <button className={buttonClass} disabled={contractLoading} type="submit">
              {contractLoading ? 'Provisioning…' : 'Create draft contract'}
            </button>
          </div>
        </form>
        <ResultPanel error={contractError} result={contractResult} />
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 shadow-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-200/70">Contract state machine</p>
        <h2 className="mt-3 text-2xl font-semibold text-white">Activate, restrict, suspend or renew</h2>
        <form className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4" onSubmit={transitionContract}>
          <label className={`${labelClass} md:col-span-2`}>
            Contract ID
            <input className={inputClass} name="contractId" placeholder="Contract UUID" required />
          </label>
          <label className={labelClass}>
            Expected status
            <select className={inputClass} defaultValue="draft" name="expectedStatus">
              {CONTRACT_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
          <label className={labelClass}>
            Next status
            <select className={inputClass} defaultValue="pending_activation" name="nextStatus">
              {CONTRACT_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
          <label className={`${labelClass} md:col-span-2 xl:col-span-4`}>
            Reason
            <textarea className="min-h-28 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-blue-200/45" maxLength={1000} minLength={5} name="reason" placeholder="Required audit reason" required />
          </label>
          <div className="md:col-span-2 xl:col-span-4">
            <button className={buttonClass} disabled={transitionLoading} type="submit">
              {transitionLoading ? 'Applying…' : 'Apply transition'}
            </button>
          </div>
        </form>
        <ResultPanel error={transitionError} result={transitionResult} />
      </section>
    </div>
  );
}
