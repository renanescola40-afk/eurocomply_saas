'use server';

import { z } from 'zod';
import { getBillingPlan, getStripePriceId } from '@/lib/billing/plans';
import { getStripeClient } from '@/lib/billing/stripe';
import { reportError } from '@/lib/observability/report-error';
import { checkDistributedRateLimit } from '@/lib/security/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAuditEvent } from '@/server/actions/audit';
import { assertCurrentUserCan } from '@/server/auth/permissions';
import { requireCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser } from '@/server/queries/current-organization';

const safeReturnPathSchema = z
  .string()
  .trim()
  .max(240)
  .optional()
  .refine((value) => !value || (value.startsWith('/') && !value.startsWith('//') && !value.includes('://')), 'Return path must be a relative internal path');

const checkoutInputSchema = z.object({
  planId: z.string().trim().min(1).max(64),
  successPath: safeReturnPathSchema,
  cancelPath: safeReturnPathSchema,
});

const portalInputSchema = z.object({
  returnPath: safeReturnPathSchema,
});

type CheckoutInput = z.infer<typeof checkoutInputSchema>;
type PortalInput = z.infer<typeof portalInputSchema>;

async function requireBillingContext() {
  const user = await requireCurrentUser();
  const organization = await getCurrentOrganizationForUser(user.id);

  if (!organization) {
    throw new Error('Organization access required');
  }

  return { user, organization };
}

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
  const { user, organization } = await requireBillingContext();
  const context = { area: 'billing_checkout', organizationId: organization.id, userId: user.id, planId: safeInput.planId };
  const rateLimit = await checkDistributedRateLimit({
    key: `checkout:${organization.id}:${user.id}`,
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
      throw new Error('Billing plan is not configured');
    }

    const appUrl = getAppUrl();

    await assertCurrentUserCan(organization.id, user.id, 'billing:manage');

    const stripe = getStripeClient();

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}${safeInput.successPath ?? '/dashboard/organizations/billing?checkout=success'}`,
      cancel_url: `${appUrl}${safeInput.cancelPath ?? '/dashboard/organizations/billing?checkout=cancelled'}`,
      metadata: {
        organizationId: organization.id,
        planId: plan.id,
        userId: user.id,
      },
      subscription_data: {
        metadata: {
          organizationId: organization.id,
          planId: plan.id,
        },
      },
    });

    await logAuditEvent({
      organizationId: organization.id,
      actorUserId: user.id,
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
    throw new Error('Unable to create checkout session');
  }
}

export async function createCustomerPortalSession(input: PortalInput) {
  const parsed = portalInputSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error('Invalid billing portal input');
  }

  const safeInput = parsed.data;
  const { user, organization } = await requireBillingContext();
  const context = { area: 'billing_customer_portal', organizationId: organization.id, userId: user.id };
  const rateLimit = await checkDistributedRateLimit({
    key: `customer_portal:${organization.id}:${user.id}`,
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

    await assertCurrentUserCan(organization.id, user.id, 'billing:manage');

    const supabase = createAdminClient();

    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('organization_id', organization.id)
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
      organizationId: organization.id,
      actorUserId: user.id,
      action: 'billing.customer_portal_opened',
      entityType: 'subscription',
      metadata: {},
    });

    return session.url;
  } catch (error) {
    reportError(error, context);
    throw new Error('Unable to create customer portal session');
  }
}
