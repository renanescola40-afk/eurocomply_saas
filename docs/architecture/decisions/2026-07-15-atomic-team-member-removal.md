# Atomic organization member removal

Date: 2026-07-15
Status: Proposed
Priority: P1 authorization and audit integrity

## Context

`POST /api/team/members/remove` loaded a tenant-scoped membership, counted owners when the target was an owner, deleted the row, and then created `team_member_removed` success audit evidence.

The owner count and delete were separate database statements. Two authorized administrators could therefore load two owners, both observe an owner count greater than one, and concurrently delete both rows. The organization could be left without an owner.

The delete also did not verify an affected row. A concurrent role change or member removal could cause a losing request to return success and write audit evidence from stale state.

This finding is based on repository control flow only. No production race, customer impact, external audit finding, certification, or penetration test is claimed.

## Decision

Use a backend-only `remove_organization_member_atomic` PostgreSQL function for the final state transition.

The route continues to perform authentication, tenant resolution, `manage_team` authorization, trusted-origin enforcement, rate limiting, step-up authentication, bounded payload validation, self-removal protection, and tenant-scoped lookup.

The function:

- runs as `SECURITY DEFINER` with a fixed `search_path`;
- is executable only by `service_role`;
- locks all membership rows for the organization in stable order;
- verifies the member ID, organization ID, expected user ID, and expected role;
- counts owners while holding the organization membership locks;
- rejects deletion of the final owner;
- deletes only the exact expected row;
- returns a typed outcome for removed, missing, stale, invalid, or final-owner state.

The route creates success audit evidence only after the function returns `removed`. A stale request receives HTTP 409 and must reload current team state.

## Tenant and security boundary

The initial lookup remains scoped by both member ID and active organization ID. The database function repeats both predicates and does not accept organization authority from the browser without the route's existing authorization checks.

The RPC is revoked from `public`, `anon`, and `authenticated`, and granted only to `service_role`. No new browser-accessible database capability is introduced.

## Impact

- concurrent deletion of all owners: possible to atomically blocked;
- stale removal reporting success: possible to rejected;
- stale removal writing success audit evidence: possible to prevented;
- migrations: one backend-only function;
- dependencies, secrets, providers, billing, entitlements, and public API expansion: none.

## Risks and limitations

- membership mutations for one organization may briefly wait on row locks;
- clients must handle HTTP 409 by refreshing state;
- the migration must be applied to the target Supabase project before the route can operate;
- repository tests do not prove production lock timing or live Supabase deployment;
- audit persistence remains a follow-up write after the atomic removal and is not part of the database transaction.

## Evidence boundary

Evidence is limited to repository source, migration SQL, focused contract tests, and GitHub checks on the exact pull-request head. No runtime evidence document is created, modified, simulated, or promoted.

## Alternatives considered

### Route-local owner count plus conditional delete

Rejected because a conditional delete can prevent stale-row success but cannot make the final-owner count and deletion atomic across concurrent requests.

### Database trigger

Not selected because the typed RPC provides explicit application outcomes and keeps the protected transition narrow and reviewable.

### General membership state machine

Deferred. It would be broader than the concrete P1 defect and increase migration and rollout risk.

## Rollback

Revert the route, test, ADR, and migration. If the migration has already been applied, deploy a follow-up migration that revokes and drops `public.remove_organization_member_atomic(uuid, uuid, uuid, text)` before reverting the route.

No customer-data rewrite, credential rotation, provider action, or billing rollback is required.
