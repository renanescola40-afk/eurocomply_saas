# Supabase Forward Reconciliation Lane

## Purpose

This lane rehearses, dry-runs, human-reviews and — only after explicit protected authorization — promotes the exact forward reconciliation set without deploying the repository's unresolved historical migration backlog.

The global migration-reconciliation program remains authoritative for historical lineage repair/classification. This bounded lane never repairs history, never uses `--include-all`, never inserts migration-ledger rows manually and never treats a human Decision Gate as Production authorization.

## Authoritative selected set

`config/supabase-forward-reconciliation.json` is the only authoritative source for the selected forward migrations.

Every stage recompiles the manifest from the exact release SHA and binds:

- ordered filenames and versions;
- source-byte SHA-256 values;
- migration count derived from the manifest;
- immutable selection digest;
- exact release SHA.

All selected execution identities must remain strictly later than the current remote migration head and none may already be recorded remotely. Any selected filename, order, SQL-byte or release-SHA change invalidates prior exact-SHA evidence.

## Administrative prerequisites

Before Stages 1-4:

1. `supabase-production-migration-dry-run` has administrator bypass disabled;
2. at least one required deployment reviewer is configured;
3. deployments are restricted to protected branches;
4. the canonical rotated `SUPABASE_DB_POOLER_URL` exists only as a protected secret;
5. connection material contains no embedded control characters and is never written to artifacts.

Before Stage 5 Production promotion, `Production` must additionally have administrator bypass disabled, at least one required reviewer, protected-branches-only policy and the canonical protected pooler secret.

## Stage 1 — isolated production-restore rehearsal

Run `Supabase Forward Reconciliation Rehearsal` on the exact current `main` SHA.

It must:

1. prove the supplied SHA equals current `main`;
2. compile the exact selected manifest;
3. restore current Production into an isolated disposable target;
4. verify every selected SHA-256;
5. apply only selected files in manifest order to the isolated target;
6. run the canonical schema/RLS/runtime postconditions;
7. emit a redacted exact-SHA rehearsal attestation;
8. destroy the disposable target.

A PR contract job is non-crediting. A Stage 1 PASS authorizes no Production write.

## Stage 2 — filtered forward dry-run

Run `Supabase Forward Reconciliation Dry Run` with the same exact SHA and successful Stage 1 run ID.

It builds a temporary workdir containing exactly:

- every version currently recorded in remote migration history; plus
- the exact selected forward set from the immutable manifest.

It then proves:

- every selected version remains after the remote head;
- no selected migration is already remote;
- pending set equals selected set;
- no unauthorized pending migration exists;
- Stage 1 target SHA and selection digest equal the current manifest.

Only then does it execute the filtered command:

`supabase --workdir "$WORKDIR" db push --dry-run --db-url "$SUPABASE_DB_POOLER_URL"`

Stage 2 performs no Production write.

## Stage 3 — bounded Production dry-run for Decision Gate

Run `Supabase Production Migration Dry Run` in bounded mode with:

- `release_sha`: exact current `main` SHA;
- `confirmation`: `DRY_RUN_ONLY`;
- `rehearsal_run_id`: successful exact-SHA Stage 1 run ID;
- `forward_dry_run_run_id`: successful exact-SHA Stage 2 run ID.

Both source run IDs must be supplied together. When they are present the workflow enters `BOUNDED_FORWARD_DECISION` mode and fails closed unless both source workflows are exact-SHA `workflow_dispatch` runs with `conclusion=success`.

The bounded Stage 3 performs two separate read-only responsibilities:

1. captures the full repository-vs-Production migration reconciliation inventory as human-review input without allowing historical local-only backlog to authorize a general deployment;
2. independently rebuilds a fresh temporary workdir from current remote history plus only the exact selected forward manifest and executes a second filtered `db push --dry-run`.

Unknown remote-only migration drift remains a hard failure in every mode.

Bounded Stage 3 must revalidate Stage 1, Stage 2, exact selection digest, current remote history, version ordering and exact pending set. It seals `bounded-production-dry-run-attestation.json` with:

- schema `risck-comply.supabase-forward-bounded-production-dry-run.v1`;
- `mode=BOUNDED_FORWARD_DECISION`;
- exact target SHA and selection digest;
- exact Stage 1/Stage 2 provenance;
- `filteredDbPushDryRunOnly=true`;
- `includeAllUsed=false`;
- `migrationHistoryRepairUsed=false`;
- `productionWriteAuthorized=false`;
- `productionWritePerformed=false`.

The general historical mode of `Supabase Production Migration Dry Run` remains separate and is non-crediting for this bounded forward lane.

## Stage 4 — exact human Decision Gate

Run `Supabase Migration Reconciliation Decision Gate` with:

- `release_sha`: exact unchanged current `main` SHA;
- `source_run_id`: successful bounded Stage 3 `Supabase Production Migration Dry Run` run ID;
- `forward_dry_run_run_id`: successful exact-SHA Stage 2 run ID;
- `decision_payload_b64`: omit on the first template-only run; supply only after real human review on the second run.

In bounded mode the Decision Gate must require the Stage 3 source run itself to have `conclusion=success`, download its artifact and validate `bounded-production-dry-run-attestation.json` against the exact Stage 2 manifest digest before generating the human decision scope.

The Decision Gate then builds an exact filename + SHA-256 subset from the Production reconciliation inventory. It does not infer classifications. A successful reviewed bounded decision requires every selected item to be explicitly classified `PENDING_DEPLOYMENT` with the required human evidence and produces `deploymentAuthorization=NOT_AUTHORIZED`.

A successful Stage 4 proves exact selected-byte human review. It still does not authorize a Production write.

## Stage 5 — human-approved bounded production promotion

`Supabase Forward Reconciliation Production Promotion` is the only Production executor for this lane.

Dispatch requires:

- exact current `main` SHA;
- successful exact-SHA Stage 1 run ID;
- successful exact-SHA Stage 2 run ID;
- successful protected human migration Decision Gate run ID;
- exact human decision subject SHA;
- confirmation `PROMOTE <release_sha> USING DRY-RUN <dry_run_run_id> AND DECISION <decision_run_id>`;
- successful `Production` environment governance preflight;
- protected human deployment approval.

The successful Decision Gate artifact must carry the validated Stage 3 bounded Production dry-run attestation. Stage 5 revalidates that attestation against current target SHA, selection digest and Stage 2 run ID before any Production write and rechecks it again immediately before the write.

Immediately before the write Stage 5:

1. proves current `main` still equals the target SHA;
2. verifies Stage 1, Stage 2 and Decision Gate workflow provenance;
3. recompiles the selected manifest;
4. validates Stage 1/Stage 2 selection digests;
5. validates the bounded Stage 3 attestation;
6. validates exact selected-byte human `PENDING_DEPLOYMENT` coverage;
7. fetches current Production migration history into a fresh temporary workdir;
8. verifies each selected source SHA-256;
9. re-proves version order and exact pending set;
10. executes one final filtered dry-run;
11. revalidates current `main`, bounded Stage 3 and human approval;
12. executes exactly one filtered Production `db push`.

After the write Stage 5:

1. captures the remote migration ledger again;
2. requires `remote-after = remote-before + exactly selected set`;
3. rejects unauthorized or partial migration application;
4. runs canonical live read-only schema/security postconditions;
5. fails release evidence if `main` moved during the promotion window;
6. uploads only redacted exact-SHA evidence.

## Prohibited shortcuts

Never replace these stages with:

- ad-hoc direct Production SQL;
- `db push --include-all`;
- unrestricted general `db push` as bounded-lane evidence;
- migration-history repair;
- manual insertion into `supabase_migrations.schema_migrations`;
- filename-only or catalog-only equivalence;
- automatic historical classification;
- inherited human approval from an older SHA;
- a Production write without successful exact-SHA Stage 1, Stage 2, bounded Stage 3, Stage 4 and protected Stage 5 authorization.

## Rollback boundary

The selected migrations are forward-only. Rollback never means deleting migration history or running migration repair. Use application LKG/rollback for application rollback, governed restore for data recovery and a new reviewed forward migration for schema correction.

## Post-promotion acceptance

After Stage 5, regenerate rather than hand-edit the canonical exact-SHA runtime evidence:

- migration ledger transition acceptance;
- live RLS/tenant isolation;
- Step-Up/runtime readiness;
- SCIM/integration runtime;
- billing runtime;
- controlled Storage boundary;
- recovery/restore drill;
- Production Runtime Proof and authenticated `/api/ready` smoke;
- Enterprise Production Gate and readiness scorecard.

The historical migration backlog remains a separate program. This bounded lane closes only the exact selected forward set through isolated rehearsal, filtered Stage 2 dry-run, bounded Stage 3 Production dry-run, exact human Stage 4 decision and protected Stage 5 promotion.
