import { getStripeClient } from '@/lib/billing/stripe';
import { reportError } from '@/lib/observability/report-error';
import { checkDistributedRateLimit } from '@/lib/security/rate-limit';
import { rateLimitResponse } from '@/lib/security/rate-limit-response';
import { handleStripeWebhookEvent } from '@/server/billing/stripe-webhooks';
import { noStoreJson } from '@/server/security/no-store';

export const runtime = 'nodejs';

export const MAX_STRIPE_WEBHOOK_BYTES = 1_000_000;

function getWebhookRateLimitKey(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const realIp = request.headers.get('x-real-ip');
  return `stripe-webhook:${forwardedFor ?? realIp ?? 'unknown'}`;
}

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

  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > MAX_STRIPE_WEBHOOK_BYTES) {
    return null;
  }

  return body;
}

export async function POST(request: Request) {
  const rateLimit = await checkDistributedRateLimit({
    key: getWebhookRateLimitKey(request),
    limit: 120,
    windowMs: 60_000,
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
    reportError(new Error('Missing Stripe signature'), { area: 'stripe_webhook' });
    return noStoreJson({ error: 'missing_signature' }, { status: 400 });
  }

  const body = await readBoundedStripeWebhookBody(request);
  if (body === null) {
    reportError(new Error('Stripe webhook payload is too large'), { area: 'stripe_webhook' });
    return noStoreJson({ error: 'payload_too_large' }, { status: 413 });
  }

  const stripe = getStripeClient();

  try {
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    const result = await handleStripeWebhookEvent(event);

    return noStoreJson({ received: true, skipped: result.skipped });
  } catch (error) {
    reportError(error, { area: 'stripe_webhook' });

    return noStoreJson({ error: 'invalid_webhook' }, { status: 400 });
  }
}
