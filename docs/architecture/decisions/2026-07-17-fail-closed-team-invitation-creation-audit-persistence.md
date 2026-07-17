# Fail closed when team invitation creation cannot be audited

Date: 2026-07-17
Status: Proposed

## Context

`POST /api/team/invites` persists a pending organization invitation and sends a bearer-style invitation link by email. The route previously created the `team_invite_created` audit event only after email delivery and returned success even when the audit writer explicitly reported `persisted: false`.

That ordering allowed an access path to be created and disclosed externally without durable accountability evidence. Audit-store, schema, database, provider, or privileged-client failures were therefore indistinguishable from an auditable successful invitation.

## Decision

Team invitation creation now requires durable `team_invite_created` audit persistence before any invitation email is sent or success is returned.

When audit persistence fails:

- the route attempts to delete the exact pending invitation;
- compensation is scoped by organization ID, invitation ID, and `accepted_at is null`;
- no invitation token or email link is disclosed;
- the route returns a no-store `503` with `team_invite_audit_unavailable`;
- compensation failures are reported with sanitized operational identifiers only.

The invitation token is never logged or returned by the failure response.

## Consequences

Successful invitation delivery is now preceded by durable creation evidence. During audit subsystem failure, invitation creation becomes unavailable rather than producing an unaudited access path.

Compensation remains best effort. If deletion fails, operators receive sanitized observability evidence and the client still receives a failure without the invitation URL. The pending record may require authorized operational cleanup.

This change does not claim that production audit persistence, email delivery, database compensation, or tenant isolation has been runtime-validated. Those require exact-head CI and authorized production evidence.

## Alternatives considered

- Continue returning success with `auditPersisted: false`: rejected because it represents an authorization-sensitive operation as successful without durable evidence.
- Send email before auditing and delete later: rejected because email cannot be recalled and would disclose a bearer link before the audit guard.
- Remove auditing from invitation creation: rejected because it weakens an existing security control.

## Rollback

Revert the route, query helper, security contract test, and this decision record. No schema, migration, dependency, secret, or external API rollback is required.