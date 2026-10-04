# Stripe LIVE binding correction evidence — 2026-10-04

## Scope

This record captures a production configuration defect found during the Stripe LIVE / billing / entitlements closure. It does not claim a completed customer payment lifecycle.

## Defect identified

The Vercel Production variable `STRIPE_PRICE_BUSINESS_MONTHLY` was bound to the canonical Professional monthly Price instead of the canonical Business monthly Price.

Expected canonical LIVE binding:

- plan: Business
- cadence: monthly
- Stripe Price: `price_1U6wo2Gt3cgjPOtqOr91hofs`
- lookup key: `risk_comply_plan_399_monthly`
- amount: EUR 399/month
- Stripe product: `prod_V7B9xkn8ud8f1d`

## Correction

The Vercel Production binding was corrected in-place to the canonical LIVE Business monthly Price.

No Stripe secret, webhook signing secret, payment data, customer PII, or card data is recorded here.

## Production secret binding correction

The same closure found that `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` were scoped to Preview only. Their existing Vercel secret records were updated in-place to target both Preview and Production without reading, copying, or exposing the secret values.

This removes the Production-scope configuration defect. A fresh production deployment created after this target correction is still required before Stripe runtime authority can be credited to the deployed application.

## Runtime boundary

The production deployment that incorporated the Business monthly Price correction completed successfully, but it was created before the Stripe secret target correction. Therefore it must not be treated as the final Stripe runtime proof.

The next production deployment must revalidate READY state, intended main SHA, health/readiness, safe Price binding readback, secret presence by non-secret metadata or fail-closed runtime proof, and the absence of new Stripe runtime errors.

## Commercial evidence boundary

This configuration correction does not create or simulate a real payment. A genuine LIVE Checkout -> payment -> subscription -> signed webhook -> DB -> entitlement lifecycle remains distinct evidence and must not be claimed unless a legitimate transaction occurs.

EMAIL_SENT=NO
