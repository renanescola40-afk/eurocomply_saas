import Stripe from 'stripe';
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
const CHECKOUT_LOCALES = ['en', 'pt', 'es', 'fr', 'it', 'de'] as const satisfies readonly Stripe.Checkout.SessionCreateParams.Locale[];
const STRIPE_CHECKOUT_URL_HOST = 'checkout.stripe.com';

type CheckoutLocale = (typeof CHECKOUT_LOCALES)[number];

const checkoutBodySchema = z.object({
  plan: z.string().trim().min(1).max(64),
  locale: z.string().trim().max(16).optional().default('en'),
});

function normalizeCheckoutLocale(locale: string): CheckoutLocale {
  const normalized = locale.trim().toLowerCase();
  return CHECKOUT_LOCALES.includes(normalized as CheckoutLocale) ? normalized as CheckoutLocale : 'en';
}

function isSafeStripeCheckoutUrl(url: string | null): url is string {
  if (!url) return false;

  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === 'https:' && parsedUrl.hostname === STRIPE_CHECKOUT_URL_HOST;
  } catch {
    return false;
  }
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

async function ensureOrganizationStripeCustomer({
  stripe,
  organizationId,
  organizationName,
  userEmail,
  metadata,
}: {
  stripe: Stripe;
  organizationId: string;
  organizationName?: string | null;
  userEmail?: string | null;
  metadata: Record<string, string>;
}) {
  const existingCustomerId = await getOrganizationStripeCustomerId(organizationId);

  if (existingCustomerId) {
    await stripe.customers.update(existingCustomerId, { metadata });
    return existingCustomerId;
  }

  const customer = await stripe.customers.create({
    ...(userEmail ? { email: userEmail } : {}),
    ...(organizationName ? { name: organizationName } : {}),
    metadata,
  });

  return customer.id;
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    const organization = await getCurrentOrganizationForUser(user.id);

    if (!organization?.id) {
      return noStoreJson({ error: 'organization_required' }, { status: 403 });
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

    const body = await readBoundedJsonRequest<Record<string, unknown>>(request, {
      maxBytes: CHECKOUT_JSON_MAX_BYTES,
    }).catch(() => null);
    const parsedBody = checkoutBodySchema.safeParse(body);
    const normalizedPlan = parsedBody.success ? normalizeBillingPlanId(parsedBody.data.plan) : undefined;

    if (!parsedBody.success || !normalizedPlan || !isSelfServePlan(normalizedPlan)) {
      return noStoreJson({ error: 'invalid_plan' }, { status: 400 });
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
      return noStoreJson({ error: 'billing_app_url_unavailable' }, { status: 503 });
    }

    const plan = normalizedPlan;
    const locale = normalizeCheckoutLocale(parsedBody.data.locale);
    const stripe = getStripeClient();
    const priceId = getStripePriceId(plan);
    const organizationName = typeof organization.name === 'string' ? organization.name : null;
    const metadata = {
      organization_id: organization.id,
      organizationId: organization.id,
      user_id: user.id,
      userId: user.id,
      plan,
      actor_role: permission.role ?? 'unknown',
      step_up_action: stepUp.assessment.action,
      step_up_verified_at: stepUp.assessment.verifiedAt ?? '',
    };
    const stripeCustomerId = await ensureOrganizationStripeCustomer({
      stripe,
      organizationId: organization.id,
      organizationName,
      userEmail: user.email,
      metadata,
    });

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${returnBaseUrl.appUrl}/${locale}/dashboard/organizations?checkout=success`,
      cancel_url: `${returnBaseUrl.appUrl}/${locale}/checkout?plan=${plan}&checkout=cancelled`,
      client_reference_id: organization.id,
      locale,
      metadata,
      subscription_data: {
        metadata,
      },
      billing_address_collection: 'required',
      customer_update: {
        address: 'auto',
        name: 'auto',
      },
      tax_id_collection: {
        enabled: true,
      },
      payment_method_collection: 'always',
      allow_promotion_codes: true,
    });

    if (!isSafeStripeCheckoutUrl(session.url)) {
      return noStoreJson({ error: 'checkout_session_unavailable' }, { status: 502 });
    }

    const auditResult = await writeAuditLog({
      action: 'checkout_created',
      organizationId: organization.id,
      userId: user.id,
      entityType: 'stripe_checkout_session',
      entityId: session.id,
      metadata: {
        plan,
        priceId,
        stripeCustomerId,
        actorRole: permission.role ?? 'unknown',
        stepUpAction: stepUp.assessment.action,
        stepUpVerifiedAt: stepUp.assessment.verifiedAt ?? null,
        trustedOriginRequired: true,
        rbacPermission: 'manage_billing',
        stripeCheckoutHost: STRIPE_CHECKOUT_URL_HOST,
      },
    });

    if (!auditResult.persisted) {
      try {
        await stripe.checkout.sessions.expire(session.id);
      } catch (expirationError) {
        reportError(expirationError, {
          area: 'billing_checkout_audit_compensation',
          organizationId: organization.id,
          userId: user.id,
        });
      }

      reportError(new Error('Billing checkout audit persistence failed'), {
        area: 'billing_checkout_audit',
        organizationId: organization.id,
        userId: user.id,
      });
      return noStoreJson({ error: 'checkout_audit_unavailable' }, { status: 503 });
    }

    return noStoreJson({
      url: session.url,
      stepUp: publicStepUpSummary(stepUp.assessment),
    });
  } catch (error) {
    return secureApiError(error);
  }
}
