# Stripe Provider Reconciliation — 2026-08-14

## Scope

Point-in-time provider reconciliation for the Billing + Commercial Entitlements domain. This record is intentionally separate from the global Enterprise scorecard and release GO/NO_GO.

## Connected provider observation

Authenticated Stripe provider access identified the account display name as `risck comply`.

Read-only live-provider inspection observed:

- zero registered webhook endpoints;
- zero Stripe subscriptions across all statuses;
- active canonical monthly EUR prices matching the repository commercial ladder for Essential (€49), Professional (€149) and Business (€399);
- additional active legacy/duplicate prices, including an older Professional/Pro amount, an older Business amount, a fixed Enterprise monthly amount and a USD recurring price.

No customer or subscription depends on those legacy prices at the time of this observation because the live account currently has no subscriptions. That makes future cleanup lower risk, but cleanup must still be sequenced after application environment bindings are verified so checkout cannot be pointed at a deactivated Price.

## Repository mismatch found

The existing protected `Stripe Provider Proof` described itself as a production provider proof while requiring a test-mode key and Starter/Growth/Enterprise recurring prices. The staging preflight also required Starter/Growth/Enterprise and omitted `invoice.paid` from the required webhook subscription set.

Those semantics conflicted with the current commercial contract:

- Essential -> internal `starter`, €49/month;
- Professional -> internal `professional`, €149/month;
- Business -> internal `business`, €399/month;
- Enterprise -> sales-led negotiated contract, no generic fixed public Stripe Price requirement.

They also allowed a webhook preflight to pass without the `invoice.paid` event consumed by the entitlement/payment-recovery lane.

## Changes in this branch

`agent/billing-product-stripe-provider-closure-v3`:

1. adds `config/stripe-webhook-contract.json` as the single repository contract for canonical webhook path and required event subscriptions;
2. changes protected Stripe provider proof to live-mode only;
3. changes provider proof to canonical Essential/Professional/Business price metadata;
4. requires the exact live endpoint `https://www.risckcomply.com/api/stripe/webhook`;
5. requires checkout, subscription lifecycle, payment-failure and `invoice.paid` coverage;
6. keeps retained provider evidence redacted;
7. aligns the staging test-mode preflight with the same canonical plan and webhook contracts;
8. removes a fixed Enterprise price from the staging preflight requirement.

## External production requirement owned outside this branch

The live Stripe account still has no webhook endpoint. Do **not** mark billing provider or billing runtime Complete until all of the following are true:

1. create one enabled live Stripe webhook endpoint at exactly `https://www.risckcomply.com/api/stripe/webhook`;
2. subscribe it to every event in `config/stripe-webhook-contract.json`;
3. capture the returned live webhook signing secret once and store it as `STRIPE_WEBHOOK_SECRET` in the production application provider store;
4. verify production uses a live `STRIPE_SECRET_KEY` matching that endpoint mode;
5. bind the production canonical Price variables for Essential, Professional and Business to provider Prices that match the repository catalog;
6. run `Stripe Provider Proof` for the exact deployed main SHA and retain a passing redacted artifact;
7. execute the separate signed-event billing runtime proof and confirm ledger persistence, tenant attribution, subscription/entitlement mutation, duplicate suppression and stale-claim recovery;
8. only after the canonical environment bindings are confirmed, archive/deactivate legacy duplicate purchase paths that are not intentionally retained.

## Why this branch does not create the live endpoint

Creating a Stripe endpoint reveals a new `whsec_...` signing secret that must immediately be bound to the production application runtime. The Billing/Product chat does not own global production secret/environment mutation. Creating the endpoint without completing that binding would leave a knowingly broken delivery target.

Therefore provider inspection was performed read-only, repository contracts were corrected, and the exact external production requirement is recorded for the release owner.

## Truth boundary

This record is a point-in-time provider observation and implementation handoff. It is not proof of signed webhook delivery, successful checkout, successful customer portal use, tax correctness, production subscription mutation or global Enterprise readiness.
