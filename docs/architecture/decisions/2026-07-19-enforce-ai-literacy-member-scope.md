# Enforce organization membership for AI literacy user references

- **Date:** 2026-07-19
- **Status:** Proposed
- **Priority:** P1 — tenant integrity, AI governance accountability

## Context

AI literacy programmes may name an `owner_user_id`, and AI literacy assignments may name an `assignee_user_id`. The original schema constrained both columns to valid `auth.users` identities, but did not require the referenced user to belong to the row's `organization_id`.

The API accepts both identifiers from privileged organization-scoped requests and writes through a service-role client. A caller with `manage_ai_governance` could therefore create a programme or assignment that references a valid user from another tenant. The affected records would remain organization-scoped, but their accountability and coverage metadata would contain a cross-tenant identity reference.

This is a source and schema review finding only. It does not assert exploitation, production impact, external audit results, penetration testing, or certification evidence.

## Decision

Add a database trigger guard for:

- `ai_literacy_programs.owner_user_id`; and
- `ai_literacy_assignments.assignee_user_id`.

For non-null user identifiers, inserts and updates that change the organization or referenced user must find a matching `(organization_id, user_id)` row in `organization_members`. Otherwise PostgreSQL rejects the mutation with `check_violation`.

The function is `SECURITY DEFINER` with an empty search path, references fully qualified tables, and is not executable directly by `public`, `anon`, or `authenticated`. It is invoked only by the two table triggers.

## Preserved behavior

Null programme owners remain supported so existing default-owner handling can continue. Null assignment user IDs remain supported for email-backed employees, contractors, and other external assignees. No RLS policy, permission, rate limit, audit behavior, API contract, secret, dependency, or existing row is changed by the migration.

## Consequences and risks

Future programme-owner and user-backed assignment writes fail when the selected user is not currently a member of the organization. Clients that previously submitted cross-tenant or stale user IDs will receive the route's existing sanitized storage error instead of creating an inconsistent record.

The trigger validates writes prospectively. It does not claim that existing production data was inspected or repaired, and it does not prevent a later membership deletion from leaving a historical reference. A separate evidence-backed cleanup or lifecycle decision would be required before adding delete-time restrictions.

## Validation boundary

The accompanying migration contract test verifies both trigger targets, organization-member matching, nullable behavior, `check_violation`, and direct-execution revocations. Required exact-head CI remains the validation authority for SQL linting, migration contracts, TypeScript tests, build, security checks, and enterprise gates.

No live database migration, runtime tenant test, audit, or penetration test is claimed.

## Rollback

Drop the two triggers and `public.enforce_ai_literacy_member_scope()`, or revert this pull request before deployment. The migration is additive and performs no data rewrite, so rollback requires no data restoration.
