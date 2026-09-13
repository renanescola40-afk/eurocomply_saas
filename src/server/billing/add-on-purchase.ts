import type Stripe from 'stripe';

import {
  getBillingAddOn,
  isAddOnAvailableForPlan,
  isBillingAddOnCommerciallyActive,
  type BillingAddOn,
} from '@/lib/billing/add-ons';
import { writeAuditLog } from '@/lib/security/audit-log';
import { createAdminClient } from '@/lib/supabase/admin';
import { classifyProviderFailure } from '@/server/providers/failure';
import type { CanonicalSubscriptionPlan } from '@/server/queries/subscription';
import {
  getAuthoritativeSignedContractPlan,
  hasProcessedLiveStripeSubscriptionAuthority,
} from './subscription-authority';
import { getStripeAddOnPriceId } from './add-ons';
import { deriveStripeIdempotencyKey, type BillingIdempotencyContext } from './idempotency';
import { getStripeClient } from './stripe';
import { getBaseSubscriptionItem, getProviderAddOnSelections } from './subscription-lifecycle';
import { normalizeBillingPlanId } from './plans';

const PLAN_RANK: Record<CanonicalSubscriptionPlan, number> = {
  starter: 1,
  professional: 2,
  business: 3,
  enterprise: 4,
};

const MAX_ADD_ON_QUANTITY = 10_000;

type SubscriptionBinding = {
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan: string | null;
  status: string | null;
};

type ActiveAddOnRow = {
  add_on_id: string | null;
  status: string | null;
};

type InvoiceWithSubscription = Stripe.Invoice & {
  subscription?: string | Stripe.Subscription | null;
  parent?: {
    subscription_details?: {
      subscription?: string | null;
    } | null;
  } | null;
};

export class AddOnPurchaseError extends Error {
  constructor(public readonly code: string, public readonly status = 409) {
    super(code);
    this.name = 'AddOnPurchaseError';
  }
}

export function isAddOnPurchaseError(error: unknown): error is AddOnPurchaseError {
  return error instanceof AddOnPurchaseError;
}

function stripeObjectId(value: string | { id?: string | null } | null | undefined) {
  if (typeof value === 'string') return value.trim() || null;
  return value?.id?.trim() || null;
}

function invoiceSubscriptionId(invoice: InvoiceWithSubscription) {
  const direct = stripeObjectId(invoice.subscription);
  if (direct) return direct;
  const parent = invoice.parent?.subscription_details?.subscription;
  return typeof parent === 'string' && parent.trim() ? parent.trim() : null;
}

function planIncludesAddOn(plan: CanonicalSubscriptionPlan, addOn: BillingAddOn) {
  return Boolean(addOn.includedFrom && PLAN_RANK[plan] >= PLAN_RANK[addOn.includedFrom]);
}

function normalizeRequestedQuantity(addOn: BillingAddOn, quantity: number | null | undefined) {
  const normalized = quantity ?? 1;
  if (!Number.isInteger(normalized) || normalized < 1 || normalized > MAX_ADD_ON_QUANTITY) {
    throw new AddOnPurchaseError('invalid_add_on_quantity', 400);
  }
  if (addOn.category !== 'capacity' && normalized !== 1) {
    throw new AddOnPurchaseError('functional_add_on_quantity_must_be_one', 400);
  }
  return normalized;
}

async function getAuthoritativeBinding(organizationId: string) {
  if (await getAuthoritativeSignedContractPlan(organizationId)) {
    throw new AddOnPurchaseError('contract_managed_billing');
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id,stripe_subscription_id,plan,status')
    .eq('organization_id', organizationId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle<SubscriptionBinding>();

  if (error) throw classifyProviderFailure('supabase', 'add_on_purchase_binding_lookup', error);
  if (!data?.stripe_customer_id || !data.stripe_subscription_id) {
    throw new AddOnPurchaseError('live_stripe_subscription_not_found');
  }

  const authoritative = await hasProcessedLiveStripeSubscriptionAuthority({
    organizationId,
    stripeCustomerId: data.stripe_customer_id,
    stripeSubscriptionId: data.stripe_subscription_id,
  });
  if (!authoritative) throw new AddOnPurchaseError('live_stripe_subscription_not_found');

  return data;
}

async function activeOrganizationAddOnIds(organizationId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('organization_add_ons')
    .select('add_on_id,status')
    .eq('organization_id', organizationId)
    .eq('status', 'active');
  if (error) throw classifyProviderFailure('supabase', 'active_add_on_lookup', error);

  return new Set(
    ((data ?? []) as ActiveAddOnRow[])
      .map((row) => row.add_on_id)
      .filter((value): value is string => typeof value === 'string' && Boolean(value)),
  );
}

async function getPurchaseContext(organizationId: string, addOnSlug: string, quantity?: number) {
  const addOn = getBillingAddOn(addOnSlug);
  if (!addOn) throw new AddOnPurchaseError('unknown_add_on', 400);
  if (!isBillingAddOnCommerciallyActive(addOn)) {
    throw new AddOnPurchaseError('add_on_not_commercially_available');
  }

  const binding = await getAuthoritativeBinding(organizationId);
  const stripe = getStripeClient();
  let subscription: Stripe.Subscription;
  try {
    subscription = await stripe.subscriptions.retrieve(binding.stripe_subscription_id!, {
      expand: ['items.data.price'],
    });
  } catch (error) {
    throw classifyProviderFailure('stripe', 'add_on_purchase_subscription_retrieve', error);
  }

  const customerId = stripeObjectId(subscription.customer);
  if (!customerId || customerId !== binding.stripe_customer_id) {
    throw new AddOnPurchaseError('stripe_subscription_customer_mismatch');
  }
  const providerOrganizationId = subscription.metadata.organization_id ?? subscription.metadata.organizationId ?? null;
  if (providerOrganizationId && providerOrganizationId !== organizationId) {
    throw new AddOnPurchaseError('stripe_subscription_organization_mismatch');
  }
  if (subscription.status !== 'active') {
    throw new AddOnPurchaseError('billing_subscription_not_active');
  }
  if (subscription.cancel_at_period_end) {
    throw new AddOnPurchaseError('billing_subscription_cancel_pending');
  }
  if (subscription.collection_method !== 'charge_automatically') {
    throw new AddOnPurchaseError('sales_assisted_collection_required');
  }

  const baseItem = getBaseSubscriptionItem(subscription);
  const interval = baseItem.price.recurring?.interval === 'year' ? 'year' : 'month';
  if (interval !== 'month') {
    throw new AddOnPurchaseError('annual_add_on_purchase_not_available');
  }

  const plan = normalizeBillingPlanId(binding.plan ?? subscription.metadata.plan);
  if (!plan) throw new AddOnPurchaseError('billing_plan_authority_missing');
  if (planIncludesAddOn(plan, addOn)) throw new AddOnPurchaseError('add_on_included_in_plan');
  if (!isAddOnAvailableForPlan(addOn, plan)) throw new AddOnPurchaseError('add_on_not_available_for_plan');

  const providerAddOns = getProviderAddOnSelections(subscription, baseItem.id);
  const providerSelection = providerAddOns.find((selection) => selection.slug === addOn.slug);
  const normalizedQuantity = normalizeRequestedQuantity(addOn, quantity);
  const activeAddOns = await activeOrganizationAddOnIds(organizationId);

  for (const dependencySlug of addOn.dependencies) {
    const dependency = getBillingAddOn(dependencySlug);
    const included = Boolean(dependency && planIncludesAddOn(plan, dependency));
    if (!included && !activeAddOns.has(dependencySlug)) {
      throw new AddOnPurchaseError(`missing_add_on_dependency_${dependencySlug}`);
    }
  }

  return {
    addOn,
    binding,
    stripe,
    subscription,
    baseItem,
    plan,
    providerSelection,
    quantity: normalizedQuantity,
    priceId: getStripeAddOnPriceId(addOn.slug, 'month'),
  };
}

function previewItems(subscription: Stripe.Subscription, addOnPriceId: string, quantity: number) {
  return [
    ...subscription.items.data.map((item) => ({
      id: item.id,
      price: item.price.id,
      quantity: item.quantity ?? 1,
    })),
    { price: addOnPriceId, quantity },
  ];
}

function totalTaxCents(invoice: Stripe.Invoice) {
  const taxAmounts = invoice.total_tax_amounts ?? [];
  return taxAmounts.reduce((total, tax) => total + tax.amount, 0);
}

export async function getAddOnPurchasePreview(input: {
  organizationId: string;
  addOnSlug: string;
  quantity?: number;
}) {
  const context = await getPurchaseContext(input.organizationId, input.addOnSlug, input.quantity);
  if (context.providerSelection) {
    throw new AddOnPurchaseError('add_on_already_present');
  }
  if (context.subscription.pending_update) {
    throw new AddOnPurchaseError('billing_pending_update_exists');
  }

  const prorationDate = Math.floor(Date.now() / 1000);
  let invoice: Stripe.Invoice;
  try {
    invoice = await context.stripe.invoices.createPreview({
      customer: context.binding.stripe_customer_id!,
      subscription: context.subscription.id,
      subscription_details: {
        items: previewItems(context.subscription, context.priceId, context.quantity),
        proration_behavior: 'always_invoice',
        proration_date: prorationDate,
      },
    });
  } catch (error) {
    throw classifyProviderFailure('stripe', 'add_on_purchase_invoice_preview', error);
  }

  return {
    addOn: {
      slug: context.addOn.slug,
      name: context.addOn.name,
      description: context.addOn.description,
      priceMonthly: context.addOn.priceMonthly,
      priceAnnual: context.addOn.priceAnnual,
      quantity: context.quantity,
    },
    plan: context.plan,
    currency: invoice.currency.toUpperCase(),
    subtotalCents: invoice.subtotal,
    taxCents: totalTaxCents(invoice),
    amountDueNowCents: invoice.total,
    recurringMonthlyCents: context.addOn.priceMonthly * 100 * context.quantity,
    providerCalculatedAt: new Date(prorationDate * 1000).toISOString(),
  };
}

export async function beginAddOnPurchase(input: {
  organizationId: string;
  userId: string;
  actorRole: string;
  addOnSlug: string;
  quantity?: number;
  idempotency: BillingIdempotencyContext;
}) {
  const context = await getPurchaseContext(input.organizationId, input.addOnSlug, input.quantity);

  // A lost client response after a successful provider mutation must not create a
  // second subscription item. Provider presence is authoritative and turns a retry
  // into a safe processing response while webhook reconciliation catches up.
  if (context.providerSelection) {
    return {
      outcome: 'already_present' as const,
      paymentState: 'processing' as const,
      subscriptionId: context.subscription.id,
      invoiceId: null,
      hostedInvoiceUrl: null,
    };
  }
  if (context.subscription.pending_update) {
    throw new AddOnPurchaseError('billing_pending_update_exists');
  }

  const prorationDate = Math.floor(Date.now() / 1000);
  let updated: Stripe.Subscription;
  try {
    updated = await context.stripe.subscriptions.update(
      context.subscription.id,
      {
        payment_behavior: 'pending_if_incomplete',
        proration_behavior: 'always_invoice',
        proration_date: prorationDate,
        items: [{ price: context.priceId, quantity: context.quantity }],
      },
      {
        idempotencyKey: deriveStripeIdempotencyKey(input.idempotency, `add-on-purchase-${context.addOn.slug}`),
      },
    );
  } catch (error) {
    throw classifyProviderFailure('stripe', 'add_on_purchase_subscription_update', error);
  }

  const invoiceId = stripeObjectId(updated.latest_invoice);
  if (!invoiceId) throw new AddOnPurchaseError('stripe_add_on_invoice_missing', 502);

  let invoice: Stripe.Invoice;
  try {
    invoice = await context.stripe.invoices.retrieve(invoiceId);
  } catch (error) {
    throw classifyProviderFailure('stripe', 'add_on_purchase_invoice_retrieve', error);
  }

  const paymentState = invoice.status === 'paid' || invoice.amount_remaining === 0
    ? 'processing' as const
    : 'payment_required' as const;

  const audit = await writeAuditLog({
    action: 'billing.add_on_purchase_initiated',
    organizationId: input.organizationId,
    userId: input.userId,
    entityType: 'stripe_invoice',
    entityId: invoice.id,
    metadata: {
      actorRole: input.actorRole,
      subscriptionId: context.subscription.id,
      addOnSlug: context.addOn.slug,
      quantity: context.quantity,
      priceId: context.priceId,
      paymentState,
      pendingUpdate: Boolean(updated.pending_update),
      paymentBehavior: 'pending_if_incomplete',
      prorationBehavior: 'always_invoice',
      browserEntitlementGranted: false,
    },
  });
  if (!audit.persisted) throw new AddOnPurchaseError('add_on_purchase_audit_unavailable', 503);

  return {
    outcome: 'initiated' as const,
    paymentState,
    subscriptionId: context.subscription.id,
    invoiceId: invoice.id,
    hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
  };
}

function providerPaymentState(invoice: Stripe.Invoice) {
  if (invoice.status === 'paid' || invoice.amount_remaining === 0) return 'processing' as const;
  if (invoice.status === 'void' || invoice.status === 'uncollectible') return 'failed' as const;
  if (invoice.status === 'open') return 'payment_required' as const;
  return 'processing' as const;
}

export async function getOrganizationAddOnPurchaseStatus(
  organizationId: string,
  addOnSlug: string,
  invoiceId?: string | null,
) {
  const addOn = getBillingAddOn(addOnSlug);
  if (!addOn) throw new AddOnPurchaseError('unknown_add_on', 400);

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('organization_add_ons')
    .select('status,quantity,stripe_subscription_item_id,stripe_price_id,current_period_end,updated_at')
    .eq('organization_id', organizationId)
    .eq('add_on_id', addOn.slug)
    .maybeSingle<{
      status: string | null;
      quantity: number | null;
      stripe_subscription_item_id: string | null;
      stripe_price_id: string | null;
      current_period_end: string | null;
      updated_at: string | null;
    }>();
  if (error) throw classifyProviderFailure('supabase', 'add_on_purchase_status', error);

  if (data?.status === 'active') {
    return {
      slug: addOn.slug,
      status: 'active',
      active: true,
      quantity: data.quantity ?? 0,
      currentPeriodEnd: data.current_period_end ?? null,
      updatedAt: data.updated_at ?? null,
      providerBound: Boolean(data.stripe_subscription_item_id && data.stripe_price_id),
      providerPaymentState: 'paid' as const,
      hostedInvoiceUrl: null,
    };
  }

  let paymentState: 'processing' | 'payment_required' | 'failed' | null = null;
  let hostedInvoiceUrl: string | null = null;
  if (invoiceId) {
    const binding = await getAuthoritativeBinding(organizationId);
    let invoice: InvoiceWithSubscription;
    try {
      invoice = await getStripeClient().invoices.retrieve(invoiceId) as InvoiceWithSubscription;
    } catch (providerError) {
      throw classifyProviderFailure('stripe', 'add_on_purchase_status_invoice_retrieve', providerError);
    }

    if (
      invoiceSubscriptionId(invoice) !== binding.stripe_subscription_id
      || stripeObjectId(invoice.customer) !== binding.stripe_customer_id
    ) {
      throw new AddOnPurchaseError('stripe_add_on_invoice_binding_mismatch', 403);
    }

    paymentState = providerPaymentState(invoice);
    hostedInvoiceUrl = invoice.hosted_invoice_url ?? null;
  }

  return {
    slug: addOn.slug,
    status: data?.status ?? (paymentState === 'failed' ? 'failed' : 'pending'),
    active: false,
    quantity: data?.quantity ?? 0,
    currentPeriodEnd: data?.current_period_end ?? null,
    updatedAt: data?.updated_at ?? null,
    providerBound: Boolean(data?.stripe_subscription_item_id && data?.stripe_price_id),
    providerPaymentState: paymentState,
    hostedInvoiceUrl,
  };
}
