'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

const POLL_INTERVAL_MS = 1500;
const MAX_WAIT_MS = 30000;

type ActivationResponse = {
  state?: string;
  subscriptionStatus?: string | null;
  next?: string;
};

type Props = {
  locale: string;
};

const COPY: Record<string, {
  title: string;
  body: string;
  pending: string;
  delayed: string;
  retry: string;
  support: string;
}> = {
  en: {
    title: 'Confirming your subscription',
    body: 'Your payment return was received. We are waiting for the signed Stripe event to finish activating your account.',
    pending: 'Activation is still processing. You do not need to pay again.',
    delayed: 'Activation is taking longer than expected. Your access has not been granted from the browser return alone.',
    retry: 'Check again',
    support: 'Contact support',
  },
  pt: {
    title: 'A confirmar a sua subscrição',
    body: 'O retorno do pagamento foi recebido. Estamos a aguardar o evento assinado da Stripe concluir a ativação da sua conta.',
    pending: 'A ativação ainda está a ser processada. Não precisa pagar novamente.',
    delayed: 'A ativação está a demorar mais do que o esperado. O acesso não foi concedido apenas pelo retorno do navegador.',
    retry: 'Verificar novamente',
    support: 'Contactar suporte',
  },
  es: {
    title: 'Confirmando tu suscripción',
    body: 'Se recibió el retorno del pago. Estamos esperando que el evento firmado de Stripe termine de activar tu cuenta.',
    pending: 'La activación sigue en proceso. No necesitas pagar de nuevo.',
    delayed: 'La activación está tardando más de lo esperado. El acceso no se concedió solo por el retorno del navegador.',
    retry: 'Comprobar de nuevo',
    support: 'Contactar con soporte',
  },
  fr: {
    title: 'Confirmation de votre abonnement',
    body: 'Le retour de paiement a été reçu. Nous attendons que l’événement Stripe signé termine l’activation de votre compte.',
    pending: 'L’activation est toujours en cours. Vous n’avez pas besoin de payer à nouveau.',
    delayed: 'L’activation prend plus de temps que prévu. L’accès n’a pas été accordé sur la seule base du retour navigateur.',
    retry: 'Vérifier à nouveau',
    support: 'Contacter le support',
  },
  it: {
    title: 'Conferma dell’abbonamento',
    body: 'Il ritorno del pagamento è stato ricevuto. Stiamo aspettando che l’evento Stripe firmato completi l’attivazione del tuo account.',
    pending: 'L’attivazione è ancora in corso. Non devi pagare di nuovo.',
    delayed: 'L’attivazione sta richiedendo più tempo del previsto. L’accesso non è stato concesso solo dal ritorno del browser.',
    retry: 'Controlla di nuovo',
    support: 'Contatta il supporto',
  },
  de: {
    title: 'Abonnement wird bestätigt',
    body: 'Die Zahlungsrückkehr wurde empfangen. Wir warten darauf, dass das signierte Stripe-Ereignis die Kontoaktivierung abschließt.',
    pending: 'Die Aktivierung läuft noch. Sie müssen nicht erneut bezahlen.',
    delayed: 'Die Aktivierung dauert länger als erwartet. Der Zugriff wurde nicht allein aufgrund der Browser-Rückkehr gewährt.',
    retry: 'Erneut prüfen',
    support: 'Support kontaktieren',
  },
};

export function CheckoutActivationClient({ locale }: Props) {
  const copy = useMemo(() => COPY[locale] ?? COPY.en, [locale]);
  const [timedOut, setTimedOut] = useState(false);
  const [checking, setChecking] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const startedAt = Date.now();
    let timer: ReturnType<typeof setTimeout> | null = null;

    const check = async () => {
      try {
        const response = await fetch('/api/billing/checkout/activation', {
          method: 'GET',
          cache: 'no-store',
          credentials: 'same-origin',
          headers: { accept: 'application/json' },
        });

        if (cancelled) return;
        if (response.status === 401) {
          window.location.replace(`/${locale}/login?next=${encodeURIComponent(`/${locale}/checkout/complete`)}`);
          return;
        }
        if (!response.ok) throw new Error(`activation_status_${response.status}`);

        const data = await response.json() as ActivationResponse;
        setStatus(data.subscriptionStatus ?? null);

        if (data.state === 'activated') {
          window.location.replace(`/${locale}${data.next ?? '/dashboard/organizations'}`);
          return;
        }
      } catch {
        // Keep the customer on the safe confirmation surface. A transient provider,
        // auth, or database read failure must never be converted into paid access.
      }

      if (cancelled) return;
      if (Date.now() - startedAt >= MAX_WAIT_MS) {
        setChecking(false);
        setTimedOut(true);
        return;
      }

      timer = setTimeout(check, POLL_INTERVAL_MS);
    };

    setTimedOut(false);
    setChecking(true);
    void check();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [locale, retryToken]);

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-2xl items-center px-6 py-16" aria-labelledby="checkout-activation-title">
      <section className="w-full rounded-2xl border border-white/10 bg-black/40 p-8 shadow-2xl backdrop-blur">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-400">RISCK COMPLY</p>
        <h1 id="checkout-activation-title" className="mt-3 text-3xl font-semibold text-white">{copy.title}</h1>
        <p className="mt-4 text-base leading-7 text-zinc-300">{copy.body}</p>

        {!timedOut ? (
          <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-5" role="status" aria-live="polite" aria-busy={checking}>
            <p className="text-zinc-100">{copy.pending}</p>
            {status ? <p className="mt-2 text-sm text-zinc-400">Stripe status: {status}</p> : null}
          </div>
        ) : (
          <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-5" role="alert">
            <p className="text-zinc-100">{copy.delayed}</p>
            {status ? <p className="mt-2 text-sm text-zinc-400">Stripe status: {status}</p> : null}
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setRetryToken((value) => value + 1)}
                className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                {copy.retry}
              </button>
              <Link
                href={`/${locale}/contact?intent=billing-activation`}
                className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                {copy.support}
              </Link>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
