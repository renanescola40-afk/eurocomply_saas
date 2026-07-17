# Fail closed on team invitation cancellation audit persistence

- Status: Proposed
- Date: 2026-07-17
- Scope: `POST /api/team/invitations/cancel`

## Context

Cancelling a pending organization invitation revokes a still-valid access path. The route already required an authenticated organization member with `manage_team`, trusted-mutation validation, fail-closed distributed rate limiting, and step-up authentication.

After deleting the pending invitation, the route wrote `team_invitation_cancelled` to the chained audit store. It returned HTTP 200 even when the audit writer explicitly reported `persisted: false`. This allowed a security-relevant authorization change to remain effective while the response represented the operation as successfully auditable.

## Decision

A successful cancellation response now requires durable audit persistence.

When the audit writer returns `persisted: false`, the route:

1. attempts to restore the exact pending invitation record captured before deletion, including its ID, organization, email, role, token, inviter, expiry, and creation timestamp;
2. reports a sanitized operational error if restoration fails; and
3. returns a no-store HTTP 503 response with `team_invitation_cancel_audit_unavailable`.

The success response exposes `auditPersisted: true` only after the persistence guard succeeds.

## Security and privacy boundaries

- The invitation token is read and used only server-side for compensation; it is not logged or returned.
- Tenant scoping remains enforced on both the lookup and deletion.
- Existing permission, trusted-origin, rate-limit, step-up, and pending-state controls remain unchanged.
- No runtime evidence, penetration-test result, or production validation is claimed by this decision record.

## Consequences and risks

The route intentionally prefers accountability consistency over availability when audit storage is unavailable.

Compensation is best-effort rather than transactional. A concurrent write or provider failure can prevent restoration after deletion. That condition is reported through sanitized observability and the request still returns 503; operators must then reconcile the invitation and audit records.

Restoring the original token preserves the pre-request invitation semantics. The token is never disclosed by the compensation path.

## Verification

A source-contract regression test verifies that:

- audit persistence is checked before success is returned;
- unsuccessful persistence produces the stable 503 error;
- the exact invitation fields required for restoration are retained and inserted; and
- tenant, permission, mutation, rate-limit, step-up, and pending-state controls remain present.

Repository CI, typecheck, lint, security, build, and release gates remain authoritative. This change is not complete or merge-ready until all required checks are green on the exact PR head SHA.

## Rollback

Revert the commits in this pull request. That restores the previous behavior where cancellation can return success with `auditPersisted: false`; no schema, migration, dependency, secret, or external configuration rollback is required.
