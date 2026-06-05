import Stripe from 'stripe';

let stripe: Stripe | null = null;

export function getStripeClient() {
  if (stripe) {
    return stripe;
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is required');
  }

  stripe = new Stripe(secretKey, {
    apiVersion: '2024-12-18.acacia',
  });

  return stripe;
}
