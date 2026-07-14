# Truthful internal batch-job results

Date: 2026-07-14
Status: Proposed
Program: Enterprise Platform Foundations
Priority: P1 operability and evidence integrity

## Context

The repository has several privileged internal jobs that process multiple items or downstream jobs in one invocation. Trial reminders and compliance alerts already return non-success HTTP status when any item fails. Metric snapshots did not: it returned HTTP 200 with `ok: false` after one or more organization snapshots failed. It also copied the caught exception message into the response.

The daily-maintenance orchestrator already returned HTTP 207 for partial downstream failure, but built its response independently and recorded `durationMs: 0` when a downstream invocation threw. These differences create response drift and can make scheduler-visible evidence disagree with actual execution.

Repository inspection establishes the source-level behavior only. It does not prove a production incident, leaked error text, missed snapshot, or scheduler misclassification.

## Decision

Introduce one shared `internalBatchResponse` primitive that:

- requires a non-negative integer failure count;
- returns `ok: true` only when the failure count is zero;
- returns `ok: false` plus a sanitized route-owned error message when failures exist;
- applies no-store headers through the existing response utility;
- supports an explicit failure status for orchestration cases such as HTTP 207;
- rejects summaries that attempt to override the reserved `ok` or `error` fields.

Adopt the primitive in two proven consumers:

1. `metric-snapshots`, with HTTP 500 for partial failure;
2. `daily-maintenance`, preserving HTTP 207 for partial downstream failure.

Metric snapshot failure entries retain the organization identifier needed for operator correlation but replace arbitrary exception messages with the fixed value `internal_error`. Detailed errors remain in the sanitized observability path. Daily-maintenance exceptions now report measured elapsed duration instead of `0`.

## Impact

Schedulers and operators receive transport status aligned with execution outcome. The metric snapshot endpoint no longer presents a partial batch as an HTTP success or returns arbitrary exception text. The maintenance envelope retains its established multi-status contract while sharing the same truthfulness rules.

No database schema, migration, tenant selection, snapshot calculation, cron schedule, authentication, authorization, provider credential, customer data, or infrastructure component changes.

## Risks and trade-offs

- Metric snapshot partial failures now return HTTP 500 and may trigger scheduler retries.
- Repeated work remains safe only to the extent that the snapshot write path is idempotent or convergent; this change does not add a distributed transaction.
- Organization identifiers remain present in the protected internal response for operational correlation.
- HTTP 207 remains intentionally reserved for the orchestrator because it represents multiple downstream HTTP outcomes.
- A shared response helper does not replace job-level observability, retry policy, deadlines, or dead-letter handling.

## Validation

Repository tests cover success, failure, no-store behavior, configurable HTTP 207, invalid configuration, metric response sanitization, and measured maintenance failure duration. GitHub Actions on the final pull-request head remain authoritative for lint, typecheck, tests, build, security gates, and production-like E2E.

No runtime execution, customer-data inspection, audit, penetration test, certification, or production availability claim is included.

## Rollback

Revert this pull request. Metric snapshots will return to HTTP 200 with raw caught error messages on partial failure, and daily maintenance will return to its route-local response construction and zero exception duration. No data, schema, credential, provider, cron, or infrastructure rollback is required.
