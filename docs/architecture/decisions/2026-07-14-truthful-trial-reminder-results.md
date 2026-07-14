# Truthful trial reminder job results

Date: 2026-07-14
Status: Proposed

## Context

The internal trial-reminder job processes multiple subscriptions independently. Per-subscription delivery or completion-recording exceptions are caught so the remaining subscriptions can still be attempted.

Before this change, caught exceptions were sent to observability but were not represented in the returned counters. The job returned only `sent` and `skipped`, and the route could return HTTP 200 with `ok: true` after one or more subscription operations failed.

For a billing lifecycle job, scheduler-visible success should not contradict actual batch completion. This repository inspection establishes the source-level control-flow gap only. It does not establish a production incident, missed reminder, customer impact, or provider behavior.

## Decision

Count caught per-subscription exceptions as `failed`, include that count in the job result, and return a no-store HTTP 500 response with `ok: false` when the completed batch contains any failures.

Continue attempting the remaining subscriptions so one recipient failure does not prevent unrelated reminders from being processed. Preserve the existing deterministic provider idempotency key and unique completion-event identity so a later retry can safely distinguish already completed reminders.

## Impact

Schedulers and operators can distinguish a complete run from a partial run. Successful sends and skips retain their existing behavior. Failed subscription operations remain visible through sanitized observability reporting and the aggregate response.

No recipient-selection rule, email template, authorization control, cron schedule, database schema, migration, provider credential, environment variable, or infrastructure component changes.

## Risks and limitations

- A partially successful batch now returns HTTP 500, which may cause the scheduler to retry the job.
- Retry behavior depends on deployment-platform configuration.
- The response contains aggregate counts only; detailed diagnostics remain in observability events.
- `delivery.sent === false` remains classified as skipped under the existing email-client contract.
- Email delivery and completion persistence are not a distributed transaction.
- This change does not prove production delivery, provider idempotency behavior, runtime availability, or regulatory compliance.

## Validation

The focused source-contract test verifies that failures are counted, returned, and checked before the success response. Repository CI remains the authority for lint, typecheck, tests, build, and security validation on the final commit.

No audit, penetration test, certification, or production probe is claimed.

## Rollback

Revert the commits in the pull request. No database migration, data rewrite, credential rotation, provider change, or infrastructure rollback is required.
