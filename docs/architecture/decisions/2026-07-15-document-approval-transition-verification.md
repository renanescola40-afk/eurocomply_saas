# Verify document approval state transitions before success evidence

- Date: 2026-07-15
- Status: Accepted
- Priority: P1 audit integrity and concurrency safety

## Context

`POST /api/documents/[id]/approval` used an admin client to load a document by ID and asserted the organization only after the row had been returned. It then updated the status by document ID and organization ID, but did not require the stored status to remain equal to the value that had been loaded.

Two authorized approve/reject requests could therefore race. Both could update the same document and each could create a success audit event and notification, even though one request acted on stale state. A repeated request for a status the document already held could also report success and create duplicate evidence without performing a real state transition.

This is a repository-side tenant-boundary and concurrency finding. No production race, cross-tenant disclosure, customer impact, external audit, or penetration test is claimed.

## Decision

Require a tenant-scoped, real state transition before success evidence:

- scope the admin lookup by document ID and active organization ID before loading row data;
- retain the central organization assertion as defense in depth;
- reject a request when the document already has the requested status with `409 document_state_unchanged`;
- match document ID and organization ID on the update;
- match the previously loaded status, including an explicit `IS NULL` predicate;
- request and verify the affected document row;
- return `409 document_state_changed` when a concurrent or stale conditional update affects no row;
- write approval/rejection success audit evidence and notifications only after a confirmed transition;
- record rejected no-op and stale attempts through the existing denial-audit path.

## Impact

Successful non-concurrent state changes preserve the existing response and audit payload. Cross-tenant IDs are filtered at query time. Repeated no-op actions and stale concurrent requests receive stable conflicts rather than claiming transitions they did not perform.

Authentication, `manage_documents` permission enforcement, trusted-origin and rate-limit controls, bounded JSON parsing, `no-store`, and secure error handling remain unchanged.

No database migration, RLS change, dependency, entitlement, secret, provider configuration, or public API expansion is introduced.

## Risks and trade-offs

- clients may need to refresh after `409 document_state_changed` or `409 document_state_unchanged`;
- lookup and update remain separate statements; correctness is provided by the conditional update and affected-row verification;
- this does not establish a general document workflow state machine or restrict which different statuses may transition to approved/rejected;
- denial-audit persistence retains the existing best-effort behavior of the audit subsystem.

## Validation

A focused source-contract test verifies that:

- central identity, permission, mutation, tenant, and no-store controls remain present;
- the admin lookup is scoped to the active organization before loading document data;
- same-state no-op requests are rejected before any update or success evidence;
- nullable and non-null loaded statuses are used as compare-and-set predicates;
- zero-row updates return a stable stale-state conflict;
- success audit and notification writes occur only after transition confirmation.

GitHub Actions remains authoritative for lint, typecheck, tests, build, security suites, CodeQL, Semgrep, Gitleaks, dependency review, and release gates on the exact pull-request head.

## Evidence boundary

The evidence for this decision is limited to repository implementation, diff review, and automated checks. It does not prove production concurrency behavior, audit delivery, notification delivery, deployment health, or external assurance.

## Rollback

Revert the pull-request commits. This restores the prior lookup scope and update behavior and removes the focused test and this decision record. No data migration or rollback script is required.
