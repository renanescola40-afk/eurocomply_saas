# Enforce organization membership for risk actors

- Status: Proposed
- Date: 2026-07-19
- Decision owners: Engineering, Security, AI Governance

## Context

`public.risks` stores `organization_id`, `created_by`, and `owner_user_id` as independent foreign keys. The user references prove only that an account exists in `auth.users`; they do not prove that the attributed creator or owner belongs to the risk record's organization.

RLS authorizes access through `risks.organization_id`. A privileged API, service-role writer, migration, or future integration could therefore persist a tenant-A risk attributed to a tenant-B user. That would weaken accountability, ownership routing, reporting, and audit evidence for a material governance record.

## Decision

Add a database trigger guard for new or scope-changing writes:

- non-null `created_by` must match an `organization_members` row for the same organization;
- non-null `owner_user_id` must match an `organization_members` row for the same organization;
- null creator and owner values remain valid;
- violations use PostgreSQL `check_violation`;
- the trigger function is `SECURITY DEFINER`, has an empty `search_path`, and is not directly executable by application roles.

The triggers run on inserts and when `organization_id`, `created_by`, or `owner_user_id` changes. They do not retroactively rewrite or claim validation of historical rows.

## Consequences

### Positive

- Risk ownership and creator attribution cannot cross tenant boundaries through any database writer.
- The invariant is enforced below application and RLS layers.
- Existing nullable actor flows remain supported.

### Risks and compatibility

- Existing cross-tenant rows, if any, are not automatically repaired or represented as validated.
- Assigning a risk to an external collaborator without organization membership will be rejected.
- Tenant-transfer workflows must clear or replace actor references before changing the organization.
- Membership removal does not rewrite historical creator attribution or current ownership automatically; offboarding remains a separate lifecycle concern.

## Verification

A migration contract test checks the membership predicate, trigger coverage, nullable behavior, error class, hardened search path, and execution revocations. Repository CI must pass on the exact PR head before merge.

No production migration execution, historical-data audit, runtime penetration test, or certification is claimed by this decision.

## Rollback

If compatibility issues are found before production rollout, revert the migration commit. After rollout, rollback requires dropping both triggers and the function in a new forward migration. Any records created while the guard was absent must be independently reviewed before re-enabling it.
