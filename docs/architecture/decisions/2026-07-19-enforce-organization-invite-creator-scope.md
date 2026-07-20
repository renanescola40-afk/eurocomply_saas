# Enforce organization invitation creator membership

- Status: Proposed
- Date: 2026-07-19
- Priority: P1 security and tenant-accountability integrity

## Context

`public.organization_invites` stores `organization_id` and nullable `created_by` independently. The invitation row is tenant-scoped, while `created_by` identifies the actor responsible for initiating access to that tenant.

A user identifier alone does not prove same-organization membership. A privileged backend defect, service-role integration, migration, or future writer could therefore persist an organization-A invitation attributed to a user who is not a member of organization A. Existing RLS and backend-only writes reduce exposure but do not establish this data invariant at the database boundary.

This is a source-review finding. It is not evidence of exploitation, a production incident, a penetration test, an external audit finding, or customer impact.

## Decision

Add a `BEFORE INSERT OR UPDATE OF organization_id, created_by` trigger that requires every non-null creator to match `(organization_id, user_id)` in `public.organization_members`.

The function is `SECURITY DEFINER`, uses an empty `search_path`, schema-qualifies referenced objects, and grants no direct execution to `public`, `anon`, or `authenticated`.

## Impact

- New invitations cannot carry cross-tenant creator attribution.
- System-created invitations remain supported through nullable `created_by`.
- Status, expiry, acceptance, and revocation updates do not re-check historical membership unless the organization or creator attribution changes.
- Existing rows are not rewritten and no claim is made that production data has been validated.

## Risks and compatibility

- A workflow intentionally attributing an invitation to an external or already-removed user must use `created_by = null` or change its data model explicitly.
- Tenant-transfer operations that change `organization_id` must also provide a creator who belongs to the destination organization.
- The migration has not been executed against production during this change; deployment must follow the normal migration review and rollback process.

## Validation

A deterministic Vitest contract checks the membership predicate, nullable-system behavior, trigger event scope, empty search path, and execution revocations. CI and database runtime results must be evaluated on the exact pull-request head before merge.

## Rollback

```sql
drop trigger if exists enforce_organization_invite_creator_scope on public.organization_invites;
drop function if exists public.enforce_organization_invite_creator_scope();
```

Rollback removes prospective enforcement only. It does not alter invitation rows.
