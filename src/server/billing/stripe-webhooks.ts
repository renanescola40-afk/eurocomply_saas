import Stripe from 'stripe';
import { getBillingEntitlements, normalizeBillingPlanId } from '@/lib/billing/plans';
import { sendEmail } from '@/lib/email/client';
import { paymentFailedEmail } from '@/lib/email/templates';
import { reportError } from '@/lib/observability/report-error';
import { writeAuditLog } from '@/lib/security/audit-log';
import { createAdminClient } from '@/lib/supabase/admin';
import { getStripeClient } from '@/server/billing/stripe';
import { getUserEmailById } from '@/server/users/email';

const SUPPORTED_STRIPE_WEBHOOK_EVENTS = new Set([
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_failed',
]);

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing', 'past_due', 'unpaid', 'incomplete']);

type StripeWebhookResult = {
  skipped: boolean;
  duplicate?: boolean;
  unsupported?: boolean;
};

type SupabaseError = {
  code?: string;
  message?: string;
};

type StripeMetadata = Stripe.Metadata | null | undefined;

type SubscriptionWithPeriod = Stripe.Subscription & {
  current_period_end?: number | null;
  items?: {
    data?: Array<{ current_period_end?: number | null }>;
  };
};

type StripeObjectWithMetadata = {
  id?: string | null;
  metadata?: StripeMetadata;
};

function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}

function isUniqueViolation(error: SupabaseError | null | undefined) {
  return error?.code === '23505' || /duplicate key/i.test(error?.message ?? '');
}

function getMetadataValue(metadata: StripeMetadata, ...keys: string[]) {
  for (const key of keys) {
    const value = metadata?.[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }

  return null;
}

function getOrganizationIdFromMetadata(metadata: StripeMetadata) {
  return getMetadataValue(metadata, 'organization_id', 'organizationId');
}

function getClerkOrgIdFromMetadata(metadata: StripeMetadata) {
  return getMetadataValue(metadata, 'clerk_org_id', 'clerkOrgId');
}

function getPlanIdFromMetadata(metadata: StripeMetadata) {
  return getMetadataValue(metadata, 'plan', 'plan_id', 'planId');
}

function getActorUserIdFromMetadata(metadata: StripeMetadata) {
  return getMetadataValue(metadata, 'user_id', 'userId');
}

function getStripeObjectId(value: string | { id?: string | null } | null | undefined) {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (value && typeof value === 'object' && typeof value.id === 'string' && value.id.trim()) return value.id.trim();
  return null;
}

function getSubscriptionCurrentPeriodEnd(subscription: Stripe.Subscription) {
  const typedSubscription = subscription as SubscriptionWithPeriod;
  const periodEnd = typedSubscription.current_period_end ?? typedSubscription.items?.data?.[0]?.current_period_end ?? null;

  return typeof periodEnd === 'number' ? new Date(periodEnd * 1000).toISOString() : null;
}

function getInvoiceSubscriptionId(invoice: Stripe.Invoice) {
  const rawInvoice = invoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null };
  const subscription = rawInvoice.subscription;

  if (!subscription) return null;
  return typeof subscription === 'string' ? subscription : subscription.id;
}

function stripeEventCreatedAt(event: Stripe.Event) {
  return new Date(event.created * 1000).toISOString();
}

function sanitizeWebhookFailure(error: unknown) {
  const message = error instanceof Error ? error.message : 'unknown_error';
  return message
    .replace(/\b(?:sk|rk|pk|whsec|cs|sess)_[A-Za-z0-9_=-]+\b/g, '[redacted]')
    .replace(/Bearer\s+[^\s]+/gi, 'Bearer [redacted]')
    .slice(0, 500);
}

export function isSupportedStripeWebhookEvent(eventType: string) {
  return SUPPORTED_STRIPE_WEBHOOK_EVENTS.has(eventType);
}

export function getStripeEventAuditContext(event: Stripe.Event) {
  const object = event.data.object as StripeObjectWithMetadata;
  const metadata = object?.metadata;

  return {
    organizationId: getOrganizationIdFromMetadata(metadata),
    actorUserId: getActorUserIdFromMetadata(metadata),
    objectId: getStripeObjectId(object),
  };
}

async function recordStripeWebhookReplayAudit(event: Stripe.Event) {
  const context = getStripeEventAuditContext(event);

  try {
    await writeAuditLog({
      action: 'webhook_replayed',
      organizationId: context.organizationId,
      userId: context.actorUserId,
      entityType: 'stripe_webhook_event',
      entityId: event.id,
      metadata: {
        stripeEventId: event.id,
        stripeEventType: event.type,
        livemode: event.livemode,
        objectId: context.objectId ?? null,
      },
    });
  } catch (error) {
    reportError(error, { area: 'stripe_webhook_replay_audit', stripeEventId: event.id });
  }
}

export async function claimStripeEventForProcessing(event: Stripe.Event) {
  const supabase = createAdminClient();
  const auditContext = getStripeEventAuditContext(event);
  const { error } = await supabase.from('stripe_events_processed').insert({
    id: event.id,
    type: event.type,
    status: 'processing',
    stripe_created_at: stripeEventCreatedAt(event),
    livemode: event.livemode,
    api_version: event.api_version ?? null,
    organization_id: auditContext.organizationId,
    payload: event as unknown as Record<string, unknown>,
  });

  if (!error) return true;
  if (!isUniqueViolation(error)) throw error;

  const { data: existingEvent, error: lookupError } = await supabase
    .from('stripe_events_processed')
    .select('id,status')
    .eq('id', event.id)
    .maybeSingle<{ id: string; status: string | null }>();

  if (lookupError) throw lookupError;

  if (existingEvent?.status !== 'failed') {
    return false;
  }

  const { data: reclaimedEvent, error: reclaimError } = await supabase
    .from('stripe_events_processed')
    .update({
      status: 'processing',
      processed_at: null,
      failed_at: null,
      error: null,
      type: event.type,
      stripe_created_at: stripeEventCreatedAt(event),
      livemode: event.livemode,
      api_version: event.api_version ?? null,
      organization_id: auditContext.organizationId,
      payload: event as unknown as Record<string, unknown>,
    })
    .eq('id', event.id)
    .eq('status', 'failed')
    .select('id')
    .maybeSingle<{ id: string }>();

  if (reclaimError) throw reclaimError;

  return Boolean(reclaimedEvent?.id);
}

export async function markStripeEventProcessed(event: Stripe.Event) {
  const supabase = createAdminClient();
  const auditContext = getStripeEventAuditContext(event);
  const { error } = await supabase
    .from('stripe_events_processed')
    .update({ status: 'processed', processed_at: new Date().toISOString(), organization_id: auditContext.organizationId, error: null })
    .eq('id', event.id);

  if (error) throw error;
}

export async function markStripeEventFailed(event: Stripe.Event, error: unknown) {
  const supabase = createAdminClient();
  const auditContext = getStripeEventAuditContext(event);
  const { error: updateError } = await supabase
    .from('stripe_events_processed')
    .update({ status: 'failed', failed_at: new Date().toISOString(), organization_id: auditContext.organizationId, error: sanitizeWebhookFailure(error) })
    .eq('id', event.id);

  if (updateError) {
    reportError(updateError, { area: 'stripe_webhook_mark_failed', stripeEventId: event.id, stripeEventType: event.type });
  }
}

export async function hasProcessedStripeEvent(eventId: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('stripe_events_processed')
    .select('id,status')
    .eq('id', eventId)
    .maybeSingle<{ id: string; status: string | null }>();

  return data?.status === 'processed';
}

export async function recordStripeEvent(event: Stripe.Event) {
  await markStripeEventProcessed(event);
}

async function validateOrganizationStripeBinding({
  organizationId,
  clerkOrgId,
  customerId,
  subscriptionId,
}: {
  organizationId: string;
  clerkOrgId?: string | null;
  customerId: string;
  subscriptionId?: string | null;
}) {
  const supabase = createAdminClient();
  const { data: organization, error: organizationError } = await supabase
    .from('organizations')
    .select('id,clerk_org_id')
    .eq('id', organizationId)
    .maybeSingle<{ id: string; clerk_org_id: string | null }>();

  if (organizationError || !organization?.id) {
    throw organizationError ?? new Error('Stripe webhook references an unknown organization');
  }

  if (clerkOrgId && organization.clerk_org_id && organization.clerk_org_id !== clerkOrgId) {
    throw new Error('Stripe webhook Clerk organization does not match organization billing profile');
  }

  const { data: subscription, error: subscriptionError } = await supabase
    .from('subscriptions')
    .select('organization_id,stripe_customer_id,stripe_subscription_id,status')
    .eq('organization_id', organizationId)
    .maybeSingle<{
      organization_id: string;
      stripe_customer_id: string | null;
      stripe_subscription_id: string | null;
      status: string | null;
    }>();

  if (subscriptionError) {
    throw subscriptionError;
  }

  if (subscription?.stripe_customer_id && subscription.stripe_customer_id !== customerId) {
    throw new Error('Stripe customer does not match organization billing profile');
  }

  if (
    subscriptionId &&
    subscription?.stripe_subscription_id &&
    subscription.stripe_subscription_id !== subscriptionId &&
    ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status ?? '')
  ) {
    throw new Error('Stripe subscription does not match organization billing profile');
  }
}

async function recordBillingWebhookAudit(input: {
  action: string;
  organizationId: string;
  actorUserId?: string | null;
  entityType: string;
  entityId: string;
  event: Stripe.Event;
  metadata?: Record<string, string | number | boolean | null | undefined>;
}) {
  try {
    await writeAuditLog({
      action: input.action,
      organizationId: input.organizationId,
      userId: input.actorUserId ?? null,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: {
        stripeEventId: input.event.id,
        stripeEventType: input.event.type,
        livemode: input.event.livemode,
        ...input.metadata,
      },
    });
  } catch (error) {
    reportError(error, { area: 'stripe_billing_audit', stripeEventId: input.event.id, organizationId: input.organizationId });
  }
}

export async function upsertSubscriptionFromStripe(subscription: Stripe.Subscription, event?: Stripe.Event) {
  const supabase = createAdminClient();
  const organizationId = getOrganizationIdFromMetadata(subscription.metadata);
  const clerkOrgId = getClerkOrgIdFromMetadata(subscription.metadata);
  const rawPlan = getPlanIdFromMetadata(subscription.metadata);
  const plan = normalizeBillingPlanId(rawPlan);
  const customerId = getStripeObjectId(subscription.customer);

  if (!organizationId) {
    throw new Error('Missing organization_id in Stripe subscription metadata');
  }

  if (!plan) {
    throw new Error('Missing or invalid plan in Stripe subscription metadata');
  }

  if (!customerId) {
    throw new Error('Missing Stripe customer on subscription');
  }

  await validateOrganizationStripeBinding({
    organizationId,
    clerkOrgId,
    customerId,
    subscriptionId: subscription.id,
  });

  const entitlements = getBillingEntitlements(plan);
  const { error } = await supabase.from('subscriptions').upsert(
    {
      organization_id: organizationId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      plan,
      tier: plan,
      status: subscription.status,
      current_period_end: getSubscriptionCurrentPeriodEnd(subscription),
      entitlements,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'organization_id' },
  );

  if (error) {
    throw error;
  }

  if (event) {
    const suffix = event.type.endsWith('.created') ? 'created' : event.type.endsWith('.deleted') ? 'deleted' : 'updated';
    await recordBillingWebhookAudit({
      action: `billing.subscription_${suffix}`,
      organizationId,
      actorUserId: getActorUserIdFromMetadata(subscription.metadata),
      entityType: 'stripe_subscription',
      entityId: subscription.id,
      event,
      metadata: {
        plan,
        status: subscription.status,
        stripeCustomerId: customerId,
        clerkOrgId: clerkOrgId ?? null,
      },
    });
    await recordBillingWebhookAudit({
      action: 'subscription_synced',
      organizationId,
      actorUserId: getActorUserIdFromMetadata(subscription.metadata),
      entityType: 'stripe_subscription',
      entityId: subscription.id,
      event,
      metadata: {
        plan,
        status: subscription.status,
        stripeCustomerId: customerId,
        clerkOrgId: clerkOrgId ?? null,
        syncSource: 'stripe_webhook',
      },
    });
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session, event: Stripe.Event) {
  if (session.mode !== 'subscription') {
    return;
  }

  const organizationId = getOrganizationIdFromMetadata(session.metadata);
  const clerkOrgId = getClerkOrgIdFromMetadata(session.metadata);
  const rawPlan = getPlanIdFromMetadata(session.metadata);
  const plan = rawPlan ? normalizeBillingPlanId(rawPlan) : undefined;
  const customerId = getStripeObjectId(session.customer);
  const subscriptionId = getStripeObjectId(session.subscription as string | Stripe.Subscription | null | undefined);

  if (!organizationId) {
    throw new Error('Missing organization_id in Stripe checkout session metadata');
  }

  if (rawPlan && !plan) {
    throw new Error('Invalid plan in Stripe checkout session metadata');
  }

  if (!customerId) {
    throw new Error('Missing Stripe customer on checkout session');
  }

  await validateOrganizationStripeBinding({ organizationId, clerkOrgId, customerId, subscriptionId });

  if (subscriptionId) {
    const subscription = await getStripeClient().subscriptions.retrieve(subscriptionId);
    await upsertSubscriptionFromStripe(subscription, event);
  }

  await recordBillingWebhookAudit({
    action: 'billing.checkout_completed',
    organizationId,
    actorUserId: getActorUserIdFromMetadata(session.metadata),
    entityType: 'stripe_checkout_session',
    entityId: session.id,
    event,
    metadata: {
      plan: plan ?? null,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId ?? null,
      clerkOrgId: clerkOrgId ?? null,
    },
  });
}

async function getBillingContactEmail(userId: string) {
  return getUserEmailById(userId, 'billing_contact_lookup');
}

export async function sendPaymentFailedEmail(invoice: Stripe.Invoice, event?: Stripe.Event) {
  const supabase = createAdminClient();
  const subscriptionId = getInvoiceSubscriptionId(invoice);
  const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;

  if (!subscriptionId && !customerId) {
    reportError(new Error('Unable to identify subscription or customer for failed payment'), { area: 'payment_failed_email', invoiceId: invoice.id });
    return;
  }

  const query = supabase
    .from('subscriptions')
    .select('organization_id, stripe_subscription_id, stripe_customer_id')
    .limit(1);

  const { data: subscriptions, error: subscriptionError } = subscriptionId
    ? await query.eq('stripe_subscription_id', subscriptionId)
    : await query.eq('stripe_customer_id', customerId!);

  if (subscriptionError) {
    reportError(subscriptionError, { area: 'payment_failed_email', invoiceId: invoice.id, subscriptionId, customerId });
    return;
  }

  const subscription = subscriptions?.[0];

  if (!subscription?.organization_id) {
    reportError(new Error('Subscription not found for payment failed email'), { area: 'payment_failed_email', invoiceId: invoice.id, subscriptionId, customerId });
    return;
  }

  const { data: organization, error: organizationError } = await supabase
    .from('organizations')
    .select('id,name,created_by')
    .eq('id', subscription.organization_id)
    .single();

  if (organizationError || !organization?.created_by) {
    reportError(organizationError ?? new Error('Organization billing contact not found'), { area: 'payment_failed_email', organizationId: subscription.organization_id });
    return;
  }

  const emailAddress = await getBillingContactEmail(organization.created_by);

  if (!emailAddress) {
    reportError(new Error('Billing contact email not found'), { area: 'payment_failed_email', organizationId: organization.id, userId: organization.created_by });
    return;
  }

  const billingUrl = `${getAppUrl()}/dashboard/organizations/billing`;
  const email = paymentFailedEmail({ organizationName: organization.name, billingUrl });

  await sendEmail({
    to: emailAddress,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });

  if (event) {
    await recordBillingWebhookAudit({
      action: 'billing.payment_failed',
      organizationId: organization.id,
      actorUserId: organization.created_by,
      entityType: 'stripe_invoice',
      entityId: invoice.id ?? event.id,
      event,
      metadata: {
        stripeCustomerId: customerId ?? null,
        stripeSubscriptionId: subscriptionId ?? null,
      },
    });
  }
}

async function processStripeWebhookEvent(event: Stripe.Event) {
  if (event.type === 'checkout.session.completed') {
    await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session, event);
    return;
  }

  if (
    event.type === 'customer.subscription.created' ||
    event.type === 'customer.subscription.updated' ||
    event.type === 'customer.subscription.deleted'
  ) {
    await upsertSubscriptionFromStripe(event.data.object as Stripe.Subscription, event);
    return;
  }

  if (event.type === 'invoice.payment_failed') {
    await sendPaymentFailedEmail(event.data.object as Stripe.Invoice, event);
  }
}

export async function handleStripeWebhookEvent(event: Stripe.Event): Promise<StripeWebhookResult> {
  if (!isSupportedStripeWebhookEvent(event.type)) {
    return { skipped: true, unsupported: true };
  }

  const claimed = await claimStripeEventForProcessing(event);

  if (!claimed) {
    await recordStripeWebhookReplayAudit(event);
    return { skipped: true, duplicate: true };
  }

  try {
    await processStripeWebhookEvent(event);
    await markStripeEventProcessed(event);
    return { skipped: false };
  } catch (error) {
    await markStripeEventFailed(event, error);
    throw error;
  }
}
