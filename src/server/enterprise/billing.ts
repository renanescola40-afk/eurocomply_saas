import Stripe from 'stripe';

import { createAdminClient } from '@/lib/supabase/admin';

export type EnterpriseBillingSyncResult = {
  outcome: string;
  matched: boolean;
  contractId: string | null;
  organizationId: string | null;
  previousStatus: string | null;
  appliedStatus: string | null;
  billingStatus: string | null;
  version: number | null;
};

type RpcError = {
  code?: string;
};

type RpcClient = {
  rpc: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: RpcError | null }>;
};

type BillingRow = {
  outcome?: unknown;
  matched?: unknown;
  contract_id?: unknown;
  organization_id?: unknown;
  previous_status?: unknown;
  applied_status?: unknown;
  billing_status?: unknown;
  version?: unknown;
};

type SubscriptionWithItems = Stripe.Subscription & {
  items?: { data?: Array<{ price?: { id?: string | null } | null }> };
};

type InvoiceWithSubscription = Stripe.Invoice & {
  subscription?: string | Stripe.Subscription | null;
  parent?: {
    subscription_details?: {
      subscription?: string | Stripe.Subscription | null;
      metadata?: Stripe.Metadata | null;
    } | null;
  } | null;
  due_date?: number | null;
  number?: string | null;
  paid?: boolean;
};

function firstRow<T>(data: unknown): T | null {
  if (Array.isArray(data)) return (data[0] as T | undefined) ?? null;
  return data && typeof data === 'object' ? (data as T) : null;
}

function metadataValue(metadata: Stripe.Metadata | null | undefined, ...keys: string[]) {
  for (const key of keys) {
    const value = metadata?.[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

function metadataValueFromEventObject(
  object: Stripe.Subscription | Stripe.Invoice,
  ...keys: string[]
) {
  const direct = metadataValue(object.metadata, ...keys);
  if (direct) return direct;

  const invoice = object as InvoiceWithSubscription;
  return metadataValue(invoice.parent?.subscription_details?.metadata, ...keys);
}

function objectId(value: string | { id?: string | null } | null | undefined) {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (value && typeof value === 'object' && typeof value.id === 'string' && value.id.trim()) {
    return value.id.trim();
  }
  return null;
}

function stringOrNull(value: unknown) {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function integerOrNull(value: unknown) {
  return typeof value === 'number' && Number.isSafeInteger(value) ? value : null;
}

function invoiceSubscriptionId(invoice: Stripe.Invoice) {
  const compatible = invoice as InvoiceWithSubscription;
  return objectId(
    compatible.subscription
      ?? compatible.parent?.subscription_details?.subscription
      ?? null,
  );
}

function subscriptionPriceId(subscription: Stripe.Subscription) {
  const priceId = (subscription as SubscriptionWithItems).items?.data?.[0]?.price?.id;
  return typeof priceId === 'string' && priceId.trim() ? priceId.trim() : null;
}

function invoiceDueAt(invoice: Stripe.Invoice) {
  const dueDate = (invoice as InvoiceWithSubscription).due_date;
  return typeof dueDate === 'number' && Number.isFinite(dueDate)
    ? new Date(dueDate * 1000).toISOString()
    : null;
}

function isRelevantEnterpriseBillingEvent(eventType: string) {
  return [
    'customer.subscription.created',
    'customer.subscription.updated',
    'customer.subscription.deleted',
    'invoice.paid',
    'invoice.payment_succeeded',
    'invoice.payment_failed',
  ].includes(eventType);
}

function isEnterpriseBillingRuntimeMissing(error: RpcError | null) {
  return error?.code === 'PGRST202' || error?.code === '42883';
}

function unmatchedRuntimeResult(organizationId: string | null): EnterpriseBillingSyncResult {
  return {
    outcome: 'runtime_unavailable_unmatched',
    matched: false,
    contractId: null,
    organizationId,
    previousStatus: null,
    appliedStatus: null,
    billingStatus: null,
    version: null,
  };
}

export async function syncEnterpriseContractBillingEvent(
  event: Stripe.Event,
): Promise<EnterpriseBillingSyncResult> {
  if (!isRelevantEnterpriseBillingEvent(event.type)) {
    return {
      outcome: 'unsupported',
      matched: false,
      contractId: null,
      organizationId: null,
      previousStatus: null,
      appliedStatus: null,
      billingStatus: null,
      version: null,
    };
  }

  const object = event.data.object as Stripe.Subscription | Stripe.Invoice;
  const contractId = metadataValueFromEventObject(
    object,
    'enterprise_contract_id',
    'enterpriseContractId',
    'contract_id',
  );
  const organizationId = metadataValueFromEventObject(object, 'organization_id', 'organizationId');
  const billingFlow = metadataValueFromEventObject(object, 'billing_flow');
  const isKnownSelfServiceEvent = billingFlow === 'initial_subscription';

  let customerId: string | null = null;
  let subscriptionId: string | null = null;
  let priceId: string | null = null;
  let invoiceId: string | null = null;
  let stripeStatus: string | null = null;
  let invoicePaid = false;
  let paymentDueAt: string | null = null;
  let externalReference: string | null = null;

  if (event.type.startsWith('customer.subscription.')) {
    const subscription = object as Stripe.Subscription;
    customerId = objectId(subscription.customer);
    subscriptionId = subscription.id;
    priceId = subscriptionPriceId(subscription);
    stripeStatus = subscription.status;
  } else {
    const invoice = object as InvoiceWithSubscription;
    customerId = objectId(invoice.customer);
    subscriptionId = invoiceSubscriptionId(invoice);
    invoiceId = invoice.id;
    invoicePaid = invoice.paid === true || event.type === 'invoice.paid' || event.type === 'invoice.payment_succeeded';
    paymentDueAt = invoiceDueAt(invoice);
    externalReference = invoice.number ?? null;
    stripeStatus = invoice.status ?? null;
  }

  const client = createAdminClient() as unknown as RpcClient;
  const { data, error } = await client.rpc('sync_enterprise_contract_billing_v3_atomic', {
    p_event_id: event.id,
    p_event_type: event.type,
    p_contract_id: contractId,
    p_organization_id: organizationId,
    p_stripe_customer_id: customerId,
    p_stripe_subscription_id: subscriptionId,
    p_stripe_price_id: priceId,
    p_stripe_invoice_id: invoiceId,
    p_stripe_status: stripeStatus,
    p_invoice_paid: invoicePaid,
    p_payment_due_at: paymentDueAt,
    p_external_reference: externalReference,
  });

  if (error) {
    // The bounded V19 Enterprise data plane may legitimately be absent before its
    // protected Production promotion. Only events carrying the canonical
    // self-service billing_flow marker may bypass a missing Enterprise RPC during
    // that transition. Unmarked or explicitly Enterprise events stay fail-closed
    // and return retryable 5xx at the webhook boundary rather than being
    // acknowledged into the wrong billing authority.
    if (
      isEnterpriseBillingRuntimeMissing(error)
      && !contractId
      && isKnownSelfServiceEvent
    ) {
      console.warn('[enterprise-billing] stripe_sync_runtime_not_promoted', {
        code: error.code ?? 'unknown',
        eventType: event.type,
      });
      return unmatchedRuntimeResult(organizationId);
    }

    console.warn('[enterprise-billing] stripe_sync_failed', {
      code: error.code ?? 'unknown',
      eventType: event.type,
    });
    throw new Error('enterprise_billing_sync_unavailable');
  }

  const row = firstRow<BillingRow>(data);
  if (!row || typeof row.outcome !== 'string') {
    throw new Error('enterprise_billing_sync_unavailable');
  }

  if (row.outcome === 'binding_conflict' || row.outcome === 'invalid_transition') {
    throw new Error(`enterprise_billing_${row.outcome}`);
  }

  return {
    outcome: row.outcome,
    matched: row.matched === true,
    contractId: stringOrNull(row.contract_id),
    organizationId: stringOrNull(row.organization_id),
    previousStatus: stringOrNull(row.previous_status),
    appliedStatus: stringOrNull(row.applied_status),
    billingStatus: stringOrNull(row.billing_status),
    version: integerOrNull(row.version),
  };
}
