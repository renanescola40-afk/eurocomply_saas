# ADR-0069: Validate Stripe prices before reporting release readiness

- Status: Accepted
- Date: 2026-07-15

## Context

The protected `/api/ready` endpoint retrieved the three configured Stripe Price IDs and treated a successful lookup plus a non-empty ID as sufficient billing readiness.

Stripe can successfully return prices that are archived, one-time, yearly, attached to an inactive product, or returned without the product expansion needed to validate product state. Those configurations are reachable through the API but are not valid substitutes for the monthly subscription prices expected by the checkout flow. Reporting `ready` in that state creates a false-positive release signal and can defer the failure until a customer attempts checkout.

This finding is based on repository source and Stripe object semantics represented by the installed SDK types. It is not evidence that production currently has an invalid price configuration.

## Decision

The Stripe readiness probe will:

1. retrieve each configured price with its product expanded;
2. require the price to be active;
3. require a recurring price with a monthly interval;
4. require an expanded, non-deleted, active product;
5. keep API reachability separate from price usability in the readiness result.

Any unusable configured price makes `priceLookup` false and therefore keeps the endpoint in `not_ready` state.

## Risks and trade-offs

- A deliberately yearly or one-time configuration cannot satisfy these monthly environment variables.
- The readiness probe requests expanded product data, slightly increasing the Stripe response size.
- The check validates configuration shape and provider reachability; it does not execute a live checkout, payment, webhook, refund, or customer portal flow.
- Product and price state can change after a successful probe, so deployment smoke evidence remains time-bound.

## Rollback

Revert the route, regression test, and this ADR. The endpoint will again accept any retrievable Stripe price ID regardless of whether the price and product are usable for monthly checkout. No migration, credential rotation, provider-side change, or customer-data rollback is required.
