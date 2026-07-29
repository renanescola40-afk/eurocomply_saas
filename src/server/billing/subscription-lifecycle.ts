import type Stripe from 'stripe';

import { writeAuditLog } from '@/lib/security/audit-log';
import { createAdminClient } from '@/lib/supabase/admin';
import { classifyProviderFailure } from '@/server/providers/failure';
import type { CanonicalSubscriptionPlan } from '@/server/queries/subscription';
import { getStripeAddOnPriceId, normalizeAddOnSelections, type BillingAddOnSelection } from './add-ons';
import { getStripeClient } from './stripe';
import { getStripePriceId, normalizeBillingInterval, type BillingInterval } from './plans';

export type BillingLifecycleAction = 'upgrade' | 'downgrade' | 'cancel' | 'reactivate' | 'replace_add_ons';

type SubscriptionAuthority = {
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  plan: string | null;
  status: string | null;
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

function buildAddOnItems(selections: BillingAddOnSelection[], interval: BillingInterval) {
  return selections.map((selection) => ({ price: getStripeAddOnPriceId(selection.slug, interval), quantity: selection.quantity }));
}

export async function mutateSubscriptionLifecycle(input: {
  action: BillingLifecycleAction;
  organizationId: string;
  userId: string;
  actorRole: string;
  plan?: CanonicalSubscriptionPlan;
  interval?: string | null;
  addOns?: Array<{ slug?: unknown; quantity?: unknown }>;
}) {
  const authority = await getSubscriptionAuthority(input.organizationId);
  const stripe = getStripeClient();
  let subscription: Stripe.Subscription;

  try {
    subscription = await stripe.subscriptions.retrieve(authority.stripe_subscription_id!);
  } catch (error) {
    throw classifyProviderFailure('stripe', 'subscription_retrieve', error);
  }

  const interval = normalizeBillingInterval(input.interval);
  const baseItem = getBaseSubscriptionItem(subscription);
  const currentPlan = (authority.plan ?? subscription.metadata.plan ?? 'starter') as CanonicalSubscriptionPlan;
  const targetPlan = input.plan ?? currentPlan;
  const addOns = normalizeAddOnSelections(input.addOns, targetPlan);

  let updated: Stripe.Subscription;
  try {
    if (input.action === 'cancel') {
      updated = await stripe.subscriptions.update(subscription.id, { cancel_at_period_end: true });
    } else if (input.action === 'reactivate') {
      updated = await stripe.subscriptions.update(subscription.id, { cancel_at_period_end: false });
    } else {
      const isDowngrade = input.action === 'downgrade';
      updated = await stripe.subscriptions.update(subscription.id, {
        cancel_at_period_end: false,
        proration_behavior: isDowngrade ? 'none' : 'create_prorations',
        billing_cycle_anchor: 'unchanged',
        items: [
          { id: baseItem.id, price: getStripePriceId(targetPlan, interval), quantity: 1 },
          ...subscription.items.data.filter((item) => item.id !== baseItem.id).map((item) => ({ id: item.id, deleted: true as const })),
          ...buildAddOnItems(addOns, interval),
        ],
        metadata: { ...subscription.metadata, organization_id: input.organizationId, user_id: input.userId, plan: targetPlan, billing_interval: interval },
      });
    }
  } catch (error) {
    throw classifyProviderFailure('stripe', `subscription_${input.action}`, error);
  }

  const audit = await writeAuditLog({
    action: `billing.subscription_${input.action}`,
    organizationId: input.organizationId,
    userId: input.userId,
    entityType: 'stripe_subscription',
    entityId: subscription.id,
    metadata: {
      previousPlan: currentPlan,
      targetPlan,
      interval,
      addOns,
      actorRole: input.actorRole,
      cancelAtPeriodEnd: updated.cancel_at_period_end,
      providerStatus: updated.status,
    },
  });
  if (!audit.persisted) throw new Error('billing_lifecycle_audit_unavailable');

  return {
    subscriptionId: updated.id,
    status: updated.status,
    cancelAtPeriodEnd: updated.cancel_at_period_end,
    currentPeriodEnd: updated.current_period_end,
    plan: targetPlan,
    interval,
    addOns,
  };
}
