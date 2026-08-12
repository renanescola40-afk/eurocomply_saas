import Stripe from 'stripe';

import { runWithEmailIdempotencyContext } from '@/lib/email/idempotency-context';
import { reportError } from '@/lib/observability/report-error';
import { writeAuditLog } from '@/lib/security/audit-log';
import { createAdminClient } from '@/lib/supabase/admin';
import { reconcileStripeEntitlementEvent } from '@/server/billing/stripe-entitlement-runtime';
import { getStripeEventAuditContext, handleStripeWebhookEvent } from '@/server/billing/stripe-webhooks';
import { buildIdempotencyKey } from '@/server/jobs/idempotency-key';

export const STRIPE_EVENT_PROCESSING_LEASE_MS = 15 * 60 * 1000;

const RECOVERABLE_STRIPE_EVENT_TYPES = new Set([
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_failed',
  'invoice.paid',
]);

type StripeEventClaim = {
  id: string;
  status: string | null;
  updated_at: string | null;
};

export function isStripeEventProcessingLeaseExpired(updatedAt: string | null | undefined, nowMs = Date.now()) {
  if (!updatedAt) return false;

  const updatedAtMs = Date.parse(updatedAt);
  if (!Number.isFinite(updatedAtMs)) return false;

  return nowMs - updatedAtMs >= STRIPE_EVENT_PROCESSING_LEASE_MS;
}

function paymentFailedEmailIdempotencyKey(event: Stripe.Event) {
  return buildIdempotencyKey({
    prefix: 'stripe-payment-failed-email',
    identityParts: [event.id],
  });
}

async function runCoreStripeWebhookHandler(event: Stripe.Event) {
  if (event.type !== 'invoice.payment_failed') {
    return handleStripeWebhookEvent(event);
  }

  return runWithEmailIdempotencyContext(paymentFailedEmailIdempotencyKey(event), () =>
    handleStripeWebhookEvent(event),
  );
}

async function isProcessedStripeEvent(eventId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('stripe_events_processed')
    .select('id,status')
    .eq('id', eventId)
    .maybeSingle<Pick<StripeEventClaim, 'id' | 'status'>>();

  if (error) throw error;
  return data?.id === eventId && data.status === 'processed';
}

async function reconcileEntitlementWhenEligible(event: Stripe.Event) {
  const entitlement = await reconcileStripeEntitlementEvent(event);
  if (entitlement.outcome === 'metadata_missing' || entitlement.outcome === 'unsupported') {
    return null;
  }
  return entitlement;
}

async function runStripeWebhookHandler(event: Stripe.Event) {
  const result = await runCoreStripeWebhookHandler(event);

  if (result.unsupported || (result.skipped && !result.duplicate)) return result;

  if (result.duplicate) {
    // Core Stripe processing is intentionally idempotent. A completed core event may
    // still predate/fail the enterprise entitlement side effect, so a verified replay
    // may repair only that idempotent snapshot. Never do this while another worker's
    // processing claim is still active; abandoned claims use the lease recovery path.
    if (!(await isProcessedStripeEvent(event.id))) return result;
  }

  const entitlement = await reconcileEntitlementWhenEligible(event);
  if (!entitlement) return result;

  return { ...result, entitlement };
}

async function recordLeaseRecoveryAudit(event: Stripe.Event) {
  const context = getStripeEventAuditContext(event);

  try {
    await writeAuditLog({
      action: 'webhook_processing_lease_recovered',
      organizationId: context.organizationId,
      userId: context.actorUserId,
      entityType: 'stripe_webhook_event',
      entityId: event.id,
      metadata: {
        stripeEventId: event.id,
        stripeEventType: event.type,
        livemode: event.livemode,
        recoveryReason: 'processing_lease_expired',
        leaseMs: STRIPE_EVENT_PROCESSING_LEASE_MS,
      },
    });
  } catch (error) {
    reportError(error, {
      area: 'stripe_webhook_lease_recovery_audit',
      stripeEventId: event.id,
      stripeEventType: event.type,
    });
  }
}

export async function recoverAbandonedStripeEventClaim(event: Stripe.Event, nowMs = Date.now()) {
  if (!RECOVERABLE_STRIPE_EVENT_TYPES.has(event.type)) {
    return false;
  }

  const supabase = createAdminClient();
  const { data: existingEvent, error: lookupError } = await supabase
    .from('stripe_events_processed')
    .select('id,status,updated_at')
    .eq('id', event.id)
    .maybeSingle<StripeEventClaim>();

  if (lookupError) throw lookupError;

  if (
    existingEvent?.status !== 'processing' ||
    !isStripeEventProcessingLeaseExpired(existingEvent.updated_at, nowMs)
  ) {
    return false;
  }

  const failedAt = new Date(nowMs).toISOString();
  const { data: recoveredEvent, error: recoveryError } = await supabase
    .from('stripe_events_processed')
    .update({
      status: 'failed',
      failed_at: failedAt,
      error: 'processing_lease_expired',
    })
    .eq('id', event.id)
    .eq('status', 'processing')
    .eq('updated_at', existingEvent.updated_at)
    .select('id')
    .maybeSingle<{ id: string }>();

  if (recoveryError) throw recoveryError;
  if (!recoveredEvent?.id) return false;

  await recordLeaseRecoveryAudit(event);
  return true;
}

export async function handleStripeWebhookEventWithRecovery(event: Stripe.Event) {
  const result = await runStripeWebhookHandler(event);

  if (!result.duplicate) {
    return result;
  }

  // A processed duplicate already had its core side effects and may have just repaired
  // the entitlement snapshot above. Only processing claims are eligible for lease replay.
  if (await isProcessedStripeEvent(event.id)) {
    return result;
  }

  const recovered = await recoverAbandonedStripeEventClaim(event);
  if (!recovered) {
    return result;
  }

  return runStripeWebhookHandler(event);
}
