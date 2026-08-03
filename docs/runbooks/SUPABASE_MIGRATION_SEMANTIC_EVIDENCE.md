# Supabase migration semantic evidence

## Purpose

Reduce false manual-review volume in the Supabase migration reconciliation process by proving column and constraint target states against immutable production catalog evidence.

This phase is analysis-only. It never authorizes migration deployment, migration-history repair or production writes.

## Inputs

The protected workflow requires:

- `target_sha`: exact current `main` SHA containing the semantic analyzer;
- `source_sha`: SHA that produced the source migration-object and schema-evidence artifacts;
- `object_evidence_run_id`: successful **Supabase Migration Object Evidence** run for `source_sha`;
- `schema_evidence_run_id`: successful **Supabase Production Schema Evidence** run for `source_sha`;
- confirmation `REFINE_MIGRATION_SEMANTIC_EVIDENCE`.

## Immutable-tree rule

The workflow may reuse source artifacts across an analyzer-only merge only when Git proves that:

```text
<source_sha>:supabase/migrations == <target_sha>:supabase/migrations
```

The Git tree object IDs must be identical. A filename comparison, timestamp comparison or migration count is not sufficient.

When the migration tree differs, stop and collect fresh Schema Evidence, Migration Dry Run and Migration Object Evidence on the new exact SHA.

## Evidence added

The semantic refinement layer can add deterministic target-state evidence for:

- column base type where the production catalog fully captures it;
- `NOT NULL` and nullable target states;
- column defaults with conservative canonical equivalence;
- inline primary-key and unique constraints;
- inline foreign keys, including common delete/update clauses;
- unnamed table constraints when their canonical PostgreSQL definition matches;
- `ALTER COLUMN ... TYPE`;
- `ALTER COLUMN ... SET|DROP NOT NULL`;
- `ALTER COLUMN ... SET|DROP DEFAULT`;
- named constraints by canonical definition, not name alone.

## Fail-closed cases

These remain in `REQUIRES_SPLIT_REVIEW` unless a later evidence layer explicitly supports them:

- `CHECK` or `EXCLUDE` definitions that do not canonically match the catalog;
- type modifiers not fully represented by the captured catalog;
- collations, generated columns and identity semantics;
- dynamic SQL;
- data mutations and data-dependent target states;
- unsupported DDL object kinds;
- duplicate migration versions;
- invalid migration filenames or timestamps;
- any digest mismatch;
- any source artifact that is expired, missing, from another SHA or from a non-manual event.

## Truth boundary

A refined candidate is still not an accepted migration decision.

Every artifact must retain:

- `HUMAN_REVIEW_REQUIRED`;
- `acceptedDecisions: 0`;
- `automaticClassificationAllowed: false`;
- `humanDecisionRequired: true` for every item;
- no database modification;
- no migration-history modification;
- no production push authorization.

## Expected output

The workflow uploads:

```text
supabase-migration-semantic-evidence-<target_sha>-from-<source_sha>
```

The artifact contains:

- refined `migration-object-evidence.json`;
- immutable 25-item batches;
- `semantic-refinement-summary.json`;
- `semantic-refinement.md`;
- `migrations-tree-equivalence.json`;
- source object-evidence files retained for traceability.

## Review sequence

1. Verify the target and source SHAs.
2. Verify migrations-tree equivalence.
3. Review the before/after candidate counts.
4. Inspect every item promoted out of split review.
5. Confirm object proof digests and semantic operations.
6. Keep duplicate and invalid-history items separated from deployment candidates.
7. Copy only independently accepted decisions into the approved reconciliation decisions file.
8. Require staging rehearsal, order and rollback evidence before any production execution plan.

## Rollback

Revert the analyzer/workflow PR. No database rollback is required because this phase does not connect to or modify the database.
