import { checkDistributedRateLimit } from '@/lib/security/rate-limit';
import { rateLimitResponse } from '@/lib/security/rate-limit-response';
import { readBoundedJsonRequest } from '@/lib/security/validate';
import { resolveBillingReturnBaseUrl } from '@/server/billing/app-url';
import { getStripeClient } from '@/server/billing/stripe';
import { getStripePriceId, isSelfServePlan } from '@/server/billing/plans';
import { getCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { assertOrganizationPermission, permissionDeniedResponse } from '@/server/security/rbac';
import { assertTrustedOrigin } from '@/server/security/origin-guard';
import { noStoreJson } from '@/server/security/no-store';
import { publicStepUpSummary, requireStepUpForRequest } from '@/server/security/step-up';

const CHECKOUT_JSON_MAX_BYTES = 2 * 1024;

export async function POST(request: Request) {
  const originDenied = assertTrustedOrigin(request);
  if (originDenied) return originDenied;

  const user = await getCurrentUser();

  if (!user) {
    return noStoreJson({ error: 'authentication_required' }, { status: 401 });
  }

  const body = await readBoundedJsonRequest<Record<string, unknown>>(request, {
    maxBytes: CHECKOUT_JSON_MAX_BYTES,
  }).catch(() => null);
  const plan = typeof body?.plan === 'string' ? body.plan : undefined;
  const localeValue = typeof body?.locale === 'string' ? body.locale : '';
  const locale = localeValue.match(/^(en|pt|es|fr|it|de)$/) ? localeValue : 'en';

  if (!plan || !isSelfServePlan(plan)) {
    return noStoreJson({ error: 'invalid_plan' }, { status: 400 });
  }

  const organization = await getCurrentOrganizationForUser(user.id);

  if (!organization?.id) {
    return noStoreJson({ error: 'organization_required' }, { status: 400 });
  }

  const permission = await assertOrganizationPermission({
    userId: user.id,
    organizationId: organization.id,
    permission: 'manage_billing',
  });

  if (!permission.ok) {
    return permissionDeniedResponse(permission);
  }

  const rateLimit = await checkDistributedRateLimit({
    key: `billing:checkout:${organization.id}:${user.id}`,
    limit: 10,
    windowMs: 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit);
  }

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
    return noStoreJson({ error: returnBaseUrl.error }, { status: 503 });
  }

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

  return noStoreJson({
    url: session.url,
    stepUp: publicStepUpSummary(stepUp.assessment),
  });
}
