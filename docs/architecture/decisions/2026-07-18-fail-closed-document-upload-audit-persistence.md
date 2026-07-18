# Fail closed on controlled-document upload audit persistence

- Status: Proposed
- Date: 2026-07-18
- Scope: `POST /api/documents/upload`

## Context

The controlled-document upload route authenticates the user, resolves the active organization, requires `manage_documents`, applies a fail-closed distributed upload rate limit, enforces quota, validates file signatures and size, requires malware-scanning policy success, writes the object to the tenant-scoped storage path, and inserts tenant-scoped document metadata.

After those durable mutations, the route emitted the `document_upload_accepted` security event but did not inspect the audit writer's explicit persistence result. It also created the success notification before the audit call. A database, schema, privileged-client, provider, or audit-chain failure could therefore leave a stored controlled document and return HTTP 201 without durable acceptance evidence.

## Decision

Treat the accepted-upload audit event as a required success condition.

The route now:

1. stores the object and inserts document metadata as before;
2. persists the accepted-upload audit event before notification or success disclosure;
3. when `persisted` is false, attempts to delete the exact metadata row using document ID, organization ID, and storage path, and removes the exact storage object;
4. returns a no-store HTTP 503 with `document_upload_audit_unavailable`;
5. creates the success notification only after durable audit persistence succeeds.

Compensation failure reporting contains only sanitized error codes and booleans. It does not log file bytes, object contents, user-provided filenames, hashes, storage credentials, or secrets.

## Consequences

### Positive

- A successful controlled-document upload cannot be returned without durable acceptance evidence.
- Notifications no longer claim success for an upload rejected at the audit boundary.
- Cleanup is tenant-scoped and targets the exact object and metadata row created by the request.
- Existing authentication, RBAC, quota, malware scanning, validation, rate limiting, and tenant-path controls remain in place.

### Trade-offs and residual risks

- Audit-service unavailability now reduces upload availability by design.
- Compensation spans database metadata and object storage and is therefore best effort rather than transactional.
- If one cleanup operation fails, an orphaned metadata row or storage object can remain. The route reports sanitized operational context and still does not return success.
- Reconciliation and operational alerting remain necessary for rare compensation failures.

## Evidence boundary

This decision and its source-level regression test demonstrate intended repository behavior only. They are not runtime evidence, a production audit, a penetration test, or proof that storage and database compensation succeeded in a deployed environment.

## Validation

Required before merge:

- exact-head lint and typecheck;
- the targeted Vitest security test;
- relevant unit and build checks;
- security, dependency, secret-scanning, enterprise-readiness, and release gates;
- human review of the availability trade-off and two-resource compensation behavior.

## Rollback

Revert the commits in this pull request. This restores the previous behavior in which upload success did not depend on durable acceptance-audit persistence. No schema migration or data backfill is introduced.
