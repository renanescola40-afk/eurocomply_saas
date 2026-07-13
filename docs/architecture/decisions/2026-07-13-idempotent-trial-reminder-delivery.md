# Idempotent trial reminder delivery

Date: 2026-07-13
Status: Proposed
Program: Enterprise Platform Foundations
Scope: internal trial-reminder job and transactional email delivery

## Context

The trial-reminder job first checks `email_notification_events`, sends a transactional email, and then records the reminder event. The lookup was already changed to fail closed, but delivery and completion persistence remained separate operations.

A successful provider delivery followed by a failed completion write could therefore be retried by a later cron execution. The email client already supports provider idempotency keys and stores them in `email_delivery_logs`, but this job did not supply a key.

Repository inspection establishes this retry window only. It does not prove that duplicate production email occurred, that the provider guarantees a specific retention period, or that a production incident happened.

## Decision

Use a deterministic, PII-safe idempotency identity for each logical trial reminder. The identity includes:

- organization ID;
- subscription ID;
- current trial period end;
- normalized recipient email.

The values are canonicalized and hashed before producing a provider key. Raw customer identifiers and email addresses do not appear in the key.

The job now:

1. preserves the existing completion lookup;
2. builds the deterministic key before delivery;
3. sends the key through the existing transactional-email client and provider header;
4. records completion only when delivery reports `sent: true`;
5. stores the key in event metadata for operational correlation;
6. writes the completion event through the existing unique constraint with an idempotent upsert;
7. treats completion-write failures as retryable errors instead of claiming success.

## Impact

Retries of the same logical reminder reuse the same provider idempotency key. Concurrent completion writes converge on the existing unique event identity instead of creating duplicate completion rows.

This is an exactly-once approximation across separate provider and database systems, not a distributed transaction. It materially narrows the duplicate-send window without introducing Redis, a queue, a new database table, or provider-specific state outside the existing email client.

No customer data is migrated. No existing event or email log is rewritten. No cron schedule, recipient-selection rule, template, authentication, authorization, provider credential, or runtime evidence is changed.

## Risks and limitations

- Effectiveness across separate cron invocations depends on the configured email provider honoring repeated idempotency keys within its supported retention window.
- The application cannot atomically commit a third-party email send and a Supabase row in one transaction.
- If the provider reports a non-sent/skipped result, the job now skips completion persistence rather than falsely marking delivery complete.
- Completion-write failures are reported and may cause a later retry using the same key.
- The helper is deliberately scoped to trial reminders; adoption by other jobs requires separate review of each side effect and identity model.

## Tests and evidence

Repository tests cover:

- deterministic canonical key generation;
- key changes when the logical delivery identity changes;
- absence of raw PII and identifiers in the key;
- ordering of lookup, key generation, provider delivery, confirmed-send check, and completion persistence;
- fail-closed completion-write errors;
- idempotent completion upsert against the existing unique columns.

GitHub Actions and deployment checks on the pull-request head are the authoritative execution evidence. This decision does not claim live provider behavior or production delivery outcomes.

## Rollback

Revert the pull request. No data, migration, credential, provider, or infrastructure rollback is required. Reverting removes deterministic provider keys and restores non-idempotent completion inserts for this job.
