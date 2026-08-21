# Supabase Forward Reconciliation — Production Promotion Checklist

Use this checklist only after the bounded reconciliation implementation has been merged to `main`. It does not authorize a production change by itself.

## Preconditions

- Current `main` SHA is frozen for the promotion window.
- `Production` has administrator bypass disabled, at least one required deployment reviewer and protected-branches-only deployment policy.
- `supabase-production-migration-dry-run` has the same governance boundary.
- `SUPABASE_DB_POOLER_URL` has been rotated/corrected after the tracked credential incident and is available only as a protected environment secret.
- Exact-SHA `Supabase Forward Reconciliation Rehearsal` completed successfully and its protected isolated-production-restore job actually ran.
- Exact-SHA `Supabase Forward Reconciliation Dry Run` completed successfully and its protected remote dry-run job actually ran.
- Exact-SHA `Supabase Migration Reconciliation Decision Gate` completed successfully for the same immutable selected migration bytes and produced an accepted human-review artifact.
- The authoritative selected set in `config/supabase-forward-reconciliation.json` remains byte-for-byte unchanged since rehearsal, dry-run and decision-gate evidence.
- The manifest migration count, ordered filenames, versions and selection digest match across current `main`, Stage 1 evidence, Stage 2 evidence and the accepted decision-gate evidence. Never rely on a hard-coded migration count in a runbook.
- Every selected version is still strictly later than the current production migration head and no selected version is already recorded remotely.
- Current human migration review covers the exact current selected manifest and release SHA; historical approval from an older SHA is non-crediting.
- Backup/recovery readiness and rollback/LKG prerequisites for the same release window are satisfied before any production write.

## Dispatch

Run `Supabase Forward Reconciliation Production Promotion` with:

- `release_sha`: exact current `main` SHA;
- `rehearsal_run_id`: successful exact-SHA Stage 1 run;
- `dry_run_run_id`: successful exact-SHA Stage 2 run;
- `decision_run_id`: successful exact-SHA `Supabase Migration Reconciliation Decision Gate` run;
- `decision_subject_sha`: immutable subject SHA reviewed by that successful decision-gate run;
- `confirmation`: `PROMOTE <release_sha> USING DRY-RUN <dry_run_run_id> AND DECISION <decision_run_id>`.

Approve the protected `Production` deployment only after reviewing the rehearsal, dry-run and decision-gate provenance, current manifest digest, current migration ledger and current change window.

## Required successful outputs

- exact current-main checks before and immediately before write;
- exact rehearsal, dry-run and decision-gate workflow provenance;
- identical immutable selection digest across current manifest and all source proofs;
- accepted human-decision proof bound to the exact selected bytes and release SHA;
- current remote migration history + exactly the selected set in the temporary workdir;
- every selected migration strictly after the remote head and currently unapplied;
- final filtered dry-run PASS;
- exactly one filtered production `db push`;
- no `--include-all`, migration repair or manual migration-ledger insertion;
- remote-after ledger equals remote-before + exactly selected set;
- no unauthorized migration applied and no partial selected set accepted;
- canonical live schema/security postconditions PASS, including the Gap Analysis/remediation persistence boundary when it is part of the selected manifest;
- redacted exact-SHA artifact uploaded without database URLs, credentials, subprocess arguments containing secrets or row data.

## Current Gap Analysis/remediation ordering invariant

When the current manifest contains the Gap Analysis/remediation closure, this order is security-critical and must be preserved in the manifest and evidence digest:

1. `20260816104000_guard_compliance_task_browser_mutations.sql` — install fail-closed authenticated mutation guards before compatibility changes;
2. `20260816104500_reconcile_gap_remediation_persistence.sql` — materialize the missing persistence/runtime schema;
3. `20260816110000_harden_gap_personal_task_write_boundary.sql` — restore the steady-state backend-only organization mutation boundary and release only owner-bound personal task creation.

If any of these files, their order, or their bytes differ from the reviewed manifest, invalidate prior rehearsal/dry-run/decision evidence and start again from Stage 1.

## After promotion

Re-run the canonical exact-SHA runtime producers rather than editing evidence manually:

- Supabase live RLS validation;
- Step-Up/runtime readiness;
- Production Runtime Proof and `/api/ready` authenticated smoke after Vercel Step-Up sync/redeploy;
- Enterprise Recovery Drill;
- P0 Runtime Evidence fan-in;
- Enterprise Production Gate;
- Enterprise Readiness Scorecard.

Also verify the canonical public Vercel deployment serves the same frozen release SHA before crediting production smoke evidence.

If `main` changes during the promotion window, do not reuse the resulting runtime evidence as proof for the newer SHA. Regenerate exact-SHA evidence.

## Rollback boundary

Do not delete migration history or run migration repair as rollback. Use the application LKG/rollback workflow for application rollback, restore procedures for data recovery, and a new reviewed forward migration for schema correction when required.
