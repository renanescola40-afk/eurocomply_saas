# Supabase migration absence closure evidence

## Purpose

Reduce false `REQUIRES_SPLIT_REVIEW` migration candidates when the immutable schema catalog already proves that a target column is absent.

The bounded closure rule is:

> When an exact migration statement targets an inline column definition and the corresponding target column is absent, the target inline state on that column is also absent.

Inline state includes constraints, references, defaults, identity, generated expressions and nullability declared in that same column definition.

This rule never proves that a migration is safe to deploy. It only removes an ambiguity that cannot be present when its parent column does not exist.

## Safety boundary

The workflow:

- opens no database connection;
- receives no Supabase credential;
- executes no SQL;
- performs no migration push or history repair;
- accepts no migration decision;
- keeps every candidate `humanDecisionRequired: true`;
- preserves `HUMAN_REVIEW_REQUIRED` and `acceptedDecisions: 0`.

It may change a candidate from `REQUIRES_SPLIT_REVIEW` to `PENDING_DEPLOYMENT`, but that remains candidate evidence and does not authorize a production write.

## Prerequisites

1. A successful `Supabase Migration Column Metadata Evidence` run.
2. The exact SHA that produced that artifact.
3. An unexpired artifact named with the source SHA.
4. A byte-identical `supabase/migrations` Git tree between the source SHA and current `main`.

If the migrations tree differs, regenerate the complete evidence chain on the new tree.

## Run

Open:

```text
Actions → Supabase Migration Absence Closure Evidence → Run workflow
```

Inputs:

```text
target_sha=<exact current main SHA>
source_sha=<SHA that produced column metadata evidence>
column_metadata_evidence_run_id=<successful source run ID>
confirmation=REFINE_MIGRATION_ABSENCE_CLOSURE_EVIDENCE
```

The workflow verifies:

- the checkout and GitHub `main` still equal `target_sha`;
- source and target migration trees are identical;
- the source run was manually dispatched and successful;
- exactly one matching unexpired artifact exists;
- source semantic and column-metadata refinements remain non-crediting;
- no source artifact authorizes production push.

## Closure requirements

An unresolved entry is closed only when all conditions are true:

1. reason equals `INLINE_COLUMN_CONSTRAINT_REQUIRES_MANUAL_REVIEW`;
2. the unresolved statement digest matches an existing `COLUMN` operation;
3. that operation expects `PRESENT`;
4. that operation observes `ABSENT`;
5. `targetStateMatched` is `false`.

The derived operation records:

```text
kind=INLINE_COLUMN_TARGET_STATE
action=ABSENCE_CLOSURE
expectedState=PRESENT
observedState=ABSENT
targetStateMatched=false
evidenceLayer=ABSENT_COLUMN_CLOSURE_REFINEMENT
closureBasis.parentKind=COLUMN
closureBasis.parentObservedState=ABSENT
```

Dynamic SQL, data mutations, object kinds not represented by the catalog, present columns and unrelated unresolved reasons remain untouched.

## Artifact

Expected name:

```text
supabase-migration-absence-closure-evidence-<target_sha>-from-<source_sha>
```

The artifact contains:

- refined `migration-object-evidence.json`;
- `absence-closure-refinement-summary.json`;
- regenerated batches of 25 items;
- source and target migration-tree evidence;
- bounded Markdown summaries.

## Interpretation

- `ALREADY_PRESENT_IN_SCHEMA`: target state appears materialized, still requiring human acceptance.
- `PENDING_DEPLOYMENT`: target state is absent, still requiring human deployment review.
- `REQUIRES_SPLIT_REVIEW`: at least one unresolved, duplicated, invalid, dynamic or partial condition remains.

Do not run `supabase db push --include-all`, repair migration history or apply pending migrations from this artifact alone.

## Failure handling

- **Stale target SHA:** rerun with current `main`.
- **Migration-tree mismatch:** rebuild the full evidence chain.
- **Missing or expired source artifact:** rerun column metadata evidence.
- **Migration digest mismatch:** stop; source evidence and repository bytes diverged.
- **Unexpected accepted decision or write marker:** treat as a security failure.
- **Closure created from a present column:** treat as a security failure and revert the implementation.

## Rollback

Revert the implementation PR. No database rollback is required because this workflow never connects to or modifies production.
