import Stripe from 'stripe';

let stripeClient: Stripe | null = null;

export function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error('missing_stripe_secret_key');
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey, {
      apiVersion: '2025-02-24.acacia',
      typescript: true,
    });
  }

  return stripeClient;
}
