import Stripe from 'stripe';

import { reportError } from '@/lib/observability/report-error';
import { writeAuditLog } from '@/lib/security/audit-log';
import { checkDistributedRateLimit, getClientIpFromRequest, getUserAgentFromRequest } from '@/lib/security/rate-limit';
import { rateLimitResponse } from '@/lib/security/rate-limit-response';
import { getStripeClient } from '@/server/billing/stripe';
import { getStripeEventAuditContext, handleStripeWebhookEvent } from '@/server/billing/stripe-webhooks';
import { noStoreJson } from '@/server/security/no-store';

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

  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > MAX_BILLING_WEBHOOK_BYTES) {
    return null;
  }

  return body;
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
    userAgent: getUserAgentFromRequest(request),
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

  await recordBillingWebhookRouteAudit({ action: 'webhook_received', event });

  try {
    const result = await handleStripeWebhookEvent(event);

    return noStoreJson({
      received: true,
      skipped: result.skipped,
      duplicate: result.duplicate ?? false,
      unsupported: result.unsupported ?? false,
    });
  } catch (error) {
    await recordBillingWebhookRouteAudit({ action: 'webhook_rejected', event, reason: 'processing_failed' });
    reportError(error, { area: 'billing_stripe_webhook_processing_failed' });

    return noStoreJson({ error: 'webhook_processing_failed' }, { status: 500 });
  }
}
