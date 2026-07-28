# Billing lifecycle and add-ons runtime

## Scope

This runtime closes the gap between the canonical commercial catalog and live Stripe subscription operations.

It supports:

- monthly and annual Stripe prices;
- upgrade with Stripe proration;
- downgrade without immediate proration;
- cancellation at the end of the paid period;
- reactivation before period end;
- complete add-on replacement;
- quantity-based capacity add-ons;
- dependency validation;
- plan eligibility validation;
- Customer Portal coexistence;
- server-side audit evidence.

## API

`POST /api/billing/subscription`

Accepted actions:

- `upgrade`
- `downgrade`
- `cancel`
- `reactivate`
- `replace_add_ons`

The route requires authentication, organization membership, `manage_billing`, trusted mutation validation, fail-closed rate limiting and billing step-up authentication.

`GET /api/billing/catalog` exposes only public commercial metadata. Stripe price IDs and environment variable names are never returned.

## Stripe behavior

Upgrades use `create_prorations`. Downgrades use `none` and preserve the existing billing-cycle anchor. Cancellation uses `cancel_at_period_end`, protecting already-paid access. Reactivation clears that flag.

All existing non-base subscription items are replaced atomically when add-ons are changed. This prevents orphaned subscription items and duplicated quantities.

## Annual pricing

Starter, Professional and Business annual prices equal ten monthly payments:

- Starter: €490/year;
- Professional: €1,990/year;
- Business: €6,990/year.

Enterprise remains contract-priced and cannot be selected through the self-service lifecycle API.

## Add-on safety

The server validates:

1. add-on exists and is active;
2. selected plan is eligible;
3. quantity is an integer from 1 to 10,000;
4. duplicate selections are consolidated;
5. dependencies are included;
6. a configured Stripe price exists for the selected interval.

## Persistence and evidence

`billing_lifecycle_requests` provides protected operational evidence for subscription changes. It is service-role only, has forced RLS and prevents multiple simultaneous pending/processing requests for one organization.

The existing audit-log system records actor, organization, previous plan, target plan, billing interval, add-ons, Stripe state and cancellation state.

## External validation required

Repository CI cannot prove live provider configuration. Production release requires:

- all monthly and annual Stripe Price environment variables;
- all add-on monthly and annual Stripe Price environment variables;
- Customer Portal configuration;
- webhook delivery for subscription updates;
- production migration application;
- one upgrade, downgrade, cancellation and reactivation smoke test in Stripe test mode before live activation.
