# Supabase Migration Drift Audit

## Purpose

This control inventories differences between repository migrations and the linked production Supabase migration history without changing database objects or migration records.

It exists because production currently contains a legacy baseline while the repository contains a much larger historical migration set. Treating every local-only migration as safe to execute would be unsafe.

## Workflow

Run **Supabase Migration Drift Audit** from GitHub Actions. It also runs weekly and whenever migration-related files change in a pull request.

The workflow requires the protected `production` environment secrets:

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_ID`
- `SUPABASE_DB_PASSWORD`

## Statuses

### ALIGNED

Every valid unique local migration version exists remotely and there are no remote-only, malformed, or duplicate versions.

### PENDING_LOCAL_MIGRATIONS

Local migrations are valid and unique but one or more have not been recorded remotely. This state requires a normal dry-run and migration review.

### CRITICAL_DRIFT

At least one of the following is present:

- malformed migration filename;
- invalid timestamp;
- duplicate local version;
- remote migration version absent from the repository.

Critical drift blocks the workflow after publishing evidence in the GitHub job summary.

## Safety boundaries

The auditor:

- does not execute migration SQL;
- does not use `supabase migration repair`;
- does not write to `supabase_migrations.schema_migrations`;
- does not reset, seed, pull, or diff the production database;
- does not use `supabase db push --include-all`;
- does not claim that a local-only migration is already materialized.

## Required reconciliation evidence

Before repairing one historical migration version, retain evidence for the objects it was expected to create or modify:

- table and column definitions;
- indexes and constraints;
- functions and security-definer ownership;
- RLS and FORCE RLS state;
- grants and policies;
- triggers;
- storage policies when applicable.

A migration may be marked applied only after its expected effects are proven to exist and the review is recorded.

## Recommended sequence

1. Run the audit and preserve its job summary.
2. Group invalid and duplicate filenames separately from valid local-only versions.
3. Resolve malformed repository history through reviewed renames or archival documentation; never rename a version already recorded remotely.
4. Compare object-level effects for one bounded migration group.
5. Create an explicit reconciliation PR with evidence and rollback boundaries.
6. Apply genuinely pending idempotent migrations separately.
7. Rerun this audit and the production RLS assurance checks.

## Incident rule

If a migration deployment reports success while the production migration page does not show the expected version, treat the deployment as failed until object-level verification proves otherwise.
