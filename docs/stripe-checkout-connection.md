# Stripe checkout connection

This branch adds a branded checkout page at `/[locale]/checkout`.

The SaaS billing catalog uses these environment variables:

- `STRIPE_PRICE_ESSENTIAL_MONTHLY`
- `STRIPE_PRICE_PROFESSIONAL_MONTHLY`
- `STRIPE_PRICE_BUSINESS_MONTHLY`
- `STRIPE_PRICE_ENTERPRISE_MONTHLY`

The matching monthly EUR prices exist in Stripe test mode and should be copied into the deployment environment. For production, create the same prices in Stripe live mode and use the live price IDs.

The checkout page calls the existing `createCheckoutSession` server action, which creates a Stripe subscription Checkout Session and records organization and plan metadata for webhook synchronization.

Anonymous visitors can view `/[locale]/checkout?plan=...`. Authentication links use the existing dashboard billing continuation, which is already accepted by the login and OAuth callback sanitizers.
