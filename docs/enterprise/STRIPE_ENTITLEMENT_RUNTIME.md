# Stripe Entitlement Runtime

## Objective

Connect verified Stripe billing events to the canonical enterprise entitlement reconciliation path without allowing duplicate delivery, stale metadata, missing billing periods or billing-state transitions to corrupt seat capacity.

## Runtime flow

1. `/api/stripe/webhook` enforces bounded payloads, distributed rate limiting and Stripe signature verification.
2. `stripe-webhook-recovery.ts` claims and processes supported core billing events with lease recovery.
3. Entitlement-bearing subscription/invoice events call `reconcileStripeEntitlementEvent` after successful core processing.
4. Stripe metadata and billing windows are validated and normalized into a tenant-scoped entitlement snapshot.
5. The canonical reconciliation RPC atomically applies the snapshot and seat policy.
6. A processed duplicate may repair a missing enterprise snapshot without replaying core billing or email side effects.

## Entitlement-authoritative events

The entitlement layer accepts:

- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`
- `invoice.paid`

`checkout.session.completed` remains a supported **core billing** event but is not an entitlement authority because Checkout completion does not itself provide a canonical subscription billing period. The subsequent subscription event carries the billing window used for entitlement materialization.

## Required Stripe metadata

- `organization_id`
- `entitlement_source_id`
- `plan_code`
- `full_seat_limit`
- `participant_seat_limit`
- `viewer_seat_limit`
- `source_version`
- `grace_period_days`

For subscription events the metadata is read from the subscription object. For current Stripe Invoice objects, subscription metadata is read from `parent.subscription_details.metadata`, with the legacy `subscription_details.metadata` form retained for older API-version events.

Missing or invalid metadata returns `metadata_missing`; no entitlement change occurs.

## Stripe billing-period compatibility

The normalizer supports both historical and current Stripe API shapes:

- pre-Basil subscriptions: top-level `current_period_end`;
- Basil subscriptions: `items.data[].current_period_end`;
- invoices: `lines.data[].period.end`.

When multiple item/line periods exist, the earliest valid end is selected. This is intentionally conservative: a plan-wide entitlement must not outlive a billed component without a newer Stripe event extending it.

A billable subscription/invoice event with no usable future billing period fails closed as `stripe_entitlement_billing_period_missing`. The runtime does not invent `now` as a synthetic period end and does not call the canonical reconciliation RPC in that state.

## Cancellation, delinquency and recovery

`customer.subscription.deleted` is treated as the actual termination boundary. Stripe subscriptions configured to cancel at period end remain active until Stripe emits the deletion event at termination. When deletion arrives, the entitlement snapshot applies zero seat limits from that event processing time with no future validity window.

This avoids writing a future zero-seat policy into the single canonical `enterprise_seat_policies` row, which would otherwise make the current policy unavailable before the scheduled cancellation time.

`invoice.payment_failed` retains the configured delinquency grace behavior, while `invoice.paid` records billing recovery through a newer canonical snapshot.

## Idempotency and concurrency

The Stripe event ID becomes the organization-scoped reconciliation idempotency key. Existing webhook event claims and the canonical reconciliation lock prevent duplicate delivery from applying capacity more than once. Source versions prevent stale webhook metadata from overwriting newer contract state.

For already-processed events, replay repair is accepted only when the enterprise reconciliation materializes or finds an existing snapshot. A rejected/non-materialized repair fails closed so the webhook is not silently acknowledged as repaired.

## Failure outcomes

- `unsupported`: event type is outside the entitlement contract.
- `metadata_missing`: canonical tenant or plan metadata is unavailable.
- `billing_period_missing`: the billable event has no usable future billing period; reconciliation fails closed before the RPC.
- `idempotent_replay`: the event was already reconciled.
- `source_version_conflict`: Stripe metadata is stale (`version_conflict` from the atomic RPC).
- `lower_priority_source`: a stronger contract source controls the organization (`lower_priority` from the atomic RPC).
- `rejected`: canonical reconciliation declined the snapshot for another reason.

## Production rollout

1. Confirm the entitlement reconciliation migration is applied.
2. Register one Stripe authority source per contracted organization.
3. Populate canonical metadata on subscriptions and ensure invoice subscription metadata is preserved.
4. Configure the production webhook secret and endpoint.
5. Verify Basil subscription item billing periods and invoice parent metadata in test mode.
6. Replay signed test events in non-production.
7. Verify duplicate delivery and lease recovery.
8. Verify upgrade, payment failure, recovery and cancellation.
9. Attach exact event, snapshot and seat-policy evidence.

## Truth boundary

Repository CI proves normalization and integration contracts only. It does not prove that Stripe metadata is populated, the production endpoint is configured, the Supabase migration is applied, or a real production event has reconciled successfully.