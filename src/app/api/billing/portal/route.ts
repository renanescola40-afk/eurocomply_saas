import { z } from 'zod';

import { normalizeLocale } from '@/lib/i18n/locales';
import { writeAuditLog } from '@/lib/security/audit-log';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { resolveBillingReturnBaseUrl } from '@/server/billing/app-url';
import { createAdminClient } from '@/lib/supabase/admin';
import { getStripeClient } from '@/server/billing/stripe';
import { noStoreJson } from '@/server/security/no-store';
import { requireApiUser, requirePermission, requireTrustedMutation, secureApiError } from '@/server/security/api-guards';
import { publicStepUpSummary, requireStepUpForRequest } from '@/server/security/step-up';

const billingPortalQuerySchema = z.object({
  locale: z.string().trim().max(16).nullable().optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    const organization = await getCurrentOrganizationForUser(user.id);

    if (!organization) {
      return noStoreJson({ error: 'organization_required' }, { status: 403 });
    }

    const permission = await requirePermission({
      userId: user.id,
      organizationId: organization.id,
      permission: 'manage_billing',
    });

    const mutationDenied = await requireTrustedMutation(request, {
      rateLimit: {
        key: `billing:portal:${organization.id}:${user.id}`,
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
      return noStoreJson({ error: 'billing_profile_unavailable' }, { status: 500 });
    }

    if (!subscription?.stripe_customer_id) {
      return noStoreJson({ error: 'stripe_customer_not_found' }, { status: 404 });
    }

    const returnBaseUrl = resolveBillingReturnBaseUrl(request.url);

    if (!returnBaseUrl.ok) {
      return noStoreJson({ error: returnBaseUrl.error }, { status: 503 });
    }

    const url = new URL(request.url);
    const parsedQuery = billingPortalQuerySchema.safeParse({ locale: url.searchParams.get('locale') });

    if (!parsedQuery.success) {
      return noStoreJson({ error: 'invalid_billing_portal_query' }, { status: 400 });
    }

    const locale = normalizeLocale(parsedQuery.data.locale);
    const returnUrl = `${returnBaseUrl.appUrl}/${locale}/settings/billing`;

    const stripe = getStripeClient();
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: returnUrl,
    });

    await writeAuditLog({
      action: 'billing.portal_start',
      organizationId: organization.id,
      userId: user.id,
      entityType: 'stripe_customer_portal_session',
      entityId: portalSession.id,
      metadata: {
        stripeCustomerId: subscription.stripe_customer_id,
        actorRole: permission.role ?? 'unknown',
        stepUpAction: stepUp.assessment.action,
      },
    });

    return noStoreJson({
      url: portalSession.url,
      stepUp: publicStepUpSummary(stepUp.assessment),
    });
  } catch (error) {
    return secureApiError(error);
  }
}
