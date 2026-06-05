'use server';

import { getBillingPlan, getStripePriceId } from '@/lib/billing/plans';
import { getStripeClient } from '@/lib/billing/stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAuditEvent } from '@/server/actions/audit';

export async function createCheckoutSession(input: {
  organizationId: string;
  planId: string;
  userId: string;
  successPath?: string;
  cancelPath?: string;
}) {
  const plan = getBillingPlan(input.planId);

  if (!plan) {
    throw new Error('Invalid billing plan');
  }

  const priceId = getStripePriceId(plan);

  if (!priceId) {
    throw new Error(`${plan.stripePriceEnvKey} is required`);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!appUrl) {
    throw new Error('NEXT_PUBLIC_APP_URL is required');
  }

  const supabase = createAdminClient();

  const { data: membership, error: membershipError } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', input.organizationId)
    .eq('user_id', input.userId)
    .single();

  if (membershipError || !membership || !['owner', 'admin'].includes(membership.role)) {
    throw new Error('Only organization owners and admins can manage billing');
  }

  const stripe = getStripeClient();

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}${input.successPath ?? '/dashboard/organizations/billing?checkout=success'}`,
    cancel_url: `${appUrl}${input.cancelPath ?? '/dashboard/organizations/billing?checkout=cancelled'}`,
    metadata: {
      organizationId: input.organizationId,
      planId: plan.id,
      userId: input.userId,
    },
    subscription_data: {
      metadata: {
        organizationId: input.organizationId,
        planId: plan.id,
      },
    },
  });

  await logAuditEvent({
    organizationId: input.organizationId,
    actorUserId: input.userId,
    action: 'billing.checkout_created',
    entityType: 'subscription',
    entityId: session.id,
    metadata: { planId: plan.id },
  });

  if (!session.url) {
    throw new Error('Stripe did not return a checkout URL');
  }

  return session.url;
}
