import type Stripe from 'stripe';

import { getStripeClient } from '@/server/billing/stripe';
import { upsertSubscriptionFromStripe } from '@/server/billing/stripe-webhooks';

type InvoiceWithSubscriptionReference = Stripe.Invoice & {
  subscription?: string | Stripe.Subscription | null;
  parent?: {
    subscription_details?: {
      subscription?: string | Stripe.Subscription | null;
    } | null;
  } | null;
};

function stripeObjectId(value: string | { id?: string | null } | null | undefined) {
  if (typeof value === 'string' && value.trim()) return value.trim();
  return value?.id?.trim() || null;
}

function invoiceSubscriptionId(invoice: Stripe.Invoice) {
  const compatible = invoice as InvoiceWithSubscriptionReference;
  return stripeObjectId(
    compatible.subscription
      ?? compatible.parent?.subscription_details?.subscription
      ?? null,
  );
}

/**
 * Invoice lifecycle events can arrive before the corresponding subscription
 * update. Refresh the canonical subscription row from Stripe after signature and
 * live/test-mode validation, but before event side effects. This never trusts the
 * invoice payload for plan/status and does not mark the Stripe event processed;
 * the existing durable event ledger remains the replay/idempotency authority.
 */
export async function syncStripeSubscriptionForInvoiceEvent(event: Stripe.Event) {
  if (event.type !== 'invoice.paid' && event.type !== 'invoice.payment_failed') {
    return { synced: false as const, reason: 'not_invoice_lifecycle_event' as const };
  }

  const invoice = event.data.object as Stripe.Invoice;
  const subscriptionId = invoiceSubscriptionId(invoice);
  if (!subscriptionId) {
    return { synced: false as const, reason: 'subscription_not_present' as const };
  }

  const subscription = await getStripeClient().subscriptions.retrieve(subscriptionId);
  await upsertSubscriptionFromStripe(subscription);

  return {
    synced: true as const,
    subscriptionId,
    status: subscription.status,
  };
}
