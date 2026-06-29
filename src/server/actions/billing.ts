'use server';

import { redirect } from 'next/navigation';

// Dashboard billing and the public /[locale]/checkout page now route mutations
// through /api/billing/checkout and /api/billing/portal so origin, rate-limit,
// RBAC and manage_billing step-up checks stay centralized.
const BILLING_API_ONLY_MESSAGE = 'Billing mutations must go through the hardened /api/billing routes.';

export async function createCheckoutSession() {
  throw new Error(BILLING_API_ONLY_MESSAGE);
}

export async function createCustomerPortalSession() {
  throw new Error(BILLING_API_ONLY_MESSAGE);
}

export async function redirectToBillingSettings(locale = 'en') {
  redirect(`/${locale}/dashboard/organizations/billing`);
}
