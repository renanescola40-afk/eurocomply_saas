# Fail closed when team-member removal audit persistence fails

- **Date:** 2026-07-17
- **Status:** Proposed
- **Severity:** P1
- **Scope:** `POST /api/team/members/remove`

## Context

Removing an organization member is an authorization-sensitive mutation. The route already enforced authentication, trusted-mutation validation, rate limiting, tenant scoping, `manage_team` permission, step-up authentication, self-removal prevention, and last-owner protection.

After the atomic removal RPC succeeded, the route attempted to persist a `team_member_removed` audit event. However, it returned HTTP 200 even when the audit writer explicitly returned `persisted: false`. This allowed a durable access-control change to remain active while the application represented it as successfully audited.

## Decision

The route must not report successful member removal unless the corresponding audit event is durably persisted.

When audit persistence fails:

1. Reinsert the exact removed membership using the tenant ID, member ID, user ID, and previous role returned by the guarded removal flow.
2. Report rollback failure through sanitized observability without exposing provider details to the caller.
3. Return a no-store HTTP 503 response with the stable code `team_member_removal_audit_unavailable`.
4. Never return `removed: true` or `auditPersisted: false` as a successful response.

## Consequences

- Access-control mutations fail closed at the accountability boundary.
- A transient audit-store failure may temporarily prevent member removal.
- Rollback is best-effort because another concurrent operation may recreate the membership first or the database may be unavailable. Such failures are observable and require operator review.
- Existing authentication, tenant isolation, RBAC, rate limiting, step-up authentication, self-removal protection, and last-owner controls remain unchanged.

## Evidence boundaries

This change is supported by repository source inspection and a regression contract test. It does not claim production execution, a completed audit, a penetration test, or runtime database evidence. Merge readiness still requires green exact-head CI and human review.

## Rollback

Revert the route, regression test, and this decision record. Reverting restores the previous behavior where member removal can succeed even if durable audit persistence fails.
