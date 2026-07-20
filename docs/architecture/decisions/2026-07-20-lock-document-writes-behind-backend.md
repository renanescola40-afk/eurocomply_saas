# Lock controlled-document writes behind the backend

- Status: Proposed
- Date: 2026-07-20
- Priority: P1 security and compliance-evidence integrity

## Context

`public.documents` contains tenant-scoped metadata for controlled documents and uploaded evidence. Historical migrations granted authenticated users direct table mutation privileges and installed organization-scoped write policies.

Tenant RLS limits which rows a signed-in user can reach, but direct Supabase/PostgREST mutations bypass the supported document workflow. The reviewed server action authenticates the user, requires `documents:write`, validates bounded input, verifies tenant-scoped storage paths, applies upload throttling, validates file type and size, performs configured malware scanning, records security provenance, and writes durable audit events through a server-owned client.

Repository source review found supported backend mutations and tenant-scoped reads, but no supported browser mutation callsite that requires direct table DML. This is source-review evidence only. It is not evidence of production exploitation, historical misuse, live database state, an audit, certification, or a penetration test.

## Decision

Add a late, additive migration that:

1. Fails closed if `public.documents` is absent.
2. Enables and forces RLS.
3. Removes mutation policies applying to `public`, `anon`, or `authenticated` without relying on historical policy names.
4. Revokes direct authenticated and anonymous `INSERT`, `UPDATE`, and `DELETE` privileges.
5. Preserves authenticated reads governed by existing tenant RLS.
6. Preserves `service_role` DML for reviewed backend and migration workflows.
7. Adds explicit authenticated deny policies for insert, update, and delete.

## Consequences

Supported server-side document creation and upload remain available. Signed-in clients keep tenant-scoped reads, while direct PostgREST/table mutations fail closed.

This does not rewrite or delete existing rows. It does not change storage-object policies, upload scanning configuration, document retention, audit schemas, or existing backend authorization.

Any undocumented browser, mobile, or script client that directly mutates `documents` will stop working. That compatibility risk is intentional and must be reviewed before deployment. `service_role` remains privileged and must continue enforcing authorization, validation, tenant scope, upload security, throttling, and durable audit behavior.

## Verification

The focused migration contract test verifies required-table presence, policy removal scope, DML revocation, preserved reads, forced RLS, explicit deny policies, and retained backend privileges.

Repository-required CI must be green on the exact PR head before merge. Production migration execution and live Supabase/PostgREST validation are not claimed by this decision record.

## Rollback

Before deployment, revert the migration, test, and this decision record together.

After the migration has been applied, use a reviewed forward migration rather than rewriting migration history. Restoring authenticated DML or client mutation policies deliberately reopens the backend-control bypass and requires documented security acceptance plus evidence that every direct client enforces equivalent authorization, validation, tenant scoping, upload security, throttling, and audit controls.

