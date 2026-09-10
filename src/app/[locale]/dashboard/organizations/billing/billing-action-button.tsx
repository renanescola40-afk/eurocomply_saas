'use client';

import { useState, type ReactNode, type FormEvent } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';

const STEP_UP_TOKEN_HEADER = 'x-eurocomply-step-up-token';
const BILLING_IDEMPOTENCY_HEADER = 'Idempotency-Key';
const DASHBOARD_BILLING_RETURN_PATH = '/dashboard/organizations/billing';
const PUBLIC_BILLING_ERROR_CODE = 'action_failed';
const PUBLIC_PAID_GA_ERROR_CODE = 'public_paid_ga_not_enabled';

type AddOnSelection = { slug: string; quantity: number };

type BillingActionButtonProps = {
  action: 'checkout' | 'portal' | 'replace_add_ons';
  locale: string;
  planId?: string;
  addOns?: AddOnSelection[];
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

async function getBillingStepUpToken(locale: string) {
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
  idempotencyKey,
  stepUpToken,
}: {
  action: BillingActionButtonProps['action'];
  locale: string;
  planId?: string;
  addOns?: AddOnSelection[];
  idempotencyKey: string;
  stepUpToken?: string;
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
      body: JSON.stringify({ action: 'replace_add_ons', addOns: addOns ?? [] }),
    });
    return { response, json: await readJson(response) };
  }

  const portalUrl = `/api/billing/portal?locale=${encodeURIComponent(locale)}&returnPath=${encodeURIComponent(DASHBOARD_BILLING_RETURN_PATH)}`;
  const response = await fetch(action === 'checkout' ? '/api/billing/checkout' : portalUrl, {
    method: 'POST',
    headers,
    body: action === 'checkout' ? JSON.stringify({ plan: planId, locale }) : undefined,
  });
  const json = await readJson(response);

  return { response, json };
}

export function BillingActionButton({ action, locale, planId, addOns, disabled, children, variant = 'default', className, errorReturnHref }: BillingActionButtonProps) {
  const [loading, setLoading] = useState(false);
  const [paidGaUnavailable, setPaidGaUnavailable] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || loading) return;

    setLoading(true);
    setPaidGaUnavailable(null);
    const idempotencyKey = crypto.randomUUID();

    try {
      let { response, json } = await requestBillingAction({ action, locale, planId, addOns, idempotencyKey });

      if (response.status === 403 && json.error === 'step_up_required') {
        const stepUpToken = await getBillingStepUpToken(locale);
        ({ response, json } = await requestBillingAction({ action, locale, planId, addOns, idempotencyKey, stepUpToken }));
      }

      if (!response.ok && json.error === PUBLIC_PAID_GA_ERROR_CODE) {
        setPaidGaUnavailable(getPublicPaidGaUnavailableCopy(locale));
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
      <Button type="submit" className={className} variant={variant} disabled={disabled || loading}>
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
