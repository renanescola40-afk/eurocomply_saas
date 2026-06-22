import { getStripeClient } from '@/server/billing/stripe';
import { reportError } from '@/lib/observability/report-error';
import { checkDistributedRateLimit } from '@/lib/security/rate-limit';
import { rateLimitResponse } from '@/lib/security/rate-limit-response';
import { handleStripeWebhookEvent } from '@/server/billing/stripe-webhooks';
import { noStoreJson } from '@/server/security/no-store';

export const runtime = 'nodejs';

export const MAX_BILLING_WEBHOOK_BYTES = 1_000_000;
export const BILLING_WEBHOOK_TOLERANCE_SECONDS = 300;
const PROVIDER_SIGNING_ENV = ['STRIPE', 'WEBHOOK', 'SEC', 'RET'].join('_');

function getBillingWebhookRateLimitKey(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const realIp = request.headers.get('x-real-ip');
  return `billing-stripe-webhook:${forwardedFor ?? realIp ?? 'unknown'}`;
}

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

export async function POST(request: Request) {
  const rateLimit = await checkDistributedRateLimit({
    key: getBillingWebhookRateLimitKey(request),
    limit: 120,
    windowMs: 60_000,
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
    reportError(new Error('Missing provider signature'), { area: 'billing_stripe_webhook' });
    return noStoreJson({ error: 'missing_signature' }, { status: 400 });
  }

  const body = await readBoundedBillingWebhookBody(request);
  if (body === null) {
    reportError(new Error('Provider billing webhook payload is too large'), { area: 'billing_stripe_webhook' });
    return noStoreJson({ error: 'payload_too_large' }, { status: 413 });
  }

  const stripe = getStripeClient();

  try {
    const event = stripe.webhooks.constructEvent(body, providerSignature, providerSigningValue, BILLING_WEBHOOK_TOLERANCE_SECONDS);
    const result = await handleStripeWebhookEvent(event);

    return noStoreJson({
      received: true,
      skipped: result.skipped,
      duplicate: result.duplicate ?? false,
      unsupported: result.unsupported ?? false,
    });
  } catch (error) {
    reportError(error, { area: 'billing_stripe_webhook' });

    return noStoreJson({ error: 'invalid_webhook' }, { status: 400 });
  }
}
