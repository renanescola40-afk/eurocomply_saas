# Supabase bounded production change

## Purpose

Compile a protected production authorization packet for only the exact migrations that passed staging. This workflow performs no database write and never authorizes unrestricted `supabase db push`.

## Provenance model

The immutable **subject release SHA** remains the commit whose migrations were reviewed. The current evidence commit may differ from the subject only by these canonical files:

- `docs/security/evidence/runtime/supabase-migration-reconciliation-decisions.json`;
- `docs/security/evidence/accepted/supabase-staging-rehearsal-result.json`;
- `docs/security/evidence/accepted/supabase-bounded-production-change-request.json`.

Any application, migration, workflow or unrelated change fails closed.

## Preconditions

1. Human classifications were accepted for the subject SHA.
2. `Supabase Migration Execution Plan` produced the exact bounded batch plan.
3. `Supabase Staging Rehearsal` reports `STAGING_REHEARSAL_PASSED` and attests the exact staged migration filename/SHA-256 set.
4. Fresh backup/PITR evidence exists and a restore test passed.
5. The maintenance window is in the future and at most four hours.
6. Operator, approver, Incident Commander and rollback owner are named.
7. Operator and approver are different people.
8. Approval has a real timestamp, immutable evidence reference and expiry after the maintenance window.
9. Production and staging project references differ.

## Canonical request

Create:

`docs/security/evidence/accepted/supabase-bounded-production-change-request.json`

from the repository template.

The request must contain:

- immutable subject SHA;
- SHA-256 of the exact staging attestation;
- backup/restore evidence and RPO/RTO;
- maintenance window;
- separation-of-duties roles;
- independent approval evidence;
- rollback command/threshold;
- required post-change checks;
- exact filename and SHA-256 of every staged migration.

The compiler rejects migrations that were not staged, staged/request digest mismatches, omitted staged migrations, copied approval, self-approval, missing backup evidence or an invalid window.

## Compile the authorization packet

Run **Supabase Bounded Production Change** with:

- `release_sha`: immutable subject SHA;
- `rehearsal_run_id`: successful Staging Rehearsal run.

The workflow checks subject ancestry, evidence-only lineage, source workflow provenance and the canonical request path.

A successful result is:

`READY_FOR_PROTECTED_PRODUCTION_EXECUTION`

This means a named operator may request protected execution of only the exact staged set during the approved window. The workflow itself still performs no SQL.

## Execution rules

- Execute only the listed exact migrations and batches.
- Do not add migrations interactively.
- Do not use `--include-all`.
- Keep migration-history repair separate from SQL deployment.
- Validate migration history, schema, cross-tenant RLS, authenticated smoke and observability after each batch.
- Stop immediately on a critical check failure or rollback threshold.

## Post-execution

Retain exact operator actions, timestamps, migration-history before/after, schema/RLS/smoke/observability evidence and rollback outcome. Run the post-execution attestation and drift audit before issue #1415 can close.

## Safety boundary

The compiler does not modify the database or migration history, does not automatically execute production changes and does not make unrestricted database push permissible.
