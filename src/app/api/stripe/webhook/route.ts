import { NextResponse } from 'next/server';
import { getStripeClient } from '@/lib/billing/stripe';
import { reportError } from '@/lib/observability/report-error';
import { checkDistributedRateLimit } from '@/lib/security/rate-limit';
import { rateLimitResponse } from '@/lib/security/rate-limit-response';
import { handleStripeWebhookEvent } from '@/server/billing/stripe-webhooks';

export const runtime = 'nodejs';

function getWebhookRateLimitKey(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const realIp = request.headers.get('x-real-ip');
  return `stripe-webhook:${forwardedFor ?? realIp ?? 'unknown'}`;
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
    return NextResponse.json({ error: 'Stripe webhook secret is not configured' }, { status: 500 });
  }

  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    reportError(new Error('Missing Stripe signature'), { area: 'stripe_webhook' });
    return NextResponse.json({ error: 'Missing Stripe signature' }, { status: 400 });
  }

  const body = await request.text();
  const stripe = getStripeClient();

  try {
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    const result = await handleStripeWebhookEvent(event);

    return NextResponse.json({ received: true, skipped: result.skipped });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid Stripe webhook event';

    reportError(error, { area: 'stripe_webhook' });

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
