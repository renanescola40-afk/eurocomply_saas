'use client';

import { useState, type ReactNode, type FormEvent } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';

const STEP_UP_TOKEN_HEADER = 'x-eurocomply-step-up-token';

const DASHBOARD_BILLING_RETURN_PATH = '/dashboard/organizations/billing';

type BillingActionButtonProps = {
  action: 'checkout' | 'portal';
  locale: string;
  planId?: string;
  disabled?: boolean;
  children: ReactNode;
  variant?: 'default' | 'outline';
  className?: string;
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

function billingErrorRedirect(locale: string, message: string): never {
  window.location.href = `/${locale}/dashboard/organizations/billing?billing_error=${encodeURIComponent(message)}`;
  throw new Error('redirecting_to_billing_error');
}

async function readJson(response: Response): Promise<ApiJson> {
  return response.json().catch(() => ({}));
}

function chooseMfaFactor(challenge: StepUpChallenge) {
  const factors = challenge.factors ?? [];
  if (challenge.factorId) return challenge.factorId;
  if (factors.length === 1) return factors[0].id;

  const factorList = factors
    .map((factor, index) => `${index + 1}. ${factor.name ?? factor.type}`)
    .join('\n');
  const selection = window.prompt(`Choose an MFA factor for billing step-up:\n${factorList}`);
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

async function getBillingStepUpToken() {
  const initialChallenge = await createStepUpChallenge({ action: 'manage_billing' });

  if (initialChallenge.provider === 'enterprise_idp' || initialChallenge.requiresCode === false) {
    return verifyStepUpChallenge({
      action: 'manage_billing',
      challengeNonce: initialChallenge.challengeNonce,
    });
  }

  const factorId = chooseMfaFactor(initialChallenge);
  if (!factorId) throw new Error('MFA factor selection is required for billing step-up.');

  const providerChallenge = await createStepUpChallenge({ action: 'manage_billing', factorId });
  const code = window.prompt('Enter your MFA code to continue billing.');
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
  stepUpToken,
}: {
  action: BillingActionButtonProps['action'];
  locale: string;
  planId?: string;
  stepUpToken?: string;
}) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (stepUpToken) headers[STEP_UP_TOKEN_HEADER] = stepUpToken;

  const portalUrl = `/api/billing/portal?locale=${encodeURIComponent(locale)}&returnPath=${encodeURIComponent(DASHBOARD_BILLING_RETURN_PATH)}`;
  const response = await fetch(action === 'checkout' ? '/api/billing/checkout' : portalUrl, {
    method: 'POST',
    headers,
    body: action === 'checkout' ? JSON.stringify({ plan: planId, locale }) : undefined,
  });
  const json = await readJson(response);

  return { response, json };
}

export function BillingActionButton({ action, locale, planId, disabled, children, variant = 'default', className }: BillingActionButtonProps) {
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || loading) return;

    setLoading(true);

    try {
      let { response, json } = await requestBillingAction({ action, locale, planId });

      if (response.status === 403 && json.error === 'step_up_required') {
        const stepUpToken = await getBillingStepUpToken();
        ({ response, json } = await requestBillingAction({ action, locale, planId, stepUpToken }));
      }

      if (!response.ok || typeof json.url !== 'string') {
        billingErrorRedirect(locale, String(json.error ?? 'Billing action could not be completed.'));
      }

      window.location.assign(json.url);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Billing action could not be completed.';
      billingErrorRedirect(locale, message);
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
    </form>
  );
}
