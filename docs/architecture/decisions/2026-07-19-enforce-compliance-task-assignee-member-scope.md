# Enforce compliance task assignee organization scope

- **Status:** Proposed
- **Date:** 2026-07-19
- **Priority:** P1 — tenant integrity and governance accountability

## Context

`public.compliance_tasks` stores both an `organization_id` and an optional `assigned_to` user reference. The existing foreign keys prove that the organization and user independently exist, while row-level security authorizes access through the task row's organization.

That model did not prove that an assigned user belongs to the same organization as the task. A privileged application path, service-role writer, migration, or future integration could therefore create or move a task so that an organization-scoped governance obligation names a user from another tenant.

This finding is based on repository source and schema review only. It is not evidence of production exploitation, affected customer data, a penetration test, an external audit, or regulatory non-compliance.

## Decision

Add a database trigger that rejects any non-null `assigned_to` value unless a matching `(organization_id, user_id)` row exists in `public.organization_members`.

The trigger runs before inserts and before updates that change `organization_id` or `assigned_to`. Unassigned tasks remain valid. The trigger function is `SECURITY DEFINER`, uses an empty `search_path`, schema-qualifies referenced objects, and is not directly executable by `public`, `anon`, or `authenticated`.

## Motivation

Task assignment is an accountability control. Enforcing tenant membership at the database boundary protects every writer, including service-role and future integration paths, instead of relying on each caller to reproduce the same membership validation correctly.

## Impact

- New cross-tenant task assignments fail with PostgreSQL `check_violation`.
- Existing same-tenant and unassigned task flows are unchanged.
- Updates that move a task between organizations must clear or replace an assignee who is not a member of the destination organization.
- Existing rows are not rewritten or claimed to have been audited by this migration.

## Risks and trade-offs

- This is prospective enforcement; pre-existing inconsistent rows are not detected or repaired.
- Offboarding does not automatically clear historical task assignments because the trigger runs only on task inserts and relevant task updates.
- Callers that previously depended on assigning arbitrary authenticated users will receive a database error and must select an organization member instead.
- A future organization-transfer workflow must coordinate assignee changes with the tenant move.

## Validation

A migration contract test verifies the membership predicate, trigger coverage, nullable-assignee behavior, `check_violation` error contract, hardened function configuration, and execution revocations.

This test is source-contract evidence only. It does not prove migration execution against production data, runtime RLS behavior, or successful deployment.

## Rollback

Drop `public.enforce_compliance_task_assignee_scope`, then drop `public.enforce_compliance_task_assignee_member_scope()`.

Rollback removes prospective enforcement and does not modify task data. Before rollback, confirm that no application behavior has begun relying on the database rejection as its only validation boundary.
