# Make team member role transitions atomic before success audit

## Status

Accepted.

## Context

`POST /api/team/members/role` loads a tenant-scoped membership, evaluates owner and self-change protections, changes the role, and then writes the `team_member_role_changed` audit event.

A route-local conditional update can prevent stale-role success evidence, but a separate owner-count query is not sufficient to protect the final owner. Two concurrent owner-demotion requests can each observe two owners and both commit, leaving the organization without an owner.

This is a P1 authorization-boundary, audit-integrity, and concurrency gap established from repository behavior. No production race, customer impact, external audit, or penetration test is claimed.

## Decision

Move the final membership role transition into the backend-only database function `public.change_organization_member_role_atomic`:

- keep authentication, `manage_team`, trusted-mutation, rate-limit, step-up, self-change, and owner-authorization checks in the API route;
- call the RPC only through the service-role Supabase client;
- lock all membership rows for the organization in a stable order within the transaction;
- require the stored role to still match the role loaded by the route, including null-safe comparison;
- reject same-role no-ops;
- count owners while the organization membership set is locked;
- block demotion of the final owner atomically;
- update the role only after all checks pass;
- return a bounded outcome enum to the route;
- persist success audit evidence only after the RPC reports `changed`.

The function uses `SECURITY DEFINER` with a fixed `search_path`, revokes execution from `public`, `anon`, and `authenticated`, and grants execution only to `service_role`.

## Impact

Successful role changes retain the existing API response and audit payload. Stale, no-op, not-found, invalid, and final-owner attempts fail without success audit evidence. Concurrent role changes for one organization are serialized at the database boundary.

Direct authenticated membership writes remain blocked by RLS. No dependency, entitlement, secret, provider, or public API expansion is introduced.

A database migration is introduced to install the backend-only RPC and reload the PostgREST schema cache.

## Risks and limitations

- concurrent administrators may need to refresh and retry after a conflict;
- role changes within one organization are serialized and may wait briefly under contention;
- the route still performs preliminary authorization using a loaded membership, while the RPC owns final state correctness;
- repository tests and CI do not prove production concurrency behavior, migration application, or audit durability;
- exact live Supabase validation remains required before enterprise Go.

## Evidence

Focused contracts verify:

- tenant-scoped lookup and central API guards;
- route delegation to the atomic RPC with expected-state parameters;
- no route-local owner count or direct role update;
- organization-row locking before owner counting and mutation;
- null-safe compare-and-set behavior;
- final-owner rejection;
- fixed search path and service-role-only execution;
- success audit creation only after a `changed` result.

GitHub Actions is authoritative for repository checks on the exact PR head. No runtime evidence file is created or reclassified by this decision.

## Rollback

Revert the route, test, decision record, and migration. If the migration has already been applied, deploy a follow-up migration that revokes and drops `public.change_organization_member_role_atomic(uuid, uuid, text, text)` before reverting the route. No customer-data rewrite is required.
