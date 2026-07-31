# Supabase Migration Reconciliation Review Runbook

## Purpose

Use the exact-SHA migration inventory and generated review batches to classify unresolved SQL files without guessing production schema state or authorising a database write.

## Preconditions

- Work from the exact current `main` SHA being assessed.
- Retain the remote migration list and drift artifacts from the same workflow run.
- Verify the inventory SHA-256 against every review package.
- Do not reuse packages after any migration file, reconciliation file, or target migration-history change.
- Keep production credentials and schema exports in the approved restricted evidence location.

## Review sequence

1. Download `migration-reconciliation-inventory.json` and the `reconciliation-review` directory from the same workflow artifact.
2. Confirm `index.json` reports `HUMAN_REVIEW_REQUIRED`, `acceptedDecisions: 0`, and the expected inventory digest.
3. Assign each batch to a reviewer with PostgreSQL/Supabase migration experience and no unresolved conflict of interest.
4. For each item, verify the SQL file digest before analysis.
5. Inspect the target production schema at object level; a migration-history row alone is not schema evidence.
6. Choose exactly one allowed classification and complete every evidence field required by that classification.
7. Record reviewer identity, role, timestamp, rationale, and immutable evidence references.
8. Require a second reviewer for destructive SQL, security-policy changes, authentication/tenant boundaries, billing data, or ambiguous duplicates.
9. Recompute the decision digest after all fields are final.
10. Submit accepted decisions through a separate protected PR and validator. Do not edit generated package artifacts in place.

## Classification rules

### `ALREADY_PRESENT_IN_SCHEMA`

Required:

- exact object-level schema evidence;
- mapping from the SQL statements to observed objects/policies/functions/indexes;
- explanation of any partial or divergent state;
- reviewer confirmation that marking history as applied would not hide absent SQL.

Do not run `supabase migration repair --status applied` until this proof is independently accepted.

### `PENDING_DEPLOYMENT`

Required:

- production-like staged execution result;
- dependency and execution-order decision;
- lock/downtime assessment;
- backup/PITR confirmation;
- rollback or forward-fix procedure;
- owner and maintenance window.

### `SUPERSEDED`

Required:

- exact replacement migration SHA-256;
- statement/object coverage comparison;
- proof the replacement has been applied or is included in the approved deployment sequence;
- explicit decision that the superseded file must not execute.

### `ARCHIVE_LEGACY`

Required:

- reason the file is invalid historical debt rather than executable migration work;
- controlled archive/mapping destination;
- proof that required schema state is represented elsewhere;
- explicit non-execution decision.

### `REQUIRES_SPLIT_REVIEW`

Required:

- precise unresolved statements or database objects;
- named follow-up owner;
- additional evidence needed;
- no deployment or history repair until the split review closes.

## Duplicate-version handling

- Review every file sharing the version; do not select one by filename alone.
- Compare SQL digests and object effects.
- Choose one controlled resolution: rename/resequence for future deployment, supersede, archive legacy, or split review.
- Do not leave multiple executable files with the same migration version in an approved production sequence.

## Invalid timestamp handling

- Confirm whether the file is historical evidence, superseded SQL, or genuinely pending work.
- Never rename a file merely to make the audit green; preserve the old digest and document the controlled mapping.
- Any replacement filename requires a new reviewed migration and explicit relation to the legacy file.

## Stop conditions

Stop and keep the release blocked when:

- inventory or package digests do not match;
- the target schema evidence is incomplete or stale;
- a reviewer cannot determine whether SQL is already present;
- duplicate files have overlapping or conflicting effects;
- destructive/locking impact lacks staging evidence;
- backup, rollback, owner, or maintenance window is missing;
- any decision field is inferred by automation rather than supplied and reviewed by a human.

## Completion

The review is not complete merely because all batches have text entered. Completion requires:

- every current inventory item covered exactly once;
- no `UNCLASSIFIED` items;
- valid evidence for every selected classification;
- decision digests and reviewer attribution;
- independent validation against the same inventory SHA-256;
- a fresh strict migration audit and reviewed dry-run for the exact final `main` SHA;
- production write approval through a separate protected process.
