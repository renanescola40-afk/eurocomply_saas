# RISCK COMPLY — Billing LIVE Reconciliation V11

Date: 2026-10-07
Repository: renanescola40-afk/eurocomply_saas
Observed main SHA at reconciliation start: `78e4a2c35d657f933a55450f3c4447e2d12db559`
Stripe LIVE account: `acct_1U6IuJGt3cgjPOtq`
Supabase production project: `tganhbbhfxcpblmgqprg`

## Truth boundary

This document reconciles current provider, repository and deployment evidence. It does not convert provider configuration into Billing Technical E2E evidence.

No customer, Checkout Session, subscription, invoice, PaymentIntent, charge, card entry, 3DS/SCA bypass, fake payment, synthetic commercial event or email was created for this reconciliation.

`BILLING_TECHNICAL_E2E=NO_PASS` until the legitimate production chain is evidenced:

checkout -> customer -> subscription -> signed LIVE webhook -> event ledger -> production database -> plan -> entitlement -> quota

## Stripe LIVE control plane

Verified directly against the connected LIVE account:

- Account: `acct_1U6IuJGt3cgjPOtq`
- Name: RISCK COMPLY SAAS
- Canonical plan products active: Essential, Professional, Business
- Canonical recurring prices active in EUR for monthly/annual billing
- Canonical add-on catalog is also active
- Canonical webhook endpoint: `https://www.risckcomply.com/api/stripe/webhook`
- Webhook status: enabled
- Webhook LIVE mode: true
- Enabled events exactly include:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid`
  - `invoice.payment_failed`

## Billing Portal delta closed

The historical August billing evidence stated that the LIVE account had no active Billing Portal configuration. That statement is no longer current.

Current LIVE provider observation confirms an active default Billing Portal configuration:

- configuration: `bpc_1U70A9Gt3cgjPOtqbzdiK830`
- active: true
- default: true
- return URL: `https://www.risckcomply.com/pt/dashboard/organizations/billing`
- customer address/tax-ID updates: enabled
- invoice history: enabled
- payment-method updates: enabled
- subscription cancellation: disabled
- subscription update: disabled
- policy metadata schema: `risck-comply.stripe-billing-portal-policy.v1`

Therefore the former provider-side Portal configuration blocker is closed.

A successful Portal session for a legitimate LIVE subscribed production organization remains part of runtime lifecycle acceptance and is not fabricated here.

## Repository implementation evidence

Current repository implements:

- server-authoritative plan/price resolution;
- authenticated and organization-scoped checkout;
- `manage_billing` RBAC;
- trusted mutation and rate limiting;
- initial-checkout singleflight protection;
- Stripe idempotency keys;
- customer/subscription metadata bound to organization and actor;
- signed webhook verification;
- LIVE/test mode binding;
- processed-event ledger;
- duplicate/retry recovery semantics;
- fail-closed entitlement authority;
- lifecycle handling for upgrade/downgrade/cancellation paths;
- tenant-bound Portal customer lookup;
- server-side entitlement and quota authority.

These implementation controls support readiness but do not substitute for genuine LIVE runtime evidence.

## Deployment binding

Latest observed READY Vercel Production deployment:

- deployment: `dpl_HU23LxLg8KtCtTeNrL7n3JgrQFqP`
- target: production
- state: READY
- deployed Git SHA: `def7bad00e082ce336734ff7658846fe87595c79`

Observed main at reconciliation start:

`78e4a2c35d657f933a55450f3c4447e2d12db559`

Therefore:

`MAIN_PRODUCTION_SHA_EQUALITY=FAIL`

Exact-SHA Billing acceptance cannot pass until a production deployment is bound to the exact accepted main SHA and the closeout workflow validates that same SHA.

## Supabase runtime evidence

The current Supabase connector identifies `tganhbbhfxcpblmgqprg` as the intended production project, but a fresh table inspection attempt during this reconciliation terminated on database connection timeout.

No PASS or FAIL is inferred from that timeout.

Existing historical production evidence showed fail-closed LIVE authority requirements in `subscriptions` and `stripe_events_processed`, but exact-current runtime persistence remains to be recollected after connectivity/exact-SHA reconciliation.

## Gate matrix

| Gate | Current evidence status |
| --- | --- |
| STRIPE_LIVE | PASS |
| PRODUCTS | PASS |
| PRICES | PASS |
| WEBHOOK | PASS |
| CHECKOUT | IMPLEMENTED / RUNTIME_PARTIAL |
| DB_SYNC | IMPLEMENTED / CURRENT_RUNTIME_PARTIAL |
| ENTITLEMENTS | IMPLEMENTED / LIVE_RUNTIME_PARTIAL |
| QUOTAS | IMPLEMENTED / LIVE_RUNTIME_PARTIAL |
| PORTAL | PROVIDER_PASS / RUNTIME_PARTIAL |
| LIFECYCLE | PARTIAL |
| TENANT_ISOLATION | IMPLEMENTED / BILLING_LIFECYCLE_PARTIAL |
| EXACT_SHA_BILLING_EVIDENCE | PARTIAL |
| BILLING_TECHNICAL_E2E | NO_PASS |

Using the V11 working matrix in which PASS=1 and PARTIAL=0.5 across the 12 primary billing gates:

`BILLING_SCOPE=8.5/12=70.83%`

This percentage is an operational closure indicator only. The canonical enterprise external producer remains the workflow artifact from `.github/workflows/final-billing-product-live-closeout.yml`.

## Remaining exact blockers

### 1. Exact main = production

Required:
- deploy the final accepted main SHA to Vercel Production;
- verify production runtime SHA equals that exact commit.

Current blocker:
- the latest READY production deployment is older than current main.

### 2. Legitimate LIVE lifecycle

Required:
- real authorized owner checkout;
- genuine payment confirmation by the owner/human;
- LIVE customer + subscription + invoice;
- signed LIVE webhook delivery;
- processed LIVE ledger correlation;
- production subscription convergence;
- server-authoritative entitlement/quota activation;
- upgrade/downgrade/cancellation/renewal/failure convergence as applicable;
- duplicate/retry proof for a genuine event.

This cannot be fabricated through direct synthetic Stripe API writes.

### 3. Final external closeout workflow

After legitimate IDs exist, run:

`.github/workflows/final-billing-product-live-closeout.yml`

with the exact final main SHA, legitimate production organization, existing LIVE subscription ID and existing processed LIVE event ID.

Expected canonical decision:

`BILLING_PRODUCT_EU_AI_ACT: PASS`

## Owner intervention boundary

`OWNER_INTERVENTION_REQUIRED=LIVE_PAYMENT_CONFIRMATION`

No real charge was initiated by this reconciliation.

## Current conclusion

Provider-side configuration is materially closed, including the Billing Portal delta that was open in the historical August evidence.

The remaining gap is not additional Stripe catalog configuration. It is exact-SHA production reconciliation plus legitimate LIVE end-to-end lifecycle evidence.

`BILLING_SCOPE=70.83%`
`BILLING_TECHNICAL_E2E=NO_PASS`
