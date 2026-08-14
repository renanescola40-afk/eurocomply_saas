'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Loader2, TriangleAlert } from 'lucide-react';

const MAX_POLLS = 20;
const DEFAULT_RETRY_MS = 1500;

type ActivationState = 'checking' | 'pending' | 'failed' | 'timeout';

type StatusPayload = {
  state?: 'ready' | 'pending' | 'failed';
  reason?: string;
  retryAfterMs?: number | null;
  error?: string;
};

const copy = {
  en: {
    eyebrow: 'PAYMENT ACTIVATION',
    checking: 'Confirming your subscription',
    pending: 'Payment received. Activating your workspace…',
    failed: 'We could not confirm an active subscription.',
    timeout: 'Activation is taking longer than expected.',
    detail: 'Access is granted only after the signed Stripe event is persisted and matched to your organization.',
    retry: 'Try again',
    checkout: 'Back to checkout',
    support: 'Contact support',
  },
  pt: {
    eyebrow: 'ATIVAÇÃO DO PAGAMENTO',
    checking: 'A confirmar a sua subscrição',
    pending: 'Pagamento recebido. A ativar o seu workspace…',
    failed: 'Não foi possível confirmar uma subscrição ativa.',
    timeout: 'A ativação está a demorar mais do que o esperado.',
    detail: 'O acesso só é concedido depois de o evento Stripe assinado ser persistido e associado à sua organização.',
    retry: 'Tentar novamente',
    checkout: 'Voltar ao checkout',
    support: 'Contactar suporte',
  },
  es: {
    eyebrow: 'ACTIVACIÓN DEL PAGO',
    checking: 'Confirmando tu suscripción',
    pending: 'Pago recibido. Activando tu espacio de trabajo…',
    failed: 'No pudimos confirmar una suscripción activa.',
    timeout: 'La activación está tardando más de lo esperado.',
    detail: 'El acceso solo se concede cuando el evento firmado de Stripe se registra y se vincula a tu organización.',
    retry: 'Intentar de nuevo',
    checkout: 'Volver al checkout',
    support: 'Contactar soporte',
  },
  fr: {
    eyebrow: 'ACTIVATION DU PAIEMENT',
    checking: 'Confirmation de votre abonnement',
    pending: 'Paiement reçu. Activation de votre espace…',
    failed: 'Nous n’avons pas pu confirmer un abonnement actif.',
    timeout: 'L’activation prend plus de temps que prévu.',
    detail: 'L’accès est accordé uniquement après l’enregistrement et le rapprochement de l’événement Stripe signé avec votre organisation.',
    retry: 'Réessayer',
    checkout: 'Retour au paiement',
    support: 'Contacter le support',
  },
  it: {
    eyebrow: 'ATTIVAZIONE PAGAMENTO',
    checking: 'Conferma dell’abbonamento',
    pending: 'Pagamento ricevuto. Attivazione del workspace…',
    failed: 'Non è stato possibile confermare un abbonamento attivo.',
    timeout: 'L’attivazione sta richiedendo più tempo del previsto.',
    detail: 'L’accesso viene concesso solo dopo che l’evento Stripe firmato è registrato e associato alla tua organizzazione.',
    retry: 'Riprova',
    checkout: 'Torna al checkout',
    support: 'Contatta il supporto',
  },
  de: {
    eyebrow: 'ZAHLUNGSAKTIVIERUNG',
    checking: 'Abonnement wird bestätigt',
    pending: 'Zahlung erhalten. Workspace wird aktiviert…',
    failed: 'Ein aktives Abonnement konnte nicht bestätigt werden.',
    timeout: 'Die Aktivierung dauert länger als erwartet.',
    detail: 'Zugriff wird erst gewährt, nachdem das signierte Stripe-Ereignis gespeichert und Ihrer Organisation zugeordnet wurde.',
    retry: 'Erneut versuchen',
    checkout: 'Zurück zum Checkout',
    support: 'Support kontaktieren',
  },
} as const;

type CopyLocale = keyof typeof copy;

function copyFor(locale: string) {
  return copy[(locale in copy ? locale : 'en') as CopyLocale];
}

export default function CheckoutCompletePage() {
  const params = useParams<{ locale?: string }>();
  const searchParams = useSearchParams();
  const locale = typeof params.locale === 'string' ? params.locale : 'en';
  const t = copyFor(locale);
  const sessionId = searchParams.get('session_id')?.trim() ?? '';
  const [state, setState] = useState<ActivationState>('checking');
  const [attempt, setAttempt] = useState(0);
  const generation = useRef(0);

  useEffect(() => {
    generation.current += 1;
    const currentGeneration = generation.current;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    if (!sessionId) {
      setState('failed');
      return () => undefined;
    }

    async function poll(nextAttempt: number) {
      if (cancelled || generation.current !== currentGeneration) return;
      setAttempt(nextAttempt);
      if (nextAttempt > 1) setState('pending');

      try {
        const response = await fetch(`/api/billing/checkout/status?session_id=${encodeURIComponent(sessionId)}`, {
          method: 'GET',
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        });
        const body = await response.json().catch(() => ({})) as StatusPayload;

        if (cancelled || generation.current !== currentGeneration) return;

        if (response.ok && body.state === 'ready') {
          window.location.replace(`/${locale}/dashboard/organizations?checkout=success`);
          return;
        }

        if (body.state === 'failed' || (!response.ok && response.status !== 429 && response.status < 500)) {
          setState('failed');
          return;
        }

        if (nextAttempt >= MAX_POLLS) {
          setState('timeout');
          return;
        }

        const retryMs = typeof body.retryAfterMs === 'number' && body.retryAfterMs >= 500
          ? Math.min(body.retryAfterMs, 5000)
          : DEFAULT_RETRY_MS;
        timer = setTimeout(() => void poll(nextAttempt + 1), retryMs);
      } catch {
        if (nextAttempt >= MAX_POLLS) {
          setState('timeout');
          return;
        }
        timer = setTimeout(() => void poll(nextAttempt + 1), DEFAULT_RETRY_MS);
      }
    }

    void poll(1);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [locale, sessionId]);

  const title = state === 'failed'
    ? t.failed
    : state === 'timeout'
      ? t.timeout
      : state === 'pending'
        ? t.pending
        : t.checking;
  const waiting = state === 'checking' || state === 'pending';

  return (
    <main className="min-h-screen bg-[#05070a] px-6 py-20 text-white">
      <section className="mx-auto flex min-h-[60vh] max-w-xl items-center justify-center" aria-live="polite" aria-busy={waiting}>
        <div className="w-full rounded-3xl border border-white/10 bg-white/[0.04] p-8 shadow-2xl backdrop-blur md:p-10">
          <p className="text-xs font-semibold tracking-[0.24em] text-cyan-300">{t.eyebrow}</p>
          <div className="mt-6 flex items-start gap-4">
            {waiting ? (
              <Loader2 className="mt-1 h-7 w-7 shrink-0 animate-spin text-cyan-300" aria-hidden="true" />
            ) : state === 'failed' ? (
              <TriangleAlert className="mt-1 h-7 w-7 shrink-0 text-amber-300" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="mt-1 h-7 w-7 shrink-0 text-cyan-300" aria-hidden="true" />
            )}
            <div>
              <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
              <p className="mt-3 text-sm leading-6 text-white/65">{t.detail}</p>
              {waiting ? <p className="mt-3 text-xs text-white/40">{attempt}/{MAX_POLLS}</p> : null}
            </div>
          </div>

          {!waiting ? (
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black outline-none transition hover:bg-white/90 focus-visible:ring-2 focus-visible:ring-cyan-300"
              >
                {t.retry}
              </button>
              <Link
                href={`/${locale}/checkout`}
                className="rounded-xl border border-white/15 px-5 py-3 text-center text-sm font-semibold text-white outline-none transition hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-cyan-300"
              >
                {t.checkout}
              </Link>
              <Link
                href={`/${locale}/contact`}
                className="px-5 py-3 text-center text-sm font-semibold text-white/70 outline-none transition hover:text-white focus-visible:ring-2 focus-visible:ring-cyan-300"
              >
                {t.support}
              </Link>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
