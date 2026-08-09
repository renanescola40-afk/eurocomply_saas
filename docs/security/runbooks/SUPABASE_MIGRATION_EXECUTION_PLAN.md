# Supabase Migration Execution Plan

## Purpose

Compile an accepted human classification set into deterministic staging/deployment batches without executing SQL or changing migration history.

The plan is intentionally **pre-staging**. Requiring completed staging evidence here would create a circular dependency because staging needs the plan first.

## Provenance

The workflow receives:

- immutable **subject release SHA**;
- successful `Supabase Migration Reconciliation Decision Gate` run ID.

It checks that the subject SHA is an ancestor of current `main` and that the lineage contains only the canonical migration decisions evidence file. The successful Decision Gate run must belong to the current evidence commit.

## Inputs

The decision artifact must contain:

- `decision-result.json` with `accepted: true` and `RECONCILIATION_ACCEPTED_FOR_STAGING`;
- `pending-deployment-plan.json`;
- `migration-history-repair-candidates.json`.

For each `PENDING_DEPLOYMENT` item the plan requires:

- exact schema evidence reference;
- unique positive deployment order;
- rollback reference.

It does **not** pretend staging already occurred. `stagedExecutionEvidenceReference` may remain null until the protected staging rehearsal is completed.

## Output

`execution-plan.json` contains:

- ordered batches of at most 1–25 migrations;
- exact filename, SHA-256, version and reviewed order;
- schema evidence and rollback reference for every pending migration;
- history-repair candidates kept separate from SQL batches;
- mandatory staging preconditions and postconditions;
- `executionAuthorized: false` for every batch;
- `productionWriteAuthorized: false` globally.

Expected status:

`PLANNING_COMPLETE_AWAITING_STAGING_REHEARSAL`

## Next step

Run `Supabase Staging Rehearsal` with the same immutable subject SHA and this workflow's successful run ID.

The staging workflow first generates an immutable plan. Operators then execute those exact batches manually on an isolated production-like staging project and retain migration-history, schema, RLS, authenticated-smoke and rollback evidence. Only a separately reviewed result can produce `STAGING_REHEARSAL_PASSED`.

## Separation of duties

- `ALREADY_PRESENT_IN_SCHEMA` remains a history-repair candidate only.
- `PENDING_DEPLOYMENT` is planned for staging, not authorized for production.
- `SUPERSEDED` and `ARCHIVE_LEGACY` never enter SQL batches.
- Any remaining `REQUIRES_SPLIT_REVIEW` prevents classification acceptance upstream.

## Safety boundary

This workflow does not connect to Supabase, execute SQL, repair history, perform staging, authorize production, or allow unrestricted `supabase db push`.
