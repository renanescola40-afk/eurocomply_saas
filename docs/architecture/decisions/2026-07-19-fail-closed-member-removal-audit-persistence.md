# Fail closed when member-removal audit persistence is unavailable

- Status: Proposed
- Date: 2026-07-19
- Owners: Security, Platform, Product Engineering
- Scope: `removeOrganizationMember`

## Context

Removing an organization member is a privileged, destructive access-governance operation. The existing action authenticates the caller, requires tenant-scoped `team:remove`, applies fail-closed distributed rate limiting, blocks self-removal, and uses an atomic database RPC to prevent last-owner and stale-state races.

After the RPC removed the membership, the action emitted `team.member_removed` but did not inspect the audit writer's explicit persistence result. It could therefore complete without durable accountability evidence.

## Decision

The action must not complete successfully unless the audit event is durably persisted.

Before removal, it captures the complete tenant-scoped membership row. If `logAuditEvent` reports `persisted: false`, the action attempts to restore that exact row and returns the existing generic removal failure. A compensation failure is sent to observability using fixed context and identifiers only.

## Security and product impact

This change strengthens accountability for privileged access revocation and aligns member removal with fail-closed governance controls already used for other destructive records.

## Risks and trade-offs

- Temporary audit unavailability can reduce member-removal availability because the action now fails closed instead of reporting an unaudited access-governance change as successful.
- Compensation is best effort and is not a single transaction spanning membership removal and audit persistence.
- Concurrent membership recreation, provider errors, schema drift, or database constraints can prevent restoration of the deleted row.
- Capturing the complete tenant-scoped row intentionally couples compensation to the current membership schema so the exact record can be restored.
- A compensation failure requires operational investigation and reconciliation; it must not be represented as successful completion.
- The source and regression-test evidence in this change does not prove compensation, alert delivery, or outage behavior in production.

## Alternatives considered

1. Continue returning success when auditing fails. Rejected because a privileged access change would lack durable evidence.
2. Write the audit event before removal. Rejected because an audit record could then claim a removal that the atomic RPC later refuses.
3. Move removal and audit-chain persistence into one database transaction. Preferred long term, but materially broader than this reviewable hardening change.

## Verification

A static security regression test verifies that the action:

- captures the complete tenant-scoped membership row;
- checks `audit.persisted`;
- attempts exact-row restoration;
- preserves authorization, self-removal protection, the atomic RPC, and fail-closed rate limiting.

No runtime, deployment, penetration-test, or production evidence is asserted by this decision record.

## Rollback

Revert the commits in the associated pull request. No schema or dependency rollback is required. Reverting restores the prior behavior in which member removal could succeed despite audit persistence failure.