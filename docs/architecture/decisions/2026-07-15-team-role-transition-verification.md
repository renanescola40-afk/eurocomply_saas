# Verify team member role transitions before success audit

## Status

Proposed.

## Context

`POST /api/team/members/role` loads a tenant-scoped membership, evaluates owner and self-change protections, updates the role, and then writes the `team_member_role_changed` audit event.

The prior update checked only for a database error. Supabase can return no error when a conditional mutation affects zero rows. Between the lookup and update, another authorized request can change or remove the membership. The losing request could then report `changed: true` and persist a success audit event based on stale state.

This is a P1 audit-integrity and concurrency gap established from repository behavior. No production race, customer impact, external audit, or penetration test is claimed.

## Decision

Use the role loaded by the route as an optimistic compare-and-set predicate:

- retain membership ID and organization ID predicates;
- require the stored role to still equal the loaded role, including an explicit null predicate;
- request the affected membership ID from the update;
- treat a zero-row result as HTTP 409 `team_member_state_changed`;
- persist success audit evidence only after the affected row is confirmed.

## Impact

Successful role changes retain the existing response and audit payload. A stale concurrent request now receives a conflict and must refresh rather than claiming a transition it did not perform.

Authentication, trusted-origin enforcement, distributed rate limiting, organization resolution, `manage_team` permission, step-up authentication, bounded JSON parsing, self-role protection, owner authorization, last-owner protection, tenant scoping, and no-store responses remain unchanged.

No migration, dependency, RLS, RBAC, entitlement, secret, provider, or public API expansion is introduced.

## Risks and limitations

- Concurrent administrators may need to refresh and retry.
- The owner-count check and role update remain separate statements. The compare-and-set prevents stale-role success evidence but does not make last-owner enforcement fully transactional.
- Database transport-error handling is unchanged.
- Repository tests and CI do not prove production concurrency behavior or audit durability.

A future database-side atomic role-transition primitive may be justified if stronger last-owner serialization is required, but that would need a separate schema and RLS review.

## Evidence

Evidence is limited to the repository implementation, focused source-contract tests, and GitHub checks on the exact PR head. No runtime evidence file is created or reclassified.

## Rollback

Revert this decision and the accompanying route/test changes. The prior error-only update behavior returns. No schema rollback, data repair, credential rotation, provider action, or customer-data migration is required.
