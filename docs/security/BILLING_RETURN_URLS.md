# Billing return URL policy

Stripe checkout and customer portal return URLs must be built from server-controlled app configuration, not from caller-controlled request origin or Host headers.

## Required behavior

`src/app/api/billing/checkout/route.ts` resolves checkout `success_url` and `cancel_url` through `resolveBillingReturnBaseUrl` in `src/server/billing/app-url.ts`.

`src/app/api/billing/portal/route.ts` resolves the customer portal `return_url` through the same helper.

The resolver must:

- prefer a valid `NEXT_PUBLIC_APP_URL` value;
- accept only HTTP(S) app URLs;
- normalize configured app URLs to their origin before route paths are appended;
- fail closed in production when the configured app URL is missing or invalid;
- allow request-origin fallback only outside production for local development and tests.

Production billing routes must return the stable public error code `billing_app_url_unavailable` with no-store headers when the return URL control is unavailable. They must not use `new URL(request.url).origin`, deployment host fallbacks or localhost defaults directly when creating Stripe return URLs.

Billing portal locale query values must be normalized through the central locale allowlist before being appended to the return path.

## Page boundary policy

Billing pages are presentation/navigation boundaries only. They must not create Stripe sessions, initialize Stripe clients, build absolute return URLs, perform billing RBAC, or duplicate tenant lookup logic during server rendering.

The deprecated `src/app/[locale]/billing/checkout/[plan]/page.tsx` entrypoint exists only as a safe compatibility redirect. It validates the plan and locale, then redirects users back to pricing with the `start_secure_checkout` marker so checkout creation remains confined to the hardened POST API flow.

## CI enforcement

`scripts/security/check-billing-return-url.mjs` validates the billing checkout route, billing portal route, helper and tests.

`scripts/security/check-billing-page-boundary.mjs` validates that billing page boundaries cannot create Stripe checkout sessions or use deployment-host return URL fallbacks.

Both checks are delegated from `security:enterprise-api`, which is part of `security:ci`.
