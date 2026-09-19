'use client';

import { useState, type ReactNode, type FormEvent } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  PUBLIC_CONTRACT_ACCEPTANCE_METHOD,
  PUBLIC_PRIVACY_VERSION,
  PUBLIC_TERMS_VERSION,
} from '@/lib/legal/public-contract';

const STEP_UP_TOKEN_HEADER = 'x-eurocomply-step-up-token';
const BILLING_IDEMPOTENCY_HEADER = 'Idempotency-Key';
const DASHBOARD_BILLING_RETURN_PATH = '/dashboard/organizations/billing';
const PUBLIC_BILLING_ERROR_CODE = 'action_failed';
const PUBLIC_PAID_GA_ERROR_CODE = 'public_paid_ga_not_enabled';
const LEGAL_PUBLICATION_NOT_EFFECTIVE_ERROR_CODE = 'legal_publication_not_effective';

type AddOnSelection = { slug: string; quantity: number };

type BillingActionButtonProps = {
  action: 'checkout' | 'portal' | 'replace_add_ons';
  locale: string;
  planId?: string;
  addOns?: AddOnSelection[];
  preserveExistingAddOns?: boolean;
  disabled?: boolean;
  children: ReactNode;
  variant?: 'default' | 'outline';
  className?: string;
  errorReturnHref?: string;
};

type ApiJson = Record<string, unknown>;

type StepUpChallenge = {
  challengeNonce?: string;
  challengeId?: string;
  factorId?: string;
  factors?: Array<{ id: string; name: string | null; type: string }>;
  requiresCode?: boolean;
  provider?: string;
  message?: string;
};

type StepUpCopy = {
  chooseFactor: string;
  enterCode: string;
};

function getStepUpCopy(locale: string): StepUpCopy {
  switch (locale) {
    case 'pt':
      return {
        chooseFactor: 'Escolha um método de autenticação multifator para continuar a faturação:',
        enterCode: 'Introduza o código de autenticação multifator para continuar a faturação.',
      };
    case 'es':
      return {
        chooseFactor: 'Elige un método de autenticación multifactor para continuar con la facturación:',
        enterCode: 'Introduce el código de autenticación multifactor para continuar con la facturación.',
      };
    case 'fr':
      return {
        chooseFactor: 'Choisissez une méthode d’authentification multifactorielle pour continuer la facturation :',
        enterCode: 'Saisissez le code d’authentification multifactorielle pour continuer la facturation.',
      };
    case 'it':
      return {
        chooseFactor: 'Scegli un metodo di autenticazione a più fattori per continuare con la fatturazione:',
        enterCode: 'Inserisci il codice di autenticazione a più fattori per continuare la fatturazione.',
      };
    case 'de':
      return {
        chooseFactor: 'Wählen Sie eine Methode für die Mehrfaktor-Authentifizierung, um mit der Abrechnung fortzufahren:',
        enterCode: 'Geben Sie den Code für die Mehrfaktor-Authentifizierung ein, um mit der Abrechnung fortzufahren.',
      };
    default:
      return {
        chooseFactor: 'Choose an MFA method to continue billing:',
        enterCode: 'Enter your MFA code to continue billing.',
      };
  }
}

function getPublicPaidGaUnavailableCopy(locale: string) {
  switch (locale) {
    case 'pt':
      return 'As novas subscrições self-service ainda não estão disponíveis. Contacte a nossa equipa comercial para avançar.';
    case 'es':
      return 'Las nuevas suscripciones de autoservicio aún no están disponibles. Contacta con nuestro equipo comercial para continuar.';
    case 'fr':
      return 'Les nouveaux abonnements en libre-service ne sont pas encore disponibles. Contactez notre équipe commerciale pour continuer.';
    case 'it':
      return 'I nuovi abbonamenti self-service non sono ancora disponibili. Contatta il nostro team commerciale per continuare.';
    case 'de':
      return 'Neue Self-Service-Abonnements sind noch nicht verfügbar. Wenden Sie sich an unser Vertriebsteam, um fortzufahren.';
    default:
      return 'New self-serve subscriptions are not available yet. Contact our sales team to continue.';
  }
}

function getLegalAcceptanceCopy(locale: string) {
  switch (locale) {
    case 'pt':
      return {
        label: 'Concordo com os Termos de Serviço e reconheço a Política de Privacidade aplicáveis a esta subscrição paga.',
        unavailable: 'O checkout pago permanece indisponível até os Termos e a Política de Privacidade públicos terem uma versão efetiva.',
      };
    case 'es':
      return {
        label: 'Acepto los Términos del Servicio y reconozco la Política de Privacidad aplicables a esta suscripción de pago.',
        unavailable: 'El checkout de pago permanece no disponible hasta que los Términos y la Política de Privacidad públicos tengan una versión efectiva.',
      };
    case 'fr':
      return {
        label: 'J’accepte les Conditions d’utilisation et reconnais la Politique de confidentialité applicables à cet abonnement payant.',
        unavailable: 'Le paiement reste indisponible jusqu’à ce que les Conditions et la Politique de confidentialité publiques aient une version effective.',
      };
    case 'it':
      return {
        label: 'Accetto i Termini di servizio e riconosco l’Informativa sulla privacy applicabili a questo abbonamento a pagamento.',
        unavailable: 'Il checkout a pagamento resta non disponibile finché i Termini e l’Informativa sulla privacy pubblici non hanno una versione effettiva.',
      };
    case 'de':
      return {
        label: 'Ich akzeptiere die Nutzungsbedingungen und bestätige die Datenschutzerklärung für dieses kostenpflichtige Abonnement.',
        unavailable: 'Der kostenpflichtige Checkout bleibt gesperrt, bis Nutzungsbedingungen und Datenschutzerklärung als wirksame Version veröffentlicht sind.',
      };
    default:
      return {
        label: 'I agree to the Terms of Service and acknowledge the Privacy Policy that apply to this paid subscription.',
        unavailable: 'Paid checkout remains unavailable until the public Terms and Privacy Policy have an effective version.',
      };
  }
}

function billingErrorRedirect(locale: string, errorReturnHref?: string): never {
  if (errorReturnHref) {
    window.location.href = errorReturnHref;
    throw new Error('redirecting_to_billing_error');
  }

  if (window.location.pathname === `/${locale}/checkout`) {
    const checkoutUrl = new URL(window.location.href);
    checkoutUrl.searchParams.set('checkout', 'error');
    window.location.href = `${checkoutUrl.pathname}${checkoutUrl.search}`;
    throw new Error('redirecting_to_billing_error');
  }

  window.location.href = `/${locale}/dashboard/organizations/billing?billing_error=${PUBLIC_BILLING_ERROR_CODE}`;
  throw new Error('redirecting_to_billing_error');
}

async function readJson(response: Response): Promise<ApiJson> {
  return response.json().catch(() => ({}));
}

function chooseMfaFactor(challenge: StepUpChallenge, copy: StepUpCopy) {
  const factors = challenge.factors ?? [];
  if (challenge.factorId) return challenge.factorId;
  if (factors.length === 1) return factors[0].id;

  const factorList = factors
    .map((factor, index) => `${index + 1}. ${factor.name ?? factor.type}`)
    .join('\n');
  const selection = window.prompt(`${copy.chooseFactor}\n${factorList}`);
  const selectedIndex = Number(selection) - 1;

  return factors[selectedIndex]?.id ?? null;
}

async function createStepUpChallenge(body: Record<string, unknown>) {
  const response = await fetch('/api/security/step-up/challenge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await readJson(response);

  if (!response.ok) {
    throw new Error(String(json.message ?? json.error ?? 'Step-up challenge could not be created.'));
  }

  return json as StepUpChallenge;
}

async function verifyStepUpChallenge(body: Record<string, unknown>) {
  const response = await fetch('/api/security/step-up/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await readJson(response);

  if (!response.ok || typeof json.token !== 'string') {
    throw new Error(String(json.message ?? json.error ?? 'Step-up verification failed.'));
  }

  return json.token;
}

export async function getBillingStepUpToken(locale: string) {
  const copy = getStepUpCopy(locale);
  const initialChallenge = await createStepUpChallenge({ action: 'manage_billing' });

  if (initialChallenge.provider === 'enterprise_idp' || initialChallenge.requiresCode === false) {
    return verifyStepUpChallenge({
      action: 'manage_billing',
      challengeNonce: initialChallenge.challengeNonce,
    });
  }

  const factorId = chooseMfaFactor(initialChallenge, copy);
  if (!factorId) throw new Error('MFA factor selection is required for billing step-up.');

  const providerChallenge = await createStepUpChallenge({ action: 'manage_billing', factorId });
  const code = window.prompt(copy.enterCode);
  if (!code) throw new Error('MFA code is required for billing step-up.');

  return verifyStepUpChallenge({
    action: 'manage_billing',
    challengeNonce: providerChallenge.challengeNonce,
    challengeId: providerChallenge.challengeId,
    factorId: providerChallenge.factorId ?? factorId,
    code,
  });
}

async function requestBillingAction({
  action,
  locale,
  planId,
  addOns,
  preserveExistingAddOns,
  idempotencyKey,
  stepUpToken,
  legalAccepted,
}: {
  action: BillingActionButtonProps['action'];
  locale: string;
  planId?: string;
  addOns?: AddOnSelection[];
  preserveExistingAddOns?: boolean;
  idempotencyKey: string;
  stepUpToken?: string;
  legalAccepted?: boolean;
}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    [BILLING_IDEMPOTENCY_HEADER]: idempotencyKey,
  };
  if (stepUpToken) headers[STEP_UP_TOKEN_HEADER] = stepUpToken;

  if (action === 'replace_add_ons') {
    const response = await fetch('/api/billing/subscription', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'replace_add_ons',
        addOns: addOns ?? [],
        preserveExistingAddOns: preserveExistingAddOns ?? true,
      }),
    });
    return { response, json: await readJson(response) };
  }

  const portalUrl = `/api/billing/portal?locale=${encodeURIComponent(locale)}&returnPath=${encodeURIComponent(DASHBOARD_BILLING_RETURN_PATH)}`;
  const response = await fetch(action === 'checkout' ? '/api/billing/checkout' : portalUrl, {
    method: 'POST',
    headers,
    body: action === 'checkout'
      ? JSON.stringify({
          plan: planId,
          locale,
          legalAcceptance: legalAccepted
            ? {
                accepted: true,
                termsVersion: PUBLIC_TERMS_VERSION,
                privacyVersion: PUBLIC_PRIVACY_VERSION,
                method: PUBLIC_CONTRACT_ACCEPTANCE_METHOD,
              }
            : undefined,
        })
      : undefined,
  });
  const json = await readJson(response);

  return { response, json };
}

export function BillingActionButton({ action, locale, planId, addOns, preserveExistingAddOns, disabled, children, variant = 'default', className, errorReturnHref }: BillingActionButtonProps) {
  const [loading, setLoading] = useState(false);
  const [paidGaUnavailable, setPaidGaUnavailable] = useState<string | null>(null);
  const [legalAccepted, setLegalAccepted] = useState(false);
  const legalCopy = getLegalAcceptanceCopy(locale);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || loading) return;

    const purchaseSelection = action === 'replace_add_ons'
      && preserveExistingAddOns !== false
      && addOns?.length === 1
      ? addOns[0]
      : null;

    // Adding an add-on is a purchase intent, not a billing mutation. Route the
    // buyer through the provider-priced review/payment flow first. Explicit
    // replacement/removal keeps using the protected lifecycle directly.
    if (purchaseSelection) {
      const checkout = new URL(`/${locale}/dashboard/organizations/add-ons/checkout`, window.location.origin);
      checkout.searchParams.set('addon', purchaseSelection.slug);
      checkout.searchParams.set('quantity', String(purchaseSelection.quantity));
      window.location.assign(`${checkout.pathname}${checkout.search}`);
      return;
    }

    setLoading(true);
    setPaidGaUnavailable(null);
    const idempotencyKey = crypto.randomUUID();

    try {
      let { response, json } = await requestBillingAction({ action, locale, planId, addOns, preserveExistingAddOns, idempotencyKey, legalAccepted });

      if (response.status === 403 && json.error === 'step_up_required') {
        const stepUpToken = await getBillingStepUpToken(locale);
        ({ response, json } = await requestBillingAction({ action, locale, planId, addOns, preserveExistingAddOns, idempotencyKey, stepUpToken, legalAccepted }));
      }

      if (!response.ok && json.error === PUBLIC_PAID_GA_ERROR_CODE) {
        setPaidGaUnavailable(getPublicPaidGaUnavailableCopy(locale));
        return;
      }

      if (!response.ok && json.error === LEGAL_PUBLICATION_NOT_EFFECTIVE_ERROR_CODE) {
        setPaidGaUnavailable(legalCopy.unavailable);
        return;
      }

      if (action === 'replace_add_ons') {
        if (!response.ok) billingErrorRedirect(locale, errorReturnHref);
        window.location.reload();
        return;
      }

      if (!response.ok || typeof json.url !== 'string') {
        billingErrorRedirect(locale, errorReturnHref);
      }

      window.location.assign(json.url);
    } catch {
      billingErrorRedirect(locale, errorReturnHref);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className={action === 'portal' ? 'flex flex-col gap-3 sm:flex-row' : 'mt-auto'}>
      {action === 'checkout' ? (
        <label className="mb-3 flex items-start gap-3 text-xs leading-5 text-slate-400">
          <input
            type="checkbox"
            checked={legalAccepted}
            onChange={(event) => setLegalAccepted(event.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 rounded border-slate-600 bg-slate-950"
          />
          <span>
            {legalCopy.label}{' '}
            <a href={`/${locale}/terms`} target="_blank" rel="noreferrer" className="underline underline-offset-2">Terms</a>
            {' · '}
            <a href={`/${locale}/privacy`} target="_blank" rel="noreferrer" className="underline underline-offset-2">Privacy</a>
            <span className="sr-only">{` ${PUBLIC_TERMS_VERSION} ${PUBLIC_PRIVACY_VERSION}`}</span>
          </span>
        </label>
      ) : null}
      <Button type="submit" className={className} variant={variant} disabled={disabled || loading || (action === 'checkout' && !legalAccepted)}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {children}
        {action === 'portal' && !loading ? <ArrowRight className="h-4 w-4" /> : null}
      </Button>
      {paidGaUnavailable ? (
        <p role="status" aria-live="polite" className="mt-3 text-sm leading-6 text-amber-200">
          {paidGaUnavailable}
        </p>
      ) : null}
    </form>
  );
}
