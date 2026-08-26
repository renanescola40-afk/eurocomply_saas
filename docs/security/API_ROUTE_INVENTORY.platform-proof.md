# Platform Proof API Route Inventory

This modular inventory classifies the protected exact-SHA platform proof endpoints. These routes are internal validation surfaces only: they require the dedicated platform proof bearer credential, run the shared internal authentication rate limit before authorization, bind requests to the deployed release SHA, return no tenant/customer payloads, and use no-store responses.

| Route | Class | Notes |
| --- | --- | --- |
| `src/app/api/internal/platform-proof/email/route.ts` | health/internal | Protected synthetic Resend delivery proof; dedicated bearer authorization, internal auth rate limit, exact-SHA binding, fixed non-customer sandbox recipient and no-store response. |
| `src/app/api/internal/platform-proof/rate-limit/route.ts` | health/internal | Protected distributed rate-limit proof; dedicated bearer authorization, internal auth rate limit, exact-SHA binding, synthetic fixed proof subject and no-store response. |
| `src/app/api/internal/platform-proof/sentry/route.ts` | health/internal | Protected synthetic Sentry ingestion/release proof; dedicated bearer authorization, internal auth rate limit, exact-SHA binding, sanitized synthetic error only and no-store response. |
| `src/app/api/internal/platform-proof/stripe-checkout/route.ts` | health/internal | Protected read-only Stripe checkout provider probe; dedicated bearer authorization, internal auth rate limit, exact-SHA binding, no customer/payment creation and no-store response. |
| `src/app/api/internal/platform-proof/stripe-subscriptions/route.ts` | health/internal | Protected read-only Stripe subscriptions provider probe; dedicated bearer authorization, internal auth rate limit, exact-SHA binding, no customer/subscription mutation and no-store response. |
