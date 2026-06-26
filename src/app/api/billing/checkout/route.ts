import { z } from 'zod';

import { readBoundedJsonRequest } from '@/lib/security/validate';
import { writeAuditLog } from '@/lib/security/audit-log';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveBillingReturnBaseUrl } from '@/server/billing/app-url';
import { getStripeClient } from '@/server/billing/stripe';
import { getStripePriceId, isSelfServePlan, normalizeBillingPlanId } from '@/server/billing/plans';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { noStoreJson } from '@/server/security/no-store';
import {
  requireApiUser,
  requirePermission,
  requireTrustedMutation,
  secureApiError,
} from '@/server/security/api-guards';
import { publicStepUpSummary, requireStepUpForRequest } from '@/server/security/step-up';

const CHECKOUT_JSON_MAX_BYTES = 2 * 1024;

const checkoutBodySchema = z.object({
  plan: z.string().trim().min(1).max(64),
  locale: z.string().trim().max(16).optional().default('en'),
});

function normalizeCheckoutLocale(locale: string) {
  return locale.match(/^(en|pt|es|fr|it|de)$/) ? locale : 'en';
}

async function getOrganizationStripeCustomerId(organizationId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('organization_id', organizationId)
    .not('stripe_customer_id', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle<{ stripe_customer_id: string | null }>();

  if (error) {
    throw error;
  }

  return data?.stripe_customer_id ?? null;
}

export async function POST(request: Request) {
  try {
    const body = await readBoundedJsonRequest<Record<string, unknown>>(request, {
      maxBytes: CHECKOUT_JSON_MAX_BYTES,
    }).catch(() => null);
    const parsedBody = checkoutBodySchema.safeParse(body);
    const normalizedPlan = parsedBody.success ? normalizeBillingPlanId(parsedBody.data.plan) : undefined;

    if (!parsedBody.success || !normalizedPlan || !isSelfServePlan(normalizedPlan)) {
      return noStoreJson({ error: 'invalid_plan' }, { status: 400 });
    }

    const user = await requireApiUser();
    const organization = await getCurrentOrganizationForUser(user.id);

    if (!organization?.id) {
      return noStoreJson({ error: 'organization_required' }, { status: 400 });
    }

    const permission = await requirePermission({
      userId: user.id,
      organizationId: organization.id,
      permission: 'manage_billing',
    });

    const mutationDenied = await requireTrustedMutation(request, {
      rateLimit: {
        key: `billing:checkout:${organization.id}:${user.id}`,
        limit: 10,
        windowMs: 60 * 1000,
      },
    });

    if (mutationDenied) return mutationDenied;

    const stepUp = await requireStepUpForRequest({
      request,
      action: 'manage_billing',
      userId: user.id,
      organizationId: organization.id,
    });

    if (!stepUp.ok) {
      return stepUp.response;
    }

    const returnBaseUrl = resolveBillingReturnBaseUrl(request.url);

    if (!returnBaseUrl.ok) {
      return noStoreJson({ error: 'billing_app_url_unavailable' }, { status: 503 });
    }

    const plan = normalizedPlan;
    const locale = normalizeCheckoutLocale(parsedBody.data.locale);
    const stripe = getStripeClient();
    const priceId = getStripePriceId(plan);
    const existingCustomerId = await getOrganizationStripeCustomerId(organization.id);
    const clerkOrgId = typeof organization.clerk_org_id === 'string' ? organization.clerk_org_id : '';
    const metadata = {
      organization_id: organization.id,
      organizationId: organization.id,
      clerk_org_id: clerkOrgId,
      clerkOrgId,
      user_id: user.id,
      userId: user.id,
      plan,
      actor_role: permission.role ?? 'unknown',
      step_up_action: stepUp.assessment.action,
      step_up_verified_at: stepUp.assessment.verifiedAt ?? '',
    };

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      ...(existingCustomerId ? { customer: existingCustomerId } : { customer_email: user.email ?? undefined }),
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${returnBaseUrl.appUrl}/${locale}/dashboard/organizations?checkout=success`,
      cancel_url: `${returnBaseUrl.appUrl}/${locale}/pricing?checkout=cancelled`,
      client_reference_id: organization.id,
      metadata,
      subscription_data: {
        metadata,
      },
      allow_promotion_codes: true,
    });

    if (!session.url) {
      return noStoreJson({ error: 'checkout_session_unavailable' }, { status: 502 });
    }

    await writeAuditLog({
      action: 'checkout_created',
      organizationId: organization.id,
      userId: user.id,
      entityType: 'stripe_checkout_session',
      entityId: session.id,
      metadata: {
        plan,
        priceId,
        stripeCustomerId: existingCustomerId,
        clerkOrgId: clerkOrgId || null,
        actorRole: permission.role ?? 'unknown',
        stepUpAction: stepUp.assessment.action,
        stepUpVerifiedAt: stepUp.assessment.verifiedAt ?? null,
        trustedOriginRequired: true,
        rbacPermission: 'manage_billing',
      },
    });

    return noStoreJson({
      url: session.url,
      stepUp: publicStepUpSummary(stepUp.assessment),
    });
  } catch (error) {
    return secureApiError(error);
  }
}
