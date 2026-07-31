# Supabase Migration Reconciliation Decision Gate

## Purpose

This gate converts the immutable migration inventory and its bounded review packages into an evidence-bound reconciliation decision set. It does not inspect the production database by itself, infer classifications, execute SQL, repair migration history, authorize a dry-run, or authorize a production write.

The current backlog contains hundreds of SQL files requiring review. Package generation is preparation only. A migration receives credit only after a named reviewer records a supported classification for the exact file digest and an independent release authority approves the complete set.

## Required inputs

1. An exact current `main` SHA.
2. A `Supabase Production Migration Dry Run` workflow run for that SHA.
3. The workflow artifact containing `drift/migration-reconciliation-inventory.json`.
4. The nine bounded review packages generated from that same inventory.
5. Production schema evidence, staged execution evidence, replacement digests, archive mappings and rollback references as applicable.
6. A completed decisions document at:

   `docs/security/evidence/runtime/supabase-migration-reconciliation-decisions.json`

## Decision classes

### `ALREADY_PRESENT_IN_SCHEMA`

Required:

- exact production schema/object evidence;
- mapping between the migration SQL digest and the existing object state;
- reviewer identity, role, rationale and review timestamp.

This classification only creates a migration-history repair candidate. It does not authorize `supabase migration repair`.

### `PENDING_DEPLOYMENT`

Required:

- successful staged execution evidence;
- a unique positive deployment order;
- rollback reference;
- reviewer identity, role, rationale and review timestamp.

This classification only creates a pending-deployment plan item. It does not authorize a production push.

### `SUPERSEDED`

Required:

- SHA-256 digest of the replacement migration;
- schema evidence showing that the replacement fully covers the intended state;
- reviewer identity, role, rationale and review timestamp.

### `ARCHIVE_LEGACY`

Required:

- controlled archive mapping;
- schema evidence confirming that the legacy file must not execute;
- reviewer identity, role, rationale and review timestamp.

### `REQUIRES_SPLIT_REVIEW`

Required:

- a follow-up reference identifying the statements or objects that require separate review.

Any item in this class keeps the reconciliation decision `HUMAN_REVIEW_REQUIRED`.

## Execution sequence

### 1. Capture the exact inventory

Run **Supabase Production Migration Dry Run** using the exact current `main` SHA and confirmation `DRY_RUN_ONLY`.

The run may fail before `supabase db push --dry-run` while the backlog is unresolved. That is expected. The `always()` artifact must still contain the exact remote migration list, drift report, reconciliation inventory and review packages.

### 2. Generate the decisions template

Run **Supabase Migration Reconciliation Decision Gate** with:

- `release_sha`: the same current `main` SHA;
- `source_run_id`: the workflow run ID from step 1.

When no committed decisions file exists, the workflow intentionally fails after uploading `decision-template.json`. Download that template. It contains no classifications or approvals.

Local equivalent:

```bash
node scripts/supabase/generate-migration-reconciliation-decision-template.mjs \
  path/to/migration-reconciliation-inventory.json \
  reviewed-draft.json \
  --release-sha=<FULL_MAIN_SHA>
```

### 3. Complete human review

Review every item against its exact filename and SQL SHA-256 digest. Do not copy conclusions from a different inventory or release SHA. Complete all evidence, reviewer, rationale and ordering fields required by the selected classification.

Set document `status` to `REVIEWED` only after every item has a supported final decision and no `REQUIRES_SPLIT_REVIEW` item remains.

### 4. Obtain independent approval

Complete `independentApprover` with:

- name;
- role;
- approval timestamp;
- immutable approval reference.

The independent approver must not also be an item reviewer in the same document.

### 5. Seal the decisions

Sealing calculates deterministic digests. It does not review or approve content.

```bash
node scripts/supabase/seal-migration-reconciliation-decisions.mjs \
  path/to/migration-reconciliation-inventory.json \
  reviewed-draft.json \
  sealed-decisions.json \
  --expected-sha=<FULL_MAIN_SHA>
```

Any modification after sealing invalidates the affected decision digest and the master approval digest.

### 6. Validate and compile plans

```bash
node scripts/supabase/validate-migration-reconciliation-decisions.mjs \
  path/to/migration-reconciliation-inventory.json \
  sealed-decisions.json \
  artifacts/supabase-migration-reconciliation-decisions \
  --expected-sha=<FULL_MAIN_SHA>
```

A successful run emits:

- `decision-result.json`;
- `migration-history-repair-candidates.json`;
- `pending-deployment-plan.json`;
- `superseded-plan.json`;
- `archive-legacy-plan.json`;
- `split-review-plan.json`;
- `summary.md`.

Every output fixes production-write authorization to `false`.

### 7. Submit an evidence PR

Commit only the reviewed and sealed decisions document to the canonical evidence path. Do not commit production credentials, schema data containing customer information, database dumps, access tokens or confidential signed material. Evidence references may point to protected artifact storage.

Rerun the manual decision gate. It must verify:

- source workflow provenance;
- exact current `main` SHA;
- exact inventory digest;
- one decision for every inventory item;
- classification-specific evidence;
- unique pending deployment order;
- deterministic decision digests;
- independent approval digest;
- zero unresolved split-review items.

## What happens after acceptance

`RECONCILIATION_ACCEPTED` is an input to controlled remediation. It is not deployability.

Use separate reviewed PRs to:

1. create controlled migration-history repair mappings only for proven already-present changes;
2. archive or rename invalid and duplicate legacy files without losing immutable evidence;
3. split unresolved migrations;
4. stage genuinely pending migrations in approved order;
5. prepare backup, rollback and maintenance controls;
6. rerun the production drift audit;
7. require `AUTHORIZED_FOR_DRY_RUN` before executing `supabase db push --dry-run`;
8. require a separate protected approval before any production write.

## Invalidation rules

Repeat inventory capture and review when any of the following changes:

- the release SHA;
- any migration file bytes or filename;
- the remote migration history;
- the target production project;
- schema evidence used by a decision;
- replacement migration digest;
- staging or rollback evidence;
- reviewer or approver decision.

Never reuse accepted decisions across a different inventory digest or release SHA.
