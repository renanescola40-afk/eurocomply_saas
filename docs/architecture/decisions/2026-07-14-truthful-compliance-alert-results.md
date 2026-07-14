# Truthful compliance alert job results

Date: 2026-07-14
Status: Proposed
Scope: internal document-expiry and vendor-review alert job

## Context

The compliance-alert job processes multiple recipients per invocation. Delivery and completion-persistence exceptions were caught per recipient so the remaining alerts could still be attempted. However, those exceptions were only reported to observability and were not represented in the returned counters.

As a result, an invocation with one or more failed recipient operations could still return HTTP 200 with `ok: true`. This made the scheduler-visible result inconsistent with the work actually completed and could prevent normal retry or incident handling from being triggered.

Repository inspection establishes this result-integrity gap only. It does not establish a production outage, missed notification, duplicate delivery, customer impact, audit finding, or penetration-test result.

## Decision

Keep per-recipient isolation so one failed alert does not prevent the rest of the batch from being attempted, but make the final job result fail closed:

- count caught delivery or completion-persistence exceptions as `failed`;
- include `failed` in each alert-family result;
- return HTTP 500 when either family reports one or more failures;
- preserve the successful HTTP 200 response only when both failure counts are zero.

The response exposes aggregate counters only. It does not include recipient addresses, entity names, provider errors, secrets, or stack traces.

## Impact

Schedulers and operators can distinguish a complete run from a partial run. Successfully delivered alerts remain recorded and are protected by the existing deterministic provider key and database uniqueness. Failed items remain eligible for a later retry.

No recipient-selection rule, email template, idempotency identity, database table, migration, provider credential, cron schedule, authorization control, or infrastructure component changes.

## Risks and limitations

- A partial run now returns HTTP 500 even when some alerts were delivered successfully.
- Scheduler retry behavior depends on the deployment platform configuration.
- The endpoint reports aggregate failure counts, not per-item diagnostics; detailed errors remain in sanitized observability events.
- `delivery.sent === false` remains a skipped result rather than an exception because the email client intentionally uses that state for non-delivery conditions handled by existing policy.
- This change does not provide a distributed transaction between the email provider and Supabase.

## Validation

Repository validation includes a focused source-contract test that verifies:

- caught recipient exceptions increment a failure counter;
- both alert-family results expose the counter;
- the partial-failure guard executes before the success response;
- partial failure returns HTTP 500.

GitHub Actions on the pull-request head are the authoritative execution evidence for lint, typecheck, tests, build, security checks, and release gates. No runtime behavior is claimed from repository inspection alone.

## Rollback

Revert the pull request. No migration, data rewrite, credential rotation, provider change, cron change, or infrastructure rollback is required. Reversion restores the previous behavior where per-recipient exceptions are logged but the invocation can still return HTTP 200.
