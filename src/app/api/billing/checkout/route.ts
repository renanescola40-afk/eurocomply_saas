import { z } from 'zod';

import { readBoundedJsonRequest } from '@/lib/security/validate';
import { writeAuditLog } from '@/lib/security/audit-log';
import { resolveBillingReturnBaseUrl } from '@/server/billing/app-url';
import { getStripeClient } from '@/server/billing/stripe';
import { getStripePriceId, isSelfServePlan } from '@/server/billing/plans';
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

export async function POST(request: Request) {
  try {
    const body = await readBoundedJsonRequest<Record<string, unknown>>(request, {
      maxBytes: CHECKOUT_JSON_MAX_BYTES,
    }).catch(() => null);
    const parsedBody = checkoutBodySchema.safeParse(body);

    if (!parsedBody.success || !isSelfServePlan(parsedBody.data.plan)) {
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

    const { plan } = parsedBody.data;
    const locale = normalizeCheckoutLocale(parsedBody.data.locale);
    const stripe = getStripeClient();
    const priceId = getStripePriceId(plan);

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: user.email ?? undefined,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${returnBaseUrl.appUrl}/${locale}/dashboard/organizations?checkout=success`,
      cancel_url: `${returnBaseUrl.appUrl}/${locale}/pricing?checkout=cancelled`,
      client_reference_id: organization.id,
      metadata: {
        organization_id: organization.id,
        user_id: user.id,
        plan,
        actor_role: permission.role ?? 'unknown',
        step_up_action: stepUp.assessment.action,
        step_up_verified_at: stepUp.assessment.verifiedAt ?? '',
      },
      subscription_data: {
        metadata: {
          organization_id: organization.id,
          user_id: user.id,
          plan,
          actor_role: permission.role ?? 'unknown',
          step_up_action: stepUp.assessment.action,
          step_up_verified_at: stepUp.assessment.verifiedAt ?? '',
        },
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
