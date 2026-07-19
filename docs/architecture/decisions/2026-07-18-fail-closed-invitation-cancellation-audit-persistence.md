# Fail closed when invitation-cancellation audit persistence is unavailable

- Status: Proposed
- Date: 2026-07-18
- Priority: P1
- Area: Access governance, audit integrity

## Context

`cancelOrganizationInvitation` permanently removes a pending organization invitation after authentication, tenant-scoped `team:remove` authorization, distributed fail-closed rate limiting, organization scoping, and a pending-state compare-and-set delete.

The action emitted `team.invite_cancelled` after deletion but did not inspect the audit writer's explicit `persisted` result. An audit database, schema, privileged-client, provider, or chain-write failure could therefore leave the invitation revoked while the caller received success without durable accountability evidence.

The repository also has a canonical invitation-entrypoint contract: user-triggered invitation creation must remain behind the protected `/api/team/invites` flow. Compensation must not turn `members.ts` into a second direct invitation-creation entrypoint.

This decision is based on source review. It does not claim a production incident, exploit, external audit, certification, or penetration test.

## Decision

The cancellation action will:

1. load only the exact restorable fields of the tenant-scoped pending invitation before deletion;
2. preserve the existing compare-and-set deletion;
3. require `audit.persisted === true` before returning success;
4. delegate restoration to the canonical server-side invitation persistence service when audit persistence fails;
5. require the restoration service to verify the expected invitation ID, organization ID, and pending state before using the privileged client;
6. restore the exact original identifiers, token, inviter, role, timestamps, and pending state;
7. report compensation failure with a fixed error, organization and invitation identifiers, and sanitized provider code only;
8. return the existing generic cancellation error when the audit write is unavailable.

## Consequences

Normal successful cancellations are unchanged. During audit-subsystem unavailability, cancellation fails closed and attempts to restore the invitation instead of silently completing without durable accountability evidence.

The action selects the explicit restorable columns rather than `*`. The token is carried only inside the in-memory compensation snapshot and is neither logged nor returned to the caller. The direct server action does not perform an invitation insert or upsert; it delegates compensation to the existing invitation persistence module.

## Risks and trade-offs

- Audit-subsystem unavailability temporarily reduces invitation-cancellation availability.
- Restoration is best effort and is not a single transaction spanning the invitation table and audit subsystem.
- Restoration can fail because of provider errors, schema drift, uniqueness constraints, or concurrent state; such failure is reported through sanitized observability and is not represented as successful compensation.
- A concurrent actor can create or change invitation state between deletion and restoration, so operational reconciliation remains necessary when compensation fails.
- The privileged restoration helper is intentionally narrow and rejects tenant, identifier, or accepted-state mismatches before touching the database.
- Source-level and unit tests establish control ordering and implementation intent only; they do not prove production database behavior, provider availability, or audit-chain durability.

## Preserved controls

- authentication;
- tenant-scoped `team:remove` authorization;
- organization-scoped lookup and deletion;
- pending-state validation and compare-and-set deletion;
- distributed `team-management` rate limiting with fail-closed provider behavior;
- canonical protected invitation-creation entrypoint;
- existing generic caller-facing errors;
- sanitized observability.

## Evidence boundary

Focused unit and source-contract tests verify the ordering, exact snapshot, delegation boundary, mismatch rejection, restoration result handling, and sanitized failure reporting. They do not prove production database behavior, runtime provider availability, end-to-end invitation delivery, audit-chain durability, or external assurance.

## Rollback

Revert the action, invitation persistence helper, focused tests, and this decision record together. No migration, data backfill, dependency rollback, secret rotation, or environment change is required.
