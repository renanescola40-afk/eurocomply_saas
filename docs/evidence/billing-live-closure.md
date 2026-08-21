# RISCK COMPLY / EUROCOMPLY — P0 Billing LIVE Production Closure

## Decision

- `BILLING_LIVE: HUMAN_BLOCKER`
- `BILLING_ENTITLEMENTS: HUMAN_BLOCKER`
- `BILLING_RUNTIME_EVIDENCE: HUMAN_BLOCKER`

This evidence pack is intentionally fail-closed. Repository correctness, provider configuration, static tests, and a rendered Checkout page do not qualify as LIVE billing evidence. The remaining PASS boundary requires a legitimate production checkout/subscription, genuinely signed LIVE webhook delivery, production ledger persistence, and a server-authoritative entitlement transition.

## Evidence identity

- Timestamp UTC: `2026-08-21T18:10:29Z`
- Repository: `renanescola40-afk/eurocomply_saas`
- Main/evidence subject SHA: `7c063edbd73e719024666b7740623455aae20f0d`
- Evidence branch: `agent/p0-billing-live-runtime-closure`
- Evidence artifact commit: use the PR HEAD containing this file; the artifact cannot self-embed its own Git commit hash without changing that hash.
- Production Vercel project: `prj_APpXAyQFy1Gie50xfbO45zjkyUSm`
- Production deployment: `dpl_rbbHqrqcXWfAchSZs46ZeLoYZETw`
- Deployment state/target: `READY` / `production`
- Deployment Git SHA: `7c063edbd73e719024666b7740623455aae20f0d`
- Canonical production domain: `https://www.risckcomply.com`

## Stripe LIVE account authority

Verified against the connected LIVE Stripe account:

- Account ID: `acct_1U6IuJGt3cgjPOtq`
- Display name: `RISCK COMPLY SAAS`
- Mode: LIVE
- `charges_enabled=true`
- `details_submitted=true`
- Default currency: `EUR`

No Stripe secret key, webhook signing secret, card data, customer email, personal name, address, phone number, bank details, or other PII is retained in this evidence pack.

## Root cause found during this closure

At the beginning of the closure, the intended LIVE Stripe account had:

- zero active Products;
- zero active Prices;
- one correct LIVE canonical webhook endpoint.

That state made repository-to-provider reconciliation impossible and prevented any canonical LIVE self-serve Checkout from being considered production-ready.

The provider catalog was repaired directly in the intended LIVE account using the reviewed commercial contract. No customer, Checkout Session, subscription, invoice, PaymentIntent, charge, or synthetic commercial event was created for evidence.

## Canonical LIVE product/price reconciliation

| Plan | Product | Price | Interval | Currency | Amount | Lookup key | Provider status |
| --- | --- | --- | --- | --- | ---: | --- | --- |
| Essential | `prod_V7B9TKop4XFVZD` | `price_1U6wnYGt3cgjPOtqIATM8DeH` | month | EUR | €49.00 | `risk_comply_essential_monthly` | active / LIVE |
| Essential | `prod_V7B9TKop4XFVZD` | `price_1U6wnjGt3cgjPOtqAgMbZdQa` | year | EUR | €490.00 | `risk_comply_essential_annual` | active / LIVE |
| Professional | `prod_V7B9MSMOjw6ScY` | `price_1U6wnpGt3cgjPOtqmL7HoPDw` | month | EUR | €149.00 | `risk_comply_professional_monthly` | active / LIVE |
| Professional | `prod_V7B9MSMOjw6ScY` | `price_1U6wnuGt3cgjPOtqdWopnIyX` | year | EUR | €1,490.00 | `risk_comply_professional_annual` | active / LIVE |
| Business | `prod_V7B9xkn8ud8f1d` | `price_1U6wo2Gt3cgjPOtqOr91hofs` | month | EUR | €399.00 | `risk_comply_plan_399_monthly` | active / LIVE |
| Business | `prod_V7B9xkn8ud8f1d` | `price_1U6wo9Gt3cgjPOtqa8vSvgaM` | year | EUR | €3,990.00 | `risk_comply_plan_399_annual` | active / LIVE |

Provider metadata on the managed objects binds them to the versioned catalog with `catalog_status=canonical_live` and `risck_comply_managed_by=stripe-live-account-bootstrap-v1`.

Enterprise remains negotiated/sales-led and does not require a fixed public Stripe Price under the repository contract.

## Production webhook

Canonical endpoint verified in Stripe LIVE:

- Endpoint ID: `we_1U6XFbGt3cgjPOtqBSnQDnVQ`
- URL: `https://www.risckcomply.com/api/stripe/webhook`
- `livemode=true`
- `status=enabled`
- Enabled event set exactly matches the repository contract:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`
  - `invoice.paid`

Repository route review confirms raw/bounded payload handling, required `stripe-signature`, Stripe signature verification with a 300-second tolerance, provider/event mode binding, failure auditing, and fail-closed processing errors.

## Checkout security boundary

The production Checkout route is server authoritative:

- authenticated user required;
- active organization required;
- `manage_billing` permission required;
- trusted mutation/origin and distributed rate limit required;
- client can submit a plan name but cannot submit an arbitrary Stripe Price or amount;
- only self-serve canonical plans resolve to server-side Price environment bindings;
- Checkout uses the organization-derived customer binding;
- organization/user/plan metadata is created server-side;
- existing LIVE subscription authority is routed to lifecycle mutation instead of creating a second subscription;
- Checkout URL must resolve to `https://checkout.stripe.com`;
- audit persistence is fail-closed; a newly-created Session is expired if the audit write fails.

## Production billing ledger inventory

Production Supabase project scoped to this evidence: `tganhbbhfxcpblmgqprg` (`eurocomply_saas`).

### `subscriptions`

Observed state:

- total rows: `70`
- rows with Stripe customer ID: `1`
- rows with Stripe subscription ID: `1`
- rows whose local `status` is `active` or `trialing`: `70`
- `business / active`: `69`, all without Stripe customer/subscription IDs
- `professional / active`: `1`, with a historical Stripe customer/subscription binding

The single Stripe-bound row is historical and cannot establish current production authority because no corresponding LIVE processed Stripe event exists. Its identifiers are deliberately redacted here.

### `stripe_events_processed`

Observed state:

- LIVE (`livemode=true`) events: `0`
- test-mode (`livemode=false`) events: `2`
- test-mode processed `customer.subscription.updated`: `1`
- test-mode failed `customer.subscription.updated`: `1`

### Contract entitlement authority

- active/current signed-contract entitlement sources: `0`
- current applied entitlement snapshots: `0`

### Effective result

The local `subscriptions.status` field is **not** sufficient commercial authority. With zero processed LIVE Stripe subscription-authority events and zero active signed-contract sources, the server-side billing context must fall back to the Starter/Essential effective plan rather than trust seeded or historical rows.

This is a critical positive security finding: test-mode or seeded production data cannot by itself grant paid access under the current authority code.

## Entitlement authority implementation

For ordinary Stripe-backed paid access, `hasProcessedLiveStripeSubscriptionAuthority` requires all of the following:

1. organization-specific subscription row has a Stripe customer ID;
2. it has a Stripe subscription ID;
3. `stripe_events_processed.organization_id` matches the organization;
4. `stripe_events_processed.livemode=true`;
5. event status is `processed`;
6. event type is `customer.subscription.created` or `customer.subscription.updated`;
7. payload subscription ID exactly matches the persisted subscription ID;
8. payload customer ID exactly matches the persisted customer ID.

The billing context grants a paid effective plan only when that LIVE authority is present and subscription status is `active` or `trialing`. Otherwise the effective plan is Starter/Essential. This means `past_due`, `unpaid`, `canceled`, missing authority, and historical test-mode authority do not grant the paid plan through this path.

Negotiated Enterprise access is a separate authority path and requires a currently active `signed_contract` source plus a currently valid `applied` entitlement snapshot.

## Webhook idempotency / replay controls

Production schema and code review show:

- `stripe_events_processed.id` is the table primary key, binding one ledger claim to one Stripe event ID;
- duplicate insert/unique violation does not create a second logical event;
- already-processed duplicates are recognized as replay;
- failed events may be reclaimed instead of duplicated;
- abandoned `processing` claims have a 15-minute processing lease and compare-and-set recovery;
- entitlement materialization uses Stripe event identity for idempotent repair/replay behavior.

A genuine duplicated LIVE event has not yet existed in the new account, so **runtime duplicate-event PASS remains open** even though the implementation is fail-closed/idempotent by construction and production schema.

## Customer Portal

Repository route security is server-side and tenant-bound:

- authenticated user + current organization;
- `manage_billing` permission;
- trusted mutation/rate limit;
- step-up authentication;
- customer ID loaded from the current organization subscription, never accepted from the browser;
- exact processed LIVE subscription authority required before creating a Portal Session;
- return path is constrained;
- audit persistence is fail-closed.

Provider state at this timestamp: the new LIVE Stripe account has **zero active Billing Portal configurations**. The repository intentionally uses the account-default Portal configuration (`configurationId: null`). The account-default Portal must therefore be configured/saved in Stripe Dashboard before Portal runtime can pass.

Required reviewed Portal policy:

- return URL: `https://www.risckcomply.com/pt/dashboard/organizations/billing`;
- enable address/tax-ID updates;
- enable invoice history;
- enable payment-method updates;
- keep Portal subscription cancellation disabled;
- keep Portal subscription updates disabled.

## Production deployment

Latest production deployment is `READY` and built from the exact current main/evidence-subject SHA.

However, the canonical LIVE Products/Prices were created **after** that deployment. The application resolves self-serve Stripe Prices from Vercel Production environment bindings. The currently available Vercel connector in this closure does not expose authorized environment-variable read/write, so this evidence cannot assert that the deployment is bound to the six newly-created LIVE `price_*` IDs.

The repository's protected **Stripe Live Account Bootstrap** workflow is the reviewed cutover path. It is designed to reuse the canonical Products/Prices, sync the Stripe secret/webhook secret/canonical Price IDs into Vercel Production without printing secrets, re-read safe Price bindings, and then require a fresh production deployment.

No tool available in this closure can dispatch that workflow or mutate/read the required Vercel environment bindings. This is an administrative/tooling blocker, not grounds to fabricate a PASS.

## LIVE commercial activity inventory

At this timestamp in the intended LIVE Stripe account:

- LIVE Checkout Sessions: `0`
- LIVE subscriptions: `0`

Therefore there is no legitimate LIVE transaction from which to prove:

- `checkout.session.livemode=true` tied to production app runtime;
- actual customer/workspace correlation;
- subscription/invoice creation;
- signed LIVE webhook delivery for that subscription;
- LIVE ledger persistence;
- paid entitlement activation;
- upgrade/downgrade/cancel/reactivation convergence;
- `invoice.payment_failed` / `past_due` fail-closed runtime behavior;
- duplicate LIVE webhook convergence.

Creating synthetic customer/subscription/payment objects directly through the Stripe API would violate the reviewed evidence boundary and is not permitted as a substitute for a genuine production lifecycle.

## Security negative-test status

### Verified by current server boundary / schema

- arbitrary client Price ID: rejected by architecture; client does not choose Price ID;
- arbitrary amount: not accepted by Checkout API;
- arbitrary workspace/customer ID: not accepted by Checkout/Portal routes; derived server-side;
- member without billing permission: route requires `manage_billing`;
- unauthenticated request: route requires authenticated API user;
- fake/missing webhook signature: route requires valid Stripe signature before dispatch;
- test-mode event against LIVE provider binding: webhook mode validation rejects mismatch;
- duplicate event row: primary-key event ledger + duplicate/recovery logic;
- historical/test subscription row: does not grant paid plan without exact processed LIVE authority.

### Still requiring LIVE runtime evidence

- duplicate genuine LIVE webhook delivery and one logical resulting transition;
- end-to-end owner checkout using the newly-bound LIVE canonical Price;
- paid feature allow after genuine activation;
- paid feature deny after delinquency/cancellation;
- Portal session on exact current organization customer;
- full lifecycle convergence.

## Test/build evidence

A local clone/test attempt was made from the current environment, but the execution sandbox could not resolve `github.com`, so `npm ci`, lint, typecheck, unit test, and build were not re-run locally in this evidence session.

This limitation is recorded explicitly and does not create a PASS. The latest Vercel production deployment for the evidence subject SHA is `READY`; that deployment state is not a substitute for the missing LIVE billing lifecycle evidence.

## HUMAN BLOCKER 1 — Vercel production binding cutover

System: GitHub Actions Production environment + Vercel Production

Exact object: workflow `.github/workflows/stripe-live-account-bootstrap.yml` for the final reviewed current-main SHA

Exact action required:

1. run **Stripe Live Account Bootstrap** with `release_sha=<exact final current main SHA>`;
2. enter confirmation `PROVISION_NEW_STRIPE_LIVE_ACCOUNT`;
3. confirm the workflow reuses the six canonical LIVE Price IDs listed above and writes/re-reads the corresponding Vercel Production bindings;
4. create a fresh Vercel Production deployment of that exact final main SHA;
5. confirm production deployment is `READY`, target `production`, and Git SHA equals the reviewed main SHA.

Why automation cannot finish it here: the connected GitHub tool exposes workflow inspection/re-run but not workflow dispatch, and the connected Vercel tool does not expose authorized environment-variable mutation/readback.

Expected evidence: successful protected workflow run + safe canonical Price binding proof + fresh exact-SHA production deployment.

Work continuing meanwhile: provider catalog, webhook, ledger and entitlement authority were audited and recorded here.

## HUMAN BLOCKER 2 — account-default Billing Portal

System: Stripe LIVE Dashboard

Exact object: account-default Billing Portal configuration for `acct_1U6IuJGt3cgjPOtq`

Exact action required: configure/save the reviewed Portal policy described above, then run the repository's protected Stripe Billing Portal bootstrap/verification path against the exact current main SHA.

Why automation cannot finish it here: the account uses Dashboard-managed default Portal authority and the connected Stripe API surface in this closure provides no approved create/default-management operation for the account-default configuration.

Expected evidence: active/default LIVE Portal configuration matching the reviewed policy and successful server-created Portal Session for a legitimately subscribed production organization.

Work continuing meanwhile: Portal route tenant/customer authorization was reviewed and is fail-closed.

## HUMAN BLOCKER 3 — first genuine LIVE lifecycle

System: production application + Stripe LIVE + production Supabase

Exact object: first legitimate production self-serve subscription, preferably canonical Essential unless the operator has a different genuine commercial purchase to complete.

Exact action required:

1. an authorized production organization owner with `manage_billing` signs in through the normal production application;
2. select a canonical self-serve plan;
3. complete the real Stripe-hosted LIVE Checkout with an authorized real payment method;
4. capture only non-sensitive operational identifiers required for evidence (`cs_*`, `sub_*`, `in_*`, `evt_*`, organization correlation); never capture card data/PII;
5. verify the canonical webhook returns expected success;
6. verify `stripe_events_processed` contains processed `livemode=true` authority for the exact organization/customer/subscription;
7. verify `subscriptions` converges to the exact plan/status/customer/subscription;
8. verify paid server-side entitlement changes from Starter/Essential fallback to the paid plan;
9. exercise reviewed lifecycle transitions (upgrade, scheduled downgrade, cancellation/reactivation as applicable) and delinquency/payment-failure behavior through legitimate provider operations;
10. replay/allow Stripe retry of one genuine event and verify one logical resulting state transition.

Why automation cannot finish it here: a genuine LIVE charge requires an authorized human/commercial payment action. Direct API creation of synthetic commercial objects is explicitly prohibited as runtime evidence.

Expected evidence: genuine LIVE Checkout/session/subscription/invoice/event chain, production DB correlation, server-side entitlement allow/deny proof, lifecycle convergence, and idempotent replay evidence.

Work continuing meanwhile: all non-financial provider and billing-ledger checks available to this closure have been completed.

## P0 remaining

1. Protected Vercel Production Price-binding cutover and exact-SHA redeployment.
2. Account-default Stripe Billing Portal configuration/verification.
3. Genuine LIVE production checkout/subscription.
4. Signed LIVE webhook delivery and production ledger persistence for the genuine subscription.
5. Server-side paid entitlement activation and deny-on-delinquency/cancellation runtime proof.
6. LIVE lifecycle convergence and duplicate-event proof.

## P1 observations

- The repository Stripe client pins API version `2025-02-24.acacia`, while the canonical LIVE webhook currently reports a newer provider API version. This is not proven to be a P0 fault because the current deployment is READY and the billing handlers use typed/defensive access, but a planned Stripe SDK/API-version upgrade should be reviewed separately after LIVE closure.
- Two Stripe client helper modules exist (`src/server/billing/stripe.ts` and `src/lib/billing/stripe.ts`). Consolidation may reduce future configuration drift, but it is not required to fabricate or unblock the missing LIVE lifecycle evidence.

## Acceptance conclusion

The intended Stripe account, LIVE account activation, canonical webhook, and canonical Product/Price catalog are now verified. Production database inspection confirms there is no processed LIVE Stripe authority and therefore no legitimate paid entitlement currently proven. The application code is deliberately fail-closed against seeded/test-mode subscription rows.

`BILLING_LIVE`, `BILLING_ENTITLEMENTS`, and `BILLING_RUNTIME_EVIDENCE` remain `HUMAN_BLOCKER` until the protected runtime binding cutover and first genuine LIVE commercial lifecycle are completed and captured against the exact production SHA.