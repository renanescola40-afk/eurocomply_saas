# Verify organization member removal before recording success

- Date: 2026-07-14
- Status: Accepted
- Priority: P1 audit integrity and concurrency hardening

## Context

`removeOrganizationMember` first loaded a tenant-scoped membership and then issued a tenant-scoped delete. The action checked only the database error returned by the delete.

A successful Supabase response does not by itself prove that a row was deleted. If another authorized request removed the same membership after the lookup but before this delete, the second request could affect zero rows while still writing a `team.member_removed` success audit event.

That creates false security and governance evidence: the audit trail would describe a state transition that this request did not perform.

## Decision

The delete now requests the affected membership ID and uses `maybeSingle()` to distinguish an applied transition from a zero-row result.

The action:

1. preserves the existing authentication and `team:remove` authorization checks;
2. preserves lookup and delete predicates for both membership ID and organization ID;
3. records the success audit event only when the conditional delete returns the affected membership;
4. raises a stable server-action error when the membership changed before this request completed.

## Impact

- Concurrent or stale removals no longer create false success audit evidence.
- The successful path and public function signature are unchanged.
- Tenant isolation, owner safeguards and self-removal prevention remain unchanged.
- No schema migration, dependency, secret, entitlement, provider or RLS change is required.

## Evidence

Focused unit tests cover:

- successful tenant-scoped deletion followed by the existing audit event;
- a zero-row concurrent deletion result producing an error and no success audit event.

GitHub Actions remains authoritative for repository-wide lint, typecheck, tests, build and security checks.

## Limitations

This change does not make the separate owner-count check transactional. It does not claim to prove live Supabase concurrency behavior, production execution, an external audit or a penetration test. A database-side atomic owner-removal primitive would be a separate, higher-risk change requiring schema and RLS review.

## Risks

Callers that previously treated a stale concurrent removal as success will now receive an error. This is intentional because the request did not apply the claimed transition.

Returning the deleted row ID adds only the minimum identifier already supplied by the caller; it is not returned to the browser by this action and does not expose another tenant's data.

## Rollback

Revert this change. The delete will again check only the database error and may record success when zero rows were affected. No migration rollback, data repair, credential rotation or provider action is required.
