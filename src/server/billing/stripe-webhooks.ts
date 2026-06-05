import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/admin';

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

  await recordStripeEvent(event);

  return { skipped: false };
}
