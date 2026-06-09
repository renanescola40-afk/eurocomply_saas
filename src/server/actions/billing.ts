'use server';

import { z } from 'zod';
import { getBillingPlan, getStripePriceId } from '@/lib/billing/plans';
import { getStripeClient } from '@/lib/billing/stripe';
import { reportError } from '@/lib/observability/report-error';
import { checkDistributedRateLimit } from '@/lib/security/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAuditEvent } from '@/server/actions/audit';
import { assertCurrentUserCan } from '@/server/auth/permissions';

const uuidSchema = z.string().uuid();
const safeReturnPathSchema = z
  .string()
  .trim()
  .max(240)
  .optional()
  .refine((value) => !value || (value.startsWith('/') && !value.startsWith('//') && !value.includes('://')), 'Return path must be a relative internal path');

const checkoutInputSchema = z.object({
  organizationId: uuidSchema,
  userId: uuidSchema,
  planId: z.string().trim().min(1).max(64),
  successPath: safeReturnPathSchema,
  cancelPath: safeReturnPathSchema,
});

const portalInputSchema = z.object({
  organizationId: uuidSchema,
  userId: uuidSchema,
  returnPath: safeReturnPathSchema,
});

type CheckoutInput = z.infer<typeof checkoutInputSchema>;
type PortalInput = z.infer<typeof portalInputSchema>;

function getAppUrl() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!appUrl) {
    throw new Error('NEXT_PUBLIC_APP_URL is required');
  }

  const parsedUrl = new URL(appUrl);

  if (parsedUrl.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
    throw new Error('NEXT_PUBLIC_APP_URL must use HTTPS in production');
  }

  return parsedUrl.origin;
}

export async function createCheckoutSession(input: CheckoutInput) {
  const parsed = checkoutInputSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error('Invalid checkout input');
  }

  const safeInput = parsed.data;
  const context = { area: 'billing_checkout', organizationId: safeInput.organizationId, userId: safeInput.userId, planId: safeInput.planId };
  const rateLimit = await checkDistributedRateLimit({
    key: `checkout:${safeInput.organizationId}:${safeInput.userId}`,
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    const error = new Error('Too many checkout attempts. Please try again later.');
    reportError(error, context);
    throw error;
  }

  try {
    const plan = getBillingPlan(safeInput.planId);

    if (!plan) {
      throw new Error('Invalid billing plan');
    }

    const priceId = getStripePriceId(plan);

    if (!priceId) {
      throw new Error(`${plan.stripePriceEnvKey} is required`);
    }

    const appUrl = getAppUrl();

    await assertCurrentUserCan(safeInput.organizationId, safeInput.userId, 'billing:manage');

    const stripe = getStripeClient();

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}${safeInput.successPath ?? '/dashboard/organizations/billing?checkout=success'}`,
      cancel_url: `${appUrl}${safeInput.cancelPath ?? '/dashboard/organizations/billing?checkout=cancelled'}`,
      metadata: {
        organizationId: safeInput.organizationId,
        planId: plan.id,
        userId: safeInput.userId,
      },
      subscription_data: {
        metadata: {
          organizationId: safeInput.organizationId,
          planId: plan.id,
        },
      },
    });

    await logAuditEvent({
      organizationId: safeInput.organizationId,
      actorUserId: safeInput.userId,
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

export async function createCustomerPortalSession(input: PortalInput) {
  const parsed = portalInputSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error('Invalid billing portal input');
  }

  const safeInput = parsed.data;
  const context = { area: 'billing_customer_portal', organizationId: safeInput.organizationId, userId: safeInput.userId };
  const rateLimit = await checkDistributedRateLimit({
    key: `customer_portal:${safeInput.organizationId}:${safeInput.userId}`,
    limit: 10,
    windowMs: 60 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    const error = new Error('Too many billing portal attempts. Please try again later.');
    reportError(error, context);
    throw error;
  }

  try {
    const appUrl = getAppUrl();

    await assertCurrentUserCan(safeInput.organizationId, safeInput.userId, 'billing:manage');

    const supabase = createAdminClient();

    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('organization_id', safeInput.organizationId)
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
      return_url: `${appUrl}${safeInput.returnPath ?? '/dashboard/organizations/billing'}`,
    });

    await logAuditEvent({
      organizationId: safeInput.organizationId,
      actorUserId: safeInput.userId,
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
