import { createHash } from 'node:crypto';
import type Stripe from 'stripe';

import { writeAuditLog } from '@/lib/security/audit-log';
import { createAdminClient } from '@/lib/supabase/admin';
import { classifyProviderFailure } from '@/server/providers/failure';
import { isPlanAtLeast, type CanonicalSubscriptionPlan } from '@/server/queries/subscription';
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
  markBillingLifecycleLegacyProviderSucceeded,
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

type SchedulePhase = Stripe.SubscriptionSchedule['phases'][number];
type SchedulePhaseItem = SchedulePhase['items'][number];
type ScheduleUpdatePhase = NonNullable<Stripe.SubscriptionScheduleUpdateParams['phases']>[number];

type ScheduleItemDiscount = {
  id?: string | null;
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

function canonicalProviderAddOnItems(subscription: Stripe.Subscription, baseItemId: string) {
  return subscription.items.data
    .filter((item) => item.id !== baseItemId)
    .map((item) => ({ price: item.price.id, quantity: item.quantity ?? 0 }))
    .sort((left, right) => left.price.localeCompare(right.price) || left.quantity - right.quantity);
}

function canonicalExpectedAddOnItems(addOns: BillingAddOnSelection[], interval: BillingInterval) {
  return buildAddOnItems(addOns, interval)
    .map((item) => ({ price: item.price, quantity: item.quantity }))
    .sort((left, right) => left.price.localeCompare(right.price) || left.quantity - right.quantity);
}

function assertLegacyRecoveredProviderState(input: {
  action: BillingLifecycleAction;
  subscription: Stripe.Subscription;
  baseItem: Stripe.SubscriptionItem;
  targetPlan: CanonicalSubscriptionPlan;
  interval: BillingInterval;
  addOns: BillingAddOnSelection[];
}) {
  if (input.action === 'cancel') {
    if (!input.subscription.cancel_at_period_end) {
      throw new BillingLifecycleRequestError('billing_provider_outcome_uncertain', 409);
    }
    return;
  }

  if (input.action === 'reactivate') {
    if (input.subscription.cancel_at_period_end) {
      throw new BillingLifecycleRequestError('billing_provider_outcome_uncertain', 409);
    }
    return;
  }

  // Legacy downgrade requests predate durable schedule snapshots, so there is no
  // safe way to infer whether a future provider phase was committed. Do not turn
  // an ambiguous historical request into an immediate price mutation.
  if (input.action === 'downgrade') {
    throw new BillingLifecycleRequestError('billing_provider_outcome_uncertain', 409);
  }

  if (input.subscription.cancel_at_period_end || input.baseItem.price.id !== getStripePriceId(input.targetPlan, input.interval)) {
    throw new BillingLifecycleRequestError('billing_provider_outcome_uncertain', 409);
  }

  const actualAddOns = canonicalProviderAddOnItems(input.subscription, input.baseItem.id);
  const expectedAddOns = canonicalExpectedAddOnItems(input.addOns, input.interval);
  if (JSON.stringify(actualAddOns) !== JSON.stringify(expectedAddOns)) {
    throw new BillingLifecycleRequestError('billing_provider_outcome_uncertain', 409);
  }
}

function assertPlanTransition(action: BillingLifecycleAction, currentPlan: CanonicalSubscriptionPlan, targetPlan: CanonicalSubscriptionPlan) {
  if (action !== 'upgrade' && action !== 'downgrade') return;

  const samePlan = currentPlan === targetPlan;
  const targetAtLeastCurrent = isPlanAtLeast(targetPlan, currentPlan);
  const currentAtLeastTarget = isPlanAtLeast(currentPlan, targetPlan);
  const valid = action === 'upgrade'
    ? !samePlan && targetAtLeastCurrent
    : !samePlan && currentAtLeastTarget;

  if (!valid) {
    throw new BillingLifecycleRequestError('billing_invalid_plan_transition', 409);
  }
}

function assertProviderLifecycleState(action: BillingLifecycleAction, subscription: Stripe.Subscription) {
  if (action === 'cancel') return;

  if (action === 'reactivate') {
    if (subscription.status !== 'active' || !subscription.cancel_at_period_end) {
      throw new BillingLifecycleRequestError('billing_subscription_not_reactivatable', 409);
    }
    return;
  }

  if (subscription.status !== 'active') {
    throw new BillingLifecycleRequestError('billing_subscription_not_active', 409);
  }

  if (subscription.cancel_at_period_end) {
    throw new BillingLifecycleRequestError('billing_subscription_cancel_pending', 409);
  }
}

function stripeScheduleId(subscription: Stripe.Subscription) {
  if (!subscription.schedule) return null;
  return typeof subscription.schedule === 'string' ? subscription.schedule : subscription.schedule.id;
}

function scheduleItemPriceId(item: SchedulePhaseItem) {
  return typeof item.price === 'string' ? item.price : item.price.id;
}

function scheduleObjectId(value: string | { id?: string | null } | null | undefined) {
  if (typeof value === 'string') return value;
  return value?.id ?? null;
}

function scheduleDiscountParams(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  const discounts = value
    .map((discount) => {
      if (typeof discount === 'string') return { discount };
      if (!discount || typeof discount !== 'object') return null;
      const id = (discount as ScheduleItemDiscount).id;
      return id ? { discount: id } : null;
    })
    .filter((discount): discount is { discount: string } => Boolean(discount));
  return discounts.length > 0 ? discounts : undefined;
}

function scheduleTaxRateIds(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  const ids = value
    .map((taxRate) => scheduleObjectId(taxRate as string | { id?: string | null } | null | undefined))
    .filter((id): id is string => Boolean(id));
  return ids.length > 0 ? ids : undefined;
}

function phaseItemParams(item: SchedulePhaseItem) {
  const raw = item as SchedulePhaseItem & { discounts?: unknown; tax_rates?: unknown };
  return {
    price: scheduleItemPriceId(item),
    quantity: item.quantity ?? 1,
    ...(scheduleDiscountParams(raw.discounts) ? { discounts: scheduleDiscountParams(raw.discounts) } : {}),
    ...(scheduleTaxRateIds(raw.tax_rates) ? { tax_rates: scheduleTaxRateIds(raw.tax_rates) } : {}),
  };
}

function currentPhaseParams(phase: SchedulePhase): ScheduleUpdatePhase {
  const raw = phase as SchedulePhase & {
    discounts?: unknown;
    default_tax_rates?: unknown;
    default_payment_method?: string | { id?: string | null } | null;
    collection_method?: 'charge_automatically' | 'send_invoice' | null;
    trial_end?: number | null;
  };
  const discounts = scheduleDiscountParams(raw.discounts);
  const defaultTaxRates = scheduleTaxRateIds(raw.default_tax_rates);
  const defaultPaymentMethod = scheduleObjectId(raw.default_payment_method);

  return {
    items: phase.items.map(phaseItemParams),
    start_date: phase.start_date,
    end_date: phase.end_date,
    proration_behavior: phase.proration_behavior ?? 'none',
    ...(phase.metadata ? { metadata: phase.metadata } : {}),
    ...(discounts ? { discounts } : {}),
    ...(defaultTaxRates ? { default_tax_rates: defaultTaxRates } : {}),
    ...(defaultPaymentMethod ? { default_payment_method: defaultPaymentMethod } : {}),
    ...(raw.collection_method ? { collection_method: raw.collection_method } : {}),
    ...(typeof raw.trial_end === 'number' ? { trial_end: raw.trial_end } : {}),
  } as ScheduleUpdatePhase;
}

function canonicalScheduleItems(items: SchedulePhaseItem[]) {
  return items
    .map((item) => ({ price: scheduleItemPriceId(item), quantity: item.quantity ?? 1 }))
    .sort((left, right) => left.price.localeCompare(right.price) || left.quantity - right.quantity);
}

function canonicalSubscriptionItems(subscription: Stripe.Subscription) {
  return subscription.items.data
    .map((item) => ({ price: item.price.id, quantity: item.quantity ?? 1 }))
    .sort((left, right) => left.price.localeCompare(right.price) || left.quantity - right.quantity);
}

function assertScheduleCanAcceptDowngrade(schedule: Stripe.SubscriptionSchedule, subscription: Stripe.Subscription) {
  if (schedule.status !== 'active' && schedule.status !== 'not_started') {
    throw new BillingLifecycleRequestError('billing_schedule_conflict', 409);
  }

  if (schedule.phases.length !== 1) {
    throw new BillingLifecycleRequestError('billing_schedule_conflict', 409);
  }

  if (JSON.stringify(canonicalScheduleItems(schedule.phases[0].items)) !== JSON.stringify(canonicalSubscriptionItems(subscription))) {
    throw new BillingLifecycleRequestError('billing_schedule_conflict', 409);
  }
}

function futureDowngradePhase(input: {
  currentPhase: SchedulePhase;
  currentBasePriceId: string;
  targetPriceId: string;
  targetPlan: CanonicalSubscriptionPlan;
  organizationId: string;
  userId: string;
  interval: BillingInterval;
}): ScheduleUpdatePhase {
  const items = input.currentPhase.items.map((item) => {
    const params = phaseItemParams(item);
    return scheduleItemPriceId(item) === input.currentBasePriceId
      ? { ...params, price: input.targetPriceId, quantity: 1 }
      : params;
  });

  return {
    items,
    iterations: 1,
    proration_behavior: 'none',
    metadata: {
      ...(input.currentPhase.metadata ?? {}),
      organization_id: input.organizationId,
      user_id: input.userId,
      plan: input.targetPlan,
      billing_interval: input.interval,
      billing_transition: 'scheduled_downgrade',
    },
  } as ScheduleUpdatePhase;
}

async function scheduleDowngradeAtPeriodEnd(input: {
  stripe: ReturnType<typeof getStripeClient>;
  subscription: Stripe.Subscription;
  baseItem: Stripe.SubscriptionItem;
  targetPlan: CanonicalSubscriptionPlan;
  interval: BillingInterval;
  organizationId: string;
  userId: string;
  idempotency: BillingIdempotencyContext;
}) {
  let schedule: Stripe.SubscriptionSchedule;
  const existingScheduleId = stripeScheduleId(input.subscription);

  if (existingScheduleId) {
    schedule = await input.stripe.subscriptionSchedules.retrieve(existingScheduleId);
  } else {
    schedule = await input.stripe.subscriptionSchedules.create(
      { from_subscription: input.subscription.id },
      { idempotencyKey: deriveStripeIdempotencyKey(input.idempotency, 'subscription-downgrade-schedule-create') },
    );
  }

  assertScheduleCanAcceptDowngrade(schedule, input.subscription);
  const currentPhase = schedule.phases[0];
  const targetPriceId = getStripePriceId(input.targetPlan, input.interval);

  await input.stripe.subscriptionSchedules.update(
    schedule.id,
    {
      end_behavior: 'release',
      proration_behavior: 'none',
      metadata: {
        organization_id: input.organizationId,
        subscription_id: input.subscription.id,
        target_plan: input.targetPlan,
        billing_interval: input.interval,
        lifecycle: 'period_end_downgrade',
      },
      phases: [
        currentPhaseParams(currentPhase),
        futureDowngradePhase({
          currentPhase,
          currentBasePriceId: input.baseItem.price.id,
          targetPriceId,
          targetPlan: input.targetPlan,
          organizationId: input.organizationId,
          userId: input.userId,
          interval: input.interval,
        }),
      ],
    },
    { idempotencyKey: deriveStripeIdempotencyKey(input.idempotency, 'subscription-downgrade-schedule-update') },
  );

  return input.subscription;
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
  assertProviderLifecycleState(input.action, subscription);

  const baseItem = getBaseSubscriptionItem(subscription);
  const currentPlan = normalizeBillingPlanId(authority.plan ?? subscription.metadata.plan) ?? 'starter';
  const interval = input.interval ? normalizeBillingInterval(input.interval) : getCurrentBillingInterval(baseItem);
  const targetPlan = input.plan ?? currentPlan;
  assertPlanTransition(input.action, currentPlan, targetPlan);
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
  const isLegacyProviderRecovery = claim.kind === 'legacy_provider_succeeded_recovery';
  const recoveredSnapshot =
    claim.kind === 'claimed' || isLegacyProviderRecovery
      ? null
      : getBillingLifecycleReplaySnapshot(claim.request);

  if (claim.kind === 'audit_succeeded_recovery') {
    await completeBillingLifecycleRequest(requestId);
    return replayResult(recoveredSnapshot!);
  }

  let updated = subscription;
  const providerWasAlreadyCompleted = claim.kind === 'provider_succeeded_recovery' || isLegacyProviderRecovery;
  let providerSnapshot = recoveredSnapshot;

  if (isLegacyProviderRecovery) {
    assertLegacyRecoveredProviderState({
      action: input.action,
      subscription,
      baseItem,
      targetPlan,
      interval,
      addOns,
    });
    providerSnapshot = snapshotFromResult(lifecycleResult({
      subscription,
      plan: targetPlan,
      interval,
      addOns,
      idempotentReplay: true,
    }));
    await markBillingLifecycleLegacyProviderSucceeded(requestId, providerSnapshot);
  }

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
      } else if (input.action === 'downgrade') {
        updated = await scheduleDowngradeAtPeriodEnd({
          stripe,
          subscription,
          baseItem,
          targetPlan,
          interval,
          organizationId: input.organizationId,
          userId: input.userId,
          idempotency: input.idempotency,
        });
      } else {
        updated = await stripe.subscriptions.update(
          subscription.id,
          {
            proration_behavior: 'create_prorations',
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
      if (error instanceof BillingLifecycleRequestError) throw error;
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
      legacyProviderSnapshotRecovered: isLegacyProviderRecovery,
      durableResultSnapshot: true,
      scheduledForPeriodEnd: input.action === 'downgrade',
      scheduledEffectiveAt: input.action === 'downgrade' ? providerSnapshot.currentPeriodEnd : null,
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
