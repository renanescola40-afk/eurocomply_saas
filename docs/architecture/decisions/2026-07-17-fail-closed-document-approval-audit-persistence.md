# Fail closed when document approval audit persistence is unavailable

- **Date:** 2026-07-17
- **Status:** Proposed
- **Priority:** P1
- **Scope:** Controlled-document approval and rejection API

## Context

`POST /api/documents/[id]/approval` changes an organization-scoped controlled document to `approved` or `rejected`. The route then attempts to persist a chained audit event, but previously returned HTTP 200 even when `createAuditEvent` explicitly reported `persisted: false`.

That behavior allowed a governance-significant state change to be represented as successful without durable evidence. It also sent an in-app approval notification despite the missing audit record. This is an evidence-integrity and incident-response gap rather than proof that any production audit event has been lost.

## Decision

The route now treats durable audit persistence as a success condition for document approval and rejection.

When audit persistence fails after the compare-and-set status update, the route:

1. attempts a tenant-scoped compare-and-set rollback to the prior status;
2. does not create the success notification;
3. does not return the successful approval payload;
4. returns a no-store HTTP 503 response with the stable error `document_approval_audit_unavailable`;
5. logs only a stable event name and sanitized provider error code or state marker.

The rollback is constrained by document ID, organization ID, and the status written by the current request. It therefore does not overwrite a concurrent subsequent state transition.

## Impact

- Approval and rejection are no longer reported as successful without durable audit evidence.
- A temporary audit-store failure can reduce availability for document approval operations.
- If compensation cannot safely restore the previous status because the row changed concurrently or the database is unavailable, the route still returns 503 and emits a sanitized operational warning. Operators must reconcile that exceptional state from database and audit evidence; the response does not claim rollback success.
- Existing authentication, `manage_documents` permission enforcement, trusted-mutation protection, body bounds, tenant scoping, and optimistic concurrency remain unchanged.

## Risks and mitigations

- **Availability tradeoff:** approvals fail closed during audit persistence outages. This is intentional for a governance-significant state transition.
- **Compensation is not a database transaction:** the rollback can fail. Compare-and-set constraints prevent clobbering a later update, and failures are surfaced to observability without leaking record contents.
- **Client behavior:** clients that previously accepted `auditPersisted: false` must handle HTTP 503 and retry only after confirming the document state.

A future schema-level transaction or RPC that changes document status and appends the chained audit event atomically would provide stronger guarantees. This change does not claim that atomicity.

## Evidence and verification boundaries

The repository change and regression contract test demonstrate intended source behavior only. They are not runtime evidence, a penetration test, an external audit, or proof that production database compensation succeeds. Merge requires all required exact-head CI, lint, typecheck, security, and release checks to be green plus human review.

## Rollback

Revert the commits in the associated pull request. That restores the prior behavior of returning success with an `auditPersisted` boolean even when audit persistence fails. No schema, migration, secret, dependency, RLS, or RBAC rollback is required.
