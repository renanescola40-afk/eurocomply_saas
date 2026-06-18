# Billing return URL policy

Stripe checkout return URLs must be built from server-controlled app configuration, not from caller-controlled request origin or Host headers.

## Required behavior

`src/app/api/billing/checkout/route.ts` resolves the checkout `success_url` and `cancel_url` through `resolveBillingReturnBaseUrl` in `src/server/billing/app-url.ts`.

The resolver must:

- prefer a valid `NEXT_PUBLIC_APP_URL` value;
- accept only HTTP(S) app URLs;
- normalize configured app URLs to their origin before route paths are appended;
- fail closed in production when the configured app URL is missing or invalid;
- allow request-origin fallback only outside production for local development and tests.

Production billing checkout must return the stable public error code `billing_app_url_unavailable` with no-store headers when the return URL control is unavailable. It must not use `new URL(request.url).origin` directly when creating Stripe return URLs.

## CI enforcement

`scripts/security/check-billing-return-url.mjs` validates the billing checkout route, helper and tests. It is delegated from `security:enterprise-api`, which is part of `security:ci`.
