# Shared idempotency-key primitive with compatibility locks

Date: 2026-07-14
Status: Proposed
Program: Enterprise Platform Foundations

## Context

The repository has two production-facing deterministic idempotency helpers:

- trial reminders use a `trial-reminder` prefix, a unit-separator canonical identity, and a 48-character SHA-256 digest;
- compliance notifications use a `notification` prefix, a colon-separated identity, and a 64-character SHA-256 digest.

Both independently implement normalization, hashing and formatting. That duplication makes future fixes or policy changes easy to apply inconsistently. A naive consolidation would be unsafe because changing an existing key value during deployment could allow a retried side effect to bypass the provider's prior idempotency identity.

## Decision

Introduce one low-level `buildIdempotencyKey` primitive that owns normalization, SHA-256 hashing, prefix validation and digest-length validation.

Keep domain wrappers for trial reminders and compliance notifications. Each wrapper explicitly supplies its existing prefix, separator, digest length and identity ordering, so every existing key remains byte-for-byte compatible.

Add golden compatibility tests with fixed expected values for both deployed formats. These tests are deliberate operational contracts, not implementation-detail snapshots.

## Impact

- normalization and hashing logic have one implementation;
- domain semantics remain explicit in domain wrappers;
- current provider keys, delivery-log correlation and retry behavior do not change;
- invalid primitive configuration fails closed instead of emitting ambiguous keys.

No route behavior, email template, recipient selection, database schema, migration, provider configuration, secret, customer data, cron schedule or runtime evidence changes.

## Risks and limitations

- Golden values intentionally make future format migrations explicit and review-heavy.
- This primitive does not provide provider-independent exactly-once delivery or a distributed transaction.
- A future key-format change requires a versioned migration and overlap strategy rather than editing the existing wrapper in place.
- The primitive should not be used without a reviewed domain identity model.

## Validation

Repository tests cover primitive validation, canonicalization, and exact compatibility for the trial-reminder and notification formats. GitHub Actions on the pull-request head are the authoritative evidence for lint, typecheck, tests, build and security gates.

## Rollback

Revert the pull request. The domain helpers return to their duplicated implementations with the same external key values. No data, migration, provider, credential or infrastructure rollback is required.
