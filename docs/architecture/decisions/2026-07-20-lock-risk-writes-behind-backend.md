# Lock risk-register writes behind the backend

- Status: Proposed
- Date: 2026-07-20
- Priority: P1 security and governance integrity

## Context

`public.risks` grants a broad authenticated manager policy for all operations. RLS limits rows by organization role, but a signed-in Supabase/PostgREST client can still mutate material risk-register records without using the reviewed server actions.

The supported risk server actions authenticate the current user, require workflow-specific `risks:write` or `risks:delete` permissions, validate bounded input, apply distributed fail-closed rate limits, scope trusted service-role writes to the organization, and require durable audit persistence with compensating rollback attempts.

Direct table DML bypasses those workflow controls. Repository search found server-owned risk mutations and tenant-scoped read queries, but no supported browser mutation callsite that requires direct table writes.

## Decision

Authenticated and anonymous clients retain no direct `INSERT`, `UPDATE`, or `DELETE` authority on `public.risks`. Authenticated tenant-scoped reads remain available under the existing read policy. Supported mutations must use reviewed backend code or controlled migrations operating with `service_role`.

The migration removes the original broad manager policy, revokes client DML grants, forces RLS, and adds explicit deny policies so an accidental future grant does not silently reopen the client mutation path.

## Impact

- Existing risk rows are not rewritten or deleted.
- Supported server-action creation and deletion remain available.
- Direct browser, mobile, or script mutations through Supabase/PostgREST fail closed.
- Service-role writers remain privileged and must continue enforcing authorization, validation, tenant scope, throttling, and durable audit behavior.

## Risks and limitations

- Any undocumented direct client mutating `risks` will stop working.
- The repository currently lacks a reviewed risk-update action; this decision intentionally does not preserve an undocumented direct-update path.
- The existing server actions use broad returning selections and compensating writes rather than a database transaction; those are separate hardening opportunities.
- This decision provides repository source and contract-test evidence only. It does not prove production migration execution, live PostgREST behavior, historical misuse, external audit, certification, or penetration testing.

## Validation

A focused migration contract verifies required-table failure, removal of the broad write policy, client DML revocation, preserved authenticated reads, explicit deny policies, forced RLS, and retained service-role DML.

All repository-required checks must be green on the exact pull-request head before merge.

## Rollback

Before deployment, revert the migration, test, and this decision record together.

After deployment, use a reviewed forward migration. Restoring authenticated DML or a broad manager mutation policy deliberately reopens the backend-control bypass and requires documented security acceptance plus evidence that every direct client enforces equivalent controls.
