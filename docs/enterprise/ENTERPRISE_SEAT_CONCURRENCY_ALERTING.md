# Enterprise Seat Concurrency and Access Escalation

## Purpose

This control closes the last controllable seat-allocation race in the Enterprise identity and access domain. Concurrent workers, SCIM requests and administrators may request the final full seat at the same time; only one reservation may succeed.

## Atomicity

Reservations acquire an organization-scoped PostgreSQL advisory transaction lock and lock the active contract row. Capacity is recalculated inside the same transaction before the membership is changed. Expected contract version protects callers from stale administrative state.

Expected outcomes:

- `reserved`: mutation committed and contention evidence appended;
- `capacity_exhausted`: no mutation, durable contention evidence appended;
- `version_conflict`: no mutation, stale contract evidence appended;
- `membership_not_found` or `contract_not_found`: no mutation.

## Escalations

Open runtime alerts are converted into durable notification jobs. Jobs use leased `FOR UPDATE SKIP LOCKED` claims, exponential retry and dead-letter after five attempts. External email or webhook delivery is deliberately fail-closed until an adapter and credentials are configured; missing providers never create false delivered evidence.

## Operator response

1. Inspect `/api/team/seat-contention` summary.
2. Confirm the active contract and seat limit.
3. Review capacity exhaustion and version conflict events by correlation ID.
4. Increase contracted capacity or downgrade/release an eligible seat.
5. Retry the original operation with the latest contract version.
6. Review notification dead letters and configure the external delivery adapter.

## Validation boundary

Repository tests prove locking, tenant derivation, forced RLS, bounded input, step-up, retry and dead-letter contracts. A production database concurrency test with simultaneous transactions, real provider credentials, Microsoft Entra ID, Okta, Google Workspace and live 10,000-user execution remain `EXTERNAL_VALIDATION_REQUIRED`.
