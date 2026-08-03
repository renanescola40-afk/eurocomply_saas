# Supabase migration column metadata evidence

## Purpose

Reduce migration review ambiguity with immutable PostgreSQL catalog metadata while preserving the production write boundary.

This control compares unresolved migration column and constraint definitions against:

- `pg_catalog.format_type` output, including typmods such as `varchar(64)` and `numeric(12,2)`;
- nullability;
- identity mode;
- generated-column expressions;
- collation;
- primary-key, unique, foreign-key and check definitions;
- constraint validation state.

The output is candidate evidence only. It is not a migration decision, deployment authorization, migration-history repair or production write.

## Prerequisites

1. A successful `Supabase Migration Semantic Evidence` run whose artifact is unexpired.
2. The exact SHA that produced that semantic artifact.
3. A successful enriched `Supabase Production Schema Evidence` run on the current tip of `main`.
4. A byte-identical `supabase/migrations` Git tree between the semantic source SHA and current `main`.

If the migrations tree differs, stop and regenerate the dry-run, object evidence and semantic evidence on the new tree.

## Step 1 — collect enriched production schema evidence

Run `Supabase Production Schema Evidence` on the exact current `main` SHA.

Inputs:

```text
release_sha=<exact current main SHA>
confirmation=COLLECT_SUPABASE_SCHEMA_EVIDENCE
```

Expected boundaries:

- read-only PostgreSQL transaction;
- metadata from `public` and `storage` only;
- no application rows;
- rollback at the end;
- immutable `catalog.txt` and `SHA256SUMS` artifact.

Confirm that the summary reports success and that the artifact is not expired.

## Step 2 — refine column metadata evidence

Run `Supabase Migration Column Metadata Evidence`.

Inputs:

```text
target_sha=<exact current main SHA>
source_sha=<SHA from the successful semantic evidence run>
semantic_evidence_run_id=<successful semantic evidence run ID>
schema_evidence_run_id=<successful enriched schema evidence run ID>
confirmation=REFINE_MIGRATION_COLUMN_METADATA_EVIDENCE
```

The workflow must prove:

- `target_sha` is still current `main`;
- source and target migration trees are identical;
- semantic and schema runs were manually dispatched and successful;
- each required artifact is unique and unexpired;
- the enriched catalog digest matches `SHA256SUMS`;
- the semantic artifact still has `HUMAN_REVIEW_REQUIRED` and `acceptedDecisions: 0`.

## Expected output

Artifact name:

```text
supabase-migration-column-metadata-evidence-<target_sha>-from-<source_sha>
```

The artifact contains:

- refined `migration-object-evidence.json`;
- `column-metadata-refinement-summary.json`;
- regenerated review batches;
- migration-tree equivalence evidence;
- bounded Markdown summary.

Every migration must continue to contain:

```text
humanDecisionRequired=true
automaticClassificationAllowed=false
```

The aggregate result must continue to contain:

```text
status=HUMAN_REVIEW_REQUIRED
acceptedDecisions=0
productionPushAuthorized=false
```

## Interpretation

- `ALREADY_PRESENT_IN_SCHEMA` means the current catalog matches the parsed target state. A reviewer must still accept or reject the candidate.
- `PENDING_DEPLOYMENT` means the parsed target state is absent. It does not authorize deployment.
- `REQUIRES_SPLIT_REVIEW` means at least one statement remains partial, dynamic, data-dependent, invalid, duplicated or otherwise unproved.

Do not run `supabase db push --include-all`, repair migration history or apply pending migrations based solely on this artifact.

## Failure handling

- **Stale target SHA:** start a new run with current `main`.
- **Migrations tree mismatch:** regenerate the full evidence chain on the new tree.
- **Missing or expired artifact:** rerun the corresponding source workflow.
- **Legacy catalog without `formatted_type`:** rerun `Supabase Production Schema Evidence` after the enriched SQL is merged.
- **Digest mismatch:** stop; do not reuse or manually edit the artifact.
- **Unexpected accepted decision or write marker:** treat as a security failure and do not continue.

## Rollback

This control is analysis-only. Revert the implementation PR if necessary. No database rollback is required because the metadata refinement workflow opens no database connection and performs no production write.
