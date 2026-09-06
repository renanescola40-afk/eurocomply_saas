import Stripe from 'stripe';

import { getStripeClient } from '@/lib/billing/stripe';
import { reportError } from '@/lib/observability/report-error';
import { writeAuditLog } from '@/lib/security/audit-log';
import { checkDistributedRateLimit, getClientIpFromRequest } from '@/lib/security/rate-limit';
import { rateLimitResponse } from '@/lib/security/rate-limit-response';
import {
  validateStripeSubscriptionPriceAuthority,
  validateStripeWebhookEventMode,
} from '@/server/billing/stripe-event-mode';
import { syncStripeSubscriptionForInvoiceEvent } from '@/server/billing/stripe-invoice-subscription-sync';
import { handleStripeWebhookEventWithRecovery } from '@/server/billing/stripe-webhook-recovery';
import { getStripeEventAuditContext } from '@/server/billing/stripe-webhooks';
import { syncEnterpriseContractBillingEvent } from '@/server/enterprise/billing';
import { noStoreJson } from '@/server/security/no-store';
import { readBoundedRequestBody } from '@/server/security/read-bounded-request-body';

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

  const result = await readBoundedRequestBody(request, MAX_STRIPE_WEBHOOK_BYTES);
  if ('error' in result) {
    return result.error === 'body_too_large' ? null : '';
  }

  return result.buffer.toString('utf8');
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

  const mode = validateStripeWebhookEventMode(event);
  if (!mode.ok) {
    const misconfigured = mode.reason === 'secret_key_mode_unknown';
    await recordWebhookRouteAudit({ action: 'webhook_rejected', event, reason: mode.reason });
    reportError(new Error(misconfigured ? 'Stripe provider mode is not configured' : 'Stripe webhook mode does not match provider mode'), {
      area: 'stripe_webhook_mode_binding',
      expectedMode: mode.expectedMode ?? 'unknown',
      actualMode: mode.actualMode,
    });
    return noStoreJson(
      { error: misconfigured ? 'webhook_mode_not_configured' : 'webhook_mode_mismatch' },
      { status: misconfigured ? 500 : 400 },
    );
  }

  try {
    // Negotiated Enterprise contracts share the canonical LIVE Stripe endpoint.
    // Route those events before any self-service synchronization so an explicitly
    // bound Enterprise subscription never mutates the self-service subscription
    // authority. The Enterprise RPC is itself idempotent by Stripe event id.
    const enterprise = await syncEnterpriseContractBillingEvent(event);
    if (enterprise.matched) {
      await recordWebhookRouteAudit({ action: 'webhook_received', event });
      const duplicate = enterprise.outcome === 'duplicate';
      return noStoreJson({
        received: true,
        enterprise: true,
        skipped: duplicate,
        duplicate,
        unsupported: false,
        contractId: enterprise.contractId,
        contractStatus: enterprise.appliedStatus,
        billingStatus: enterprise.billingStatus,
      });
    }
  } catch (enterpriseSyncError) {
    await recordWebhookRouteAudit({ action: 'webhook_rejected', event, reason: 'enterprise_billing_sync_failed' });
    reportError(enterpriseSyncError, { area: 'stripe_enterprise_billing_sync_failed', stripeEventId: event.id });
    return noStoreJson({ error: 'webhook_processing_failed' }, { status: 500 });
  }

  const priceAuthority = validateStripeSubscriptionPriceAuthority(event);
  if (!priceAuthority.ok) {
    await recordWebhookRouteAudit({ action: 'webhook_rejected', event, reason: priceAuthority.reason });
    reportError(new Error('Live Stripe subscription price is not authorized'), {
      area: 'stripe_webhook_price_authority',
      stripeEventId: event.id,
      stripeEventType: event.type,
      reason: priceAuthority.reason,
      resolvedPlan: priceAuthority.plan ?? 'none',
      metadataPlan: priceAuthority.metadataPlan ?? 'none',
    });
    return noStoreJson({ error: 'webhook_price_not_authorized' }, { status: 400 });
  }

  try {
    // invoice.paid/payment_failed can arrive before a matching subscription.updated.
    // Refresh provider truth first so access and entitlements never depend on the
    // ordering of two different Stripe event types. The event ledger below still
    // owns replay/idempotency and all event-specific side effects.
    await syncStripeSubscriptionForInvoiceEvent(event);
  } catch (syncError) {
    await recordWebhookRouteAudit({ action: 'webhook_rejected', event, reason: 'invoice_subscription_sync_failed' });
    reportError(syncError, { area: 'stripe_invoice_subscription_sync_failed', stripeEventId: event.id });
    return noStoreJson({ error: 'webhook_processing_failed' }, { status: 500 });
  }

  await recordWebhookRouteAudit({ action: 'webhook_received', event });

  try {
    const result = await handleStripeWebhookEventWithRecovery(event);
    const unsupported = 'unsupported' in result ? result.unsupported ?? false : false;

    return noStoreJson({
      received: true,
      skipped: result.skipped,
      duplicate: result.duplicate ?? false,
      unsupported,
    });
  } catch (processingError) {
    await recordWebhookRouteAudit({ action: 'webhook_rejected', event, reason: 'processing_failed' });
    reportError(processingError, { area: 'stripe_webhook_processing_failed' });

    return noStoreJson({ error: 'webhook_processing_failed' }, { status: 500 });
  }
}
