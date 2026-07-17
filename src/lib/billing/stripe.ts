import Stripe from 'stripe';

import { providerConfigurationFailure } from '@/server/providers/failure';

let stripe: Stripe | null = null;

export function getStripeClient() {
  if (stripe) {
    return stripe;
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw providerConfigurationFailure('stripe', 'client_initialization', 'missing_secret_key');
  }

  stripe = new Stripe(secretKey, {
    apiVersion: '2025-02-24.acacia',
  });

  return stripe;
}
