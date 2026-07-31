# Supabase Live Schema Evidence

## Purpose

Produce read-only, exact-SHA evidence that helps a human reviewer classify the migration reconciliation inventory.

## Safety boundary

The workflow:

- opens a PostgreSQL `READ ONLY` transaction;
- reads catalog metadata only;
- does not dump table rows or customer content;
- does not execute migration SQL;
- does not modify migration history;
- does not classify a migration automatically;
- does not authorize a dry-run or production deployment.

Object presence is supporting evidence, not proof that every statement in a migration was applied correctly.

## Required configuration

Create the protected GitHub environment:

`supabase-production-schema-evidence`

Provide:

- `SUPABASE_DB_URL`: production PostgreSQL connection string with catalog read permission.

Require environment approval before execution.

## Execution

1. Run **Supabase Production Migration Dry Run** for the exact current `main` SHA. A blocked result is expected while reconciliation is incomplete; retain its artifact and run ID.
2. Run **Supabase Live Schema Evidence** with the same full SHA and the source run ID.
3. Review the retained artifact:
   - `live-schema-catalog.json`;
   - `migration-object-evidence.json`;
   - `live-catalog.tsv`.
4. Use this evidence alongside SQL inspection, schema definitions, staged execution and rollback evidence when completing the migration decision template.

## Interpretation

- `allExtractedObjectsPresent: true` means every object name recognized by the conservative parser exists in the live catalog.
- It does not establish column shape, constraints, function body, policy expression, grants, trigger behavior or data migration completion.
- Migrations with dynamic SQL or unsupported syntax may have no extracted objects and always require direct review.
- `automaticClassification` is intentionally always `null`.

## Promotion rule

Only the migration decision gate may accept a complete, sealed, independently approved classification set. This workflow supplies evidence but grants no migration status or release credit by itself.
