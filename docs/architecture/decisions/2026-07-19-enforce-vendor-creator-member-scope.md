# Enforce vendor creator membership scope

- Status: Proposed
- Date: 2026-07-19
- Priority: P1 security and tenant-accountability integrity

## Context

`public.vendors` stores an organization identifier and a nullable creator identifier as independent foreign keys. The organization-scoped RLS policies authorize access through `organization_id`, while the `created_by` foreign key proves only that the referenced account exists in `auth.users`.

A privileged backend, service-role writer, migration, or future integration could therefore persist a vendor record for one organization while attributing its creation to a user who is not a member of that organization. This finding is based on repository source review. It is not evidence of exploitation, a production incident, a penetration test, an external audit, or customer impact.

## Decision

Add a database trigger that requires each non-null `vendors.created_by` value to match a row in `public.organization_members` with the same `organization_id` and `user_id`.

The trigger runs before inserts and before changes to `organization_id` or `created_by`. Null creator attribution remains supported for legitimate system-created or legacy-compatible records.

The trigger function is `SECURITY DEFINER`, uses an empty `search_path`, fully qualifies referenced objects, and is not directly executable by `public`, `anon`, or `authenticated`.

## Impact

- Cross-tenant creator attribution is rejected at the database boundary.
- Existing RLS policies, grants, API authorization, and service-role architecture remain unchanged.
- Existing rows are not rewritten or represented as validated by this prospective guard.
- Normal updates that do not change organization or creator attribution are unaffected.

## Risks and trade-offs

- A legitimate workflow that attributes vendor creation to an external or already-offboarded user must use null attribution or define a separate explicit model.
- Tenant-transfer workflows must update creator attribution consistently or clear it.
- Deployment can fail if the function or trigger conflicts with an unexpected production-only schema difference; exact migration execution must therefore be reviewed and validated before production rollout.

## Validation

A static migration-contract test verifies the tenant membership predicate, trigger coverage, null compatibility, hardened function configuration, direct-execution revocations, and `check_violation` error code.

No production migration execution, historical-data validation, runtime Supabase test, security audit, certification, or penetration-test result is claimed by this change.

## Rollback

Drop trigger `enforce_vendor_creator_member_scope` from `public.vendors`, then drop function `public.enforce_vendor_creator_member_scope()`.

Rollback restores the prior behavior and therefore reopens the cross-tenant attribution gap. It does not require data transformation because the migration does not rewrite existing rows.
