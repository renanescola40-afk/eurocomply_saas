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
  error?: string;
};

type Props = {
  locale: string;
  addOnSlug: string;
  addOnName: string;
  quantity: number;
};

function copy(locale: string) {
  switch (locale) {
    case 'pt':
      return {
        confirm: 'Confirmar e continuar para pagamento',
        opening: 'A preparar pagamento seguro…',
        payStripe: 'Pagar com Stripe',
        waiting: 'Pagamento em processamento. O acesso só será ativado após confirmação do Stripe.',
        confirmed: 'Pagamento confirmado. Add-on ativo.',
        back: 'Voltar para Integrações',
        retry: 'Tentar novamente',
        failed: 'O pagamento ainda não foi confirmado. Nenhum acesso foi ativado.',
        stripeWindow: 'O pagamento abre numa página segura do Stripe. Esta página acompanhará a ativação automaticamente.',
      };
    case 'es':
      return {
        confirm: 'Confirmar y continuar al pago', opening: 'Preparando pago seguro…', payStripe: 'Pagar con Stripe',
        waiting: 'Pago en proceso. El acceso solo se activará tras la confirmación de Stripe.',
        confirmed: 'Pago confirmado. Add-on activo.', back: 'Volver a Integraciones', retry: 'Reintentar',
        failed: 'El pago aún no se ha confirmado. No se ha activado ningún acceso.',
        stripeWindow: 'El pago se abre en una página segura de Stripe. Esta página seguirá la activación automáticamente.',
      };
    case 'fr':
      return {
        confirm: 'Confirmer et continuer vers le paiement', opening: 'Préparation du paiement sécurisé…', payStripe: 'Payer avec Stripe',
        waiting: 'Paiement en cours. L’accès ne sera activé qu’après confirmation par Stripe.',
        confirmed: 'Paiement confirmé. Add-on actif.', back: 'Retour aux Intégrations', retry: 'Réessayer',
        failed: 'Le paiement n’est pas encore confirmé. Aucun accès n’a été activé.',
        stripeWindow: 'Le paiement s’ouvre sur une page Stripe sécurisée. Cette page suivra automatiquement l’activation.',
      };
    case 'it':
      return {
        confirm: 'Conferma e continua al pagamento', opening: 'Preparazione del pagamento sicuro…', payStripe: 'Paga con Stripe',
        waiting: 'Pagamento in elaborazione. L’accesso sarà attivato solo dopo la conferma di Stripe.',
        confirmed: 'Pagamento confermato. Add-on attivo.', back: 'Torna a Integrazioni', retry: 'Riprova',
        failed: 'Il pagamento non è ancora confermato. Nessun accesso è stato attivato.',
        stripeWindow: 'Il pagamento si apre su una pagina Stripe sicura. Questa pagina monitorerà automaticamente l’attivazione.',
      };
    case 'de':
      return {
        confirm: 'Bestätigen und zur Zahlung fortfahren', opening: 'Sichere Zahlung wird vorbereitet…', payStripe: 'Mit Stripe bezahlen',
        waiting: 'Zahlung wird verarbeitet. Zugriff wird erst nach Stripe-Bestätigung aktiviert.',
        confirmed: 'Zahlung bestätigt. Add-on aktiv.', back: 'Zurück zu Integrationen', retry: 'Erneut versuchen',
        failed: 'Die Zahlung ist noch nicht bestätigt. Es wurde kein Zugriff aktiviert.',
        stripeWindow: 'Die Zahlung öffnet sich auf einer sicheren Stripe-Seite. Diese Seite verfolgt die Aktivierung automatisch.',
      };
    default:
      return {
        confirm: 'Confirm and continue to payment', opening: 'Preparing secure payment…', payStripe: 'Pay with Stripe',
        waiting: 'Payment is processing. Access activates only after Stripe confirms payment.',
        confirmed: 'Payment confirmed. Add-on active.', back: 'Back to Integrations', retry: 'Try again',
        failed: 'Payment has not been confirmed. No access has been activated.',
        stripeWindow: 'Payment opens on a secure Stripe page. This page will automatically track activation.',
      };
  }
}

async function readJson<T>(response: Response): Promise<T> {
  return response.json().catch(() => ({} as T));
}

export function AddOnPurchaseClient({ locale, addOnSlug, addOnName, quantity }: Props) {
  const text = copy(locale);
  const [starting, setStarting] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [active, setActive] = useState(false);
  const [hostedInvoiceUrl, setHostedInvoiceUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const idempotencyKey = useRef<string | null>(null);

  const pollStatus = useCallback(async () => {
    const response = await fetch(`/api/billing/add-ons/status?addon=${encodeURIComponent(addOnSlug)}`, {
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
    if (json.status === 'past_due' || json.status === 'cancelled' || json.status === 'failed') {
      setProcessing(false);
      setError(text.failed);
    }
  }, [addOnSlug, text.failed]);

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

      setHostedInvoiceUrl(typeof result.json.hostedInvoiceUrl === 'string' ? result.json.hostedInvoiceUrl : null);
      setProcessing(true);
      await pollStatus();
    } catch {
      setError(text.failed);
      idempotencyKey.current = null;
    } finally {
      setStarting(false);
    }
  }

  if (active) {
    return (
      <section className="rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.06] p-5" role="status" aria-live="polite">
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
    <section className="space-y-4 rounded-2xl border border-white/[0.08] bg-[#101715] p-5">
      <div className="flex items-start gap-3 text-sm text-white/55">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" />
        <p>{hostedInvoiceUrl ? text.stripeWindow : text.waiting}</p>
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
