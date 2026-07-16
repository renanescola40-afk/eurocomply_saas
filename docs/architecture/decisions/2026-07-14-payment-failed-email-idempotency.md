# Make payment-failed webhook recovery email-idempotent

Date: 2026-07-14  
Status: Accepted

## Context

The Stripe webhook lease recovery introduced for checkout and subscription lifecycle events deliberately excluded `invoice.payment_failed`. That event sends a transactional email. If a process stopped after the provider accepted the email but before the Stripe ledger was marked `processed`, replaying the event could send a duplicate customer notification.

The email sender already supports provider idempotency keys and persists them in `email_delivery_logs`, but the payment-failed call site did not provide one. Consequently, leaving the event unrecoverable avoided duplicate email at the cost of allowing a stale `processing` claim to remain permanently unprocessed.

## Decision

Run each `invoice.payment_failed` handler invocation inside an asynchronous email-idempotency context keyed by a SHA-256-derived identifier from the immutable Stripe event ID.

The email client applies the contextual key only when the caller has not supplied an explicit key. Existing explicit keys remain authoritative. The context is scoped with `AsyncLocalStorage`, so concurrent webhook requests do not share identifiers and the key is unavailable after the handler completes.

Add `invoice.payment_failed` to the existing 15-minute stale-processing recovery set. Both the initial delivery and any recovered replay execute with the same deterministic provider key.

The event is marked `processed` only after the email provider returns `sent: true` and the delivery audit is written. A missing subscription, tenant, billing contact, provider rejection, or explicit non-sent provider result fails the event claim so Stripe can retry it through the same idempotent recovery path.

## Why the event ID is the identity

Stripe event IDs identify one delivery event and remain stable across retries. Deriving the key from the event ID means:

- retries of the same event use the same email key;
- separate failed-payment events use different keys;
- recipient addresses, invoice payloads, customer metadata and secrets are not embedded in the key;
- raw event IDs are not sent as the provider key because the shared builder hashes the identity.

## Security and privacy

The key contains a fixed prefix plus a SHA-256 digest. It does not contain email addresses, names, tenant data, invoice content, tokens, credentials or payment details.

The change does not weaken Stripe signature verification, tenant binding, billing authorization, RLS, rate limiting, provider-secret handling or no-store behavior.

## Reliability behavior

A stale `invoice.payment_failed` claim can now be changed atomically from `processing` to `failed` and reclaimed through the existing handler. If the first attempt already reached the email provider, the repeated request uses the same idempotency key. If the first attempt failed before provider acceptance, the retry can still deliver the email.

The application email log uses the same key as its conflict identity, preserving one logical delivery record for the Stripe event.

The sender receives the canonical `invoice_failed` template key plus tenant and actor identifiers for operational delivery logs. Provider payloads and failure messages do not include invoice content, recipient addresses, payment details or credentials.

## Alternatives considered

### Keep payment-failed events unrecoverable

Rejected because it leaves a permanent lost-processing state after an abrupt runtime termination.

### Use invoice ID only

Rejected because Stripe can create more than one relevant event for an invoice over time, while the recovery ledger is event-based.

### Use recipient and subject

Rejected because it risks suppressing legitimate later notifications and would include unnecessary customer identity in the key derivation.

### Add billing-specific parameters to every email call

Deferred in favor of a generic scoped context. The context preserves explicit caller keys and avoids coupling the email sender to Stripe types.

## Verification

Repository tests verify that:

- the initial handler and recovered replay observe the same derived key;
- the context is cleared after processing;
- the email client applies a contextual key when no explicit key exists;
- explicit caller keys override contextual keys;
- calls outside a context remain unchanged;
- payment-failed claims use the existing atomic stale-lease recovery.
- lookup and provider failures leave the event `failed`, never `processed`;
- an explicit `sent: false` result cannot produce a successful billing audit;
- successful delivery is classified as the `invoice_failed` template.

GitHub Actions remains authoritative for typecheck, lint, unit tests, build and security gates. No real Stripe delivery, Resend request, payment failure, customer email or target-runtime recovery is claimed.

## Risks and trade-offs

- Provider idempotency retention is provider-dependent; the application delivery log remains an additional record but is not used as a pre-send distributed lock in this change.
- Audit records may still be duplicated if a process stopped after writing audit data but before marking the Stripe event processed.
- All webhook entry points must continue using the shared recovery wrapper so the email context is applied.

## Rollback

Revert this change. `invoice.payment_failed` returns to the non-recoverable set and payment-failed email calls no longer receive a contextual idempotency key.

No migration, data rewrite, credential rotation, provider configuration or customer-data rollback is required.
