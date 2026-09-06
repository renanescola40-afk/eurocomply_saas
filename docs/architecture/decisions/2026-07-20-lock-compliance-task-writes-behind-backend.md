# Lock compliance task writes behind the reviewed backend

- Status: Proposed
- Date: 2026-07-20
- Last updated: 2026-09-06
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

## 2026-09-06 extension: legacy tasks and final client RLS boundary

### Additional context

A read-only Production review identified `public.tasks` as a preserved legacy task table with four historical rows. The current application runtime uses `public.compliance_tasks`; repository search on the reviewed release line found no application consumer using `.from('tasks')`. Despite that, `authenticated` still retained `INSERT`, `UPDATE`, and `DELETE` table privileges on `public.tasks` under tenant-scoped and commercial RLS policies.

That direct Data API mutation surface is no longer part of the reviewed task workflow. Keeping it available would create a second, undocumented mutation authority for historical task data. The four legacy rows must be preserved because absence of a current runtime writer is not evidence that historical records are disposable.

The same Production review found five client-facing public tables with scoped RLS policies but without FORCE RLS: `email_notification_events`, `intelligence_calendar_suggestions`, `intelligence_items`, `profiles`, and `vendor_review_history`. `profiles` also retained redundant authenticated `INSERT` and `DELETE` grants even though it has only self-scoped `SELECT` and `UPDATE` policies. A global read-only preflight found these five tables to be the complete set of client-granted public tables missing the FORCE RLS invariant, and found no application `SECURITY DEFINER` function executable by `anon`.

### Extended decision

The final forward reconciliation package will therefore:

1. preserve `public.tasks` and all existing rows;
2. preserve authenticated `SELECT` on `public.tasks` under its existing tenant and commercial RLS contract;
3. revoke direct `INSERT`, `UPDATE`, and `DELETE` on `public.tasks` from `anon` and `authenticated`;
4. preserve `service_role` CRUD on `public.tasks` for controlled compatibility and administrative paths;
5. keep RLS and FORCE RLS enabled on `public.tasks`;
6. FORCE RLS on the five remaining client-facing tables listed above without widening their authenticated policies;
7. reduce `profiles` to authenticated self `SELECT`/`UPDATE` table privileges, removing redundant client `INSERT`/`DELETE` grants;
8. fail the migration if any client-granted public table escapes RLS/FORCE RLS, lacks an RLS policy, or if `anon` can execute an application `SECURITY DEFINER` function.

This is a fail-closed authority decision: reviewed browser access remains readable where required, while mutation authority stays on reviewed backend paths. It does not create a new tenant, billing, identity, or provider authority.

### Compatibility and residual risk

- A previously undocumented client that directly mutates `public.tasks` will stop working. Repository review found no such current application consumer; this is still a compatibility risk and is intentionally accepted in favor of a single reviewed mutation authority.
- Existing `public.tasks` rows are not deleted, rewritten, migrated, or reclassified.
- FORCE RLS does not replace application authorization. Existing row policies remain the client-facing authorization contract, and privileged backend paths must continue to enforce their own authorization and validation.
- `service_role` remains privileged and must remain server-only.
- This decision does not claim the September 6 forward package is live. Production remains authoritative only after the protected reconciliation stages, exact-ledger verification, and exact-SHA runtime acceptance succeed.

### Extended verification

Before promotion, the exact PR/release head must prove:

- no current application `.from('tasks')` consumer;
- `public.tasks` retains authenticated `SELECT`, loses client DML, and retains service-role CRUD;
- the five named client-facing tables have RLS and FORCE RLS after reconciliation;
- `profiles` retains authenticated `SELECT`/`UPDATE` but not `INSERT`/`DELETE`;
- every client-granted public table has RLS, FORCE RLS, and at least one policy;
- `anon` cannot execute any application `SECURITY DEFINER` function in `public` or `app_private`;
- repository CI is green on the exact head;
- Production behavior is not claimed until the protected forward-reconciliation and deployment gates complete.

### Extended rollback

Before Production promotion, revert this decision update together with the matching migration/test changes if the authority decision is rejected.

After Production promotion, do not edit applied migration history. Any need to restore authenticated mutation on `public.tasks`, relax FORCE RLS, or restore `profiles` client `INSERT`/`DELETE` must use a new reviewed forward migration and explicitly document the compatibility need, equivalent authorization controls, residual risk, and rollback path.
