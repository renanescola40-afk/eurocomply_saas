'use client';

import { FormEvent, useState } from 'react';

const inputClass = 'h-11 w-full rounded-2xl border border-white/10 bg-black/35 px-4 text-sm text-white outline-none placeholder:text-white/25 focus:border-blue-200/45';
const labelClass = 'space-y-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/50';
const buttonClass = 'inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50';

function toIsoOrNull(value: string) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export function EnterpriseContractBilling() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function configure(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setResult(null);
    setError(null);

    const form = new FormData(event.currentTarget);
    const nullable = (name: string) => String(form.get(name) ?? '').trim() || null;

    try {
      const response = await fetch('/api/platform/contracts/billing', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          contractId: String(form.get('contractId') ?? '').trim(),
          paymentMethod: String(form.get('paymentMethod') ?? 'manual_invoice'),
          billingStatus: String(form.get('billingStatus') ?? 'manual_invoice'),
          stripeCustomerId: nullable('stripeCustomerId'),
          stripeSubscriptionId: nullable('stripeSubscriptionId'),
          stripePriceId: nullable('stripePriceId'),
          externalReference: nullable('externalReference'),
          paymentDueAt: toIsoOrNull(String(form.get('paymentDueAt') ?? '')),
          reason: String(form.get('reason') ?? '').trim(),
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof body.error === 'string' ? body.error : `http_${response.status}`);
      }
      setResult(body);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'enterprise_billing_configuration_failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 shadow-2xl">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-200/70">Negotiated billing</p>
      <h2 className="mt-3 text-2xl font-semibold text-white">Link Stripe or manage invoice and bank-transfer contracts</h2>
      <p className="mt-2 max-w-4xl text-sm leading-6 text-white/55">
        Stripe events update the contract idempotently. Manual billing can record references, due dates and payment status; the protected lifecycle job advances past-due contracts through grace period and read-only states.
      </p>

      <form className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4" onSubmit={configure}>
        <label className={`${labelClass} md:col-span-2`}>
          Contract ID
          <input className={inputClass} name="contractId" placeholder="Enterprise contract UUID" required />
        </label>
        <label className={labelClass}>
          Payment method
          <select className={inputClass} defaultValue="manual_invoice" name="paymentMethod">
            <option value="stripe_subscription">stripe_subscription</option>
            <option value="stripe_invoice">stripe_invoice</option>
            <option value="bank_transfer">bank_transfer</option>
            <option value="manual_invoice">manual_invoice</option>
          </select>
        </label>
        <label className={labelClass}>
          Billing status
          <select className={inputClass} defaultValue="manual_invoice" name="billingStatus">
            <option value="unlinked">unlinked</option>
            <option value="pending">pending</option>
            <option value="active">active</option>
            <option value="paid">paid</option>
            <option value="past_due">past_due</option>
            <option value="manual_invoice">manual_invoice</option>
            <option value="canceled">canceled</option>
            <option value="failed">failed</option>
          </select>
        </label>
        <label className={labelClass}>
          Stripe customer ID
          <input className={inputClass} name="stripeCustomerId" placeholder="cus_..." />
        </label>
        <label className={labelClass}>
          Stripe subscription ID
          <input className={inputClass} name="stripeSubscriptionId" placeholder="sub_..." />
        </label>
        <label className={labelClass}>
          Stripe price ID
          <input className={inputClass} name="stripePriceId" placeholder="price_..." />
        </label>
        <label className={labelClass}>
          Invoice / transfer reference
          <input className={inputClass} name="externalReference" placeholder="INV-2026-001 or transfer reference" />
        </label>
        <label className={`${labelClass} md:col-span-2`}>
          Payment due at
          <input className={inputClass} name="paymentDueAt" type="datetime-local" />
        </label>
        <label className={`${labelClass} md:col-span-2`}>
          Audit reason
          <input className={inputClass} minLength={5} name="reason" placeholder="Annual invoice issued / payment confirmed" required />
        </label>
        <div className="md:col-span-2 xl:col-span-4">
          <button className={buttonClass} disabled={loading} type="submit">
            {loading ? 'Saving…' : 'Save billing configuration'}
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
