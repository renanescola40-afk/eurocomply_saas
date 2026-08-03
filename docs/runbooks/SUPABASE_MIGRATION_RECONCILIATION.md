# Supabase production migration reconciliation

## Purpose

Reconcile repository migration files, live production schema state and Supabase migration history without blind execution or false history repair.

## Non-negotiable boundary

Until the reconciliation result is accepted and a separate staging rehearsal succeeds, unrestricted production `supabase db push`, `--include-all` and broad migration-history repair remain prohibited.

## Required inputs

1. Exact current `main` SHA.
2. Fresh production schema-only evidence stored in the approved confidential location.
3. Fresh `supabase migration list` output.
4. Complete migration drift inventory generated for the same SHA.
5. Migration object-evidence artifact generated from the exact inventory and schema catalog.
6. Reviewed decisions based on `docs/security/evidence/templates/supabase-migration-reconciliation-decisions.json`.
7. Distinct database reviewer and approver.

Never place credentials, connection strings, customer rows, auth records or production data in repository artifacts.

## Canonical connection prerequisite

The drift audit must use `SUPABASE_DB_POOLER_URL` and `SUPABASE_PROJECT_ID` from the protected `production` environment. The full Session Pooler URI is the single endpoint and password source. Do not combine a stale URL with a separately rotated password.

A failed authentication run is not a migration inventory. Its artifact may contain safe diagnostics, but the reconciliation workflow rejects it because the remote history and JSON inventory files are absent.

## Source audit acceptance

A completed drift audit can conclude either:

- `success`, when no critical drift is detected; or
- `failure`, when the fail-closed gate intentionally rejects detected drift after publishing a complete inventory.

The reconciliation workflow accepts either conclusion only when it verifies:

- source workflow path `.github/workflows/supabase-migration-drift-audit.yml`;
- exact `head_sha` equal to current `main`;
- non-expired artifact `supabase-migration-drift-<exact-sha>`;
- non-empty `migration-state-remote.txt`;
- valid `migration-drift.json`;
- valid `migration-reconciliation-inventory.json`;
- expected schemas and explicit non-mutation safety markers.

This allows a legitimate fail-closed audit to continue into human review without treating every red run as evidence.

## Object-evidence phase

Run **Supabase Migration Object Evidence** only after both source artifacts exist for the same exact current `main` SHA:

- `supabase-production-migration-dry-run-<exact-sha>` containing the immutable reconciliation inventory; and
- `supabase-production-schema-evidence-<exact-sha>` containing `catalog.txt` plus its SHA-256 manifest.

The workflow validates both source run IDs, their exact `head_sha`, event, conclusion, artifact name, expiry state and catalog digest. It then verifies every migration file digest before parsing SQL.

The generated object-evidence artifact:

- maps tables, columns, constraints, indexes, functions, triggers, policies, grants and RLS target states to the live catalog;
- records matched, unmatched and unresolved statements with deterministic digests;
- emits `ALREADY_PRESENT_IN_SCHEMA`, `PENDING_DEPLOYMENT` or `REQUIRES_SPLIT_REVIEW` only as review candidates;
- keeps duplicate versions, invalid timestamps, data mutations, dynamic SQL, unnamed constraints and unsupported object kinds fail-closed;
- always reports `HUMAN_REVIEW_REQUIRED`, zero accepted decisions and no production authorization.

A candidate is not a classification. Reviewers must inspect the exact SQL, object proof and unresolved statements before copying a decision into the approved decisions artifact.

## Classification rules

- `ALREADY_PRESENT_IN_SCHEMA`: requires object-level schema proof and immutable proof digest. It may become a history-repair candidate but is never automatically repaired.
- `PENDING_DEPLOYMENT`: requires staging evidence, deterministic order, rollback reference and independent approval.
- `SUPERSEDED`: requires the digest of the migration or reconciliation that replaced it.
- `ARCHIVE_LEGACY`: only for invalid or duplicate historical files proven not to require execution.
- `REQUIRES_SPLIT_REVIEW`: fail-closed state for SQL whose effects cannot yet be proven or must be separated.

## Workflow

1. Run **Supabase Migration Drift Audit** and retain the exact-SHA artifact.
2. Run **Supabase Production Schema Evidence** for the same exact SHA.
3. Run **Supabase Production Migration Dry Run** and require review packages plus artifact retention even when deployability exits with code `3`.
4. Run **Supabase Migration Object Evidence** with the exact SHA, dry-run ID and schema-evidence run ID.
5. Review every object-evidence batch; do not infer final disposition from filenames, creation dates or candidate labels.
6. Copy only accepted classifications into a confidential decisions working file with reviewer attribution and required proof fields.
7. Commit only policy-approved, non-secret decisions evidence.
8. Run **Supabase Migration Reconciliation** with the exact SHA and source inventory run ID.
9. Require `READY_FOR_STAGING_REHEARSAL` before planning a staging clone execution.
10. Execute genuinely pending SQL against a production-like clone in declared order.
11. Validate schema diff, RLS, tenant isolation, critical queries, rollback and application smoke.
12. Produce a separate bounded production execution plan.
13. Obtain independent approval before any production write or history repair.
14. Rerun drift, RLS and runtime evidence after execution.

## Forbidden shortcuts

- Marking a migration applied because a similarly named object exists.
- Treating a candidate classification as an accepted decision.
- Treating a repository test as production schema proof.
- Repairing history for SQL absent from the live schema.
- Renaming duplicate migrations without preserving digest mapping.
- Applying all historical migrations in one unrestricted push.
- Treating a red audit without complete inventory files as evidence.
- Using the reconciliation compiler as authorization for production mutation.

## Expected artifacts

- source `migration-state-remote.txt`;
- source `migration-drift.json`;
- source `migration-reconciliation-inventory.json`;
- `migration-object-evidence.json`;
- immutable migration object-evidence batches;
- source inventory and catalog digests;
- `migration-reconciliation-result.json`;
- `migration-reconciliation-result.md`;
- reviewed decisions digest;
- staging rehearsal artifact;
- bounded production plan and approval artifact;
- post-execution drift audit.

## Issue linkage

This runbook advances issue #1415. It does not close the issue until staging, bounded production execution or justified repair, and post-execution drift evidence are independently accepted.
