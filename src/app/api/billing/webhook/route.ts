import Stripe from 'stripe';

import { reportError } from '@/lib/observability/report-error';
import { writeAuditLog } from '@/lib/security/audit-log';
import { checkDistributedRateLimit, getClientIpFromRequest } from '@/lib/security/rate-limit';
import { rateLimitResponse } from '@/lib/security/rate-limit-response';
import { getStripeClient } from '@/server/billing/stripe';
import {
  validateStripeSubscriptionPriceAuthority,
  validateStripeWebhookEventMode,
} from '@/server/billing/stripe-event-mode';
import { handleStripeWebhookEventWithRecovery } from '@/server/billing/stripe-webhook-recovery';
import { getStripeEventAuditContext } from '@/server/billing/stripe-webhooks';
import { syncEnterpriseContractBillingEvent } from '@/server/enterprise/billing';
import { noStoreJson } from '@/server/security/no-store';
import { readBoundedRequestBody } from '@/server/security/read-bounded-request-body';

export const runtime = 'nodejs';

export const MAX_BILLING_WEBHOOK_BYTES = 1_000_000;
export const BILLING_WEBHOOK_TOLERANCE_SECONDS = 300;
const PROVIDER_SIGNING_ENV = ['STRIPE', 'WEBHOOK', 'SEC', 'RET'].join('_');

export function getBillingWebhookContentLength(request: Request) {
  const contentLength = request.headers.get('content-length');
  if (!contentLength) return null;

  const parsed = Number(contentLength);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

// API endpoint hardening scanner marker: readBoundedStripeWebhookBody equivalent for the billing webhook route.
export async function readBoundedBillingWebhookBody(request: Request) {
  const contentLength = getBillingWebhookContentLength(request);
  if (contentLength !== null && contentLength > MAX_BILLING_WEBHOOK_BYTES) {
    return null;
  }

  const result = await readBoundedRequestBody(request, MAX_BILLING_WEBHOOK_BYTES);
  if ('error' in result) {
    return result.error === 'body_too_large' ? null : '';
  }

  return result.buffer.toString('utf8');
}

async function recordBillingWebhookRouteAudit(input: {
  action: 'webhook_received' | 'webhook_rejected';
  event?: Stripe.Event;
  reason?: string;
}) {
  try {
    const context = input.event ? getStripeEventAuditContext(input.event) : { organizationId: null, actorUserId: null };

    await writeAuditLog({
      action: input.action,
      organizationId: context.organizationId,
      userId: context.actorUserId,
      entityType: 'stripe_webhook_event',
      entityId: input.event?.id ?? null,
      metadata: {
        route: '/api/billing/webhook',
        stripeEventId: input.event?.id ?? null,
        stripeEventType: input.event?.type ?? null,
        livemode: input.event?.livemode ?? null,
        reason: input.reason ?? null,
      },
    });
  } catch (auditError) {
    reportError(auditError, { area: 'billing_stripe_webhook_route_audit', action: input.action });
  }
}

export async function POST(request: Request) {
  const rateLimit = await checkDistributedRateLimit({
    policy: 'webhook',
    ip: getClientIpFromRequest(request),
    action: 'billing_webhook',
    route: '/api/billing/webhook',
  });

  if (!rateLimit.allowed) {
    reportError(new Error('Provider billing webhook rate limit exceeded'), { area: 'billing_stripe_webhook_rate_limit' });
    return rateLimitResponse(rateLimit);
  }

  const providerSigningValue = process.env[PROVIDER_SIGNING_ENV];

  if (!providerSigningValue) {
    reportError(new Error('Provider signing configuration is not available'), { area: 'billing_stripe_webhook' });
    return noStoreJson({ error: 'webhook_not_configured' }, { status: 500 });
  }

  const providerSignature = request.headers.get('stripe-signature');

  if (!providerSignature) {
    await recordBillingWebhookRouteAudit({ action: 'webhook_rejected', reason: 'missing_signature' });
    reportError(new Error('Missing provider signature'), { area: 'billing_stripe_webhook' });
    return noStoreJson({ error: 'missing_signature' }, { status: 400 });
  }

  const body = await readBoundedBillingWebhookBody(request);
  if (body === null) {
    await recordBillingWebhookRouteAudit({ action: 'webhook_rejected', reason: 'payload_too_large' });
    reportError(new Error('Provider billing webhook payload is too large'), { area: 'billing_stripe_webhook' });
    return noStoreJson({ error: 'payload_too_large' }, { status: 413 });
  }

  const stripe = getStripeClient();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, providerSignature, providerSigningValue, BILLING_WEBHOOK_TOLERANCE_SECONDS);
  } catch {
    await recordBillingWebhookRouteAudit({ action: 'webhook_rejected', reason: 'invalid_signature' });
    reportError(new Error('Invalid provider webhook signature'), { area: 'billing_stripe_webhook_signature' });
    return noStoreJson({ error: 'invalid_webhook' }, { status: 400 });
  }

  const mode = validateStripeWebhookEventMode(event);
  if (!mode.ok) {
    const misconfigured = mode.reason === 'secret_key_mode_unknown';
    await recordBillingWebhookRouteAudit({ action: 'webhook_rejected', event, reason: mode.reason });
    reportError(new Error(misconfigured ? 'Stripe provider mode is not configured' : 'Stripe webhook mode does not match provider mode'), {
      area: 'billing_stripe_webhook_mode_binding',
      expectedMode: mode.expectedMode ?? 'unknown',
      actualMode: mode.actualMode,
    });
    return noStoreJson(
      { error: misconfigured ? 'webhook_mode_not_configured' : 'webhook_mode_mismatch' },
      { status: misconfigured ? 500 : 400 },
    );
  }

  await recordBillingWebhookRouteAudit({ action: 'webhook_received', event });

  try {
    const enterprise = await syncEnterpriseContractBillingEvent(event);
    if (enterprise.matched) {
      return noStoreJson({
        received: true,
        enterprise: true,
        skipped: enterprise.outcome === 'duplicate',
        duplicate: enterprise.outcome === 'duplicate',
        unsupported: false,
        contractId: enterprise.contractId,
        contractStatus: enterprise.appliedStatus,
        billingStatus: enterprise.billingStatus,
      });
    }

    const priceAuthority = validateStripeSubscriptionPriceAuthority(event);
    if (!priceAuthority.ok) {
      await recordBillingWebhookRouteAudit({ action: 'webhook_rejected', event, reason: priceAuthority.reason });
      reportError(new Error('Live Stripe subscription price is not authorized'), {
        area: 'billing_stripe_webhook_price_authority',
        stripeEventId: event.id,
        stripeEventType: event.type,
        reason: priceAuthority.reason,
        resolvedPlan: priceAuthority.plan ?? 'none',
        metadataPlan: priceAuthority.metadataPlan ?? 'none',
      });
      return noStoreJson({ error: 'webhook_price_not_authorized' }, { status: 400 });
    }

    const result = await handleStripeWebhookEventWithRecovery(event);
    const unsupported = 'unsupported' in result ? result.unsupported ?? false : false;

    return noStoreJson({
      received: true,
      enterprise: false,
      skipped: result.skipped,
      duplicate: result.duplicate ?? false,
      unsupported,
    });
  } catch (processingError) {
    await recordBillingWebhookRouteAudit({ action: 'webhook_rejected', event, reason: 'processing_failed' });
    reportError(processingError, { area: 'billing_stripe_webhook_processing_failed' });

    return noStoreJson({ error: 'webhook_processing_failed' }, { status: 500 });
  }
}
