# Billing lifecycle and add-ons runtime

## Scope

This runtime closes the gap between the canonical commercial catalog and Stripe subscription lifecycle operations.

It supports:

- monthly pricing and annual pricing when the corresponding provider Price is configured;
- upgrade with Stripe proration;
- downgrade scheduled for the end of the current paid period;
- cancellation at the end of the paid period;
- reactivation before period end;
- complete add-on replacement;
- quantity-based capacity add-ons;
- dependency validation;
- plan eligibility validation;
- Customer Portal coexistence;
- durable lifecycle-request and chained audit evidence.

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

Upgrades mutate the active subscription using `create_prorations` while preserving the billing-cycle anchor.

Downgrades do **not** immediately replace the paid plan. The server creates or validates a Stripe Subscription Schedule, preserves the current phase, appends the lower-plan phase for the next period, uses `proration_behavior: none`, and releases the schedule after the transition. Conflicting or ambiguous schedules fail closed.

Cancellation sets `cancel_at_period_end`, protecting already-paid access. Reactivation clears that flag before the period ends.

Add-on replacement removes the prior non-base subscription items and installs the canonical requested set under the same idempotent lifecycle request.

## Canonical annual pricing contract

`config/billing-commercial-catalog.json` defines annual billing as ten monthly payments:

- Essential: €490/year;
- Professional: €1,490/year;
- Business: €3,990/year.

Business is sales-led in the commercial catalog even though a canonical annual amount exists. Enterprise is negotiated contract pricing and has no fixed public annual or monthly Price requirement.

Repository catalog values do not prove that corresponding Stripe live Prices exist. An interval must remain unavailable when its required provider Price binding is absent.

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

Durable requests persist a SHA-256 request fingerprint and a bounded result snapshot after provider success. The audit ledger records `billing.subscription_<action>` with the lifecycle request ID, actor/tenant context, source and target plans, interval, provider state, cancellation state, idempotency state and scheduled-downgrade metadata.

## Billing Lifecycle Runtime Proof

`.github/workflows/billing-lifecycle-runtime-proof.yml` is a protected, read-only observation workflow. It never calls Stripe mutation APIs and does not execute a charge.

For one pre-authorized organization and Stripe subscription it requires persisted evidence for:

1. authoritative processed Stripe subscription event correlated to the exact organization, customer and subscription;
2. live-mode event authority when the target environment is `production`;
3. completed `upgrade`, `downgrade`, `cancel` and `reactivate` lifecycle requests;
4. valid request fingerprints and durable result snapshots bound to the exact subscription;
5. cancellation followed by a later successful reactivation;
6. downgrade audit evidence showing `scheduledForPeriodEnd` and a scheduled effective time;
7. exact lifecycle-request-to-audit correlation for all four actions;
8. SHA-256 chained audit integrity and predecessor resolution.

Inputs are exact release SHA, target environment, authorized organization UUID, Stripe subscription ID and a processed Stripe event ID. Retained artifacts contain only booleans, bounded identifier suffixes, provenance and a source digest; raw database rows are deleted before upload.

A `Complete` proof means those already-executed lifecycle actions were observed for that one subscription at that exact release SHA. It does not itself perform the smoke test, settle payment, prove every tenant, or guarantee future provider availability.

## External validation required

Repository CI cannot manufacture provider truth. Production closure still requires:

- canonical live monthly Prices used by enabled plans;
- annual/add-on Prices for any annual or add-on path that is actually enabled;
- an active usable Customer Portal configuration;
- signed webhook delivery and durable live Stripe event processing;
- required production migrations;
- a controlled lifecycle exercise before running the observation proof;
- the resulting `Billing Lifecycle Runtime Proof` artifact bound to the exact current `main` SHA.
