# Supabase Migration Drift Audit

## Purpose

This control inventories differences between repository migrations and the production Supabase migration history without changing database objects or migration records.

It exists because production contains a legacy baseline while the repository contains a larger historical migration set. Treating every local-only migration as safe to execute would be unsafe.

## Canonical production connection

Run **Supabase Migration Drift Audit** from GitHub Actions. It also runs weekly and whenever migration-related files change in a pull request.

The protected `production` environment requires exactly these database connection secrets:

- `SUPABASE_PROJECT_ID`: the exact 20-character production project reference;
- `SUPABASE_DB_POOLER_URL`: the complete Session Pooler URI copied from **Supabase → Connect** for the same project, including the current database password.

`SUPABASE_DB_POOLER_URL` is the canonical connection and credential source shared by the runtime proof, drift audit, migration dry-run and production migration deployment. Do not maintain a second `SUPABASE_DB_URL` or standalone `SUPABASE_DB_PASSWORD` for these workflows.

The workflow maps the canonical secret to the resolver's internal `SUPABASE_DB_URL` input, normalizes accidental line breaks, validates the URL/project relationship, writes the normalized URL to a temporary `0600` file, invokes `supabase migration list --db-url`, and removes the temporary file even when the audit fails.

Only non-secret connection diagnostics are retained. They never include the URI, username, password or full project reference.

## Statuses

### ALIGNED

Every valid unique local migration version exists remotely and there are no unknown remote versions.

### PENDING_LOCAL_MIGRATIONS

One or more valid local versions are not recorded remotely. This state requires reviewed reconciliation and a separate dry-run.

### CRITICAL_DRIFT

At least one remote migration version is absent from normal migrations and controlled reconciliation files. The audit generates evidence and then fails closed.

Malformed filenames, invalid timestamps and duplicate local versions remain explicit deployability blockers and require human classification even when no remote-only version exists.

## Safety boundaries

The auditor:

- does not execute migration SQL;
- does not use `supabase migration repair`;
- does not write to `supabase_migrations.schema_migrations`;
- does not reset, seed, pull or diff the production database;
- does not use `supabase db push` or `--include-all`;
- does not claim that a local-only migration is already materialized;
- does not print or retain database credentials;
- rejects foreign hosts, wrong projects, unsupported ports, missing passwords, unsafe fragments and remaining internal whitespace.

## Reconciliation source contract

A drift audit may conclude `failure` after successfully producing a complete fail-closed inventory. The reconciliation workflow may consume either a successful audit or this expected fail-closed result only when all of the following are true:

1. the source run is completed;
2. its workflow path is `.github/workflows/supabase-migration-drift-audit.yml`;
3. its `head_sha` exactly matches current `main`;
4. the non-expired artifact is named `supabase-migration-drift-<exact-sha>`;
5. `migration-state-remote.txt`, `migration-drift.json` and `migration-reconciliation-inventory.json` are all present and non-empty;
6. the JSON schemas and safety markers are valid.

An authentication-only artifact containing diagnostics but no inventory is rejected. A red status alone is therefore neither accepted nor discarded; evidence completeness decides.

## Required reconciliation evidence

Before classifying one historical migration, retain evidence for the objects it was expected to create or modify:

- table and column definitions;
- indexes and constraints;
- functions, owners and security-definer properties;
- RLS and FORCE RLS state;
- grants, policies and triggers;
- storage policies when applicable.

A migration may be marked applied only after its expected effects are proven to exist and the review is recorded.

## Recommended sequence

1. Confirm `SUPABASE_DB_POOLER_URL` and `SUPABASE_PROJECT_ID` belong to the same production project.
2. Run the audit and preserve its summary and artifact even when it fails closed.
3. Group invalid and duplicate filenames separately from valid local-only versions.
4. Review every generated inventory item against immutable schema evidence.
5. Create an explicit reconciliation PR with classification, rollback and independent approval.
6. Rehearse genuinely pending migrations in staging.
7. Execute only the bounded approved production plan.
8. Rerun this audit and the production RLS/runtime assurance checks.

## Authentication failures

Successful URL normalization proves endpoint shape and project binding, not credential validity. `SQLSTATE 28P01` means the database rejected the password embedded in `SUPABASE_DB_POOLER_URL`.

After a database password reset, copy a fresh Session Pooler URI from the exact production project and replace the canonical secret in every protected environment that runs these workflows. Never paste it into workflow inputs, logs, issues or screenshots.

## Incident rule

If a migration deployment reports success while the production migration history does not show the expected version, treat the deployment as failed until object-level verification proves otherwise.
