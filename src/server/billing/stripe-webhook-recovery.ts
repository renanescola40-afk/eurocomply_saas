import Stripe from 'stripe';

import { runWithEmailIdempotencyContext } from '@/lib/email/idempotency-context';
import { reportError } from '@/lib/observability/report-error';
import { writeAuditLog } from '@/lib/security/audit-log';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildIdempotencyKey } from '@/server/jobs/idempotency-key';
import { getStripeEventAuditContext, handleStripeWebhookEvent } from '@/server/billing/stripe-webhooks';

export const STRIPE_EVENT_PROCESSING_LEASE_MS = 15 * 60 * 1000;

const RECOVERABLE_STRIPE_EVENT_TYPES = new Set([
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_failed',
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

function runStripeWebhookHandler(event: Stripe.Event) {
  if (event.type !== 'invoice.payment_failed') {
    return handleStripeWebhookEvent(event);
  }

  return runWithEmailIdempotencyContext(paymentFailedEmailIdempotencyKey(event), () =>
    handleStripeWebhookEvent(event),
  );
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

  const recovered = await recoverAbandonedStripeEventClaim(event);
  if (!recovered) {
    return result;
  }

  return runStripeWebhookHandler(event);
}
