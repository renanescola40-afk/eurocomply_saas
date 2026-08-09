# Supabase staging migration rehearsal

## Purpose

Validate the exact pending migration plan on an isolated production-like Supabase project before any production change request. This process is fail-closed and never authorizes unrestricted `supabase db push`.

## Provenance model

The **subject release SHA** remains the immutable commit whose migrations were reviewed. Current `main` may advance only through canonical migration-evidence commits.

For staging, the only permitted evidence files between the subject SHA and current `main` are:

- `docs/security/evidence/runtime/supabase-migration-reconciliation-decisions.json`;
- `docs/security/evidence/accepted/supabase-staging-rehearsal-result.json`.

Any code, workflow, migration or unrelated file change invalidates the lineage.

## Preconditions

- Successful `Supabase Migration Execution Plan` for the subject SHA.
- Zero unresolved split-review items upstream.
- Staging project and database are different from production.
- A staging backup or disposable clone exists.
- Operator and approver are different people.

## Phase 1 — generate immutable staging plan

Run **Supabase Staging Rehearsal** with:

- `release_sha`: immutable subject SHA;
- `execution_plan_run_id`: successful Execution Plan run.

When the canonical reviewed result does not yet exist, the workflow intentionally exits fail-closed after uploading `staging-rehearsal-plan.json`.

The plan is compiled directly from the modern execution-plan artifact and contains the exact filename, SHA-256, order and rollback reference of each pending migration. Every batch remains `executionAuthorized: false`.

## Phase 2 — execute staging manually

Execute the generated batches manually in the approved staging window. After every batch retain:

- migration history before and after;
- schema diff;
- tenant-isolation/RLS evidence;
- authenticated application smoke evidence;
- rollback rehearsal evidence.

Do not run these batches against production.

## Phase 3 — submit reviewed staging result

Copy the staging-result template to the canonical path:

`docs/security/evidence/accepted/supabase-staging-rehearsal-result.json`

Populate:

- immutable subject SHA;
- SHA-256 digest of the exact `staging-rehearsal-plan.json`;
- staging and production project references;
- distinct operator and approver;
- real start/completion timestamps;
- one passing evidence set for every planned batch.

Commit only canonical evidence files. Rerun **Supabase Staging Rehearsal** with the same subject SHA and Execution Plan run ID.

## Passing attestation

A successful run emits `STAGING_REHEARSAL_PASSED` and seals:

- subject SHA;
- exact plan digest;
- reviewed result digest;
- staged migration set digest;
- exact staged filename/SHA-256 set;
- operator and approver;
- batch count and timestamps.

The attestation still sets production authorization to false.

## Stop conditions

Stop immediately when staging resolves to production, a SQL digest differs, migration order changes, a batch fails any required check, operator equals approver, or evidence lineage contains non-canonical changes.

## Next step

Create the canonical bounded production change request and run `Supabase Bounded Production Change`. That compiler permits only the exact migration set proven by this staging attestation.
