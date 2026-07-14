# Idempotent compliance alert delivery

Date: 2026-07-14
Status: Proposed
Scope: internal document-expiry and vendor-review alert jobs

## Context

The compliance-alert cron job sends document-expiry and vendor-review emails, then records completion in `email_notification_events`. Before this change, both paths had four repository-side integrity gaps:

1. a dedupe lookup error was treated as a trustworthy `not sent` result;
2. provider delivery did not receive an idempotency key;
3. completion writes used plain inserts despite an existing logical unique constraint;
4. completion-write failures were reported but not propagated.

A successful provider delivery followed by a failed completion write could therefore be retried by a later cron execution. Concurrent executions could also race between the dedupe lookup and completion insert.

This repository evidence establishes the retry and concurrency windows only. It does not establish duplicate production email, provider failure, a customer incident, an audit result, or a penetration test.

## Decision

Create a reusable notification identity helper that canonicalizes the organization, event type, entity type, entity, recipient and occurrence, then hashes that identity into a PII-safe provider idempotency key.

For both compliance-alert types:

- fail closed when dedupe state cannot be read;
- pass the deterministic key through the existing transactional email client;
- record completion only after `sendEmail` confirms `sent: true`;
- store the key in completion metadata for correlation;
- use the existing unique event identity with an upsert;
- propagate completion-write errors so later retries reuse the same provider key.

The occurrence component is the document expiry date or vendor next-review date. A materially new occurrence therefore receives a new key while retries of the same logical notification remain stable.

## Impact

Document-expiry and vendor-review alerts now approximate exactly-once delivery across repeated cron executions using provider idempotency plus database uniqueness.

No queue, Redis dependency, new table, migration, schedule, template, recipient-selection rule, authentication, authorization, provider credential, deployment target, customer-data rewrite, or runtime evidence is introduced.

## Risks and limitations

- This is not a distributed transaction between the email provider and Supabase.
- Cross-run suppression depends on the configured provider honoring repeated keys within its retention window.
- A failed completion write remains an error and may be retried; the same provider key is deliberately reused.
- Existing completion rows are not rewritten with idempotency metadata.
- Other email paths require separate identity and lifecycle review before adopting this helper.

## Validation

Repository validation includes:

- deterministic, occurrence-sensitive and PII-safe helper tests;
- contract tests for fail-closed lookup and completion errors;
- contract tests for provider key propagation, confirmed-delivery ordering and idempotent upsert;
- lint, typecheck, unit tests, build, production-like E2E, Security CI, Full Security Suite and Enterprise Production Gate;
- CodeQL, Semgrep, Gitleaks, dependency review, Actionlint, SBOM and deployment preview where platform capacity permits.

GitHub Actions results on the pull-request head are the authoritative execution evidence. No production behavior is claimed from repository tests alone.

## Rollback

Revert the pull request. No migration, data, provider, credential, cron or infrastructure rollback is required. Reverting restores fail-open dedupe reads, provider calls without deterministic keys and non-idempotent completion inserts for these two alert flows.
