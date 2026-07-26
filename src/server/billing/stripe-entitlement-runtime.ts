import Stripe from 'stripe';
import { z } from 'zod';

import { reconcileEntitlementSnapshot } from '@/server/enterprise/entitlement-reconciliation';

const SUPPORTED_EVENTS = new Set([
  'checkout.session.completed',
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
  | 'reconciled'
  | 'idempotent_replay'
  | 'deferred_downgrade'
  | 'source_version_conflict'
  | 'lower_priority_source'
  | 'rejected';

function metadataFromEvent(event: Stripe.Event): Record<string, string> {
  const object = event.data.object as { metadata?: Record<string, string> | null };
  return object.metadata ?? {};
}

function unixToIso(value: unknown, fallback: Date) {
  return typeof value === 'number' && Number.isFinite(value)
    ? new Date(value * 1000).toISOString()
    : fallback.toISOString();
}

function subscriptionPeriodEnd(event: Stripe.Event, fallback: Date) {
  const object = event.data.object as { current_period_end?: number; lines?: { data?: Array<{ period?: { end?: number } }> } };
  return object.current_period_end
    ?? object.lines?.data?.[0]?.period?.end
    ?? Math.floor(fallback.valueOf() / 1000);
}

export function normalizeStripeEntitlementEvent(event: Stripe.Event, now = new Date()) {
  if (!SUPPORTED_EVENTS.has(event.type)) return { outcome: 'unsupported' as const };

  const parsed = metadataSchema.safeParse(metadataFromEvent(event));
  if (!parsed.success) return { outcome: 'metadata_missing' as const };

  const metadata = parsed.data;
  const cancelled = event.type === 'customer.subscription.deleted';
  const delinquent = event.type === 'invoice.payment_failed';
  const periodEnd = new Date(subscriptionPeriodEnd(event, now) * 1000);
  const graceUntil = new Date(periodEnd.valueOf() + metadata.grace_period_days * 86_400_000);

  const limits = cancelled
    ? { full: 0, participant: 0, viewer: 0 }
    : {
        full: metadata.full_seat_limit,
        participant: metadata.participant_seat_limit,
        viewer: metadata.viewer_seat_limit,
      };

  const validUntil = cancelled
    ? periodEnd
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
        downgrade_deferred_until: cancelled ? unixToIso(subscriptionPeriodEnd(event, now), now) : null,
      },
      observedAt: new Date(event.created * 1000).toISOString(),
      validFrom: now.toISOString(),
      validUntil: validUntil.toISOString(),
      actorUserId: null,
    },
    deferredDowngrade: cancelled && periodEnd > now,
  };
}

export async function reconcileStripeEntitlementEvent(event: Stripe.Event) {
  const normalized = normalizeStripeEntitlementEvent(event);
  if (normalized.outcome !== 'normalized') return normalized;

  const result = await reconcileEntitlementSnapshot(normalized.snapshot);
  const mapped: StripeEntitlementRuntimeOutcome =
    result.outcome === 'applied' ? (normalized.deferredDowngrade ? 'deferred_downgrade' : 'reconciled')
      : result.outcome === 'idempotent_replay' ? 'idempotent_replay'
      : result.outcome === 'source_version_conflict' ? 'source_version_conflict'
      : result.outcome === 'lower_priority_source' ? 'lower_priority_source'
      : 'rejected';

  return { ...result, outcome: mapped, stripeEventId: event.id };
}
