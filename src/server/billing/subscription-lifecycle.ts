import { createHash } from 'node:crypto';
import type Stripe from 'stripe';

import { writeAuditLog } from '@/lib/security/audit-log';
import { createAdminClient } from '@/lib/supabase/admin';
import { classifyProviderFailure } from '@/server/providers/failure';
import type { CanonicalSubscriptionPlan } from '@/server/queries/subscription';
import { getStripeAddOnPriceId, normalizeAddOnSelections, type BillingAddOnSelection } from './add-ons';
import { deriveStripeIdempotencyKey, type BillingIdempotencyContext } from './idempotency';
import {
  BillingLifecycleRequestError,
  claimBillingLifecycleRequest,
  completeBillingLifecycleRequest,
  failBillingLifecycleRequest,
  findCompletedBillingLifecycleReplay,
  getBillingLifecycleReplaySnapshot,
  markBillingLifecycleAuditSucceeded,
  markBillingLifecycleProviderInFlight,
  markBillingLifecycleProviderSucceeded,
  type BillingLifecycleAction,
  type BillingLifecycleReplaySnapshot,
} from './lifecycle-request-ledger';
import { getStripeClient } from './stripe';
import { getStripePriceId, normalizeBillingInterval, normalizeBillingPlanId, type BillingInterval } from './plans';

export type { BillingLifecycleAction } from './lifecycle-request-ledger';
export { BillingLifecycleRequestError } from './lifecycle-request-ledger';

type SubscriptionAuthority = {
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  plan: string | null;
  status: string | null;
};

type SubscriptionLifecycleInput = {
  action: BillingLifecycleAction;
  organizationId: string;
  userId: string;
  actorRole: string;
  plan?: CanonicalSubscriptionPlan;
  interval?: string | null;
  addOns?: Array<{ slug?: unknown; quantity?: unknown }>;
  idempotency: BillingIdempotencyContext;
};

async function getSubscriptionAuthority(organizationId: string): Promise<SubscriptionAuthority> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('subscriptions')
    .select('stripe_subscription_id,stripe_customer_id,plan,status')
    .eq('organization_id', organizationId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle<SubscriptionAuthority>();
  if (error) throw classifyProviderFailure('supabase', 'subscription_authority_lookup', error);
  if (!data?.stripe_subscription_id) throw new Error('stripe_subscription_not_found');
  return data;
}

function getBaseSubscriptionItem(subscription: Stripe.Subscription) {
  const item = subscription.items.data.find((candidate) => candidate.price.recurring?.usage_type !== 'metered');
  if (!item) throw new Error('stripe_base_subscription_item_not_found');
  return item;
}

function getSubscriptionCustomerId(subscription: Stripe.Subscription) {
  if (typeof subscription.customer === 'string') return subscription.customer;
  return subscription.customer?.id ?? null;
}

function assertSubscriptionAuthority(
  subscription: Stripe.Subscription,
  authority: SubscriptionAuthority,
  organizationId: string,
) {
  const providerCustomerId = getSubscriptionCustomerId(subscription);
  if (authority.stripe_customer_id && providerCustomerId !== authority.stripe_customer_id) {
    throw new Error('stripe_subscription_customer_mismatch');
  }

  const providerOrganizationId = subscription.metadata.organization_id ?? subscription.metadata.organizationId ?? null;
  if (providerOrganizationId && providerOrganizationId !== organizationId) {
    throw new Error('stripe_subscription_organization_mismatch');
  }
}

function getCurrentBillingInterval(baseItem: Stripe.SubscriptionItem): BillingInterval {
  return baseItem.price.recurring?.interval === 'year' ? 'year' : 'month';
}

function buildAddOnItems(selections: BillingAddOnSelection[], interval: BillingInterval) {
  return selections.map((selection) => ({ price: getStripeAddOnPriceId(selection.slug, interval), quantity: selection.quantity }));
}

function canonicalRequestAddOns(value: SubscriptionLifecycleInput['addOns']) {
  return (value ?? [])
    .map((item) => ({
      slug: typeof item.slug === 'string' ? item.slug.trim().toLowerCase() : '',
      quantity: typeof item.quantity === 'number' && Number.isInteger(item.quantity) ? item.quantity : 1,
    }))
    .sort((left, right) => left.slug.localeCompare(right.slug) || left.quantity - right.quantity);
}

export function billingLifecycleRequestFingerprint(
  input: Pick<SubscriptionLifecycleInput, 'action' | 'plan' | 'interval' | 'addOns'>,
) {
  const payload = JSON.stringify({
    action: input.action,
    plan: input.plan ?? null,
    interval: input.interval ? normalizeBillingInterval(input.interval) : null,
    addOns: canonicalRequestAddOns(input.addOns),
  });
  return createHash('sha256').update(payload).digest('hex');
}

function lifecycleResult(input: {
  subscription: Stripe.Subscription;
  plan: CanonicalSubscriptionPlan;
  interval: BillingInterval;
  addOns: BillingAddOnSelection[];
  idempotentReplay: boolean;
}) {
  return {
    subscriptionId: input.subscription.id,
    status: input.subscription.status,
    cancelAtPeriodEnd: input.subscription.cancel_at_period_end,
    currentPeriodEnd: input.subscription.current_period_end,
    plan: input.plan,
    interval: input.interval,
    addOns: input.addOns,
    idempotentReplay: input.idempotentReplay,
  };
}

function snapshotFromResult(result: ReturnType<typeof lifecycleResult>): BillingLifecycleReplaySnapshot {
  return {
    subscriptionId: result.subscriptionId,
    status: result.status,
    cancelAtPeriodEnd: result.cancelAtPeriodEnd,
    currentPeriodEnd: result.currentPeriodEnd,
    plan: result.plan,
    interval: result.interval,
    addOns: result.addOns,
  };
}

function replayResult(snapshot: BillingLifecycleReplaySnapshot) {
  return { ...snapshot, idempotentReplay: true };
}

export async function mutateSubscriptionLifecycle(input: SubscriptionLifecycleInput) {
  const requestFingerprint = billingLifecycleRequestFingerprint(input);
  const completedReplay = await findCompletedBillingLifecycleReplay({
    organizationId: input.organizationId,
    requestedBy: input.userId,
    action: input.action,
    requestDigest: input.idempotency.digest,
    requestFingerprint,
  });
  if (completedReplay) return replayResult(completedReplay);

  const authority = await getSubscriptionAuthority(input.organizationId);
  const stripe = getStripeClient();
  let subscription: Stripe.Subscription;

  try {
    subscription = await stripe.subscriptions.retrieve(authority.stripe_subscription_id!);
  } catch (error) {
    throw classifyProviderFailure('stripe', 'subscription_retrieve', error);
  }

  assertSubscriptionAuthority(subscription, authority, input.organizationId);

  const baseItem = getBaseSubscriptionItem(subscription);
  const currentPlan = normalizeBillingPlanId(authority.plan ?? subscription.metadata.plan) ?? 'starter';
  const interval = input.interval ? normalizeBillingInterval(input.interval) : getCurrentBillingInterval(baseItem);
  const targetPlan = input.plan ?? currentPlan;
  const addOns = normalizeAddOnSelections(input.addOns, targetPlan);
  const claim = await claimBillingLifecycleRequest({
    organizationId: input.organizationId,
    requestedBy: input.userId,
    action: input.action,
    sourcePlan: currentPlan,
    targetPlan,
    billingInterval: interval,
    addOns,
    stripeSubscriptionId: subscription.id,
    requestDigest: input.idempotency.digest,
    requestFingerprint,
  });

  if (claim.kind === 'completed_replay') {
    return replayResult(getBillingLifecycleReplaySnapshot(claim.request));
  }

  const requestId = claim.request.id;
  const recoveredSnapshot = claim.kind === 'claimed' ? null : getBillingLifecycleReplaySnapshot(claim.request);

  if (claim.kind === 'audit_succeeded_recovery') {
    await completeBillingLifecycleRequest(requestId);
    return replayResult(recoveredSnapshot!);
  }

  let updated = subscription;
  const providerWasAlreadyCompleted = claim.kind === 'provider_succeeded_recovery';
  let providerSnapshot = recoveredSnapshot;

  if (!providerWasAlreadyCompleted) {
    await markBillingLifecycleProviderInFlight(requestId);

    try {
      const requestOptions = {
        idempotencyKey: deriveStripeIdempotencyKey(input.idempotency, `subscription-${input.action}`),
      };

      if (input.action === 'cancel') {
        updated = await stripe.subscriptions.update(
          subscription.id,
          { cancel_at_period_end: true },
          requestOptions,
        );
      } else if (input.action === 'reactivate') {
        updated = await stripe.subscriptions.update(
          subscription.id,
          { cancel_at_period_end: false },
          requestOptions,
        );
      } else {
        const isDowngrade = input.action === 'downgrade';
        updated = await stripe.subscriptions.update(
          subscription.id,
          {
            cancel_at_period_end: false,
            proration_behavior: isDowngrade ? 'none' : 'create_prorations',
            billing_cycle_anchor: 'unchanged',
            items: [
              { id: baseItem.id, price: getStripePriceId(targetPlan, interval), quantity: 1 },
              ...subscription.items.data
                .filter((item) => item.id !== baseItem.id)
                .map((item) => ({ id: item.id, deleted: true as const })),
              ...buildAddOnItems(addOns, interval),
            ],
            metadata: {
              ...subscription.metadata,
              organization_id: input.organizationId,
              user_id: input.userId,
              plan: targetPlan,
              billing_interval: interval,
            },
          },
          requestOptions,
        );
      }
    } catch (error) {
      await failBillingLifecycleRequest(requestId, 'stripe_mutation_failed');
      throw classifyProviderFailure('stripe', `subscription_${input.action}`, error);
    }

    providerSnapshot = snapshotFromResult(lifecycleResult({
      subscription: updated,
      plan: targetPlan,
      interval,
      addOns,
      idempotentReplay: false,
    }));
    await markBillingLifecycleProviderSucceeded(requestId, providerSnapshot);
  }

  if (!providerSnapshot) throw new Error('billing_lifecycle_result_snapshot_unavailable');

  const auditPreviousPlan = normalizeBillingPlanId(claim.request.source_plan) ?? currentPlan;
  const auditTargetPlan = normalizeBillingPlanId(claim.request.target_plan) ?? providerSnapshot.plan;
  const auditInterval = claim.request.billing_interval === 'year' ? 'year' : providerSnapshot.interval;

  const audit = await writeAuditLog({
    action: `billing.subscription_${input.action}`,
    organizationId: input.organizationId,
    userId: input.userId,
    entityType: 'stripe_subscription',
    entityId: providerSnapshot.subscriptionId,
    metadata: {
      previousPlan: auditPreviousPlan,
      targetPlan: auditTargetPlan,
      interval: auditInterval,
      addOns: providerSnapshot.addOns,
      actorRole: input.actorRole,
      cancelAtPeriodEnd: providerSnapshot.cancelAtPeriodEnd,
      providerStatus: providerSnapshot.status,
      lifecycleRequestId: requestId,
      idempotencyProtected: true,
      providerMutationReplayed: providerWasAlreadyCompleted,
      durableResultSnapshot: true,
    },
  });

  if (!audit.persisted) {
    throw new Error('billing_lifecycle_audit_unavailable');
  }

  await markBillingLifecycleAuditSucceeded(requestId);
  await completeBillingLifecycleRequest(requestId);

  return providerWasAlreadyCompleted
    ? replayResult(providerSnapshot)
    : { ...providerSnapshot, idempotentReplay: false };
}

export function isBillingLifecycleRequestError(error: unknown): error is BillingLifecycleRequestError {
  return error instanceof BillingLifecycleRequestError;
}
