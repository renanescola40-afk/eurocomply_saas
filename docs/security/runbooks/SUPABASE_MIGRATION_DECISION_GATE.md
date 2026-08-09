# Supabase Migration Reconciliation Decision Gate

## Purpose

Convert the immutable migration inventory and exact-SHA runtime evidence into a human-reviewed classification set without creating a self-referential Git SHA requirement.

This gate does not execute SQL, repair migration history, run staging, authorize a dry-run, or authorize a production write.

## Provenance model

Two SHAs have different meanings:

- **subject release SHA** — immutable commit whose migration files, inventory and production schema evidence were reviewed;
- **evidence commit SHA** — current `main` commit that may contain the reviewed evidence document.

The subject SHA must be an ancestor of the evidence commit. Between them, this gate permits only:

`docs/security/evidence/runtime/supabase-migration-reconciliation-decisions.json`

Any application, migration, workflow or unrelated documentation change fails closed. This prevents the impossible fixed-point where committing the evidence changes the SHA the evidence is supposed to describe.

## Required inputs

1. Exact subject release SHA.
2. `Supabase Production Migration Dry Run` run ID for that subject SHA.
3. Its immutable reconciliation inventory.
4. Exact-SHA live schema/review dossier evidence used by the human reviewer.
5. The canonical reviewed and sealed decision document.
6. Named item reviewer(s) and a distinct independent approver.

## Decision classes

### `ALREADY_PRESENT_IN_SCHEMA`

Requires exact schema/object evidence, reviewer identity, role, rationale and timestamp. It creates only a history-repair candidate; it does not authorize migration repair.

### `PENDING_DEPLOYMENT`

At the **classification** gate this means the reviewer concluded that the intended state is not safely creditable as already present and must go through protected staging. It requires:

- exact schema evidence reference;
- unique positive deployment order;
- rollback reference;
- reviewer identity, role, rationale and timestamp.

Successful staging evidence is deliberately **not** required here because staging occurs after classification and execution-plan compilation. Pending items remain non-production-ready until `Supabase Staging Rehearsal` produces a passing attestation.

### `SUPERSEDED`

Requires replacement migration SHA-256, schema evidence showing coverage, reviewer identity, role, rationale and timestamp.

### `ARCHIVE_LEGACY`

Requires controlled archival mapping, schema evidence confirming the legacy file must not execute, reviewer identity, role, rationale and timestamp.

### `REQUIRES_SPLIT_REVIEW`

Requires a follow-up reference. Any remaining item in this class keeps the decision gate blocked.

## Execution sequence

### 1. Capture the subject inventory

Run `Supabase Production Migration Dry Run` for the subject SHA with `DRY_RUN_ONLY`. A fail-closed `HUMAN_REVIEW_REQUIRED` result is acceptable when the immutable inventory artifact is retained.

### 2. Generate the decision template

Run `Supabase Migration Reconciliation Decision Gate` with:

- `release_sha`: subject SHA;
- `source_run_id`: dry-run run ID.

When the canonical decisions file does not exist, the workflow intentionally fails after uploading `decision-template.json`.

### 3. Complete human review

Review every filename and exact SQL SHA-256 against the production evidence and migration SQL. Do not copy decisions from another inventory or release.

Set document `status` to `REVIEWED` only after every item has a supported classification and no `REQUIRES_SPLIT_REVIEW` remains.

### 4. Obtain independent approval

Complete `independentApprover` with name, role, approval timestamp and immutable approval reference. The independent approver must not be an item reviewer in the same document.

### 5. Seal decisions

```bash
node scripts/supabase/seal-migration-reconciliation-decisions.mjs \
  path/to/migration-reconciliation-inventory.json \
  reviewed-draft.json \
  sealed-decisions.json \
  --expected-sha=<SUBJECT_SHA>
```

Sealing calculates deterministic decision and approval digests. It does not create human review or approval.

### 6. Submit the evidence-only PR

Commit only the sealed document to:

`docs/security/evidence/runtime/supabase-migration-reconciliation-decisions.json`

Do not modify migrations, application code, workflows or unrelated files in that evidence PR.

### 7. Rerun the gate

Use the original subject SHA and original dry-run run ID. The workflow checks:

- subject SHA ancestry;
- current `main` identity;
- evidence-only diff from subject to current;
- source run provenance;
- exact inventory digest;
- one sealed decision for every inventory item;
- classification-specific evidence;
- unique pending deployment order;
- independent approval and deterministic approval digest;
- zero split-review items.

A successful result is `RECONCILIATION_ACCEPTED_FOR_STAGING`. It is not deployment authorization.

## Next step

Run `Supabase Migration Execution Plan`, still using the immutable subject SHA and the successful Decision Gate run ID. Pending migrations must then pass protected staging before any production-change request can be compiled.

## Invalidation rules

Repeat the inventory/evidence review if any migration file bytes or filename changes, the remote migration history changes, the production target changes, or the production schema evidence changes. Evidence-only descendant commits do not change the subject SHA, but any non-canonical change in that lineage is rejected.
