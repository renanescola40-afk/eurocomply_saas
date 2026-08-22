# Supabase Forward Reconciliation — Production Promotion Checklist

Use this checklist only after the bounded reconciliation implementation has been merged to `main`. It does not authorize a Production change by itself.

## Preconditions

- Current `main` SHA is frozen for the promotion window.
- `Production` has administrator bypass disabled, at least one required deployment reviewer and protected-branches-only deployment policy.
- `supabase-production-migration-dry-run` has the same governance boundary.
- `SUPABASE_DB_POOLER_URL` is the canonical rotated protected secret.
- Exact-SHA Stage 1 `Supabase Forward Reconciliation Rehearsal` succeeded and its isolated-production-restore job actually ran.
- Exact-SHA Stage 2 `Supabase Forward Reconciliation Dry Run` succeeded and executed the filtered remote+selected dry-run.
- Exact-SHA Stage 3 `Supabase Production Migration Dry Run` succeeded in `BOUNDED_FORWARD_DECISION` mode using the same successful Stage 1 and Stage 2 runs.
- Stage 3 produced `bounded-production-dry-run-attestation.json` with the exact target SHA/selection digest, `filteredDbPushDryRunOnly=true`, no include-all/repair and no Production write.
- Exact-SHA Stage 4 `Supabase Migration Reconciliation Decision Gate` succeeded for the same immutable selected migration bytes and carried the validated Stage 3 attestation into its evidence artifact.
- Stage 4 produced accepted human-review evidence covering every selected item as `PENDING_DEPLOYMENT` while retaining `deploymentAuthorization=NOT_AUTHORIZED`.
- The selected set in `config/supabase-forward-reconciliation.json` remains byte-for-byte unchanged since Stages 1-4.
- Manifest count, ordered filenames, versions and selection digest match across current `main` and all source evidence.
- Every selected version remains strictly later than the current Production migration head and no selected version is already remote.
- Backup/recovery readiness and rollback/LKG prerequisites for the same release window are satisfied.

## Stage 3 dispatch

Run `Supabase Production Migration Dry Run` with:

- `release_sha`: exact current `main` SHA;
- `confirmation`: `DRY_RUN_ONLY`;
- `rehearsal_run_id`: successful Stage 1 run;
- `forward_dry_run_run_id`: successful Stage 2 run.

Do not credit the workflow's general historical mode as bounded Stage 3 evidence.

## Stage 4 dispatch

Run `Supabase Migration Reconciliation Decision Gate` with:

- `release_sha`: same exact current `main` SHA;
- `source_run_id`: successful bounded Stage 3 run;
- `forward_dry_run_run_id`: successful Stage 2 run;
- `decision_payload_b64`: omit for template generation, then provide only after real human review and sealing.

A Stage 4 success is human classification evidence, not Production authorization.

## Stage 5 dispatch

Run `Supabase Forward Reconciliation Production Promotion` with:

- `release_sha`: exact current `main` SHA;
- `rehearsal_run_id`: successful Stage 1 run;
- `dry_run_run_id`: successful Stage 2 run;
- `decision_run_id`: successful exact-SHA Stage 4 run;
- `decision_subject_sha`: exact SHA reviewed by Stage 4;
- `confirmation`: `PROMOTE <release_sha> USING DRY-RUN <dry_run_run_id> AND DECISION <decision_run_id>`.

Approve the protected `Production` deployment only after reviewing Stage 1, Stage 2, bounded Stage 3, Stage 4, current manifest digest, current ledger and the change window.

## Required successful outputs

- exact current-main checks before and immediately before write;
- exact Stage 1/Stage 2/Stage 4 workflow provenance;
- validated bounded Stage 3 attestation carried by Stage 4;
- identical immutable selection digest across current manifest and all source proofs;
- accepted human-decision proof bound to exact selected bytes and release SHA;
- fresh current remote migration history + exactly the selected set in the temporary workdir;
- every selected migration still strictly after remote head and unapplied;
- final filtered dry-run PASS;
- exactly one filtered Production `db push`;
- no `--include-all`, migration repair or manual migration-ledger insertion;
- remote-after ledger equals remote-before + exactly selected set;
- no unauthorized migration and no partial selected set;
- canonical live schema/security postconditions PASS;
- redacted exact-SHA artifact with no database URLs, credentials, human names, approval references or row data.

## After promotion

Regenerate canonical exact-SHA evidence rather than editing evidence manually:

- Supabase live RLS/tenant validation;
- Step-Up/runtime readiness;
- SCIM/integration and billing runtime validation;
- controlled Storage validation;
- Enterprise Recovery Drill;
- Production Runtime Proof and authenticated `/api/ready` smoke;
- P0 Runtime Evidence fan-in;
- Enterprise Production Gate;
- Enterprise Readiness Scorecard.

If `main` changes during the promotion window, do not transfer credit to the newer SHA.

## Rollback boundary

Do not delete migration history or run migration repair as rollback. Use application LKG/rollback for application rollback, governed restore for data recovery and a new reviewed forward migration for schema correction.
