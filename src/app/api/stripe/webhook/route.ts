import { NextResponse } from 'next/server';
import { getStripeClient } from '@/lib/billing/stripe';
import { handleStripeWebhookEvent } from '@/server/billing/stripe-webhooks';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json({ error: 'Stripe webhook secret is not configured' }, { status: 500 });
  }

  const signature = request.headers.get('stripe-signature');

  if (!signature) {
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

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
