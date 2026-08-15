# Supabase Forward Reconciliation — Production Promotion Checklist

Use this checklist only after the Stage 3 workflow has been merged to `main`. It does not authorize a production change by itself.

## Preconditions

- Current `main` SHA is frozen for the promotion window.
- `Production` has administrator bypass disabled, at least one required deployment reviewer and protected-branches-only deployment policy.
- `supabase-production-migration-dry-run` has the same governance boundary.
- `SUPABASE_DB_POOLER_URL` has been rotated/corrected after the tracked credential incident and is available only as a protected environment secret.
- Exact-SHA `Supabase Forward Reconciliation Rehearsal` completed successfully.
- Exact-SHA `Supabase Forward Reconciliation Dry Run` completed successfully and its protected remote job actually ran.
- The 15 selected migrations in `config/supabase-forward-reconciliation.json` remain unchanged since both source proofs.

## Dispatch

Run `Supabase Forward Reconciliation Production Promotion` with:

- `release_sha`: exact current `main` SHA;
- `rehearsal_run_id`: successful exact-SHA Stage 1 run;
- `dry_run_run_id`: successful exact-SHA Stage 2 run;
- `confirmation`: `PROMOTE <release_sha> USING DRY-RUN <dry_run_run_id>`.

Approve the protected `Production` deployment only after reviewing the source-run provenance and current change window.

## Required successful outputs

- exact current-main checks before and immediately before write;
- exact rehearsal and dry-run workflow provenance;
- identical immutable selection digest across current manifest and source dry-run;
- current remote migration history + exactly the selected set in the temporary workdir;
- final filtered dry-run PASS;
- exactly one filtered production `db push`;
- remote-after ledger equals remote-before + exactly selected set;
- no unauthorized migration applied;
- canonical live schema/security postconditions PASS;
- redacted exact-SHA artifact uploaded.

## After promotion

Re-run the canonical exact-SHA runtime producers rather than editing evidence manually:

- Supabase live RLS validation;
- Step-Up/runtime readiness;
- Production Runtime Proof and `/api/ready` authenticated smoke after Vercel Step-Up sync/redeploy;
- Enterprise Recovery Drill;
- P0 Runtime Evidence fan-in;
- Enterprise Production Gate;
- Enterprise Readiness Scorecard.

If `main` changes during the promotion window, do not reuse the resulting runtime evidence as proof for the newer SHA. Regenerate exact-SHA evidence.

## Rollback boundary

Do not delete migration history or run migration repair as rollback. Use the application LKG/rollback workflow for application rollback, restore procedures for data recovery, and a new reviewed forward migration for schema correction when required.
