# Stripe Test Runtime Preflight

## Purpose

Prepare the existing Stripe entitlement runtime proof without weakening production billing. This lane verifies that a staging target is actually configured for Stripe **test mode**, that the three server-side recurring test prices are active, and that Stripe has an enabled webhook endpoint for the exact staging `/api/stripe/webhook` URL with the required billing events.

This is a preflight only. It never creates Stripe objects, never creates or updates webhook endpoints, never sends a customer charge, never changes a subscription, and never promotes `stripe-billing-validation` to Complete.

## Why this boundary exists

The application previously verified webhook signatures but did not explicitly bind `event.livemode` to the mode of `STRIPE_SECRET_KEY`. The webhook routes now reject a signed test event when the runtime uses a live Stripe key, reject a signed live event when the runtime uses a test key, and fail closed when provider mode cannot be derived.

That boundary allows staging to be configured with `sk_test_*` plus its matching test webhook secret while production remains live-only. Do not add a test webhook signing secret to the production runtime merely to make an enterprise score green.

## Required staging configuration

Configure the GitHub `staging` environment and the staging application provider store with test-only values. Prefer dedicated names in GitHub:

- `STRIPE_TEST_SECRET_KEY`
- `STRIPE_TEST_PRICE_STARTER_MONTHLY`
- `STRIPE_TEST_PRICE_GROWTH_MONTHLY`
- `STRIPE_TEST_PRICE_ENTERPRISE_MONTHLY`

The workflow accepts the legacy `STRIPE_SECRET_KEY` / plan secret names only as a compatibility fallback, but it always rejects any key that is not `sk_test_*`.

The staging deployment itself must use its matching Stripe test secret key and webhook signing secret. The webhook endpoint in Stripe test mode must be the exact HTTPS URL:

`<staging-base-url>/api/stripe/webhook`

and subscribe to at least:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`

## Running the preflight

Run **Stripe Test Runtime Preflight** manually with:

- the exact current `main` SHA;
- the HTTPS staging base URL;
- confirmation `PREFLIGHT_STRIPE_TEST_RUNTIME`.

The workflow checks out that exact SHA, verifies it is still current `main`, refuses known production hosts, requires an `sk_test_*` provider key, queries Stripe read-only, checks the exact webhook URL/events, and checks the staging `/api/health` endpoint with `no-store` semantics.

The retained artifact is `stripe-test-runtime-preflight-<SHA>` and contains no Stripe keys, webhook secrets, customer data, payloads or database credentials.

## What closes billing runtime after preflight

A passing preflight is **not** billing runtime evidence. The existing reviewed chain remains authoritative:

1. deliberately produce a real Stripe test-mode billing event for a controlled staging organization;
2. allow Stripe to deliver the event through the configured signed webhook endpoint;
3. capture the real `evt_...` identifier and expected organization/plan/seat limits;
4. run **Stripe Entitlement Runtime Proof** against the exact current `main` SHA and staging database;
5. let **Stripe Runtime Evidence Promotion** independently validate provenance, correlation and replay safety;
6. only the promoted exact-SHA artifact may satisfy the billing P0 validator.

## Production boundary

Production stays live-only. A test-mode event is rejected before billing dispatch when `STRIPE_SECRET_KEY` is live. A live-mode event is rejected before billing dispatch when the configured key is test. Mode mismatch is audited and returns a bounded `400`; unknown provider mode fails closed with `500`.

This does not certify all future Stripe behavior, every organization, production load, tax correctness or contract correctness. It closes a configuration and safety gap so the already-existing runtime proof can be executed without mixing test and live billing planes.
