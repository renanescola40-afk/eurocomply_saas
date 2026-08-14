# Supabase Forward Reconciliation Lane

## Purpose

This lane exists to rehearse and dry-run a small set of reviewed, forward-only reconciliation migrations without reclassifying, repairing, or accidentally deploying the repository's unresolved historical migration backlog.

It is intentionally separate from the global migration reconciliation gate. The global gate remains authoritative for historical lineage repair and historical migration classification.

## Current selected set

The authoritative selection is `config/supabase-forward-reconciliation.json` and currently contains only:

- `20260813175000_optimize_organization_add_ons_rls_initplan.sql`
- `20260813194500_reconcile_step_up_challenges_runtime.sql`
- `20260813200000_reconcile_subscription_schema_defaults.sql`
- `20260813201500_reconcile_controlled_document_storage.sql`
- `20260813201600_force_tasks_rls.sql`
- `20260813234000_reconcile_enterprise_break_glass_governance.sql`
- `20260814101500_reconcile_enterprise_core_active_runtime.sql`

All selected execution identities are later than the current remote migration head observed before this lane was updated. The lane therefore remains compatible with a filtered `db push --dry-run` and never requires `--include-all` or migration-history repair.

### Active core runtime reconciliation

The historical `20260809135000_enterprise_core_runtime_schema_reconciliation.sql` remains byte-for-byte immutable and unapplied. It is **not** selected by this bounded lane because its version precedes the current production migration ledger.

`20260814101500_reconcile_enterprise_core_active_runtime.sql` is the new forward execution identity for that already-reviewed reconciliation intent. It exists so the same idempotent, fail-closed runtime state can be rehearsed and later reviewed without pretending the older unapplied version is a normal forward migration.

Read-only production inspection on 2026-08-14 showed concrete application/schema drift:

- `public.intelligence_items` is absent while `/api/intelligence/refresh` upserts it; retained Vercel runtime evidence shows PostgREST `PGRST205` on that route;
- `public.email_notification_events` is absent while compliance-alert jobs use it for idempotent delivery tracking;
- `public.vendors.next_review_at` is absent while the vendor-review alert job selects, filters and orders by it.

The forward identity also restores canonical RLS/runtime boundaries, removes temporary `live_rls_*` validation artifacts and creates the backend-only atomic organization bootstrap RPC. Inclusion in this lane is **not** production approval: it only makes the active runtime drift part of the same exact-SHA isolated rehearsal and filtered dry-run proof.

### Break-Glass reconciliation

`20260813234000_reconcile_enterprise_break_glass_governance.sql` is the forward-only reconciliation for the unapplied historical `20260727160000_enterprise_break_glass_governance.sql`. The historical file remains immutable; the newer execution identity exists so the intended backend-only tenant-safe runtime can be reviewed and promoted without rewriting migration history.

The control plane compiles the exact Git SHA, migration filenames, migration versions, byte sizes and SHA-256 digests into one immutable selection digest.

Changing any selected SQL byte, filename or release SHA changes the selection digest and invalidates previous rehearsal evidence. Both bounded workflow path filters explicitly include every selected migration so a selected SQL-byte change cannot skip PR validation.

The rehearsal and filtered dry-run stages use the same pinned Supabase CLI baseline. A CLI-version change therefore invalidates workflow checks and must be reviewed like any other control-plane change.

## Administrative prerequisites

The runtime lane is designed for a secrets-bearing GitHub deployment environment, but current live GitHub metadata must be treated as authoritative rather than assumed from the environment name.

Before dispatching either runtime stage as production evidence:

1. harden `supabase-production-migration-dry-run` so administrator bypass is disabled;
2. configure at least one required deployment reviewer;
3. restrict deployment to protected branches only;
4. rotate/correct the `SUPABASE_DB_POOLER_URL` credential after the evidence incident tracked by #1620;
5. verify the replacement value contains no embedded CR/LF/control characters and update every authorized dependent location without publishing the value;
6. keep the broader production-control-plane work tracked by #1621 open until live evidence passes.

Do not call the environment protected merely because its name contains `production` or `dry-run`.

## Stage 1 — isolated production-restore rehearsal

Run `Supabase Forward Reconciliation Rehearsal` manually from the exact current `main` SHA only after the administrative prerequisites above are satisfied.

The workflow is designed to:

1. verify the supplied SHA is the exact current `main` and the workflow run itself is bound to that SHA;
2. compile the selected migration manifest;
3. read production only through the Supabase pooler credential;
4. restore the production database into a disposable runner-local Supabase/PostgreSQL target;
5. verify each selected migration's SHA-256 before applying it to the isolated restore;
6. apply only those selected files to the isolated target;
7. run `scripts/supabase/verify-forward-reconciliation-postconditions.sql` against the isolated target;
8. require active-core postconditions proving Intelligence, notification-dedupe, vendor governance, atomic onboarding and canonical temporary-RLS cleanup;
9. require Break-Glass postconditions proving tenant composite keys/FKs, RLS + FORCE RLS on all four Break-Glass tables, zero browser-role table grants, and service-role-only execution of the hardened expiry function with fixed `search_path`;
10. emit a redacted attestation that records no production-write authorization;
11. destroy the disposable database.

The canonical backup/restore producer normalizes accidental CR/LF before PostgreSQL-tool use and records only bounded failure codes; raw subprocess errors, command arguments, database URLs and credentials must never be retained in evidence.

A rehearsal PASS does not authorize production deployment.

## Stage 2 — filtered remote dry-run

Run `Supabase Forward Reconciliation Dry Run` with:

- the same exact current `main` SHA; and
- the successful Stage 1 rehearsal run ID.

The workflow validates the source workflow/repository/SHA/conclusion, recompiles the manifest after exact-current-main checkout and validates the rehearsal attestation.

It then creates a temporary Supabase workdir, fetches the current remote migration history into that workdir, copies only the exact selected migration files into the temporary migration directory, and proves:

- every remote migration version is represented locally;
- no selected migration is already recorded remotely;
- the local migration set is exactly `remote history + selected set`;
- the pending migration set is exactly the selected set;
- there are no unauthorized pending migration versions;
- neither migration-history repair nor unrestricted migration inclusion is required.

Only after those assertions pass does it execute a Supabase migration **dry run** against production.

The dry-run workflow does not perform a production write.

## Production boundary

This lane deliberately does **not** contain an automatic production executor.

Production application still requires an independently protected, human-approved execution step bound to:

- exact current `main`;
- the immutable selected migration manifest;
- a successful exact-SHA isolated rehearsal;
- a successful exact-SHA filtered Supabase dry-run;
- the same selected migration SHA-256 digests immediately before execution;
- an explicit human approval/confirmation in a protected production environment.

Do not replace this boundary with:

- direct production SQL from an ad-hoc terminal;
- migration-history repair;
- unrestricted migration inclusion;
- manual insertion into `supabase_migrations.schema_migrations`;
- filename-only or catalog-only migration equivalence;
- automatic classification of historical migrations.

If production execution tooling is added later, it must use the filtered remote-history workdir and normal Supabase migration mechanism, prove the remote ledger transition is exactly previous-history plus the selected set, run the same read-only postconditions afterward, and retain redacted exact-SHA evidence.

## Historical backlog remains separate

This lane does not close or alter the unresolved historical migration reconciliation program. Current fingerprint-backed provenance still requires the remaining human owner decisions and independent approval before the global historical gate can open.

The goal here is narrower: prove that a specifically reviewed set of active forward-only runtime reconciliations is safe and deployable without exposing the production database to the unresolved historical backlog.
