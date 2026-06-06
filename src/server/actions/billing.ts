'use server';

import { getBillingPlan, getStripePriceId } from '@/lib/billing/plans';
import { getStripeClient } from '@/lib/billing/stripe';
import { reportError } from '@/lib/observability/report-error';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAuditEvent } from '@/server/actions/audit';

async function requireBillingManager(supabase: ReturnType<typeof createAdminClient>, organizationId: string, userId: string) {
  const { data: membership, error: membershipError } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .single();

  if (membershipError || !membership || !['owner', 'admin'].includes(membership.role)) {
    throw new Error('Only organization owners and admins can manage billing');
  }

  return membership;
}

export async function createCheckoutSession(input: {
  organizationId: string;
  planId: string;
  userId: string;
  successPath?: string;
  cancelPath?: string;
}) {
  const context = { area: 'billing_checkout', organizationId: input.organizationId, userId: input.userId, planId: input.planId };
  const rateLimit = checkRateLimit({
    key: `checkout:${input.organizationId}:${input.userId}`,
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    const error = new Error('Too many checkout attempts. Please try again later.');
    reportError(error, context);
    throw error;
  }

  try {
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

    await requireBillingManager(supabase, input.organizationId, input.userId);

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
  } catch (error) {
    reportError(error, context);
    throw error;
  }
}

export async function createCustomerPortalSession(input: {
  organizationId: string;
  userId: string;
  returnPath?: string;
}) {
  const context = { area: 'billing_customer_portal', organizationId: input.organizationId, userId: input.userId };
  const rateLimit = checkRateLimit({
    key: `customer_portal:${input.organizationId}:${input.userId}`,
    limit: 10,
    windowMs: 60 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    const error = new Error('Too many billing portal attempts. Please try again later.');
    reportError(error, context);
    throw error;
  }

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (!appUrl) {
      throw new Error('NEXT_PUBLIC_APP_URL is required');
    }

    const supabase = createAdminClient();

    await requireBillingManager(supabase, input.organizationId, input.userId);

    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('organization_id', input.organizationId)
      .maybeSingle();

    if (subscriptionError) {
      throw subscriptionError;
    }

    if (!subscription?.stripe_customer_id) {
      throw new Error('Organization does not have a Stripe customer yet');
    }

    const stripe = getStripeClient();

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${appUrl}${input.returnPath ?? '/dashboard/organizations/billing'}`,
    });

    await logAuditEvent({
      organizationId: input.organizationId,
      actorUserId: input.userId,
      action: 'billing.customer_portal_opened',
      entityType: 'subscription',
      metadata: {},
    });

    return session.url;
  } catch (error) {
    reportError(error, context);
    throw error;
  }
}
