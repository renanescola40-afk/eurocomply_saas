# ADR: Verify server-action invitation cancellation state transitions

- **Date:** 2026-07-15
- **Status:** Proposed
- **Priority:** P1

## Context

`cancelOrganizationInvitation` loaded a tenant-scoped pending invitation and then deleted it with predicates for invitation ID, organization ID, and `accepted_at IS NULL`.

The mutation checked only for a database error. A concurrent acceptance or cancellation could make the conditional delete affect zero rows while the server action still recorded `team.invite_cancelled` as a successful audit event.

A separate API cancellation route already verifies its affected row. The server-action path required the same evidence-integrity property.

## Decision

Require the conditional delete to return the affected invitation ID and reject zero-row results before writing success evidence.

The action now:

1. preserves authentication, `team:remove` authorization, tenant-scoped lookup, and pending-state validation;
2. preserves the existing invitation ID, organization ID, and `accepted_at IS NULL` mutation predicates;
3. requests the affected row ID;
4. rejects a zero-row result as a stale state transition;
5. writes `team.invite_cancelled` only after the database confirms that this request performed the deletion.

## Impact

- Successful cancellations retain their existing behavior.
- A losing concurrent request fails instead of reporting false success.
- Audit chronology corresponds to a confirmed mutation.
- No migration, dependency, RLS, RBAC, entitlement, secret, or provider change is introduced.

## Tests

Focused unit tests cover:

- tenant-scoped conditional deletion;
- affected-row selection;
- success audit creation after a confirmed deletion;
- zero-row concurrent cancellation rejection;
- absence of false success audit evidence.

GitHub Actions remains authoritative for lint, typecheck, tests, build, and security gates.

## Evidence boundary

This decision is supported by repository code and automated tests only. It does not claim that a production race was observed or that a live database concurrency test, external audit, or penetration test was performed.

## Risks and trade-offs

- Duplicate or concurrent cancellation attempts may now surface an error requiring a UI refresh.
- Lookup and delete remain separate statements; correctness relies on the conditional delete and affected-row verification.
- Database transport errors retain their existing handling.

## Rollback

Revert this change. No schema rollback, data rewrite, credential rotation, or provider action is required. The previous behavior would again allow zero-row deletes to be treated as successful.
