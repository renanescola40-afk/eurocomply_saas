# Supabase Forward Reconciliation Lane

## Purpose

This lane exists to rehearse and dry-run a small set of new, forward-only reconciliation migrations without reclassifying, repairing, or accidentally deploying the repository's unresolved historical migration backlog.

It is intentionally separate from the global migration reconciliation gate. The global gate remains authoritative for historical lineage repair and historical migration classification.

## Current selected set

The authoritative selection is `config/supabase-forward-reconciliation.json` and currently contains only:

- `20260813194500_reconcile_step_up_challenges_runtime.sql`
- `20260813200000_reconcile_subscription_schema_defaults.sql`
- `20260813201500_reconcile_controlled_document_storage.sql`
- `20260813201600_force_tasks_rls.sql`

The control plane compiles the exact Git SHA, migration filenames, migration versions, byte sizes and SHA-256 digests into one immutable selection digest.

Changing any selected SQL byte, filename or release SHA changes the selection digest and invalidates previous rehearsal evidence.

## Stage 1 — isolated production-restore rehearsal

Run `Supabase Forward Reconciliation Rehearsal` manually from the exact current `main` SHA.

The protected workflow:

1. verifies the supplied SHA is the exact current `main` and the workflow run itself is bound to that SHA;
2. compiles the selected migration manifest;
3. reads production only through the protected Supabase pooler credential;
4. restores the production database into a disposable runner-local Supabase/PostgreSQL target;
5. verifies each selected migration's SHA-256 before applying it to the isolated restore;
6. applies only those selected files to the isolated target;
7. runs `scripts/supabase/verify-forward-reconciliation-postconditions.sql` against the isolated target;
8. emits a redacted attestation that explicitly records `productionWritePerformed=false`;
9. destroys the disposable database.

A rehearsal PASS does not authorize production deployment.

## Stage 2 — filtered remote dry-run

Run `Supabase Forward Reconciliation Dry Run` with:

- the same exact current `main` SHA; and
- the successful Stage 1 rehearsal run ID.

The workflow validates the source workflow/repository/SHA/conclusion, recompiles the manifest and validates the rehearsal attestation.

It then creates a temporary Supabase workdir, fetches the current remote migration history into that workdir, copies only the exact selected migration files into the temporary migration directory, and proves:

- every remote migration version is represented locally;
- no selected migration is already recorded remotely;
- the local migration set is exactly `remote history + selected set`;
- the pending migration set is exactly the selected set;
- there are no unauthorized pending migration versions;
- neither migration-history repair nor `--include-all` is required.

Only after those assertions pass does it execute a Supabase `db push --dry-run` against production.

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
- `supabase migration repair`;
- unrestricted `supabase db push --include-all`;
- manual insertion into `supabase_migrations.schema_migrations`;
- filename-only or catalog-only migration equivalence;
- automatic classification of historical migrations.

If production execution tooling is added later, it must use the filtered remote-history workdir and normal Supabase migration mechanism, prove the remote ledger transition is exactly previous-history plus the selected set, run the same read-only postconditions afterward, and retain redacted exact-SHA evidence.

## Historical backlog remains separate

This lane does not close or alter the unresolved historical migration reconciliation program. Historical duplicate versions, invalid legacy filenames/timestamps, local-only historical files and owner-review decisions remain governed by the global migration reconciliation workflows.

The goal here is narrower: prove that a specifically reviewed set of new forward-only runtime reconciliations is safe and deployable without exposing the production database to the unresolved historical backlog.
