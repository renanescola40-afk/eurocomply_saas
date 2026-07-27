# Stripe Entitlement Runtime

## Objective

Connect verified Stripe billing events to the canonical enterprise entitlement reconciliation path without allowing duplicate delivery, stale metadata or billing downgrades to corrupt seat capacity.

## Runtime flow

1. `/api/stripe/webhook` enforces bounded payloads, distributed rate limiting and Stripe signature verification.
2. `stripe-webhook-recovery.ts` claims and processes supported events with lease recovery.
3. Successful non-duplicate processing calls `reconcileStripeEntitlementEvent`.
4. Stripe metadata is validated and normalized into a tenant-scoped entitlement snapshot.
5. The canonical reconciliation RPC atomically applies the snapshot and seat policy.

## Required Stripe metadata

- `organization_id`
- `entitlement_source_id`
- `plan_code`
- `full_seat_limit`
- `participant_seat_limit`
- `viewer_seat_limit`
- `source_version`
- `grace_period_days`

Missing or invalid metadata returns `metadata_missing`; no entitlement change occurs.

## Downgrades and delinquency

Subscription deletion schedules zero-seat limits at the current period end instead of removing active access immediately. `invoice.payment_failed` extends validity only through the configured grace period. `invoice.paid` clears the delinquency signal through a new canonical snapshot.

## Idempotency and concurrency

The Stripe event ID becomes the organization-scoped reconciliation idempotency key. Existing webhook event claims and the canonical reconciliation lock prevent duplicate delivery from applying capacity more than once. Source versions prevent stale webhook metadata from overwriting newer contract state.

## Failure outcomes

- `unsupported`: event type is outside the billing entitlement contract.
- `metadata_missing`: canonical tenant or plan metadata is unavailable.
- `idempotent_replay`: the event was already reconciled.
- `source_version_conflict`: Stripe metadata is stale.
- `lower_priority_source`: a stronger contract source controls the organization.
- `deferred_downgrade`: cancellation is accepted but effective at period end.
- `rejected`: canonical reconciliation declined the snapshot.

## Production rollout

1. Confirm the entitlement reconciliation migration is applied.
2. Register one Stripe authority source per contracted organization.
3. Populate metadata on subscriptions and checkout sessions.
4. Configure the production webhook secret and endpoint.
5. Replay signed test events in non-production.
6. Verify duplicate delivery and lease recovery.
7. Verify upgrade, payment failure, recovery and cancellation.
8. Attach exact event, snapshot and seat-policy evidence.

## Truth boundary

Repository CI proves normalization and integration contracts only. It does not prove that Stripe metadata is populated, the production endpoint is configured, the Supabase migration is applied, or a real production event has reconciled successfully.
