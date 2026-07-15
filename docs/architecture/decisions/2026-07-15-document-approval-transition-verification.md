# Verify document approval state transitions before success evidence

- Date: 2026-07-15
- Status: Accepted
- Priority: P1 audit integrity and concurrency safety

## Context

`POST /api/documents/[id]/approval` loaded a tenant-scoped document and then updated its status by document ID and organization ID. The update verified that a row was returned, but it did not require the stored status to remain equal to the value that had been loaded.

Two authorized approve/reject requests could therefore race. Both could update the same document and each could create a success audit event and notification, even though one request acted on stale state. This is a repository-side concurrency finding; no production race, customer impact, external audit, or penetration test is claimed.

## Decision

Use the loaded status as an optimistic compare-and-set predicate on the approval update:

- match document ID and organization ID;
- match the previously loaded status, including an explicit `IS NULL` predicate;
- request the affected document row;
- return `409 document_state_changed` when the conditional update affects no row;
- write approval/rejection success audit evidence and notifications only after a confirmed transition;
- record the rejected stale attempt through the existing denial audit path.

## Impact

Successful non-concurrent approvals preserve the existing response and audit payload. A stale concurrent request now receives a refresh-and-retry conflict rather than claiming a transition it did not perform.

Authentication, `manage_documents` permission enforcement, trusted-origin and rate-limit controls, bounded JSON parsing, tenant isolation, `no-store`, and secure error handling remain unchanged.

No database migration, RLS change, dependency, entitlement, secret, provider configuration, or public API expansion is introduced.

## Risks and trade-offs

- Clients may need to refresh after a `409 document_state_changed` response.
- Lookup and update remain separate statements; correctness is provided by the conditional update and affected-row verification.
- This does not establish a general document workflow state machine or restrict which statuses may transition to approved/rejected.
- Denial-audit persistence retains the existing best-effort behavior of the audit subsystem.

## Validation

A focused source-contract test verifies that:

- central identity, permission, mutation, tenant, and no-store controls remain present;
- nullable and non-null loaded statuses are used as compare-and-set predicates;
- zero-row updates return a stable conflict;
- success audit and notification writes occur only after transition confirmation.

GitHub Actions remains authoritative for lint, typecheck, tests, build, security suites, CodeQL, Semgrep, Gitleaks, dependency review, and release gates on the exact pull-request head.

## Evidence boundary

The evidence for this decision is limited to repository implementation, diff review, and automated checks. It does not prove production concurrency behavior, audit delivery, notification delivery, deployment health, or external assurance.

## Rollback

Revert the pull-request commits. This restores the previous update predicate and removes the focused test and this decision record. No data migration or rollback script is required.
