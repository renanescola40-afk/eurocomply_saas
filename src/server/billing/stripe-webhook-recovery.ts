import Stripe from 'stripe';

import { runWithEmailIdempotencyContext } from '@/lib/email/idempotency-context';
import { reportError } from '@/lib/observability/report-error';
import { writeAuditLog } from '@/lib/security/audit-log';
import { createAdminClient } from '@/lib/supabase/admin';
import { reconcileOrganizationAddOnsFromStripeEvent } from '@/server/billing/add-on-reconciliation';
import { reconcileStripeEntitlementEvent } from '@/server/billing/stripe-entitlement-runtime';
import {
  claimStripeEventForProcessing,
  getStripeEventAuditContext,
  handleStripeWebhookEvent,
  markStripeEventFailed,
} from '@/server/billing/stripe-webhooks';
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

const ENTITLEMENT_ONLY_STRIPE_EVENT_TYPES = new Set([
  'invoice.paid',
]);

const MATERIALIZED_ENTITLEMENT_OUTCOMES = new Set([
  'reconciled',
  'idempotent_replay',
]);

type StripeEventClaim = {
  id: string;
  status: string | null;
  updated_at: string | null;
};

type ExistingEntitlementSnapshot = {
  id: string;
  applied_policy_version: number | null;
  source_version: number;
};

type InvoiceWithSubscriptionMetadata = Stripe.Invoice & {
  parent?: {
    subscription_details?: {
      metadata?: Stripe.Metadata | null;
    } | null;
  } | null;
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

function getEntitlementOnlyOrganizationId(event: Stripe.Event) {
  if (event.type !== 'invoice.paid') return null;

  const invoice = event.data.object as InvoiceWithSubscriptionMetadata;
  const metadata = invoice.parent?.subscription_details?.metadata;
  const value = metadata?.organization_id ?? metadata?.organizationId;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

async function recordEntitlementOnlyReplayAudit(event: Stripe.Event) {
  const context = getStripeEventAuditContext(event);

  try {
    await writeAuditLog({
      action: 'webhook_replayed',
      organizationId: context.organizationId ?? getEntitlementOnlyOrganizationId(event),
      userId: context.actorUserId,
      entityType: 'stripe_webhook_event',
      entityId: event.id,
      metadata: {
        stripeEventId: event.id,
        stripeEventType: event.type,
        livemode: event.livemode,
        objectId: context.objectId ?? null,
        processingLane: 'entitlement_only',
      },
    });
  } catch (error) {
    reportError(error, {
      area: 'stripe_entitlement_only_replay_audit',
      stripeEventId: event.id,
      stripeEventType: event.type,
    });
  }
}

async function finalizeEntitlementOnlyStripeEvent(event: Stripe.Event) {
  const supabase = createAdminClient();
  const organizationId = getEntitlementOnlyOrganizationId(event);
  const { data, error } = await supabase
    .from('stripe_events_processed')
    .update({
      status: 'processed',
      processed_at: new Date().toISOString(),
      organization_id: organizationId,
      error: null,
    })
    .eq('id', event.id)
    .eq('status', 'processing')
    .select('id')
    .maybeSingle<{ id: string }>();

  if (error) throw error;
  if (data?.id !== event.id) throw new Error('stripe_entitlement_only_finalize_conflict');
}

async function runEntitlementOnlyStripeEvent(event: Stripe.Event) {
  const claimed = await claimStripeEventForProcessing(event);

  if (!claimed) {
    await recordEntitlementOnlyReplayAudit(event);
    return { skipped: true, duplicate: true };
  }

  try {
    await finalizeEntitlementOnlyStripeEvent(event);
    return { skipped: false };
  } catch (error) {
    await markStripeEventFailed(event, error);
    throw error;
  }
}

async function runCoreStripeWebhookHandler(event: Stripe.Event) {
  if (ENTITLEMENT_ONLY_STRIPE_EVENT_TYPES.has(event.type)) {
    return runEntitlementOnlyStripeEvent(event);
  }

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

async function findExistingStripeEntitlementReplay(eventId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('enterprise_entitlement_snapshots')
    .select('id,applied_policy_version,source_version')
    .eq('idempotency_key', `stripe:${eventId}`)
    .limit(2);

  if (error) throw error;
  const rows = (data ?? []) as ExistingEntitlementSnapshot[];
  if (rows.length === 0) return null;
  if (rows.length !== 1 || !rows[0]?.id) {
    throw new Error('stripe_entitlement_snapshot_ambiguous');
  }

  const snapshot = rows[0];
  return {
    outcome: 'idempotent_replay' as const,
    stripeEventId: eventId,
    snapshotId: snapshot.id,
    appliedPolicyVersion: snapshot.applied_policy_version,
    sourceVersion: snapshot.source_version,
  };
}

async function reconcileEntitlementWhenEligible(event: Stripe.Event) {
  const entitlement = await reconcileStripeEntitlementEvent(event);
  if (entitlement.outcome === 'metadata_missing' || entitlement.outcome === 'unsupported') {
    return null;
  }
  return entitlement;
}

async function reconcileAddOnsWhenEligible(event: Stripe.Event) {
  const addOns = await reconcileOrganizationAddOnsFromStripeEvent(event);
  return addOns.outcome === 'unsupported' || addOns.outcome === 'not_applicable' ? null : addOns;
}

function entitlementRepairMaterialized(entitlement: Awaited<ReturnType<typeof reconcileStripeEntitlementEvent>>) {
  if (!MATERIALIZED_ENTITLEMENT_OUTCOMES.has(entitlement.outcome)) return false;
  return typeof ('snapshotId' in entitlement ? entitlement.snapshotId : null) === 'string';
}

function isBillingPeriodMissingError(error: unknown) {
  return error instanceof Error && error.message === 'stripe_entitlement_billing_period_missing';
}

async function repairProcessedStripeEntitlement(event: Stripe.Event) {
  let entitlement: Awaited<ReturnType<typeof reconcileStripeEntitlementEvent>> | null;
  try {
    entitlement = await reconcileEntitlementWhenEligible(event);
  } catch (error) {
    if (!isBillingPeriodMissingError(error)) throw error;

    const existingReplay = await findExistingStripeEntitlementReplay(event.id);
    if (existingReplay) return existingReplay;
    throw error;
  }

  if (!entitlement) return null;

  if (!entitlementRepairMaterialized(entitlement)) {
    reportError(new Error('Processed Stripe entitlement repair did not materialize a snapshot'), {
      area: 'stripe_entitlement_processed_repair',
      stripeEventId: event.id,
      stripeEventType: event.type,
      entitlementOutcome: entitlement.outcome,
    });
    throw new Error('stripe_entitlement_repair_failed');
  }

  return entitlement;
}

async function repairedSideEffects(event: Stripe.Event) {
  const [addOns, entitlement] = await Promise.all([
    reconcileAddOnsWhenEligible(event),
    repairProcessedStripeEntitlement(event),
  ]);
  return { addOns, entitlement };
}

function withSideEffects<T extends object>(result: T, sideEffects: { addOns: unknown | null; entitlement: unknown | null }) {
  return {
    ...result,
    ...(sideEffects.addOns ? { addOns: sideEffects.addOns } : {}),
    ...(sideEffects.entitlement ? { entitlement: sideEffects.entitlement } : {}),
  };
}

async function runStripeWebhookHandler(event: Stripe.Event) {
  const result = await runCoreStripeWebhookHandler(event);
  const unsupported = 'unsupported' in result ? result.unsupported ?? false : false;

  if (unsupported || (result.skipped && !result.duplicate)) return result;

  if (result.duplicate) {
    if (!(await isProcessedStripeEvent(event.id))) return result;
    return withSideEffects(result, await repairedSideEffects(event));
  }

  const [addOns, entitlement] = await Promise.all([
    reconcileAddOnsWhenEligible(event),
    reconcileEntitlementWhenEligible(event),
  ]);

  if (!addOns && !entitlement) return result;
  return withSideEffects(result, { addOns, entitlement });
}

async function recordLeaseRecoveryAudit(event: Stripe.Event) {
  const context = getStripeEventAuditContext(event);

  try {
    await writeAuditLog({
      action: 'webhook_processing_lease_recovered',
      organizationId: context.organizationId ?? getEntitlementOnlyOrganizationId(event),
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

  if (!result.duplicate || 'entitlement' in result || 'addOns' in result) {
    return result;
  }

  if (await isProcessedStripeEvent(event.id)) {
    return withSideEffects(result, await repairedSideEffects(event));
  }

  const recovered = await recoverAbandonedStripeEventClaim(event);
  if (!recovered) {
    if (await isProcessedStripeEvent(event.id)) {
      return withSideEffects(result, await repairedSideEffects(event));
    }
    return result;
  }

  return runStripeWebhookHandler(event);
}
