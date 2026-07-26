# Supabase Production Schema Evidence

## Purpose

This workflow captures a read-only inventory of production database metadata so historical migrations can be reconciled against objects that actually exist.

It does not inspect application rows and does not modify the database.

## Evidence collected

The artifact records metadata for the `public` and `storage` schemas:

- tables, views and RLS state;
- columns and defaults;
- constraints;
- indexes;
- functions, ownership, volatility and `SECURITY DEFINER` state;
- triggers;
- RLS policies;
- table grants;
- sequences;
- Supabase migration history.

The workflow also creates a SHA-256 checksum for the catalog file.

## Execution

Run **Supabase Production Schema Evidence** from the `main` branch with:

- `release_sha`: the exact 40-character current `main` SHA;
- `confirmation`: `COLLECT_SUPABASE_SCHEMA_EVIDENCE`.

The protected `production` environment must contain:

- `SUPABASE_PROJECT_ID`;
- `SUPABASE_DB_PASSWORD`.

## Safety properties

The SQL runs inside:

```sql
begin transaction read only;
```

It uses bounded statement and lock timeouts and finishes with `rollback`.

The workflow:

- does not query application rows;
- does not expose the database password;
- does not execute DDL or DML;
- does not run migration repair;
- does not mark migration versions as applied;
- does not use `supabase db push`;
- does not use `--include-all`.

## Reconciliation use

For each local-only migration:

1. identify the objects the migration was intended to create or change;
2. locate those objects in the evidence artifact;
3. verify definitions, ownership, grants, RLS and policies;
4. classify the migration as already materialized, genuinely pending, superseded or unsafe;
5. record the decision in a bounded reconciliation PR;
6. never mark a migration as applied without object-level evidence.

## Data handling

The artifact contains schema metadata and SQL expressions such as defaults and policy predicates. Treat it as internal operational evidence. Retention is limited to 30 days by the workflow.

## Failure handling

A missing public table inventory, missing migration history, empty artifact or PostgreSQL error causes the workflow to fail. A failed collection must not be interpreted as evidence that production is aligned.
