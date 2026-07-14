# ADR: Idempotent Stripe webhook email recovery

- **Date:** 2026-07-14
- **Status:** Proposed
- **Owners:** Billing Engineering / SRE
- **Priority:** P1 billing reliability and revenue operations

## Context

The Stripe webhook ledger uses a bounded processing lease so abandoned `processing` claims can be recovered. Subscription and checkout events were recoverable, but `invoice.payment_failed` was excluded because its customer email did not carry a deterministic provider idempotency key.

A process can terminate after the provider accepts an email but before the webhook ledger reaches `processed`. Replaying that event without a stable provider identity can duplicate a payment-failure notification. Leaving the claim unrecoverable instead can permanently suppress the event after a crash.

Repository source proves this control gap. No production duplicate email, lost event, provider behavior, or customer impact is claimed.

## Decision

1. Execute Stripe webhook processing inside an `AsyncLocalStorage` context containing the verified Stripe event ID and event type.
2. At the central email-client boundary, preserve every caller-provided idempotency key.
3. When no explicit key exists and a verified Stripe webhook context is active, derive a SHA-256 key with prefix `stripe-webhook-email-v1` from the exact event ID and event type.
4. Include `invoice.payment_failed` in the recoverable processing-lease event set.
5. Apply the same context to both the initial attempt and the recovered attempt.

## Why event identity

The Stripe event ID is stable across delivery retries. Subject, body, recipient address, organization name, and deployment version can change and therefore are not suitable as the primary replay identity.

The event type is included to make the semantic domain explicit and protect against accidental cross-type reuse in synthetic tests or malformed inputs.

## Invariant

A webhook event that relies on contextual idempotency may emit at most one implicit email side effect. Additional emails for the same Stripe event must supply their own explicit domain idempotency keys.

## Security, privacy, and tenancy

- Context begins only after Stripe signature verification in the existing route pipeline.
- The generated key contains a one-way digest, not customer data, recipient email, invoice contents, or secrets.
- Existing tenant binding, subscription lookup, email-recipient selection, ledger compare-and-set, and audit behavior remain unchanged.
- Explicit idempotency keys are never overwritten.

## Reliability behavior

- A fresh `processing` claim remains non-recoverable until the 15-minute lease expires.
- Only one recovery request can win the existing atomic compare-and-set.
- A replay uses the same provider idempotency key as the original attempt.
- If the provider honors the idempotency contract, duplicate sends are suppressed while the webhook can converge to `processed`.

## Trade-offs and limitations

- Provider idempotency behavior still requires configured runtime validation.
- The application cannot prove whether a provider accepted an email if the process terminated before receiving the response.
- The implicit one-email-per-event invariant must be maintained; future multi-email Stripe handlers need explicit keys.
- Async context propagation depends on the Node.js runtime and is covered by concurrent unit tests, not production execution.

## Alternatives rejected

- **Keep payment failures unrecoverable:** leaves abandoned claims permanently incomplete.
- **Use recipient or subject in the key:** those values may change between retries.
- **Use invoice ID only:** Stripe event identity is the actual retry unit and remains available before domain lookup.
- **Modify only the payment-failed call site:** would fix one call but leave future webhook email side effects vulnerable to the same omission.

## Validation

Repository tests cover:

- deterministic event-derived keys;
- concurrent context isolation;
- absence of keys outside the webhook context;
- preservation of explicit caller keys;
- payment-failed inclusion in lease recovery;
- context use on both initial and recovered processing attempts.

GitHub CI remains authoritative for lint, typecheck, unit tests, build, security gates, and production-like E2E.

## Evidence boundary

This ADR and its tests are repository evidence only. They do not prove a real Stripe signed delivery, provider deduplication, Supabase mutation, email delivery, production recovery, incident outcome, audit, or penetration test.

## Rollback

Revert this change. `invoice.payment_failed` returns to the non-recoverable event set and emails stop receiving contextual webhook keys. No schema, stored data, credential, Stripe configuration, email-provider configuration, or infrastructure rollback is required.
