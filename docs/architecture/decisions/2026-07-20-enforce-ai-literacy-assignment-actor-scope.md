# Enforce AI literacy assignment actor scope

- Status: Proposed
- Date: 2026-07-20
- Priority: P1
- Scope: `public.ai_literacy_assignments`

## Context

AI literacy assignments are organization-scoped governance records. The table stores `organization_id` independently from `assignee_user_id`, `assigned_by`, and `waiver_approved_by`.

The existing foreign keys prove that referenced user accounts exist, but they do not prove that those users belong to the assignment organization. Existing row-level policies authorize through the assignment row's organization and therefore do not establish the missing cross-column invariant for privileged writers.

A backend defect, service-role integration, migration, or future privileged writer could consequently persist a tenant-A training assignment that names a tenant-B user as assignee, assigner, or waiver approver. This is repository source-review evidence only. No production incident, exploit, historical-data defect, audit finding, certification, or penetration-test result is claimed.

## Decision

Add a prospective `BEFORE INSERT OR UPDATE` database trigger on `public.ai_literacy_assignments` that requires every non-null user reference to match `(organization_id, user_id)` in `public.organization_members`.

The guard covers:

- `assignee_user_id`;
- `assigned_by`;
- `waiver_approved_by`;
- changes to `organization_id` that would invalidate any of those references.

Email-only external assignments remain supported because `assignee_user_id` may remain null while `assignee_email` satisfies the existing assignment constraint.

The trigger function is `SECURITY DEFINER`, has an empty `search_path`, uses fully qualified relations, and is not directly executable by `public`, `anon`, or `authenticated`.

## Impact

This adds a database-boundary tenant-integrity invariant for AI literacy accountability records without changing existing rows, RLS policies, grants, status rules, API behavior, or supported email-only external assignments.

## Risks and trade-offs

- Existing integrations that intentionally store a non-member user ID will fail with PostgreSQL `check_violation`; external people should use the existing email-only representation instead.
- Removing an organization member does not rewrite historical assignments. The trigger is prospective and runs only when covered columns are inserted or changed.
- Tenant-transfer workflows must clear or replace actor references before changing `organization_id`.
- This migration does not validate historical rows and does not claim production data cleanliness.

## Validation

A source contract test verifies the same-organization membership checks, trigger coverage, explicit failure codes, hardened function configuration, and revoked direct execution.

Runtime migration execution against production or a production clone is intentionally not claimed by this change.

## Rollback

Drop `enforce_ai_literacy_assignment_actor_scope` from `public.ai_literacy_assignments`, then drop `public.enforce_ai_literacy_assignment_actor_scope()`.

Rollback removes only prospective enforcement. It does not alter assignment data.

