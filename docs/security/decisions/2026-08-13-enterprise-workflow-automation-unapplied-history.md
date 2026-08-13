# Enterprise workflow automation — unapplied migration boundary

Date: 2026-08-13

## Decision

`supabase/migrations/20260721093000_enterprise_workflow_automation.sql` is treated as a reviewed, uniquely-versioned **unapplied historical migration** for disposable schema-effect replay only.

This decision does **not** mark the migration as applied, canonical, superseded in the production ledger, or approved for production history repair.

## Evidence

Read-only inspection of the production Supabase migration ledger on 2026-08-13 showed that version `20260721093000` is absent while later helper hardening version `20260804230433` is present.

Read-only inspection of the production catalog also showed that the seven `enterprise_workflow_*` tables created by the historical migration are absent.

The historical migration cannot replay cleanly against the reviewed chain because its RLS policies call `public.is_organization_member(uuid)`, a helper that is not part of the canonical helper lineage. The current production helper boundary is `app_private.is_org_member(uuid)` / `app_private.has_org_role(uuid,text[])`.

Current application code at the reviewed PR head implements the Enterprise workflow state machine in `src/lib/enterprise/workflow-engine.ts` as a pure in-memory transition engine. It does not import Supabase, query Postgres, or reference the historical `enterprise_workflow_*` tables. No current admin Enterprise API directory exists at the reviewed head.

## Disposable replay treatment

The exact historical SQL file is backed up byte-for-byte, removed only from the disposable replay tree, and restored after the replay attempt. Its exclusion is reported separately from duplicate migrations, schema-effect replacements, and unresolved invalid filenames.

The disposable replay must continue to publish:

`RECOVERY_EPHEMERAL_MIGRATION_HISTORY_CANONICAL=false`

A green disposable schema smoke therefore proves recoverability of the currently materialized product schema effects; it does not prove production migration-history reconciliation.

## Production boundary

No production database mutation is authorized by this decision. If the product later requires durable database-backed Enterprise workflow persistence, that capability must be introduced through a new canonical migration using the current private RLS helper boundary, reviewed independently and applied through the protected production migration process.

## Human governance boundary

The P0 migration-lineage reconciliation remains open and human-governed. This decision must not be used to bulk-mark, resequence, rewrite, or fabricate acceptance of historical migration versions.