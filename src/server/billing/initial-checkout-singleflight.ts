import { randomUUID } from 'node:crypto';

import { createAdminClient } from '@/lib/supabase/admin';
import type { CanonicalSubscriptionPlan } from '@/server/queries/subscription';

const INITIAL_CHECKOUT_CLAIM_MS = 2 * 60 * 1000;

export type InitialCheckoutPlan = Extract<CanonicalSubscriptionPlan, 'starter' | 'professional'>;

type CheckoutAttemptRow = {
  outcome: 'claimed' | 'existing' | 'busy' | 'invalid_input';
  attempt_token: string | null;
  plan: string | null;
  stripe_session_id: string | null;
  lease_expires_at: string | null;
};

function firstAttemptRow(value: unknown): CheckoutAttemptRow | null {
  if (!Array.isArray(value) || value.length !== 1) return null;
  const candidate = value[0];
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return null;
  const row = candidate as Partial<CheckoutAttemptRow>;
  if (!['claimed', 'existing', 'busy', 'invalid_input'].includes(String(row.outcome))) return null;
  return row as CheckoutAttemptRow;
}

export async function claimInitialCheckoutAttempt(
  organizationId: string,
  plan: InitialCheckoutPlan,
  nowMs = Date.now(),
) {
  const attemptToken = randomUUID();
  const claimExpiresAt = new Date(nowMs + INITIAL_CHECKOUT_CLAIM_MS).toISOString();
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('claim_initial_billing_checkout_atomic', {
    p_organization_id: organizationId,
    p_plan: plan,
    p_attempt_token: attemptToken,
    p_claim_expires_at: claimExpiresAt,
  });

  if (error) throw error;
  const row = firstAttemptRow(data);
  if (!row || row.outcome === 'invalid_input' || !row.attempt_token || !row.plan) {
    throw new Error('billing_checkout_attempt_claim_invalid');
  }

  if (row.plan !== 'starter' && row.plan !== 'professional') {
    throw new Error('billing_checkout_attempt_plan_invalid');
  }

  return {
    outcome: row.outcome,
    attemptToken: row.attempt_token,
    plan: row.plan as InitialCheckoutPlan,
    stripeSessionId: row.stripe_session_id,
    leaseExpiresAt: row.lease_expires_at,
  };
}

export async function bindInitialCheckoutSession(input: {
  organizationId: string;
  attemptToken: string;
  stripeSessionId: string;
  sessionExpiresAt: string;
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('bind_initial_billing_checkout_session_atomic', {
    p_organization_id: input.organizationId,
    p_attempt_token: input.attemptToken,
    p_stripe_session_id: input.stripeSessionId,
    p_session_expires_at: input.sessionExpiresAt,
  });
  if (error) throw error;
  if (data !== true) throw new Error('billing_checkout_attempt_bind_conflict');
}

export async function releaseInitialCheckoutAttempt(organizationId: string, attemptToken: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.rpc('release_initial_billing_checkout_atomic', {
    p_organization_id: organizationId,
    p_attempt_token: attemptToken,
  });
  if (error) throw error;
}

export async function clearInitialCheckoutAttemptBySession(stripeSessionId: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.rpc('clear_initial_billing_checkout_by_session_atomic', {
    p_stripe_session_id: stripeSessionId,
  });
  if (error) throw error;
}

export const initialCheckoutSingleflightContract = {
  claimMs: INITIAL_CHECKOUT_CLAIM_MS,
} as const;
