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

## Runtime boundary

A fresh production deployment is required after the environment-variable correction before the fixed binding can be treated as deployed runtime state.

The post-deploy closure must revalidate production READY state, intended main SHA, health/readiness, safe Price binding readback, and the absence of new Stripe runtime errors.

## Commercial evidence boundary

This configuration correction does not create or simulate a real payment. A genuine LIVE Checkout -> payment -> subscription -> signed webhook -> DB -> entitlement lifecycle remains distinct evidence and must not be claimed unless a legitimate transaction occurs.

EMAIL_SENT=NO
