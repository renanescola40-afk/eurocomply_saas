import Stripe from 'stripe';

import { getStripeClient } from '@/lib/billing/stripe';
import { reportError } from '@/lib/observability/report-error';
import { writeAuditLog } from '@/lib/security/audit-log';
import { checkDistributedRateLimit, getClientIpFromRequest, getUserAgentFromRequest } from '@/lib/security/rate-limit';
import { rateLimitResponse } from '@/lib/security/rate-limit-response';
import { handleStripeWebhookEventWithRecovery } from '@/server/billing/stripe-webhook-recovery';
import { getStripeEventAuditContext } from '@/server/billing/stripe-webhooks';
import { noStoreJson } from '@/server/security/no-store';

export const runtime = 'nodejs';

export const MAX_STRIPE_WEBHOOK_BYTES = 1_000_000;
export const STRIPE_WEBHOOK_TOLERANCE_SECONDS = 300;

export function getStripeWebhookContentLength(request: Request) {
  const contentLength = request.headers.get('content-length');
  if (!contentLength) return null;

  const parsed = Number(contentLength);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

export async function readBoundedStripeWebhookBody(request: Request) {
  const contentLength = getStripeWebhookContentLength(request);
  if (contentLength !== null && contentLength > MAX_STRIPE_WEBHOOK_BYTES) {
    return null;
  }

  const payload = await request.text();
  if (new TextEncoder().encode(payload).byteLength > MAX_STRIPE_WEBHOOK_BYTES) {
    return null;
  }

  return payload;
}

async function recordWebhookRouteAudit(input: {
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
        route: '/api/stripe/webhook',
        stripeEventId: input.event?.id ?? null,
        stripeEventType: input.event?.type ?? null,
        livemode: input.event?.livemode ?? null,
        reason: input.reason ?? null,
      },
    });
  } catch (auditError) {
    reportError(auditError, { area: 'stripe_webhook_route_audit', action: input.action });
  }
}

export async function POST(request: Request) {
  const rateLimit = await checkDistributedRateLimit({
    policy: 'webhook',
    ip: getClientIpFromRequest(request),
    userAgent: getUserAgentFromRequest(request),
    action: 'stripe_webhook',
    route: '/api/stripe/webhook',
  });

  if (!rateLimit.allowed) {
    reportError(new Error('Stripe webhook rate limit exceeded'), { area: 'stripe_webhook_rate_limit' });
    return rateLimitResponse(rateLimit);
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    reportError(new Error('Stripe webhook secret is not configured'), { area: 'stripe_webhook' });
    return noStoreJson({ error: 'webhook_not_configured' }, { status: 500 });
  }

  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    await recordWebhookRouteAudit({ action: 'webhook_rejected', reason: 'missing_signature' });
    reportError(new Error('Missing Stripe signature'), { area: 'stripe_webhook' });
    return noStoreJson({ error: 'missing_signature' }, { status: 400 });
  }

  const body = await readBoundedStripeWebhookBody(request);
  if (body === null) {
    await recordWebhookRouteAudit({ action: 'webhook_rejected', reason: 'payload_too_large' });
    reportError(new Error('Stripe webhook payload is too large'), { area: 'stripe_webhook' });
    return noStoreJson({ error: 'payload_too_large' }, { status: 413 });
  }

  const stripe = getStripeClient();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret, STRIPE_WEBHOOK_TOLERANCE_SECONDS);
  } catch {
    await recordWebhookRouteAudit({ action: 'webhook_rejected', reason: 'invalid_signature' });
    reportError(new Error('Invalid Stripe webhook signature'), { area: 'stripe_webhook_signature' });
    return noStoreJson({ error: 'invalid_webhook' }, { status: 400 });
  }

  await recordWebhookRouteAudit({ action: 'webhook_received', event });

  try {
    const result = await handleStripeWebhookEventWithRecovery(event);

    return noStoreJson({
      received: true,
      skipped: result.skipped,
      duplicate: result.duplicate ?? false,
      unsupported: result.unsupported ?? false,
    });
  } catch (processingError) {
    await recordWebhookRouteAudit({ action: 'webhook_rejected', event, reason: 'processing_failed' });
    reportError(processingError, { area: 'stripe_webhook_processing_failed' });

    return noStoreJson({ error: 'webhook_processing_failed' }, { status: 500 });
  }
}
