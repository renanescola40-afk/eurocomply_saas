'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, ExternalLink, Loader2, ShieldCheck, TriangleAlert } from 'lucide-react';

import { getBillingStepUpToken } from '@/app/[locale]/dashboard/organizations/billing/billing-action-button';
import { Button } from '@/components/ui/button';

const STEP_UP_TOKEN_HEADER = 'x-eurocomply-step-up-token';
const BILLING_IDEMPOTENCY_HEADER = 'Idempotency-Key';

type PurchaseResponse = {
  outcome?: string;
  paymentState?: 'payment_required' | 'processing';
  hostedInvoiceUrl?: string | null;
  invoiceId?: string | null;
  error?: string;
};

type StatusResponse = {
  status?: string;
  active?: boolean;
  quantity?: number;
  providerPaymentState?: 'paid' | 'processing' | 'payment_required' | 'failed' | null;
  hostedInvoiceUrl?: string | null;
  error?: string;
};

type Props = {
  locale: string;
  addOnSlug: string;
  addOnName: string;
  quantity: number;
};

function copy(_locale: string) {
  return {
    before: 'Confirm to create the add-on charge on your existing subscription. No access is activated before payment.',
    confirm: 'Confirm and continue to payment',
    opening: 'Preparing secure payment…',
    payStripe: 'Pay with Stripe',
    waiting: 'Payment is processing. Access activates only after Stripe confirms payment.',
    confirmed: 'Payment confirmed. Add-on active.',
    back: 'Back to Integrations',
    retry: 'Try again',
    failed: 'Payment was not completed. No access has been activated.',
    stripeWindow: 'Complete payment on Stripe’s secure page. This page will automatically track activation.',
  };
}

async function readJson<T>(response: Response): Promise<T> {
  return response.json().catch(() => ({} as T));
}

export function AddOnPurchaseClient({ locale, addOnSlug, addOnName, quantity }: Props) {
  const text = copy(locale);
  const [starting, setStarting] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [active, setActive] = useState(false);
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [hostedInvoiceUrl, setHostedInvoiceUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const idempotencyKey = useRef<string | null>(null);

  const pollStatus = useCallback(async (invoiceOverride?: string | null) => {
    const providerInvoiceId = invoiceOverride ?? invoiceId;
    const query = new URLSearchParams({ addon: addOnSlug });
    if (providerInvoiceId) query.set('invoice', providerInvoiceId);

    const response = await fetch(`/api/billing/add-ons/status?${query.toString()}`, {
      method: 'GET',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return;
    const json = await readJson<StatusResponse>(response);
    if (json.active === true) {
      setActive(true);
      setProcessing(false);
      setHostedInvoiceUrl(null);
      setError(null);
      return;
    }

    if (typeof json.hostedInvoiceUrl === 'string') setHostedInvoiceUrl(json.hostedInvoiceUrl);

    if (json.providerPaymentState === 'failed' || json.status === 'failed' || json.status === 'cancelled') {
      setProcessing(false);
      setError(text.failed);
      idempotencyKey.current = null;
      return;
    }

    if (json.providerPaymentState === 'payment_required') {
      setProcessing(true);
      setError(null);
    }
  }, [addOnSlug, invoiceId, text.failed]);

  useEffect(() => {
    if (!processing || active) return;
    void pollStatus();
    const timer = window.setInterval(() => void pollStatus(), 2500);
    return () => window.clearInterval(timer);
  }, [active, pollStatus, processing]);

  async function startPurchase() {
    if (starting || active) return;
    setStarting(true);
    setError(null);
    if (!idempotencyKey.current) idempotencyKey.current = crypto.randomUUID();

    const request = async (stepUpToken?: string) => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        [BILLING_IDEMPOTENCY_HEADER]: idempotencyKey.current!,
      };
      if (stepUpToken) headers[STEP_UP_TOKEN_HEADER] = stepUpToken;
      const response = await fetch('/api/billing/add-ons/purchase', {
        method: 'POST',
        headers,
        body: JSON.stringify({ addOnSlug, quantity }),
      });
      return { response, json: await readJson<PurchaseResponse>(response) };
    };

    try {
      let result = await request();
      if (result.response.status === 403 && result.json.error === 'step_up_required') {
        const stepUpToken = await getBillingStepUpToken(locale);
        result = await request(stepUpToken);
      }

      if (!result.response.ok) {
        setError(result.json.error ? `${text.failed} (${result.json.error})` : text.failed);
        idempotencyKey.current = null;
        return;
      }

      const nextInvoiceId = typeof result.json.invoiceId === 'string' ? result.json.invoiceId : null;
      setInvoiceId(nextInvoiceId);
      setHostedInvoiceUrl(typeof result.json.hostedInvoiceUrl === 'string' ? result.json.hostedInvoiceUrl : null);
      setProcessing(true);
      await pollStatus(nextInvoiceId);
    } catch {
      setError(text.failed);
      idempotencyKey.current = null;
    } finally {
      setStarting(false);
    }
  }

  if (active) {
    return (
      <section className="rounded-xl border border-emerald-300/20 bg-emerald-300/[0.06] p-5" role="status" aria-live="polite">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-300" aria-hidden="true" />
          <div>
            <p className="font-semibold text-emerald-100">{text.confirmed}</p>
            <p className="mt-1 text-sm text-white/48">{addOnName}</p>
          </div>
        </div>
        <Link href={`/${locale}/dashboard/organizations/add-ons#addon-${addOnSlug}`} className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl bg-emerald-300 px-4 text-sm font-semibold text-[#07110e]">
          {text.back}
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-xl border border-white/[0.08] bg-[#101715] p-5">
      <div className="flex items-start gap-3 text-sm text-white/55">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" />
        <p>{processing ? (hostedInvoiceUrl ? text.stripeWindow : text.waiting) : text.before}</p>
      </div>

      {error ? (
        <div className="flex items-start gap-2 rounded-xl border border-rose-300/20 bg-rose-300/[0.06] p-3 text-sm text-rose-100" role="alert">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      ) : null}

      {!processing ? (
        <Button type="button" onClick={() => void startPurchase()} disabled={starting} className="min-h-11 w-full rounded-xl sm:w-auto">
          {starting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          {starting ? text.opening : error ? text.retry : text.confirm}
        </Button>
      ) : null}

      {processing && hostedInvoiceUrl ? (
        <a href={hostedInvoiceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-300 px-5 text-sm font-semibold text-[#07110e]">
          {text.payStripe}<ExternalLink className="h-4 w-4" aria-hidden="true" />
        </a>
      ) : null}

      {processing ? (
        <div className="flex items-center gap-2 text-xs text-white/38" role="status" aria-live="polite">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          {text.waiting}
        </div>
      ) : null}
    </section>
  );
}
