import { headers } from 'next/headers';
import Stripe from 'stripe';

import { createAdminClient } from '@/lib/supabase/admin';
import { getStripeClient } from '@/server/billing/stripe';
import { createAuditEvent } from '@/server/queries/audit-events';
import { createNotification } from '@/server/queries/notifications';
import { normalizePlan } from '@/server/queries/subscription';
import { noStoreJson } from '@/server/security/no-store';

export const runtime = 'nodejs';

type SubscriptionWithPeriod = Stripe.Subscription & {
  current_period_end?: number | null;
  items?: {
    data?: Array<{ current_period_end?: number | null }>;
  };
};

function getPlanFromSubscription(subscription: Stripe.Subscription) {
  return normalizePlan(subscription.metadata?.plan);
}

function getCurrentPeriodEnd(subscription: Stripe.Subscription) {
  const typedSubscription = subscription as SubscriptionWithPeriod;
  const periodEnd = typedSubscription.current_period_end ?? typedSubscription.items?.data?.[0]?.current_period_end ?? null;

  return typeof periodEnd === 'number' ? new Date(periodEnd * 1000).toISOString() : null;
}

async function recordBillingActivity(subscription: Stripe.Subscription, plan: ReturnType<typeof normalizePlan>) {
  const organizationId = subscription.metadata?.organization_id;
  const actorUserId = subscription.metadata?.user_id;

  if (!organizationId || !actorUserId) {
    return;
  }

  await Promise.allSettled([
    createAuditEvent({
      organizationId,
      actorUserId,
      action: 'subscription_synced',
      entityType: 'subscription',
      entityId: subscription.id,
      metadata: {
        plan,
        status: subscription.status,
        stripeCustomerId: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id,
      },
    }),
    createNotification({
      organizationId,
      userId: actorUserId,
      type: 'system',
      message: `Assinatura atualizada: o plano ${plan} foi sincronizado com o estado ${subscription.status}.`,
    }),
  ]);
}

async function syncSubscription(subscription: Stripe.Subscription) {
  const supabase = createAdminClient();

  if (!supabase) {
    throw new Error('supabase_admin_unavailable');
  }

  const organizationId = subscription.metadata?.organization_id;

  if (!organizationId) {
    throw new Error('missing_organization_id');
  }

  const plan = getPlanFromSubscription(subscription);
  const currentPeriodEnd = getCurrentPeriodEnd(subscription);

  const { error } = await supabase
    .from('subscriptions')
    .upsert({
      organization_id: organizationId,
      plan,
      tier: plan,
      status: subscription.status,
      stripe_customer_id: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id,
      stripe_subscription_id: subscription.id,
      current_period_end: currentPeriodEnd,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'stripe_subscription_id',
    });

  if (error) {
    throw error;
  }

  await recordBillingActivity(subscription, plan);
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return noStoreJson({ error: 'webhook_not_configured' }, { status: 500 });
  }

  const signature = (await headers()).get('stripe-signature');

  if (!signature) {
    return noStoreJson({ error: 'missing_signature' }, { status: 400 });
  }

  const payload = await request.text();
  const stripe = getStripeClient();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch {
    return noStoreJson({ error: 'invalid_signature' }, { status: 400 });
  }

  try {
    if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted'
    ) {
      await syncSubscription(event.data.object as Stripe.Subscription);
    }
  } catch {
    console.error('[billing:webhook] sync failed');
    return noStoreJson({ error: 'sync_failed' }, { status: 500 });
  }

  return noStoreJson({ received: true });
}
