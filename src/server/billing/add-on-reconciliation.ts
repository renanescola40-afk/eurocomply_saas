import Stripe from 'stripe';

import { getBillingAddOn, isAddOnAvailableForPlan, isBillingAddOnCommerciallyActive } from '@/lib/billing/add-ons';
import { writeAuditLog } from '@/lib/security/audit-log';
import { createAdminClient } from '@/lib/supabase/admin';
import { getBillingAddOnSlugForStripePriceId } from '@/server/billing/add-ons';
import { normalizeBillingPlanId, type BillingPlan } from '@/server/billing/plans';
import { getStripeClient } from '@/server/billing/stripe';

const SUPPORTED_ADD_ON_EVENTS = new Set([
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_failed',
  'invoice.paid',
]);

const PRESERVED_PENDING_PAYMENT_STATUSES = new Set(['active', 'trialing', 'past_due']);
const MAX_INVOICE_LINE_ITEMS = 100;

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
      metadata?: Stripe.Metadata | null;
    } | null;
  } | null;
};

type InvoiceLineWithSubscriptionItem = Stripe.InvoiceLineItem & {
  subscription_item?: string | Stripe.SubscriptionItem | null;
  parent?: {
    subscription_item_details?: {
      subscription_item?: string | Stripe.SubscriptionItem | null;
    } | null;
  } | null;
};

type ReconciliationProviderState = {
  subscription: Stripe.Subscription;
  paidSubscriptionItemIds: Set<string> | null;
  invoiceId: string | null;
};

type SubscriptionBinding = {
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan: string | null;
};

type ExistingAddOnRow = {
  add_on_id: string | null;
  status: string | null;
  stripe_subscription_item_id: string | null;
  activated_at: string | null;
};

function stripeObjectId(value: string | { id?: string | null } | null | undefined) {
  if (typeof value === 'string') return value.trim() || null;
  if (!value || typeof value !== 'object') return null;
  const id = value.id;
  return typeof id === 'string' && id.trim() ? id.trim() : null;
}

function organizationIdFromMetadata(metadata: Stripe.Metadata | null | undefined) {
  const value = metadata?.organization_id ?? metadata?.organizationId;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function organizationIdFromSubscription(subscription: Stripe.Subscription) {
  return organizationIdFromMetadata(subscription.metadata);
}

function subscriptionHasKnownAddOn(subscription: Stripe.Subscription) {
  const items = subscription.items?.data;
  if (!Array.isArray(items)) return false;
  return items.some((item) => Boolean(getBillingAddOnSlugForStripePriceId(item.price?.id)));
}

function invoiceSubscriptionId(invoice: InvoiceWithSubscription) {
  const direct = stripeObjectId(invoice.subscription);
  if (direct) return direct;
  const parent = invoice.parent?.subscription_details?.subscription;
  return typeof parent === 'string' && parent.trim() ? parent.trim() : null;
}

function invoiceLineSubscriptionItemId(line: InvoiceLineWithSubscriptionItem) {
  const legacy = stripeObjectId(line.subscription_item);
  if (legacy) return legacy;
  return stripeObjectId(line.parent?.subscription_item_details?.subscription_item);
}

async function paidInvoiceSubscriptionItemIds(invoiceId: string) {
  const lines = await getStripeClient().invoices.listLineItems(invoiceId, { limit: MAX_INVOICE_LINE_ITEMS });
  if (lines.has_more) throw new Error('stripe_add_on_invoice_lines_incomplete');

  const ids = new Set<string>();
  for (const line of lines.data as InvoiceLineWithSubscriptionItem[]) {
    const subscriptionItemId = invoiceLineSubscriptionItemId(line);
    if (subscriptionItemId) ids.add(subscriptionItemId);
  }
  return ids;
}

async function canonicalProviderStateForEvent(event: Stripe.Event): Promise<ReconciliationProviderState | null> {
  if (
    event.type === 'customer.subscription.created'
    || event.type === 'customer.subscription.updated'
    || event.type === 'customer.subscription.deleted'
  ) {
    return {
      subscription: event.data.object as Stripe.Subscription,
      paidSubscriptionItemIds: null,
      invoiceId: null,
    };
  }

  if (event.type !== 'invoice.payment_failed' && event.type !== 'invoice.paid') return null;
  const invoice = event.data.object as InvoiceWithSubscription;
  const subscriptionId = invoiceSubscriptionId(invoice);
  if (!subscriptionId) return null;

  const subscription = await getStripeClient().subscriptions.retrieve(subscriptionId, {
    expand: ['items.data.price'],
  });

  return {
    subscription,
    paidSubscriptionItemIds: event.type === 'invoice.paid'
      ? await paidInvoiceSubscriptionItemIds(invoice.id)
      : null,
    invoiceId: invoice.id,
  };
}

async function assertSubscriptionBinding(subscription: Stripe.Subscription, organizationId: string): Promise<BillingPlan> {
  const customerId = stripeObjectId(subscription.customer);
  if (!customerId) throw new Error('stripe_add_on_customer_missing');

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id,stripe_subscription_id,plan')
    .eq('organization_id', organizationId)
    .eq('stripe_subscription_id', subscription.id)
    .limit(2);

  if (error) throw error;
  const rows = (data ?? []) as SubscriptionBinding[];
  if (rows.length === 0) throw new Error('stripe_add_on_subscription_binding_missing');
  if (rows.length !== 1) throw new Error('stripe_add_on_subscription_binding_ambiguous');

  const binding = rows[0];
  if (!binding.stripe_customer_id) {
    throw new Error('stripe_add_on_customer_binding_missing');
  }
  if (binding.stripe_customer_id !== customerId) {
    throw new Error('stripe_add_on_customer_binding_mismatch');
  }

  const plan = normalizeBillingPlanId(binding.plan ?? subscription.metadata?.plan);
  if (!plan) throw new Error('stripe_add_on_plan_binding_missing');
  return plan;
}

export function resolveReconciledAddOnStatus(
  eventType: string,
  subscriptionStatus: string,
  existingStatus?: string | null,
  paidByCurrentInvoice = true,
) {
  if (eventType === 'customer.subscription.deleted') return 'cancelled' as const;
  if (eventType === 'invoice.payment_failed') return 'past_due' as const;

  if (eventType === 'invoice.paid') {
    if (subscriptionStatus === 'canceled' || subscriptionStatus === 'incomplete_expired') return 'cancelled' as const;
    if (subscriptionStatus === 'unpaid') return 'past_due' as const;

    // Never let an unrelated or delayed invoice activate a subscription item that
    // did not contribute a line to that exact paid invoice. Preserve already-paid
    // authority, but keep new/past-due items fail-closed until their own invoice pays.
    if (!paidByCurrentInvoice) {
      if (existingStatus === 'active') return 'active' as const;
      if (existingStatus === 'past_due') return 'past_due' as const;
      if (existingStatus === 'trialing') return 'trialing' as const;
      return 'inactive' as const;
    }

    return 'active' as const;
  }

  if (subscriptionStatus === 'past_due' || subscriptionStatus === 'unpaid') return 'past_due' as const;
  if (subscriptionStatus === 'canceled' || subscriptionStatus === 'incomplete_expired') return 'cancelled' as const;
  if (subscriptionStatus === 'trialing') return 'trialing' as const;

  if (subscriptionStatus === 'active') {
    if (existingStatus && PRESERVED_PENDING_PAYMENT_STATUSES.has(existingStatus)) {
      return existingStatus as 'active' | 'trialing' | 'past_due';
    }
    return 'inactive' as const;
  }

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

  const providerState = await canonicalProviderStateForEvent(event);
  if (!providerState) return { outcome: 'not_applicable' as const, reconciled: 0, removed: 0 };

  const { subscription, paidSubscriptionItemIds, invoiceId } = providerState;
  const hasKnownAddOn = subscriptionHasKnownAddOn(subscription);
  const organizationId = organizationIdFromSubscription(subscription);
  const customerId = stripeObjectId(subscription.customer);

  if (!organizationId) {
    if (hasKnownAddOn) throw new Error('stripe_add_on_organization_missing');
    return { outcome: 'not_applicable' as const, reconciled: 0, removed: 0 };
  }

  if (!customerId && !hasKnownAddOn) {
    return { outcome: 'not_applicable' as const, reconciled: 0, removed: 0 };
  }

  const plan = await assertSubscriptionBinding(subscription, organizationId);

  const supabase = createAdminClient();
  const observedAt = new Date(event.created * 1000).toISOString();
  const matchedSlugs = new Set<string>();

  const { data: existingRowsData, error: existingError } = await supabase
    .from('organization_add_ons')
    .select('add_on_id,status,stripe_subscription_item_id,activated_at')
    .eq('organization_id', organizationId);
  if (existingError) throw existingError;

  const existingRows = (existingRowsData ?? []) as ExistingAddOnRow[];
  const existingBySlug = new Map(
    existingRows
      .filter((row): row is ExistingAddOnRow & { add_on_id: string } => typeof row.add_on_id === 'string' && Boolean(row.add_on_id))
      .map((row) => [row.add_on_id, row]),
  );

  let reconciled = 0;

  if (event.type !== 'customer.subscription.deleted') {
    for (const rawItem of subscription.items?.data ?? []) {
      const item = rawItem as SubscriptionItemWithPeriod;
      const slug = getBillingAddOnSlugForStripePriceId(item.price.id);
      if (!slug) continue;

      const addOn = getBillingAddOn(slug);
      if (!addOn || !isBillingAddOnCommerciallyActive(addOn)) {
        throw new Error('stripe_add_on_price_not_commercially_active');
      }
      if (!isAddOnAvailableForPlan(addOn, plan)) {
        throw new Error('stripe_add_on_not_available_for_plan');
      }

      const existing = existingBySlug.get(slug);
      const paidByCurrentInvoice = event.type !== 'invoice.paid'
        || Boolean(paidSubscriptionItemIds?.has(item.id));
      const status = resolveReconciledAddOnStatus(
        event.type,
        subscription.status,
        existing?.status,
        paidByCurrentInvoice,
      );
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
        activated_at: status === 'active' ? existing?.activated_at ?? observedAt : existing?.activated_at ?? null,
        cancelled_at: status === 'cancelled' ? observedAt : null,
        metadata: {
          stripe_event_id: event.id,
          stripe_event_type: event.type,
          stripe_invoice_id: invoiceId,
          livemode: event.livemode,
          source: 'stripe_subscription_items',
          payment_confirmed: event.type === 'invoice.paid' && paidByCurrentInvoice,
        },
        updated_at: new Date().toISOString(),
      }, { onConflict: 'organization_id,add_on_id' });

      if (error) throw error;
      reconciled += 1;
    }
  }

  let removed = 0;
  for (const existing of existingRows) {
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
          stripe_invoice_id: invoiceId,
          livemode: event.livemode,
          source: 'stripe_subscription_items',
          removal_reconciled: true,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('organization_id', organizationId)
      .eq('add_on_id', addOnId);
    if (error) throw error;
    removed += 1;
  }

  const audit = await writeAuditLog({
    action: 'billing.add_ons_reconciled',
    organizationId,
    userId: null,
    entityType: 'stripe_subscription',
    entityId: subscription.id,
    metadata: {
      stripeEventId: event.id,
      stripeEventType: event.type,
      stripeInvoiceId: invoiceId,
      livemode: event.livemode,
      plan,
      reconciled,
      removed,
      paymentConfirmed: event.type === 'invoice.paid',
    },
  });

  if (!audit.persisted) throw new Error('stripe_add_on_reconciliation_audit_unavailable');

  return {
    outcome: 'reconciled' as const,
    organizationId,
    subscriptionId: subscription.id,
    plan,
    reconciled,
    removed,
  };
}
