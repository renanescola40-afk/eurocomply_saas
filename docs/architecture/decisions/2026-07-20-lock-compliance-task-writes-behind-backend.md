# Lock compliance task writes behind the reviewed backend

- Status: Proposed
- Date: 2026-07-20
- Priority: P1 security and governance integrity

## Context

`public.compliance_tasks` is a tenant-scoped governance table. Its original migration permits authenticated organization managers to insert and update rows directly through Supabase/PostgREST.

The supported server actions already authenticate the current user, enforce `tasks:write` or `tasks:delete`, apply a distributed fail-closed rate limit, validate mutation input, constrain writes to the active organization, use the trusted admin client, and require durable audit persistence with compensating rollback attempts.

Direct authenticated table mutation bypasses that reviewed boundary. A valid browser session could avoid workflow-specific permissions, server-owned validation, throttling, durable audit handling, and future lifecycle controls even when RLS still limits tenant visibility.

This is repository source-review evidence only. It does not establish exploitation, production misuse, customer impact, live provider behavior, external audit results, certification, or penetration-test findings.

## Decision

Add a late additive migration that:

1. fails closed if `public.compliance_tasks` is absent;
2. keeps RLS enabled and forces it;
3. removes the original authenticated manager insert and update policies;
4. revokes `INSERT`, `UPDATE`, and `DELETE` from `anon` and `authenticated`;
5. preserves authenticated `SELECT` access under the existing tenant-scoped read policy;
6. preserves `service_role` DML for reviewed backend and migration workflows;
7. installs explicit authenticated deny policies for all three mutation operations.

## Impact

Supported server-action task creation, update, and deletion remain available because they use the trusted backend role. Authenticated clients retain tenant-scoped reads, but direct PostgREST/table mutation fails closed.

No existing task row is rewritten or deleted. No test, lint, typecheck, CI, release, RLS, or audit control is weakened.

## Risks and trade-offs

- Any undocumented browser, mobile, or script client that directly mutates `compliance_tasks` will stop working.
- `service_role` remains privileged; every supported backend writer must continue enforcing authorization, validation, tenant scope, throttling, and durable audit behavior.
- The existing server action uses broad `select('*')` responses and compensating writes rather than a single atomic database operation; those are separate reviewable hardening opportunities and are not represented as solved here.
- The migration has not been applied to production or validated against live Supabase/PostgREST in this decision.

## Verification

A focused migration contract test checks required-table failure, removal of the known client write policies, DML revocations, preserved authenticated reads, forced RLS, explicit deny policies, and retained service-role mutation privileges.

Repository-mandated checks on the exact pull-request head are authoritative. This decision does not claim green CI until GitHub reports it.

## Rollback

Before deployment, revert the migration, contract test, and this decision record together.

After deployment, use a reviewed forward migration rather than editing applied migration history. Restoring authenticated DML or manager write policies deliberately reopens the backend-control bypass and requires documented security acceptance plus confirmation that every direct client enforces equivalent controls.

