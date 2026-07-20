# Lock AI assessment writes behind backend boundaries

- Status: Proposed
- Date: 2026-07-20
- Priority: P1 security, tenant integrity, and AI-governance accountability

## Context

`public.ai_assessments` is a tenant-scoped governance table. The current schema grants authenticated users INSERT, UPDATE, and DELETE privileges and installs role-based write policies. Those controls restrict rows by organization, but a browser session can still mutate the table directly through Supabase/PostgREST.

Direct client writes bypass reviewed server-side controls that may be required for a material assessment workflow, including trusted-origin enforcement, bounded request validation, distributed throttling, lifecycle rules, durable audit behavior, and future separation-of-duties checks. Repository search found a client-side assessment read callsite but no supported browser mutation callsite that requires direct table DML.

This is a repository source-review finding. It does not establish exploitation, production impact, historical data quality, penetration-test results, regulatory non-compliance, or live provider behavior.

## Decision

Add a late, additive migration that keeps authenticated tenant-scoped reads and denies direct `anon` and `authenticated` INSERT, UPDATE, and DELETE operations.

The migration:

- fails closed if `public.ai_assessments` is absent;
- keeps RLS enabled and forced;
- removes the known historical authenticated write policies;
- revokes direct client DML privileges;
- adds explicit authenticated deny policies for INSERT, UPDATE, and DELETE;
- retains service-role table privileges for reviewed server-side or migration workflows;
- leaves the existing tenant-scoped SELECT policy unchanged.

## Impact

A signed-in browser can continue reading assessments permitted by RLS but can no longer create, change, or delete assessment rows directly through PostgREST. Trusted backend code using the service role remains capable of performing supported mutations.

No application rows are rewritten or deleted by this migration.

## Risks and trade-offs

- Any undocumented client that directly mutates `ai_assessments` will fail after deployment. Repository search did not identify such a supported callsite, but production telemetry was not available during this review.
- This change establishes a database boundary; it does not create a new assessment mutation API.
- Service-role writers must still implement authorization, validation, audit, and workflow rules correctly.
- Static migration tests do not prove that Supabase has applied the migration or that live PostgREST behavior matches the repository contract.

## Validation

A focused Vitest contract verifies required-table fail-closed behavior, removal of known write policies, client DML revocations, explicit deny policies, preserved authenticated reads, forced RLS, and retained service-role privileges.

All repository-required checks must be green on the exact pull-request head before merge. No production migration execution, live RLS test, audit, certification, or penetration-test result is claimed.

## Rollback

Before deployment, revert the migration, test, and this decision record together.

After deployment, use a reviewed forward migration rather than rewriting migration history. Restoring authenticated DML or role-based write policies deliberately reopens the direct-write bypass and requires a documented security acceptance plus verification that every client mutation path enforces equivalent server-side controls.
