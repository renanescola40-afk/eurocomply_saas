import Stripe from 'stripe';
import { z } from 'zod';

import { reconcileEntitlementSnapshot } from '@/server/enterprise/entitlement-reconciliation';

const SUPPORTED_ENTITLEMENT_EVENTS = new Set([
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_failed',
  'invoice.paid',
]);

const metadataSchema = z.object({
  organization_id: z.string().uuid(),
  entitlement_source_id: z.string().uuid(),
  plan_code: z.string().trim().min(1).max(120),
  full_seat_limit: z.coerce.number().int().min(0).max(1_000_000),
  participant_seat_limit: z.coerce.number().int().min(0).max(1_000_000),
  viewer_seat_limit: z.coerce.number().int().min(0).max(1_000_000),
  source_version: z.coerce.number().int().positive(),
  grace_period_days: z.coerce.number().int().min(0).max(90).default(0),
});

export type StripeEntitlementRuntimeOutcome =
  | 'unsupported'
  | 'metadata_missing'
  | 'billing_period_missing'
  | 'reconciled'
  | 'idempotent_replay'
  | 'source_version_conflict'
  | 'lower_priority_source'
  | 'rejected';

type StripeMetadata = Record<string, string>;

type EntitlementEventObject = {
  metadata?: StripeMetadata | null;
  current_period_end?: number | null;
  items?: {
    data?: Array<{
      current_period_end?: number | null;
    }>;
  } | null;
  lines?: {
    data?: Array<{
      period?: {
        end?: number | null;
      } | null;
    }>;
  } | null;
  parent?: {
    subscription_details?: {
      metadata?: StripeMetadata | null;
    } | null;
  } | null;
  subscription_details?: {
    metadata?: StripeMetadata | null;
  } | null;
};

function hasMetadata(metadata: StripeMetadata | null | undefined): metadata is StripeMetadata {
  return Boolean(metadata && Object.keys(metadata).length > 0);
}

function metadataFromEvent(event: Stripe.Event): StripeMetadata {
  const object = event.data.object as EntitlementEventObject;

  if (hasMetadata(object.metadata)) return object.metadata;

  // Stripe Basil moved invoice subscription details under invoice.parent.
  // Keep the legacy subscription_details fallback for older API-version events.
  const parentMetadata = object.parent?.subscription_details?.metadata;
  if (hasMetadata(parentMetadata)) return parentMetadata;

  const legacySubscriptionMetadata = object.subscription_details?.metadata;
  return hasMetadata(legacySubscriptionMetadata) ? legacySubscriptionMetadata : {};
}

function validEpochSeconds(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
    ? value
    : null;
}

function earliestTimestamp(values: Array<number | null>) {
  const timestamps = values.filter((value): value is number => value !== null);
  return timestamps.length > 0 ? Math.min(...timestamps) : null;
}

export function stripeEntitlementPeriodEnd(event: Stripe.Event): number | null {
  const object = event.data.object as EntitlementEventObject;

  // Pre-Basil subscription events exposed one top-level period end.
  const legacySubscriptionPeriodEnd = validEpochSeconds(object.current_period_end);
  if (legacySubscriptionPeriodEnd) return legacySubscriptionPeriodEnd;

  // Basil subscription periods are item-level. When mixed intervals exist, use
  // the earliest period end so a plan-wide entitlement never outlives any billed
  // component without a newer Stripe event extending it.
  const itemPeriodEnd = earliestTimestamp(
    (object.items?.data ?? []).map((item) => validEpochSeconds(item.current_period_end)),
  );
  if (itemPeriodEnd) return itemPeriodEnd;

  // Invoice events expose service windows on invoice lines. Use the earliest end
  // for the same conservative plan-wide entitlement boundary.
  return earliestTimestamp(
    (object.lines?.data ?? []).map((line) => validEpochSeconds(line.period?.end)),
  );
}

export function normalizeStripeEntitlementEvent(event: Stripe.Event, now = new Date()) {
  if (!SUPPORTED_ENTITLEMENT_EVENTS.has(event.type)) return { outcome: 'unsupported' as const };

  const parsed = metadataSchema.safeParse(metadataFromEvent(event));
  if (!parsed.success) return { outcome: 'metadata_missing' as const };

  const metadata = parsed.data;
  const cancelled = event.type === 'customer.subscription.deleted';
  const delinquent = event.type === 'invoice.payment_failed';
  const paid = event.type === 'invoice.paid';
  const periodEndSeconds = cancelled ? null : stripeEntitlementPeriodEnd(event);

  if (!cancelled && !periodEndSeconds) {
    return { outcome: 'billing_period_missing' as const };
  }

  const periodEnd = periodEndSeconds ? new Date(periodEndSeconds * 1000) : null;
  if (periodEnd && periodEnd <= now) {
    return { outcome: 'billing_period_missing' as const };
  }

  const graceUntil = periodEnd
    ? new Date(periodEnd.valueOf() + metadata.grace_period_days * 86_400_000)
    : null;

  // Stripe emits customer.subscription.deleted when the subscription is actually
  // terminated, including cancel-at-period-end subscriptions reaching period end.
  // The canonical seat-policy store has one current row, so scheduling a future
  // zero-seat policy would make the current policy unavailable before that time.
  const limits = cancelled
    ? { full: 0, participant: 0, viewer: 0 }
    : {
        full: metadata.full_seat_limit,
        participant: metadata.participant_seat_limit,
        viewer: metadata.viewer_seat_limit,
      };

  const validUntil = cancelled
    ? null
    : delinquent && metadata.grace_period_days > 0
      ? graceUntil
      : periodEnd;

  return {
    outcome: 'normalized' as const,
    snapshot: {
      organizationId: metadata.organization_id,
      sourceId: metadata.entitlement_source_id,
      idempotencyKey: `stripe:${event.id}`,
      expectedSourceVersion: metadata.source_version,
      planCode: metadata.plan_code,
      fullSeatLimit: limits.full,
      participantSeatLimit: limits.participant,
      viewerSeatLimit: limits.viewer,
      entitlements: {
        billing_provider: 'stripe',
        stripe_event_type: event.type,
        stripe_livemode: event.livemode,
        billing_delinquent: delinquent,
        billing_recovered: paid,
        subscription_terminated: cancelled,
      },
      observedAt: new Date(event.created * 1000).toISOString(),
      validFrom: now.toISOString(),
      validUntil: validUntil?.toISOString() ?? null,
      actorUserId: null,
    },
  };
}

export async function reconcileStripeEntitlementEvent(event: Stripe.Event) {
  const normalized = normalizeStripeEntitlementEvent(event);
  if (normalized.outcome === 'billing_period_missing') {
    throw new Error('stripe_entitlement_billing_period_missing');
  }
  if (normalized.outcome !== 'normalized') return normalized;

  const result = await reconcileEntitlementSnapshot(normalized.snapshot);
  const outcome: StripeEntitlementRuntimeOutcome =
    result.outcome === 'applied'
      ? 'reconciled'
      : result.outcome === 'idempotent_replay'
        ? 'idempotent_replay'
        : result.outcome === 'version_conflict' || result.outcome === 'source_version_conflict'
          ? 'source_version_conflict'
          : result.outcome === 'lower_priority' || result.outcome === 'lower_priority_source'
            ? 'lower_priority_source'
            : 'rejected';

  return {
    ...result,
    outcome,
    stripeEventId: event.id,
  };
}
