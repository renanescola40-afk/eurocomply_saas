# Stripe Test Runtime Preflight

## Purpose

Prepare the existing Stripe entitlement runtime proof without weakening production billing. This lane verifies that a staging target is actually configured for Stripe **test mode**, that the canonical Essential, Professional and Business monthly test prices match the repository commercial contract, and that Stripe has an enabled webhook endpoint for the exact staging `/api/stripe/webhook` URL with the complete billing event contract.

This is a preflight only. It never creates Stripe objects, never creates or updates webhook endpoints, never sends a customer charge, never changes a subscription, and never promotes `stripe-billing-validation` to Complete.

## Canonical contracts

Two versioned repository contracts are authoritative for this lane:

- `config/billing-commercial-catalog.json` — public plan names, internal compatibility IDs, EUR amounts and canonical Stripe environment keys;
- `config/stripe-webhook-contract.json` — canonical webhook path and required Stripe event set.

Enterprise is intentionally **not** a fixed-price preflight requirement. Enterprise is sales-led and contract-priced; a generic `STRIPE_PRICE_ENTERPRISE_MONTHLY` must not be required to prove the canonical public commercial ladder.

## Why this boundary exists

The application verifies webhook signatures and binds `event.livemode` to the mode of `STRIPE_SECRET_KEY`. The webhook routes reject a signed test event when the runtime uses a live Stripe key, reject a signed live event when the runtime uses a test key, and fail closed when provider mode cannot be derived.

That boundary allows staging to be configured with `sk_test_*` plus its matching test webhook secret while production remains live-only. Do not add a test webhook signing secret to the production runtime merely to make an enterprise score green.

## Required staging configuration

Configure the GitHub `staging` environment and the staging application provider store with test-only values. Prefer dedicated names in GitHub:

- `STRIPE_TEST_SECRET_KEY`
- `STRIPE_TEST_PRICE_ESSENTIAL_MONTHLY`
- `STRIPE_TEST_PRICE_PROFESSIONAL_MONTHLY`
- `STRIPE_TEST_PRICE_BUSINESS_MONTHLY`

During transition, Essential may fall back to the legacy Starter test price key and Professional may fall back to the legacy Growth test price key. The script still exposes those values to itself through the **canonical** environment names and verifies amount, EUR currency, monthly recurrence, active Price and active Product against `config/billing-commercial-catalog.json`.

The staging deployment itself must use its matching Stripe test secret key and webhook signing secret. The webhook endpoint in Stripe test mode must be the exact HTTPS URL:

`<staging-base-url>/api/stripe/webhook`

and subscribe to every event in `config/stripe-webhook-contract.json`:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`
- `invoice.paid`

`invoice.paid` is required because the enterprise entitlement/recovery lane consumes it for payment-recovery reconciliation. A preflight without it is incomplete even if checkout and subscription update events are present.

## Running the preflight

Run **Stripe Test Runtime Preflight** manually with:

- the exact current `main` SHA;
- the HTTPS staging base URL;
- confirmation `PREFLIGHT_STRIPE_TEST_RUNTIME`.

The workflow checks out that exact SHA, verifies it is still current `main`, refuses known production hosts, requires an `sk_test_*` provider key, queries Stripe read-only, validates the three canonical price definitions, checks the exact webhook URL/events, and checks the staging `/api/health` endpoint with `no-store` semantics.

The retained artifact is `stripe-test-runtime-preflight-<SHA>` and contains no Stripe keys, Price IDs, webhook secrets, webhook URLs, customer data, payloads or database credentials.

## What closes billing runtime after preflight

A passing preflight is **not** billing runtime evidence. The existing reviewed chain remains authoritative:

1. deliberately produce a real Stripe test-mode billing event for a controlled staging organization;
2. allow Stripe to deliver the event through the configured signed webhook endpoint;
3. capture the real `evt_...` identifier and expected organization/plan/seat limits;
4. run **Stripe Entitlement Runtime Proof** against the exact current `main` SHA and staging database;
5. let **Stripe Runtime Evidence Promotion** independently validate provenance, correlation and replay safety;
6. only the promoted exact-SHA artifact may satisfy the billing P0 validator.

## Production boundary

Production stays live-only. `Stripe Provider Proof` now requires a live Stripe key, canonical Essential/Professional/Business Price metadata, and the exact enabled production endpoint `https://www.risckcomply.com/api/stripe/webhook` with the same required event contract.

That provider proof still does not prove that the production application has the matching `STRIPE_WEBHOOK_SECRET`. The signing secret must be stored in the production application provider store and signed delivery must be proven separately before billing runtime can be Complete.

This does not certify all future Stripe behavior, every organization, production load, tax correctness or Enterprise contract correctness. It closes configuration false-positives while preserving the separation between provider configuration and end-to-end runtime proof.
