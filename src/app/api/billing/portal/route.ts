import { z } from 'zod';

import { normalizeLocale } from '@/lib/i18n/locales';
import { reportError } from '@/lib/observability/report-error';
import { writeAuditLog } from '@/lib/security/audit-log';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveBillingReturnBaseUrl } from '@/server/billing/app-url';
import { deriveStripeIdempotencyKey, readBillingIdempotencyKey } from '@/server/billing/idempotency';
import { resolveStripeBillingPortalConfigurationBinding } from '@/server/billing/portal-configuration';
import { getStripeClient } from '@/server/billing/stripe';
import {
  getAuthoritativeSignedContractPlan,
  hasProcessedLiveStripeSubscriptionAuthority,
} from '@/server/billing/subscription-authority';
import { classifyProviderFailure } from '@/server/providers/failure';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { noStoreJson } from '@/server/security/no-store';
import { requireApiUser, requirePermission, requireTrustedMutation, secureApiError } from '@/server/security/api-guards';
import { publicStepUpSummary, requireStepUpForRequest } from '@/server/security/step-up';

const DEFAULT_BILLING_RETURN_PATH = '/dashboard/organizations/billing';

const billingPortalQuerySchema = z.object({
  locale: z.string().trim().max(16).nullable().optional(),
  returnPath: z
    .string()
    .trim()
    .max(160)
    .regex(/^\/dashboard\/organizations\/billing(?:\?.*)?$/)
    .nullable()
    .optional(),
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
        policy: 'billing-checkout',
        userId: user.id,
        organizationId: organization.id,
        action: 'billing_portal_create',
        route: '/api/billing/portal',
        limit: 10,
        windowMs: 60 * 1000,
        failureMode: 'fail-closed',
      },
    });

    if (mutationDenied) return mutationDenied;

    const idempotency = readBillingIdempotencyKey(request, {
      scope: 'portal',
      organizationId: organization.id,
      userId: user.id,
    });
    if (!idempotency.ok) {
      return noStoreJson({ error: idempotency.error }, { status: 400 });
    }

    const stepUp = await requireStepUpForRequest({
      request,
      action: 'manage_billing',
      userId: user.id,
      organizationId: organization.id,
    });

    if (!stepUp.ok) return stepUp.response;

    if (await getAuthoritativeSignedContractPlan(organization.id)) {
      return noStoreJson({ error: 'contract_managed_billing' }, { status: 409 });
    }

    const supabase = createAdminClient();
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id,stripe_subscription_id,status')
      .eq('organization_id', organization.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle<{
        stripe_customer_id: string | null;
        stripe_subscription_id: string | null;
        status: string | null;
      }>();

    if (error) {
      throw classifyProviderFailure('supabase', 'billing_profile_lookup', error);
    }

    const liveAuthority = await hasProcessedLiveStripeSubscriptionAuthority({
      organizationId: organization.id,
      stripeCustomerId: subscription?.stripe_customer_id,
      stripeSubscriptionId: subscription?.stripe_subscription_id,
    });

    if (!liveAuthority || !subscription?.stripe_customer_id) {
      return noStoreJson({ error: 'live_stripe_subscription_not_found' }, { status: 404 });
    }

    const returnBaseUrl = resolveBillingReturnBaseUrl(request.url);
    if (!returnBaseUrl.ok) {
      return noStoreJson({ error: 'billing_app_url_unavailable' }, { status: 503 });
    }

    const url = new URL(request.url);
    const parsedQuery = billingPortalQuerySchema.safeParse({
      locale: url.searchParams.get('locale'),
      returnPath: url.searchParams.get('returnPath'),
    });

    if (!parsedQuery.success) {
      return noStoreJson({ error: 'invalid_billing_portal_query' }, { status: 400 });
    }

    const portalConfiguration = resolveStripeBillingPortalConfigurationBinding();
    if (!portalConfiguration.ok) {
      reportError(new Error('Stripe Billing Portal configuration binding is invalid'), {
        area: 'billing_portal_configuration',
        organizationId: organization.id,
        userId: user.id,
      });
      return noStoreJson({ error: portalConfiguration.error }, { status: 503 });
    }

    const locale = normalizeLocale(parsedQuery.data.locale);
    const returnPath = parsedQuery.data.returnPath ?? DEFAULT_BILLING_RETURN_PATH;
    const returnUrl = `${returnBaseUrl.appUrl}/${locale}${returnPath}`;
    const stripe = getStripeClient();

    let portalSession;
    try {
      portalSession = await stripe.billingPortal.sessions.create(
        {
          customer: subscription.stripe_customer_id,
          return_url: returnUrl,
          ...(portalConfiguration.configurationId
            ? { configuration: portalConfiguration.configurationId }
            : {}),
        },
        { idempotencyKey: deriveStripeIdempotencyKey(idempotency.context, 'portal-session') },
      );
    } catch (providerError) {
      throw classifyProviderFailure('stripe', 'billing_portal_session_create', providerError);
    }

    const auditResult = await writeAuditLog({
      action: 'billing_portal_created',
      organizationId: organization.id,
      userId: user.id,
      entityType: 'stripe_billing_portal_session',
      entityId: portalSession.id ?? subscription.stripe_customer_id,
      metadata: {
        stripeCustomerId: subscription.stripe_customer_id,
        stripeSubscriptionId: subscription.stripe_subscription_id,
        returnUrl,
        actorRole: permission.role ?? 'unknown',
        stepUpAction: stepUp.assessment.action,
        stepUpVerifiedAt: stepUp.assessment.verifiedAt ?? null,
        trustedOriginRequired: true,
        rbacPermission: 'manage_billing',
        idempotencyProtected: true,
        liveSubscriptionAuthority: true,
        billingPortalConfigurationSource: portalConfiguration.source,
        billingPortalConfigurationPinned: portalConfiguration.source === 'explicit',
      },
    });

    if (!auditResult.persisted) {
      reportError(new Error('Billing portal audit persistence failed'), {
        area: 'billing_portal_audit',
        organizationId: organization.id,
        userId: user.id,
      });
      return noStoreJson({ error: 'billing_portal_audit_unavailable' }, { status: 503 });
    }

    return noStoreJson({
      url: portalSession.url,
      idempotencyProtected: true,
      stepUp: publicStepUpSummary(stepUp.assessment),
    });
  } catch (error) {
    return secureApiError(error, request);
  }
}
