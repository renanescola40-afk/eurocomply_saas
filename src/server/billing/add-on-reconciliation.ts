import Stripe from 'stripe';

import { writeAuditLog } from '@/lib/security/audit-log';
import { createAdminClient } from '@/lib/supabase/admin';
import { getBillingAddOnSlugForStripePriceId } from '@/server/billing/add-ons';
import { getStripeClient } from '@/server/billing/stripe';

const SUPPORTED_ADD_ON_EVENTS = new Set([
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_failed',
  'invoice.paid',
]);

type SubscriptionItemWithPeriod = Stripe.SubscriptionItem & {
  current_period_start?: number | null;
  current_period_end?: number | null;
};

type SubscriptionWithLegacyPeriod = Stripe.Subscription & {
  current_period_start?: number | null;
  current_period_end?: number | null;
};

type InvoiceWithSubscription = Stripe.Invoice & {
  subscription?: string | Stripe.Subscription | null;
  parent?: {
    subscription_details?: {
      subscription?: string | null;
    } | null;
  } | null;
};

type SubscriptionBinding = {
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
};

function stripeObjectId(value: string | { id?: string | null } | null | undefined) {
  if (typeof value === 'string' && value.trim()) return value.trim();
  return value && typeof value.id === 'string' && value.id.trim() ? value.id.trim() : null;
}

function organizationIdFromSubscription(subscription: Stripe.Subscription) {
  const value = subscription.metadata.organization_id ?? subscription.metadata.organizationId;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function invoiceSubscriptionId(invoice: InvoiceWithSubscription) {
  const direct = stripeObjectId(invoice.subscription);
  if (direct) return direct;
  const parent = invoice.parent?.subscription_details?.subscription;
  return typeof parent === 'string' && parent.trim() ? parent.trim() : null;
}

async function canonicalSubscriptionForEvent(event: Stripe.Event) {
  if (
    event.type === 'customer.subscription.created'
    || event.type === 'customer.subscription.updated'
    || event.type === 'customer.subscription.deleted'
  ) {
    return event.data.object as Stripe.Subscription;
  }

  if (event.type !== 'invoice.payment_failed' && event.type !== 'invoice.paid') return null;
  const invoice = event.data.object as InvoiceWithSubscription;
  const subscriptionId = invoiceSubscriptionId(invoice);
  if (!subscriptionId) throw new Error('stripe_add_on_invoice_subscription_missing');

  return getStripeClient().subscriptions.retrieve(subscriptionId, {
    expand: ['items.data.price'],
  });
}

async function assertSubscriptionBinding(subscription: Stripe.Subscription, organizationId: string) {
  const customerId = stripeObjectId(subscription.customer);
  if (!customerId) throw new Error('stripe_add_on_customer_missing');

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id,stripe_subscription_id')
    .eq('organization_id', organizationId)
    .maybeSingle<SubscriptionBinding>();

  if (error) throw error;
  if (!data?.stripe_subscription_id) throw new Error('stripe_add_on_subscription_binding_missing');
  if (data.stripe_subscription_id !== subscription.id) throw new Error('stripe_add_on_subscription_binding_mismatch');
  if (data.stripe_customer_id && data.stripe_customer_id !== customerId) throw new Error('stripe_add_on_customer_binding_mismatch');
}

function rowStatus(event: Stripe.Event, subscription: Stripe.Subscription) {
  if (event.type === 'customer.subscription.deleted') return 'cancelled' as const;
  if (event.type === 'invoice.payment_failed') return 'past_due' as const;
  if (event.type === 'invoice.paid') return 'active' as const;
  if (subscription.status === 'active') return 'active' as const;
  if (subscription.status === 'past_due' || subscription.status === 'unpaid') return 'past_due' as const;
  return 'inactive' as const;
}

function isoFromEpoch(value: number | null | undefined) {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
    ? new Date(value * 1000).toISOString()
    : null;
}

function itemPeriod(item: SubscriptionItemWithPeriod, subscription: SubscriptionWithLegacyPeriod) {
  return {
    start: isoFromEpoch(item.current_period_start ?? subscription.current_period_start),
    end: isoFromEpoch(item.current_period_end ?? subscription.current_period_end),
  };
}

export async function reconcileOrganizationAddOnsFromStripeEvent(event: Stripe.Event) {
  if (!SUPPORTED_ADD_ON_EVENTS.has(event.type)) {
    return { outcome: 'unsupported' as const, reconciled: 0, removed: 0 };
  }

  const subscription = await canonicalSubscriptionForEvent(event);
  if (!subscription) return { outcome: 'unsupported' as const, reconciled: 0, removed: 0 };

  const organizationId = organizationIdFromSubscription(subscription);
  if (!organizationId) throw new Error('stripe_add_on_organization_missing');
  await assertSubscriptionBinding(subscription, organizationId);

  const supabase = createAdminClient();
  const status = rowStatus(event, subscription);
  const observedAt = new Date(event.created * 1000).toISOString();
  const matchedSlugs = new Set<string>();
  let reconciled = 0;

  if (event.type !== 'customer.subscription.deleted') {
    for (const rawItem of subscription.items.data) {
      const item = rawItem as SubscriptionItemWithPeriod;
      const slug = getBillingAddOnSlugForStripePriceId(item.price.id);
      if (!slug) continue;

      const period = itemPeriod(item, subscription as SubscriptionWithLegacyPeriod);
      matchedSlugs.add(slug);

      const { error } = await supabase.from('organization_add_ons').upsert({
        organization_id: organizationId,
        add_on_id: slug,
        status,
        stripe_subscription_item_id: item.id,
        stripe_price_id: item.price.id,
        quantity: Math.max(1, item.quantity ?? 1),
        current_period_start: period.start,
        current_period_end: period.end,
        activated_at: status === 'active' ? observedAt : null,
        cancelled_at: null,
        metadata: {
          stripe_event_id: event.id,
          stripe_event_type: event.type,
          livemode: event.livemode,
          source: 'stripe_subscription_items',
        },
        updated_at: new Date().toISOString(),
      }, { onConflict: 'organization_id,add_on_id' });

      if (error) throw error;
      reconciled += 1;
    }
  }

  const { data: existingRows, error: existingError } = await supabase
    .from('organization_add_ons')
    .select('add_on_id,status')
    .eq('organization_id', organizationId);
  if (existingError) throw existingError;

  let removed = 0;
  for (const existing of existingRows ?? []) {
    const addOnId = typeof existing.add_on_id === 'string' ? existing.add_on_id : null;
    if (!addOnId || matchedSlugs.has(addOnId)) continue;
    if (existing.status === 'cancelled') continue;

    const { error } = await supabase
      .from('organization_add_ons')
      .update({
        status: 'cancelled',
        cancelled_at: observedAt,
        current_period_end: observedAt,
        metadata: {
          stripe_event_id: event.id,
          stripe_event_type: event.type,
          livemode: event.livemode,
          source: 'stripe_subscription_items',
          removal_reconciled: true,
        },
      })
      .eq('organization_id', organizationId)
      .eq('add_on_id', addOnId);
    if (error) throw error;
    removed += 1;
  }

  await writeAuditLog({
    action: 'billing.add_ons_reconciled',
    organizationId,
    userId: null,
    entityType: 'stripe_subscription',
    entityId: subscription.id,
    metadata: {
      stripeEventId: event.id,
      stripeEventType: event.type,
      livemode: event.livemode,
      status,
      reconciled,
      removed,
    },
  });

  return {
    outcome: 'reconciled' as const,
    organizationId,
    subscriptionId: subscription.id,
    status,
    reconciled,
    removed,
  };
}
