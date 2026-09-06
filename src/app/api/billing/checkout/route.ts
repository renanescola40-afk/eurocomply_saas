import Stripe from 'stripe';
import { z } from 'zod';

import { getBillingEntitlements } from '@/lib/billing/plans';
import { reportError } from '@/lib/observability/report-error';
import { writeAuditLog } from '@/lib/security/audit-log';
import { readBoundedJsonRequest } from '@/lib/security/validate';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveBillingReturnBaseUrl } from '@/server/billing/app-url';
import { deriveStripeIdempotencyKey, readBillingIdempotencyKey, type BillingIdempotencyContext } from '@/server/billing/idempotency';
import {
  bindInitialCheckoutSession,
  claimInitialCheckoutAttempt,
  releaseInitialCheckoutAttempt,
} from '@/server/billing/initial-checkout-singleflight';
import { getStripePriceId, isSelfServePlan, normalizeBillingPlanId } from '@/server/billing/plans';
import { getStripeClient } from '@/server/billing/stripe';
import {
  getAuthoritativeSignedContractPlan,
  hasProcessedLiveStripeSubscriptionAuthority,
} from '@/server/billing/subscription-authority';
import { mutateSubscriptionLifecycle } from '@/server/billing/subscription-lifecycle';
import {
  classifyProviderFailure,
  providerFailureContext,
} from '@/server/providers/failure';
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
const INITIAL_CHECKOUT_SESSION_TTL_SECONDS = 45 * 60;

type CheckoutLocale = (typeof CHECKOUT_LOCALES)[number];

type BillingBinding = {
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: string | null;
  plan: string | null;
};

type StripeCustomerBinding = {
  id: string;
  created: boolean;
};

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

function isStripeResourceMissing(error: unknown) {
  return Boolean(
    error
    && typeof error === 'object'
    && 'code' in error
    && (error as { code?: unknown }).code === 'resource_missing',
  );
}

async function getOrganizationBillingBinding(organizationId: string): Promise<BillingBinding | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id,stripe_subscription_id,status,plan')
    .eq('organization_id', organizationId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle<BillingBinding>();

  if (error) throw error;
  return data ?? null;
}

async function hasLiveSubscriptionRelationship(organizationId: string, binding: BillingBinding | null) {
  return hasProcessedLiveStripeSubscriptionAuthority({
    organizationId,
    stripeCustomerId: binding?.stripe_customer_id,
    stripeSubscriptionId: binding?.stripe_subscription_id,
  });
}

async function ensureOrganizationStripeCustomer({
  stripe,
  organizationName,
  userEmail,
  metadata,
  existingCustomerId,
  idempotency,
}: {
  stripe: Stripe;
  organizationName?: string | null;
  userEmail?: string | null;
  metadata: Record<string, string>;
  existingCustomerId?: string | null;
  idempotency: BillingIdempotencyContext;
}): Promise<StripeCustomerBinding> {
  if (existingCustomerId) {
    try {
      await stripe.customers.update(
        existingCustomerId,
        { metadata },
        { idempotencyKey: deriveStripeIdempotencyKey(idempotency, 'customer-metadata') },
      );
      return { id: existingCustomerId, created: false };
    } catch (error) {
      if (!isStripeResourceMissing(error)) {
        throw classifyProviderFailure('stripe', 'customer_update', error);
      }
    }
  }

  try {
    const customer = await stripe.customers.create(
      {
        ...(userEmail ? { email: userEmail } : {}),
        ...(organizationName ? { name: organizationName } : {}),
        metadata,
      },
      { idempotencyKey: deriveStripeIdempotencyKey(idempotency, 'customer-create') },
    );
    return { id: customer.id, created: true };
  } catch (error) {
    throw classifyProviderFailure('stripe', 'customer_create', error);
  }
}

async function persistPendingLiveCustomerBinding({
  stripe,
  organizationId,
  customer,
}: {
  stripe: Stripe;
  organizationId: string;
  customer: StripeCustomerBinding;
}) {
  const supabase = createAdminClient();
  const starterEntitlements = getBillingEntitlements('starter');
  const { error } = await supabase.from('subscriptions').upsert(
    {
      organization_id: organizationId,
      stripe_customer_id: customer.id,
      stripe_subscription_id: null,
      plan: 'starter',
      tier: 'starter',
      status: 'incomplete',
      current_period_end: null,
      entitlements: starterEntitlements,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'organization_id' },
  );

  if (!error) return;

  if (customer.created) {
    try {
      await stripe.customers.del(customer.id);
    } catch (cleanupError) {
      const providerFailure = classifyProviderFailure('stripe', 'customer_cleanup', cleanupError);
      reportError(providerFailure, {
        area: 'billing_customer_binding_compensation',
        organizationId,
        ...providerFailureContext(providerFailure),
      });
    }
  }

  throw error;
}

async function releaseCheckoutAttemptSafely(organizationId: string, attemptToken: string, area: string) {
  try {
    await releaseInitialCheckoutAttempt(organizationId, attemptToken);
  } catch (error) {
    reportError(error, { area, organizationId });
  }
}

async function expireCheckoutSessionSafely(stripe: Stripe, sessionId: string, organizationId: string, area: string) {
  try {
    await stripe.checkout.sessions.expire(sessionId);
  } catch (error) {
    const providerFailure = classifyProviderFailure('stripe', 'checkout_session_expire', error);
    reportError(providerFailure, {
      area,
      organizationId,
      ...providerFailureContext(providerFailure),
    });
  }
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
        policy: 'billing-checkout',
        userId: user.id,
        organizationId: organization.id,
        action: 'billing_checkout_create',
        route: '/api/billing/checkout',
        limit: 10,
        windowMs: 60 * 1000,
        failureMode: 'fail-closed',
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

    if (await getAuthoritativeSignedContractPlan(organization.id)) {
      return noStoreJson({ error: 'contract_managed_billing' }, { status: 409 });
    }

    const idempotency = readBillingIdempotencyKey(request, {
      scope: 'checkout',
      organizationId: organization.id,
      userId: user.id,
    });
    if (!idempotency.ok) {
      return noStoreJson({ error: idempotency.error }, { status: 400 });
    }

    const billingBinding = await getOrganizationBillingBinding(organization.id);
    const hasLiveSubscription = await hasLiveSubscriptionRelationship(organization.id, billingBinding);
    const stepUp = hasLiveSubscription
      ? await requireStepUpForRequest({
          request,
          action: 'manage_billing',
          userId: user.id,
          organizationId: organization.id,
        })
      : null;

    if (stepUp && !stepUp.ok) return stepUp.response;

    const returnBaseUrl = resolveBillingReturnBaseUrl(request.url);
    if (!returnBaseUrl.ok) {
      return noStoreJson({ error: 'billing_app_url_unavailable' }, { status: 503 });
    }

    const plan = normalizedPlan;
    const locale = normalizeCheckoutLocale(parsedBody.data.locale);

    if (hasLiveSubscription) {
      const currentPlan = normalizeBillingPlanId(billingBinding?.plan);
      if (!currentPlan || !isSelfServePlan(currentPlan)) {
        return noStoreJson({ error: 'sales_assisted_plan_required' }, { status: 409 });
      }

      if (currentPlan === plan) {
        return noStoreJson({
          url: `${returnBaseUrl.appUrl}/${locale}/dashboard/organizations/billing`,
          idempotencyProtected: true,
          stepUp: stepUp?.ok ? publicStepUpSummary(stepUp.assessment) : undefined,
        });
      }

      const action = currentPlan === 'professional' && plan === 'starter' ? 'downgrade' : 'upgrade';
      const lifecycle = await mutateSubscriptionLifecycle({
        action,
        organizationId: organization.id,
        userId: user.id,
        actorRole: permission.role ?? 'unknown',
        plan,
        interval: 'month',
        idempotency: idempotency.context,
      });

      const billingOutcome = action === 'downgrade' ? 'scheduled' : 'updated';
      return noStoreJson({
        url: `${returnBaseUrl.appUrl}/${locale}/dashboard/organizations/billing?billing=${billingOutcome}`,
        idempotencyProtected: true,
        lifecycle,
        stepUp: stepUp?.ok ? publicStepUpSummary(stepUp.assessment) : undefined,
      });
    }

    let checkoutAttempt = await claimInitialCheckoutAttempt(organization.id, plan);
    if (checkoutAttempt.outcome === 'busy') {
      return noStoreJson({ error: 'checkout_in_progress' }, { status: 409 });
    }

    const stripe = getStripeClient();

    if (checkoutAttempt.outcome === 'existing') {
      if (!checkoutAttempt.stripeSessionId) {
        return noStoreJson({ error: 'checkout_in_progress' }, { status: 409 });
      }

      let existingSession: Stripe.Checkout.Session;
      try {
        existingSession = await stripe.checkout.sessions.retrieve(checkoutAttempt.stripeSessionId);
      } catch (error) {
        if (!isStripeResourceMissing(error)) {
          throw classifyProviderFailure('stripe', 'checkout_session_retrieve', error);
        }
        await releaseCheckoutAttemptSafely(organization.id, checkoutAttempt.attemptToken, 'billing_checkout_stale_session_release');
        checkoutAttempt = await claimInitialCheckoutAttempt(organization.id, plan);
        if (checkoutAttempt.outcome !== 'claimed') {
          return noStoreJson({ error: 'checkout_in_progress' }, { status: 409 });
        }
        existingSession = null as never;
      }

      if (existingSession) {
        const existingPlan = normalizeBillingPlanId(existingSession.metadata?.plan);
        const existingOrganizationId = existingSession.metadata?.organization_id ?? existingSession.metadata?.organizationId;
        if (existingSession.mode !== 'subscription' || existingOrganizationId !== organization.id || existingPlan !== plan) {
          throw new Error('billing_checkout_attempt_binding_mismatch');
        }

        if (existingSession.status === 'open') {
          if (!isSafeStripeCheckoutUrl(existingSession.url)) {
            throw new Error('billing_checkout_existing_session_url_invalid');
          }
          return noStoreJson({
            url: existingSession.url,
            idempotencyProtected: true,
            singleflightReused: true,
            stepUpRequired: false,
          });
        }

        if (existingSession.status === 'complete') {
          return noStoreJson(
            {
              error: 'checkout_pending_activation',
              idempotencyProtected: true,
              singleflightProtected: true,
            },
            { status: 409 },
          );
        }

        if (existingSession.status !== 'expired') {
          throw new Error('billing_checkout_existing_session_status_invalid');
        }

        await releaseCheckoutAttemptSafely(organization.id, checkoutAttempt.attemptToken, 'billing_checkout_expired_session_release');
        checkoutAttempt = await claimInitialCheckoutAttempt(organization.id, plan);
        if (checkoutAttempt.outcome !== 'claimed') {
          return noStoreJson({ error: 'checkout_in_progress' }, { status: 409 });
        }
      }
    }

    if (checkoutAttempt.outcome !== 'claimed') {
      return noStoreJson({ error: 'checkout_in_progress' }, { status: 409 });
    }

    const attemptToken = checkoutAttempt.attemptToken;
    const priceId = getStripePriceId(plan);
    const organizationName = typeof organization.name === 'string' ? organization.name : null;
    const metadata = {
      organization_id: organization.id,
      organizationId: organization.id,
      user_id: user.id,
      userId: user.id,
      plan,
      actor_role: permission.role ?? 'unknown',
      billing_flow: 'initial_subscription',
      step_up_action: 'not_required_initial_checkout',
      step_up_verified_at: '',
    };

    try {
      const customer = await ensureOrganizationStripeCustomer({
        stripe,
        organizationName,
        userEmail: user.email,
        metadata,
        existingCustomerId: billingBinding?.stripe_customer_id,
        idempotency: idempotency.context,
      });

      await persistPendingLiveCustomerBinding({ stripe, organizationId: organization.id, customer });

      const sessionExpiresAtSeconds = Math.floor(Date.now() / 1000) + INITIAL_CHECKOUT_SESSION_TTL_SECONDS;
      let session: Stripe.Checkout.Session;
      try {
        session = await stripe.checkout.sessions.create(
          {
            mode: 'subscription',
            customer: customer.id,
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: `${returnBaseUrl.appUrl}/${locale}/checkout/complete`,
            cancel_url: `${returnBaseUrl.appUrl}/${locale}/checkout?plan=${plan}&checkout=cancelled`,
            client_reference_id: organization.id,
            locale,
            metadata,
            subscription_data: { metadata },
            billing_address_collection: 'required',
            customer_update: {
              address: 'auto',
              name: 'auto',
            },
            tax_id_collection: { enabled: true },
            payment_method_collection: 'always',
            allow_promotion_codes: true,
            expires_at: sessionExpiresAtSeconds,
          },
          { idempotencyKey: deriveStripeIdempotencyKey(idempotency.context, `checkout-session:${attemptToken}`) },
        );
      } catch (error) {
        throw classifyProviderFailure('stripe', 'checkout_session_create', error);
      }

      if (!isSafeStripeCheckoutUrl(session.url)) {
        await expireCheckoutSessionSafely(stripe, session.id, organization.id, 'billing_checkout_unsafe_url_compensation');
        await releaseCheckoutAttemptSafely(organization.id, attemptToken, 'billing_checkout_unsafe_url_release');
        return noStoreJson({ error: 'checkout_session_unavailable' }, { status: 502 });
      }

      try {
        await bindInitialCheckoutSession({
          organizationId: organization.id,
          attemptToken,
          stripeSessionId: session.id,
          sessionExpiresAt: new Date((session.expires_at ?? sessionExpiresAtSeconds) * 1000).toISOString(),
        });
      } catch (error) {
        await expireCheckoutSessionSafely(stripe, session.id, organization.id, 'billing_checkout_singleflight_bind_compensation');
        await releaseCheckoutAttemptSafely(organization.id, attemptToken, 'billing_checkout_singleflight_bind_release');
        throw error;
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
          stripeCustomerId: customer.id,
          actorRole: permission.role ?? 'unknown',
          billingFlow: 'initial_subscription',
          stepUpRequired: false,
          trustedOriginRequired: true,
          rbacPermission: 'manage_billing',
          stripeCheckoutHost: STRIPE_CHECKOUT_URL_HOST,
          idempotencyProtected: true,
          initialCheckoutSingleflight: true,
          liveSubscriptionAuthority: false,
          pendingCustomerBindingPersisted: true,
        },
      });

      if (!auditResult.persisted) {
        await expireCheckoutSessionSafely(stripe, session.id, organization.id, 'billing_checkout_audit_compensation');
        await releaseCheckoutAttemptSafely(organization.id, attemptToken, 'billing_checkout_audit_release');

        reportError(new Error('Billing checkout audit persistence failed'), {
          area: 'billing_checkout_audit',
          organizationId: organization.id,
          userId: user.id,
        });
        return noStoreJson({ error: 'checkout_audit_unavailable' }, { status: 503 });
      }

      return noStoreJson({
        url: session.url,
        idempotencyProtected: true,
        singleflightProtected: true,
        stepUpRequired: false,
      });
    } catch (error) {
      await releaseCheckoutAttemptSafely(organization.id, attemptToken, 'billing_checkout_failed_attempt_release');
      throw error;
    }
  } catch (error) {
    return secureApiError(error, request);
  }
}
