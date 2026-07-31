# Supabase Migration Drift Audit

## Purpose

This control inventories differences between repository migrations and the production Supabase migration history without changing database objects or migration records.

It exists because production currently contains a legacy baseline while the repository contains a much larger historical migration set. Treating every local-only migration as safe to execute would be unsafe.

## Workflow

Run **Supabase Migration Drift Audit** from GitHub Actions. It also runs weekly and whenever migration-related files change in a pull request.

The workflow requires these secrets in the protected `production` environment:

- `SUPABASE_PROJECT_ID`: the exact 20-character production project reference;
- `SUPABASE_DB_URL`: a complete percent-encoded URI copied from **Supabase → Connect** for the same project.

The workflow does not rely on `SUPABASE_DB_PASSWORD`, `supabase link`, or automatic pooler discovery. It validates the URL/project relationship, writes the URL to a temporary `0600` file, invokes `supabase migration list --db-url`, and removes the temporary file even when the audit fails.

Only non-secret connection diagnostics are retained in the artefact.

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

Critical drift blocks the workflow after publishing evidence in the GitHub job summary and uploading the bounded artefact.

## Safety boundaries

The auditor:

- does not execute migration SQL;
- does not use `supabase migration repair`;
- does not write to `supabase_migrations.schema_migrations`;
- does not reset, seed, pull, or diff the production database;
- does not use `supabase db push` or `--include-all`;
- does not claim that a local-only migration is already materialized;
- does not print or retain the database URL, username, or password.

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

1. Verify `SUPABASE_DB_URL` and `SUPABASE_PROJECT_ID` were copied from the same production project.
2. Run the audit and preserve its job summary and artefact.
3. Group invalid and duplicate filenames separately from valid local-only versions.
4. Resolve malformed repository history through reviewed renames or archival documentation; never rename a version already recorded remotely.
5. Compare object-level effects for one bounded migration group.
6. Create an explicit reconciliation PR with evidence and rollback boundaries.
7. Apply genuinely pending idempotent migrations separately.
8. Rerun this audit and the production RLS assurance checks.

## Authentication failures

If the URL is rejected before connecting, fix the secret rather than weakening validation. Common causes are:

- URL copied from a different Supabase project;
- pooler username missing `postgres.<project-ref>`;
- direct hostname not matching `db.<project-ref>.supabase.co`;
- password placeholder not replaced;
- special password characters not percent-encoded;
- embedded line break or URL fragment;
- unsupported port or non-Supabase hostname.

Never paste the URL into a workflow input or job log for debugging.

## Incident rule

If a migration deployment reports success while the production migration page does not show the expected version, treat the deployment as failed until object-level verification proves otherwise.
