import { checkDistributedRateLimit } from '@/lib/security/rate-limit';
import { rateLimitResponse } from '@/lib/security/rate-limit-response';
import { normalizeLocale } from '@/lib/i18n/locales';
import { getCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { resolveBillingReturnBaseUrl } from '@/server/billing/app-url';
import { createAdminClient } from '@/lib/supabase/admin';
import { getStripeClient } from '@/server/billing/stripe';
import { assertOrganizationPermission, permissionDeniedResponse } from '@/server/security/rbac';
import { assertTrustedOrigin } from '@/server/security/origin-guard';
import { noStoreJson } from '@/server/security/no-store';
import { requireStepUpForRequest } from '@/server/security/step-up';

export async function POST(request: Request) {
  const originDenied = assertTrustedOrigin(request);
  if (originDenied) return originDenied;

  const user = await getCurrentUser();
  if (!user) {
    return noStoreJson({ error: 'Authentication required.' }, { status: 401 });
  }

  const organization = await getCurrentOrganizationForUser(user.id);
  if (!organization) {
    return noStoreJson({ error: 'Organization required.' }, { status: 403 });
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
    key: `billing:portal:${organization.id}:${user.id}`,
    limit: 10,
    windowMs: 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit);
  }

  const stepUp = requireStepUpForRequest({
    request,
    action: 'manage_billing',
    userId: user.id,
    organizationId: organization.id,
  });

  if (!stepUp.ok) {
    return stepUp.response;
  }

  const supabase = createAdminClient();
  const { data: subscription, error } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('organization_id', organization.id)
    .not('stripe_customer_id', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return noStoreJson({ error: 'Unable to load billing profile.' }, { status: 500 });
  }

  if (!subscription?.stripe_customer_id) {
    return noStoreJson({ error: 'No active Stripe customer found.' }, { status: 404 });
  }

  const returnBaseUrl = resolveBillingReturnBaseUrl(request.url);

  if (!returnBaseUrl.ok) {
    return noStoreJson({ error: returnBaseUrl.error }, { status: 503 });
  }

  const url = new URL(request.url);
  const locale = normalizeLocale(url.searchParams.get('locale'));
  const returnUrl = `${returnBaseUrl.appUrl}/${locale}/settings/billing`;

  const stripe = getStripeClient();
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: subscription.stripe_customer_id,
    return_url: returnUrl,
  });

  return noStoreJson({
    url: portalSession.url,
    stepUp: {
      action: stepUp.assessment.action,
      verifiedAt: stepUp.assessment.verifiedAt,
      expiresAt: stepUp.assessment.expiresAt,
      tokenType: 'signed_hmac',
    },
  });
}
