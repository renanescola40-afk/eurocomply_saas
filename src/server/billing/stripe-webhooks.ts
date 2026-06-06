import Stripe from 'stripe';
import { sendEmail } from '@/lib/email/client';
import { paymentFailedEmail } from '@/lib/email/templates';
import { reportError } from '@/lib/observability/report-error';
import { createAdminClient } from '@/lib/supabase/admin';

function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}

export async function hasProcessedStripeEvent(eventId: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('stripe_webhook_events')
    .select('id')
    .eq('id', eventId)
    .maybeSingle();

  return Boolean(data?.id);
}

export async function recordStripeEvent(event: Stripe.Event) {
  const supabase = createAdminClient();

  await supabase.from('stripe_webhook_events').insert({
    id: event.id,
    type: event.type,
    payload: event as unknown as Record<string, unknown>,
  });
}

export async function upsertSubscriptionFromStripe(subscription: Stripe.Subscription) {
  const supabase = createAdminClient();
  const organizationId = subscription.metadata.organizationId;
  const plan = subscription.metadata.planId ?? 'unknown';

  if (!organizationId) {
    throw new Error('Missing organizationId in Stripe subscription metadata');
  }

  await supabase.from('subscriptions').upsert({
    organization_id: organizationId,
    stripe_customer_id: String(subscription.customer),
    stripe_subscription_id: subscription.id,
    plan,
    status: subscription.status,
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'organization_id' });
}

function getInvoiceSubscriptionId(invoice: Stripe.Invoice) {
  const rawInvoice = invoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null };
  const subscription = rawInvoice.subscription;

  if (!subscription) return null;
  return typeof subscription === 'string' ? subscription : subscription.id;
}

async function getBillingContactEmail(userId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.auth.admin.getUserById(userId);

  if (error) {
    reportError(error, { area: 'billing_contact_lookup', userId });
    return null;
  }

  return data.user?.email ?? null;
}

export async function sendPaymentFailedEmail(invoice: Stripe.Invoice) {
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
}

export async function handleStripeWebhookEvent(event: Stripe.Event) {
  if (await hasProcessedStripeEvent(event.id)) {
    return { skipped: true };
  }

  if (
    event.type === 'customer.subscription.created' ||
    event.type === 'customer.subscription.updated' ||
    event.type === 'customer.subscription.deleted'
  ) {
    await upsertSubscriptionFromStripe(event.data.object as Stripe.Subscription);
  }

  if (event.type === 'invoice.payment_failed') {
    await sendPaymentFailedEmail(event.data.object as Stripe.Invoice);
  }

  await recordStripeEvent(event);

  return { skipped: false };
}
