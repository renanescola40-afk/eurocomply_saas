import type Stripe from 'stripe';

type InvoiceWithSubscriptionReference = Stripe.Invoice & {
  subscription?: string | Stripe.Subscription | null;
  parent?: {
    subscription_details?: {
      subscription?: string | Stripe.Subscription | null;
    } | null;
  } | null;
};

function stripeObjectId(value: string | { id?: string | null } | null | undefined) {
  if (typeof value === 'string') {
    const id = value.trim();
    return id || null;
  }

  if (!value) return null;
  const id = value.id;
  return typeof id === 'string' && id.trim() ? id.trim() : null;
}

/** Resolve the Stripe subscription from either legacy or current invoice shape.
 * A conflicting dual reference is not a valid billing authority. */
export function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const compatible = invoice as InvoiceWithSubscriptionReference;
  const legacyId = stripeObjectId(compatible.subscription);
  const parentId = stripeObjectId(compatible.parent?.subscription_details?.subscription);

  if (legacyId && parentId && legacyId !== parentId) {
    throw new Error('stripe_invoice_subscription_reference_mismatch');
  }

  return parentId ?? legacyId;
}
