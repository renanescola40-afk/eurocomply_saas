# Fail closed when invitation-cancellation audit persistence is unavailable

- Status: Proposed
- Date: 2026-07-18
- Priority: P1
- Area: Access governance, audit integrity

## Context

`cancelOrganizationInvitation` permanently removes a pending organization invitation after authentication, tenant-scoped `team:remove` authorization, distributed fail-closed rate limiting, organization scoping, and a pending-state compare-and-set delete.

The action emitted `team.invite_cancelled` after deletion but did not inspect the audit writer's explicit `persisted` result. An audit database, schema, privileged-client, provider, or chain-write failure could therefore leave the invitation revoked while the caller received success without durable accountability evidence.

This decision is based on source review. It does not claim a production incident, exploit, external audit, certification, or penetration test.

## Decision

The cancellation action will:

1. load the complete tenant-scoped pending invitation before deletion;
2. preserve the existing compare-and-set deletion;
3. require `audit.persisted === true` before returning success;
4. restore the exact deleted invitation when audit persistence fails;
5. report compensation failure with a fixed event name, organization and invitation identifiers, and sanitized provider code only;
6. return the existing generic cancellation error when the audit write is unavailable.

## Consequences

Normal successful cancellations are unchanged. During audit-subsystem unavailability, cancellation fails closed and attempts to restore the invitation instead of silently completing without durable accountability evidence.

Loading the complete row broadens the internal query result solely so the exact record can be restored. No invitation token or row content is added to logs or caller-facing errors.

## Risks and trade-offs

- Audit-subsystem unavailability temporarily reduces invitation-cancellation availability.
- Restoration is best effort and is not a single transaction spanning the invitation table and audit subsystem.
- Restoration can fail because of provider errors, schema drift, constraints, or concurrent state; such failure is reported through sanitized observability and is not represented as successful compensation.
- A concurrent actor can change invitation state between deletion and restoration, so operational reconciliation remains necessary when compensation fails.
- Source-level tests establish control ordering and implementation intent only; they do not prove production database behavior, provider availability, or audit-chain durability.

## Preserved controls

- authentication;
- tenant-scoped `team:remove` authorization;
- organization-scoped lookup and deletion;
- pending-state validation and compare-and-set deletion;
- distributed `team-management` rate limiting with fail-closed provider behavior;
- existing generic caller-facing errors;
- sanitized observability.

## Evidence boundary

The focused source-level test verifies the control ordering and compensation implementation. It does not prove production database behavior, runtime provider availability, end-to-end invitation delivery, audit-chain durability, or external assurance.

## Rollback

Revert the action, focused test, and this decision record together. No migration, data backfill, dependency rollback, secret rotation, or environment change is required.