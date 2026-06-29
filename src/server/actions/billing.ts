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

const DUPLICATE_CHECKOUT_BLOCKING_STATUSES = new Set([
  'active',
  'trialing',
  'past_due',
  'unpaid',
  'incomplete',
]);

type CheckoutInput = z.infer<typeof checkoutInputSchema>;
type PortalInput = z.infer<typeof portalInputSchema>;

function actionError(message: string) {
  return new Error(message);
}

async function requireBillingContext() {
  const user = await requireCurrentUser();
  const organization = await getCurrentOrganizationForUser(user.id);

  if (!organization) {
    throw actionError('Organization access required');
  }

  return { user, organization };
}

function isDuplicateCheckoutStatus(status: string | null | undefined) {
  return Boolean(status && DUPLICATE_CHECKOUT_BLOCKING_STATUSES.has(status));
}

function getAppUrl() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!appUrl) {
    throw actionError('Application URL is not configured');
  }

  const parsedUrl = new URL(appUrl);

  if (parsedUrl.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
    throw actionError('Application URL must use HTTPS in production');
  }

  return parsedUrl.origin;
}

function failBillingAction(error: unknown, context: Record<string, unknown>, message: string): never {
  reportError(error, context);
  throw actionError(message);
}

function throwRateLimit(message: string, context: Record<string, unknown>): never {
  const error = actionError(message);
  reportError(error, context);
  throw error;
}

export async function createCheckoutSession(input: CheckoutInput) {
  const parsed = checkoutInputSchema.safeParse(input);

  if (!parsed.success) {
    throw actionError('Invalid checkout input');
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
    throwRateLimit('Too many checkout attempts. Please try again later.', context);
  }

  try {
    const plan = getBillingPlan(safeInput.planId);

    if (!plan) {
      throw actionError('Invalid billing plan');
    }

    const priceId = getStripePriceId(plan);

    if (!priceId) {
      throw actionError('Billing plan is not configured');
    }

    const appUrl = getAppUrl();

    await assertCurrentUserCan(organization.id, user.id, 'billing:manage');

    const supabase = createAdminClient();
    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('plan,status')
      .eq('organization_id', organization.id)
      .maybeSingle();

    if (subscriptionError) {
      failBillingAction(subscriptionError, context, 'Unable to create checkout session');
    }

    if (subscription?.plan === plan.id && isDuplicateCheckoutStatus(subscription.status)) {
      throw actionError('Organization is already subscribed to this billing plan');
    }

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
      action: 'billing.checkout_start',
      entityType: 'subscription',
      entityId: session.id,
      metadata: { planId: plan.id },
    });

    if (!session.url) {
      throw actionError('Stripe did not return a checkout URL');
    }

    return session.url;
  } catch (error) {
    failBillingAction(error, context, 'Unable to create checkout session');
  }
}

export async function createCustomerPortalSession(input: PortalInput) {
  const parsed = portalInputSchema.safeParse(input);

  if (!parsed.success) {
    throw actionError('Invalid billing portal input');
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
    throwRateLimit('Too many billing portal attempts. Please try again later.', context);
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
      failBillingAction(subscriptionError, context, 'Unable to create customer portal session');
    }

    if (!subscription?.stripe_customer_id) {
      throw actionError('Organization does not have a Stripe customer yet');
    }

    const stripe = getStripeClient();

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${appUrl}${safeInput.returnPath ?? '/dashboard/organizations/billing'}`,
    });

    await logAuditEvent({
      organizationId: organization.id,
      actorUserId: user.id,
      action: 'billing.portal_start',
      entityType: 'subscription',
      metadata: {},
    });

    return session.url;
  } catch (error) {
    failBillingAction(error, context, 'Unable to create customer portal session');
  }
}
