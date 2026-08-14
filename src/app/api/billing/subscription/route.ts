import { z } from 'zod';

import { readBoundedJsonRequest } from '@/lib/security/validate';
import { createAdminClient } from '@/lib/supabase/admin';
import { readBillingIdempotencyKey } from '@/server/billing/idempotency';
import { isSelfServePlan, normalizeBillingPlanId } from '@/server/billing/plans';
import {
  getAuthoritativeSignedContractPlan,
  hasProcessedLiveStripeSubscriptionAuthority,
} from '@/server/billing/subscription-authority';
import { isBillingLifecycleRequestError, mutateSubscriptionLifecycle } from '@/server/billing/subscription-lifecycle';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { noStoreJson } from '@/server/security/no-store';
import { requireApiUser, requirePermission, requireTrustedMutation, secureApiError } from '@/server/security/api-guards';
import { publicStepUpSummary, requireStepUpForRequest } from '@/server/security/step-up';

const BODY_MAX_BYTES = 8 * 1024;
const schema = z.object({
  action: z.enum(['upgrade', 'downgrade', 'cancel', 'reactivate', 'replace_add_ons']),
  plan: z.string().trim().max(64).optional(),
  interval: z.enum(['month', 'year', 'monthly', 'annual']).optional(),
  addOns: z.array(z.object({ slug: z.string().trim().min(1).max(80), quantity: z.number().int().min(1).max(10000).optional() })).max(25).optional(),
});

async function getLiveSubscriptionBinding(organizationId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id,stripe_subscription_id,status')
    .eq('organization_id', organizationId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle<{
      stripe_customer_id: string | null;
      stripe_subscription_id: string | null;
      status: string | null;
    }>();

  if (error) throw error;
  if (!data) return null;

  const authoritative = await hasProcessedLiveStripeSubscriptionAuthority({
    organizationId,
    stripeCustomerId: data.stripe_customer_id,
    stripeSubscriptionId: data.stripe_subscription_id,
  });

  return authoritative ? data : null;
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    const organization = await getCurrentOrganizationForUser(user.id);
    if (!organization?.id) return noStoreJson({ error: 'organization_required' }, { status: 403 });

    const permission = await requirePermission({ userId: user.id, organizationId: organization.id, permission: 'manage_billing' });
    const denied = await requireTrustedMutation(request, {
      rateLimit: {
        key: `billing:subscription:${organization.id}:${user.id}`,
        policy: 'billing-checkout',
        userId: user.id,
        organizationId: organization.id,
        action: 'billing_subscription_lifecycle',
        route: '/api/billing/subscription',
        limit: 12,
        windowMs: 60 * 1000,
        failureMode: 'fail-closed',
      },
    });
    if (denied) return denied;

    const parsed = schema.safeParse(await readBoundedJsonRequest(request, { maxBytes: BODY_MAX_BYTES }).catch(() => null));
    if (!parsed.success) return noStoreJson({ error: 'invalid_billing_lifecycle_request' }, { status: 400 });

    // Annual amounts exist only as repository commercial references until
    // matching production Stripe Prices are provider-verified. Keep the public
    // monthly self-serve contract fail-closed rather than allowing a hidden API
    // caller to discover a missing Price through a 500/provider error.
    if (parsed.data.interval === 'year' || parsed.data.interval === 'annual') {
      return noStoreJson({ error: 'annual_billing_not_available' }, { status: 409 });
    }

    const plan = parsed.data.plan ? normalizeBillingPlanId(parsed.data.plan) : undefined;
    if (parsed.data.plan && !plan) return noStoreJson({ error: 'invalid_plan' }, { status: 400 });
    if (
      (parsed.data.action === 'upgrade' || parsed.data.action === 'downgrade')
      && (!plan || !isSelfServePlan(plan))
    ) {
      return noStoreJson({ error: 'sales_assisted_plan_required' }, { status: 400 });
    }

    if (await getAuthoritativeSignedContractPlan(organization.id)) {
      return noStoreJson({ error: 'contract_managed_billing' }, { status: 409 });
    }

    const liveBinding = await getLiveSubscriptionBinding(organization.id);
    if (!liveBinding) {
      return noStoreJson({ error: 'live_stripe_subscription_not_found' }, { status: 409 });
    }

    const idempotency = readBillingIdempotencyKey(request, {
      scope: 'subscription',
      organizationId: organization.id,
      userId: user.id,
    });
    if (!idempotency.ok) return noStoreJson({ error: idempotency.error }, { status: 400 });

    const stepUp = await requireStepUpForRequest({ request, action: 'manage_billing', userId: user.id, organizationId: organization.id });
    if (!stepUp.ok) return stepUp.response;

    const result = await mutateSubscriptionLifecycle({
      action: parsed.data.action,
      organizationId: organization.id,
      userId: user.id,
      actorRole: permission.role ?? 'unknown',
      plan,
      interval: parsed.data.interval,
      addOns: parsed.data.addOns,
      idempotency: idempotency.context,
    });

    return noStoreJson({ ...result, stepUp: publicStepUpSummary(stepUp.assessment) });
  } catch (error) {
    if (isBillingLifecycleRequestError(error)) {
      return noStoreJson({ error: error.code }, { status: error.status });
    }
    return secureApiError(error, request);
  }
}
