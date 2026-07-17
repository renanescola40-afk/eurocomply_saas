import Stripe from 'stripe';

import { providerConfigurationFailure } from '@/server/providers/failure';

let stripeClient: Stripe | null = null;

export function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw providerConfigurationFailure('stripe', 'client_initialization', 'missing_secret_key');
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey, {
      apiVersion: '2025-02-24.acacia',
      typescript: true,
    });
  }

  return stripeClient;
}
