import type Stripe from 'stripe';

import { createAdminClient } from '@/lib/supabase/admin';
import { getStripeClient } from '@/server/billing/stripe';
import { hasProcessedLiveStripeSubscriptionAuthority } from '@/server/billing/subscription-authority';
import { classifyProviderFailure } from '@/server/providers/failure';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { noStoreJson } from '@/server/security/no-store';
import { requireApiUser, secureApiError } from '@/server/security/api-guards';

const CHECKOUT_SESSION_ID = /^cs_[A-Za-z0-9_]+$/;
const ACCESS_STATUSES = new Set(['active', 'trialing']);
const FAIL_CLOSED_STATUSES = new Set(['past_due', 'unpaid', 'canceled', 'incomplete_expired']);

type SubscriptionRow = {
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: string | null;
};

function stripeObjectId(value: string | { id?: string | null } | null | undefined) {
  if (typeof value === 'string') return value;
  return value?.id ?? null;
}

function isStripeResourceMissing(error: unknown) {
  return Boolean(
    error
    && typeof error === 'object'
    && 'code' in error
    && (error as { code?: unknown }).code === 'resource_missing',
  );
}

function sessionBelongsToOrganization(session: Stripe.Checkout.Session, organizationId: string) {
  const metadataOrganizationId = session.metadata?.organization_id ?? session.metadata?.organizationId ?? null;
  return session.client_reference_id === organizationId && metadataOrganizationId === organizationId;
}

export async function GET(request: Request) {
  try {
    const user = await requireApiUser();
    const organization = await getCurrentOrganizationForUser(user.id);
    if (!organization?.id) return noStoreJson({ error: 'organization_required' }, { status: 403 });

    const sessionId = new URL(request.url).searchParams.get('session_id')?.trim() ?? '';
    if (!sessionId || sessionId.length > 255 || !CHECKOUT_SESSION_ID.test(sessionId)) {
      return noStoreJson({ error: 'invalid_checkout_session' }, { status: 400 });
    }

    const stripe = getStripeClient();
    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId);
    } catch (error) {
      if (isStripeResourceMissing(error)) {
        return noStoreJson({ error: 'checkout_session_not_found' }, { status: 404 });
      }
      throw classifyProviderFailure('stripe', 'checkout_session_retrieve', error);
    }

    if (session.mode !== 'subscription' || !sessionBelongsToOrganization(session, organization.id)) {
      // Do not reveal whether a foreign session exists.
      return noStoreJson({ error: 'checkout_session_not_found' }, { status: 404 });
    }

    if (session.status !== 'complete') {
      return noStoreJson({
        state: session.status === 'expired' ? 'failed' : 'pending',
        reason: session.status === 'expired' ? 'checkout_expired' : 'checkout_not_complete',
        retryAfterMs: 1500,
      });
    }

    const stripeCustomerId = stripeObjectId(session.customer);
    const stripeSubscriptionId = stripeObjectId(session.subscription as string | Stripe.Subscription | null | undefined);
    if (!stripeCustomerId || !stripeSubscriptionId) {
      return noStoreJson({ state: 'pending', reason: 'subscription_binding_pending', retryAfterMs: 1500 });
    }

    const supabase = createAdminClient();
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id,stripe_subscription_id,status')
      .eq('organization_id', organization.id)
      .limit(1)
      .maybeSingle<SubscriptionRow>();

    if (error) throw error;

    const exactBinding = subscription?.stripe_customer_id === stripeCustomerId
      && subscription?.stripe_subscription_id === stripeSubscriptionId;
    const liveAuthority = exactBinding
      ? await hasProcessedLiveStripeSubscriptionAuthority({
          organizationId: organization.id,
          stripeCustomerId,
          stripeSubscriptionId,
        })
      : false;

    if (exactBinding && liveAuthority && ACCESS_STATUSES.has(subscription?.status ?? '')) {
      return noStoreJson({ state: 'ready', status: subscription?.status, retryAfterMs: null });
    }

    if (exactBinding && FAIL_CLOSED_STATUSES.has(subscription?.status ?? '')) {
      return noStoreJson({
        state: 'failed',
        reason: `subscription_${subscription?.status}`,
        retryAfterMs: null,
      });
    }

    const paymentAccepted = session.payment_status === 'paid' || session.payment_status === 'no_payment_required';
    return noStoreJson({
      state: paymentAccepted ? 'pending' : 'failed',
      reason: paymentAccepted ? 'webhook_activation_pending' : 'payment_not_confirmed',
      retryAfterMs: paymentAccepted ? 1500 : null,
    });
  } catch (error) {
    return secureApiError(error, request);
  }
}
