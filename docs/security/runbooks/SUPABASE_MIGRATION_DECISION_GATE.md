# Supabase Migration Reconciliation Decision Gate

## Purpose

Convert immutable migration inventory and exact-SHA runtime evidence into a human-reviewed classification set without creating production authorization.

This gate does not execute SQL, repair migration history, run staging, authorize a dry-run, or authorize a production write.

## Review modes

### General reconciliation mode

The legacy/general mode reviews the complete `Supabase Production Migration Dry Run` inventory. Its subject release SHA may be an evidence-only ancestor of current `main`; between the subject and evidence commit only the canonical repository decision document is permitted.

Canonical repository decision document:

`docs/security/evidence/runtime/supabase-migration-reconciliation-decisions.json`

### Exact-SHA bounded forward mode

The bounded forward mode is for an already-defined `config/supabase-forward-reconciliation.json` package and is deliberately stricter:

- `forward_dry_run_run_id` must identify a successful exact-subject `Supabase Forward Reconciliation Dry Run`;
- the gate downloads that run's `current-manifest.json` and filters the production dry-run inventory by exact `filename + SHA-256` identity;
- every selected manifest identity must exist in the production dry-run inventory or the gate fails closed;
- only the selected 1-25 identities enter the human decision template;
- `current main SHA == subject release SHA` is mandatory;
- byte equivalence to an older release grants **zero** human review or approval credit;
- human decisions are supplied after the exact SHA exists through `decision_payload_b64`, avoiding a self-referential evidence commit;
- the bounded decision result must classify every selected identity as `PENDING_DEPLOYMENT` before it can be consumed by the forward Production Promotion lane;
- the Decision Gate still emits `deploymentAuthorization = NOT_AUTHORIZED`.

The base64 payload is transport only. It is not a secret and it does not create review. It must contain a real reviewed and sealed decision document produced from the exact bounded template.

## Required inputs

General mode:

1. Exact subject release SHA.
2. `Supabase Production Migration Dry Run` run ID for that subject SHA.
3. Its immutable reconciliation inventory.
4. Exact-SHA live schema/review dossier evidence used by the human reviewer.
5. The canonical reviewed and sealed decision document.
6. Named item reviewer(s) and a distinct independent approver.

Bounded forward mode adds:

7. Successful exact-SHA `Supabase Forward Reconciliation Dry Run` run ID.
8. The exact bounded template emitted from those two source runs.
9. A reviewed/sealed base64 decision payload whose `releaseSha` is the exact unchanged current `main` SHA.

## Decision classes

### `ALREADY_PRESENT_IN_SCHEMA`

Requires exact schema/object evidence, reviewer identity, role, rationale and timestamp. It creates only a history-repair candidate; it does not authorize migration repair.

### `PENDING_DEPLOYMENT`

At the classification gate this means the reviewer concluded that the intended state is not safely creditable as already present and must go through the protected execution lane. It requires:

- exact schema evidence reference;
- unique positive deployment order;
- rollback reference;
- reviewer identity, role, rationale and timestamp.

In bounded forward mode every selected migration must be an explicitly reviewed `PENDING_DEPLOYMENT` item for the forward production promotion verifier to accept the Decision Gate output.

### `SUPERSEDED`

Requires replacement migration SHA-256, schema evidence showing coverage, reviewer identity, role, rationale and timestamp.

### `ARCHIVE_LEGACY`

Requires controlled archival mapping, schema evidence confirming the legacy file must not execute, reviewer identity, role, rationale and timestamp.

### `REQUIRES_SPLIT_REVIEW`

Requires a follow-up reference. Any remaining item in this class keeps the decision gate blocked.

## General reconciliation execution sequence

### 1. Capture the subject inventory

Run `Supabase Production Migration Dry Run` for the subject SHA with `DRY_RUN_ONLY`. A fail-closed `HUMAN_REVIEW_REQUIRED` result is acceptable when the immutable inventory artifact is retained.

### 2. Generate the decision template

Run `Supabase Migration Reconciliation Decision Gate` with:

- `release_sha`: subject SHA;
- `source_run_id`: production dry-run run ID.

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

General mode may commit only the sealed document to:

`docs/security/evidence/runtime/supabase-migration-reconciliation-decisions.json`

Do not modify migrations, application code, workflows or unrelated files in that evidence PR.

### 7. Rerun the gate

Use the original subject SHA and original dry-run run ID. The workflow validates exact inventory coverage, classification-specific evidence, unique deploy order, independent approval, deterministic digests and zero unresolved split-review items.

A successful result is `RECONCILIATION_ACCEPTED_FOR_STAGING`. It is not deployment authorization.

## Bounded forward execution sequence

1. Freeze the exact current `main` SHA.
2. Run `Supabase Forward Reconciliation Rehearsal` on that exact SHA.
3. Run `Supabase Forward Reconciliation Dry Run` on that exact SHA using the successful rehearsal run ID.
4. Run `Supabase Production Migration Dry Run` with `DRY_RUN_ONLY` on that exact SHA to retain the production inventory artifact.
5. Dispatch `Supabase Migration Reconciliation Decision Gate` with:
   - `release_sha=<EXACT_MAIN_SHA>`;
   - `source_run_id=<PRODUCTION_DRY_RUN_RUN_ID>`;
   - `forward_dry_run_run_id=<FORWARD_DRY_RUN_RUN_ID>`;
   - leave `decision_payload_b64` empty.
6. Download `decision-template.json`. The template contains only the exact selected forward identities and remains non-crediting.
7. A qualified human reviews every selected filename + SQL SHA-256, fills rationale/evidence/rollback/deploy order/reviewer provenance, and records a distinct independent approver.
8. Seal the reviewed decisions against `bounded-migration-reconciliation-inventory.json` from the same gate artifact.
9. Base64-encode the sealed JSON without modifying `main`.
10. Confirm `main` still equals the original exact subject SHA. If it moved, discard the payload for Production credit and restart the exact-SHA lane; byte equivalence does not transfer approval.
11. Dispatch the Decision Gate again with the same three run/SHA inputs and the sealed `decision_payload_b64`.
12. A successful Decision Gate is still non-authorizing. Obtain separate protected `Production` authorization before `Supabase Forward Reconciliation Production Promotion`.

## Invalidation rules

Repeat the bounded exact-SHA review whenever `main` advances, even when the selected bytes are mechanically equal. Also repeat the applicable inventory/evidence review if any migration filename/bytes change, remote migration history changes, production target changes, source run provenance changes, or production schema evidence changes.

Never use `--include-all`, migration repair, manual ledger insertion, unrestricted `db push`, ad-hoc production SQL, or an older human approval to bypass these boundaries.
