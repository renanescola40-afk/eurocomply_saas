import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

import { createAdminClient } from '@/lib/supabase/admin';
import { getStripeClient } from '@/server/billing/stripe';
import { createAuditEvent } from '@/server/queries/audit-events';
import { createNotification } from '@/server/queries/notifications';
import { normalizePlan } from '@/server/queries/subscription';

export const runtime = 'nodejs';

function getPlanFromSubscription(subscription: Stripe.Subscription) {
  return normalizePlan(subscription.metadata?.plan);
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
  const currentPeriodEnd = subscription.items.data[0]?.current_period_end
    ? new Date(subscription.items.data[0].current_period_end * 1000).toISOString()
    : null;

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
    return NextResponse.json({ error: 'webhook_not_configured' }, { status: 500 });
  }

  const signature = (await headers()).get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'missing_signature' }, { status: 400 });
  }

  const payload = await request.text();
  const stripe = getStripeClient();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 });
  }

  try {
    if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted'
    ) {
      await syncSubscription(event.data.object as Stripe.Subscription);
    }
  } catch (error) {
    console.error('[billing:webhook] sync failed', error);
    return NextResponse.json({ error: 'sync_failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
