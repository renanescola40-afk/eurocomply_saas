# Recover abandoned Stripe webhook processing claims with a bounded lease

Date: 2026-07-14  
Status: Proposed

## Context

Supported Stripe webhook events are inserted into `stripe_events_processed` with status `processing` before subscription or checkout effects run. Normal failures are caught and changed to `failed`, allowing a later Stripe retry to reclaim the event.

A process termination, platform timeout, runtime crash, or deployment interruption can occur after the `processing` insert and before either terminal update. In that state, later deliveries hit the event primary key, observe `processing`, and are returned as duplicates. The event can therefore remain unprocessed indefinitely even though Stripe retries it.

The ledger already has a trigger-maintained `updated_at` timestamp. No schema change is required to determine whether a processing claim is fresh or abandoned.

## Decision

Introduce a 15-minute processing lease for webhook events whose downstream effects are safe to replay:

- `checkout.session.completed`;
- `customer.subscription.created`;
- `customer.subscription.updated`;
- `customer.subscription.deleted`.

When the normal handler reports a duplicate, the recovery layer reads the ledger row. A `processing` row is recoverable only when `updated_at` is at least 15 minutes old.

Recovery uses an optimistic atomic update constrained by:

- event ID;
- current status `processing`;
- the exact observed `updated_at` value.

The winning request marks the abandoned claim `failed` with the fixed reason `processing_lease_expired`, then invokes the existing handler again. The existing failed-event reclaim logic changes it back to `processing` and performs the normal operation.

Fresh processing claims, processed events, malformed timestamps, unsupported events, and recovery races remain duplicates and are not replayed.

## Why these events are recoverable

Checkout and subscription handlers primarily validate Stripe-to-organization binding and upsert the organization subscription authority. Repeating those operations is materially safer than permanently losing a subscription lifecycle update.

Audit entries may be repeated if a process stopped after writing an audit record but before marking the Stripe event processed. The Stripe event ID remains present in audit metadata for correlation.

## Deliberate exclusion

`invoice.payment_failed` is not automatically recovered in this change. Its downstream effect includes sending an email, and the current call site does not provide a provider idempotency key derived from the Stripe event. Replaying it automatically could duplicate customer email.

A future change may add deterministic email idempotency and then include this event in the recoverable set. Until then, stale payment-failed claims require operator review.

## Security and privacy

- Signature verification still occurs before any recovery logic.
- Recovery does not accept client-provided event identity outside the verified Stripe event.
- No secret, payload, email address, token, or raw provider credential is added to logs or audit metadata.
- Ledger read or update failures propagate to the route, which returns a retryable server error.
- Recovery does not change authentication, authorization, RLS, tenant ownership, plans, prices, entitlements, or Stripe binding rules.

## Operational impact

A recoverable stale claim can now converge through a later Stripe retry instead of remaining permanently `processing`.

A successful recovery writes a sanitized audit event named `webhook_processing_lease_recovered` with event ID, event type, livemode, lease duration, and the fixed recovery reason.

The 15-minute lease intentionally favors avoiding concurrent duplicate execution over immediate recovery. A legitimate handler running longer than 15 minutes could be considered abandoned, although current subscription and checkout operations are expected to complete much sooner. Runtime duration was not measured in this execution environment.

## Alternatives considered

### Treat every `processing` row as a duplicate forever

Rejected because a non-graceful process termination creates a permanent lost-event state.

### Reclaim every duplicate immediately

Rejected because concurrent Stripe deliveries could execute the same event at the same time.

### Add a scheduled cleanup job only

Rejected as the primary mechanism because it adds scheduling and operational dependencies, and a cleanup run does not itself guarantee Stripe will redeliver the event.

### Recover payment-failed events now

Rejected until the email side effect uses deterministic provider idempotency.

## Validation

Focused tests verify:

- the exact lease boundary;
- fresh claims are not replayed;
- stale claims use an atomic ID/status/timestamp compare-and-set;
- only the winning recovery request replays the handler;
- payment-failed events remain excluded;
- ledger lookup failures fail closed.

Repository CI remains authoritative for lint, typecheck, unit tests, build, security gates, and workflow checks.

No production webhook was replayed. No Stripe delivery, payment, email, tenant isolation, audit, penetration test, certification, or runtime availability result is claimed.

## Rollback

Revert the pull request. Both webhook routes will return to calling the existing handler directly, and stale `processing` claims will again remain duplicates until manually changed to `failed`.

No migration, data rewrite, provider configuration, secret rotation, deployment rollback, or customer-data rollback is required.
