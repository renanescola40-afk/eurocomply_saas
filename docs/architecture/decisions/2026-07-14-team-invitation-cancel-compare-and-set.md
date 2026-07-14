# ADR: Verify team invitation cancellation with compare-and-set

- **Date:** 2026-07-14
- **Status:** Proposed
- **Priority:** P1

## Context

`POST /api/team/invitations/cancel` first loaded a pending invitation and then issued an update constrained by invitation ID, organization ID, and `status = pending`.

The update was correctly tenant-scoped and conditionally guarded, but the route only inspected the database error. It did not verify that the conditional update actually returned a row. If two authorized requests raced after the same pending lookup, one could revoke the invitation while the other update matched zero rows. The losing request could still return `cancelled: true` and write a `team_invitation_cancelled` audit event.

That behavior would not grant access or cross a tenant boundary, but it could produce a false mutation response and duplicate or misleading governance evidence.

## Decision

Require the conditional update to return the affected invitation ID.

The route now:

1. preserves the existing authenticated, trusted-origin, rate-limit, organization, permission, step-up, bounded-body, and tenant-scoped lookup controls;
2. performs the revoke with the existing `id`, `organization_id`, and `status = pending` predicates;
3. requests the affected row ID from the database;
4. returns HTTP 409 with `invitation_state_changed` when no row was changed;
5. creates the success audit event only after the database confirms that this request performed the transition.

## Impact

- Successful cancellations continue returning HTTP 200.
- A concurrent losing request now receives HTTP 409 instead of a false success.
- Success audit events correspond to confirmed state transitions.
- No schema, migration, dependency, entitlement, RBAC, RLS, secret, or provider configuration changes are required.

## Security and privacy

The existing organization predicate remains on both lookup and mutation. The response does not expose invitation email, role, tenant identifiers, database details, or competing actor information.

## Tests

Focused route tests cover:

- tenant-scoped lookup rejection;
- tenant-scoped conditional mutation;
- affected-row verification;
- successful audit persistence after a confirmed transition;
- HTTP 409 and absence of a success audit event when another request wins the race.

GitHub Actions remains authoritative for lint, typecheck, tests, build, and security gates.

## Evidence boundary

This decision is supported by repository code and automated tests only. It does not claim a production race was observed, a live database transaction was exercised, or that an external audit or penetration test occurred.

## Risks and trade-offs

- Clients that issue duplicate concurrent cancellation requests may now need to handle HTTP 409.
- The initial lookup remains separate from the update; the correctness guarantee is provided by the conditional update and affected-row verification, not by a multi-statement transaction.
- Database transport or query errors continue to return HTTP 503 and do not create a success audit event.

## Rollback

Revert this change. The route will again treat a zero-row conditional update as successful. No database rollback, data rewrite, credential rotation, or provider action is required.
