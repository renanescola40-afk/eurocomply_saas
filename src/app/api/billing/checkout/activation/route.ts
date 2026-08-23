import { rateLimitResponse } from '@/lib/security/rate-limit-response';
import { createAdminClient } from '@/lib/supabase/admin';
import { hasProcessedLiveStripeSubscriptionAuthority } from '@/server/billing/subscription-authority';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { requireApiUser, secureApiError } from '@/server/security/api-guards';
import { noStoreJson } from '@/server/security/no-store';
import {
  buildRateLimitSubjectFromRequest,
  checkDistributedRateLimit,
} from '@/server/security/rate-limit';

const ACTIVATED_SUBSCRIPTION_STATUSES = new Set(['active']);
const ACTIVATION_POLL_ROUTE = '/api/billing/checkout/activation';
const ACTIVATION_POLL_LIMIT = 60;
const ACTIVATION_POLL_WINDOW_MS = 60_000;

type SubscriptionActivationRow = {
  status: string | null;
  plan: string | null;
  updated_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
};

async function getLatestSubscriptionActivation(organizationId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('subscriptions')
    .select('status,plan,updated_at,stripe_customer_id,stripe_subscription_id')
    .eq('organization_id', organizationId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle<SubscriptionActivationRow>();

  if (error) throw error;
  return data ?? null;
}

export async function GET(request: Request) {
  try {
    const user = await requireApiUser();
    const organization = await getCurrentOrganizationForUser(user.id);

    if (!organization?.id) {
      return noStoreJson({ state: 'organization_required' }, { status: 403 });
    }

    const rateLimit = await checkDistributedRateLimit({
      ...buildRateLimitSubjectFromRequest(request, {
        userId: user.id,
        organizationId: organization.id,
        action: 'billing.checkout.activation.poll',
        route: ACTIVATION_POLL_ROUTE,
      }),
      policy: 'general-api',
      limit: ACTIVATION_POLL_LIMIT,
      windowMs: ACTIVATION_POLL_WINDOW_MS,
      failureMode: 'fail-closed',
    });

    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit);
    }

    const subscription = await getLatestSubscriptionActivation(organization.id);
    const hasActivatableStatus = Boolean(
      subscription?.status && ACTIVATED_SUBSCRIPTION_STATUSES.has(subscription.status),
    );
    const hasCanonicalStripeBinding = Boolean(
      subscription?.stripe_customer_id && subscription?.stripe_subscription_id,
    );
    const liveStripeAuthority = hasActivatableStatus && hasCanonicalStripeBinding
      ? await hasProcessedLiveStripeSubscriptionAuthority({
          organizationId: organization.id,
          stripeCustomerId: subscription?.stripe_customer_id,
          stripeSubscriptionId: subscription?.stripe_subscription_id,
        })
      : false;
    const activated = hasActivatableStatus && hasCanonicalStripeBinding && liveStripeAuthority;

    return noStoreJson({
      state: activated ? 'activated' : 'pending',
      subscriptionStatus: subscription?.status ?? null,
      plan: subscription?.plan ?? null,
      updatedAt: subscription?.updated_at ?? null,
      liveStripeAuthority,
      ...(activated ? { next: '/dashboard/organizations' } : {}),
      authority: 'processed_live_stripe_subscription_event',
    });
  } catch (error) {
    return secureApiError(error, request);
  }
}