# Supabase production migration reconciliation

## Purpose

Reconcile repository migration files, live production schema state, and Supabase migration history without blind execution or false history repair.

## Non-negotiable boundary

Until the reconciliation result is accepted and a separate staging rehearsal succeeds, unrestricted production `supabase db push`, `--include-all`, and broad migration-history repair remain prohibited.

## Required inputs

1. Exact current `main` SHA.
2. Fresh production schema-only dump stored in the approved confidential evidence location.
3. Fresh `supabase migration list` output.
4. Migration drift inventory generated for the same SHA.
5. Reviewed decisions file based on `docs/security/evidence/templates/supabase-migration-reconciliation-decisions.json`.
6. Independent database reviewer and approver.

Never place credentials, connection strings, customer rows, auth records, or production data in repository artifacts.

## Classification rules

- `ALREADY_PRESENT_IN_SCHEMA`: requires object-level schema proof and immutable proof digest. This may become a migration-history repair candidate, but is not automatically repaired.
- `PENDING_DEPLOYMENT`: requires staging execution evidence, deterministic order, rollback reference, and independent approval.
- `SUPERSEDED`: requires the digest of the migration or reconciliation that replaced it.
- `ARCHIVE_LEGACY`: only for invalid or duplicate historical files proven not to require execution.
- `REQUIRES_SPLIT_REVIEW`: fail-closed state for files whose SQL must be separated or whose effects cannot yet be proven.

## Workflow

1. Run the existing migration drift audit and retain `supabase-migration-drift` for the exact SHA.
2. Copy the generated inventory decisions into a confidential working location.
3. Review every item; do not leave an item absent, duplicated, or inferred by filename.
4. Commit only the accepted, non-secret decisions artifact when approved by policy.
5. Run **Supabase Migration Reconciliation** with the exact SHA and source inventory run ID.
6. Require `READY_FOR_STAGING_REHEARSAL` before planning a staging clone execution.
7. Execute genuinely pending SQL against a production-like clone in declared order.
8. Validate schema diff, RLS, tenant isolation, critical queries, rollback, and application smoke.
9. Produce a separate bounded production execution plan.
10. Obtain independent production approval before any write.
11. After execution or approved history repair, rerun the drift audit and require no unexplained local-only or remote-only versions.

## Forbidden shortcuts

- Marking a migration as applied because a similarly named object exists.
- Treating a repository test as production schema proof.
- Repairing history for SQL that is absent from the live schema.
- Renaming duplicate migrations without preserving digest mapping.
- Applying all historical migrations to production in one unrestricted push.
- Using the reconciliation compiler as authorization for production mutation.

## Expected artifacts

- `migration-reconciliation-result.json`
- `migration-reconciliation-result.md`
- source inventory digest
- reviewed decisions digest
- staging rehearsal artifact
- production plan and approval artifact
- post-execution drift audit

## Issue linkage

This runbook advances issue #1415. It does not close #1415 until staging, production execution or justified repair, and post-execution drift evidence are independently accepted.
