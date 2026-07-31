# Supabase bounded production change

## Purpose

Execute only the migrations accepted by the exact-SHA reconciliation and staging rehearsal. This process never authorizes an unrestricted `supabase db push`.

## Preconditions

1. The reconciliation artifact is accepted for the current `main` SHA.
2. The protected staging rehearsal reports `STAGING_REHEARSAL_PASSED`.
3. Backup or PITR is verified and a restore test has passed.
4. The maintenance window is in the future and no longer than four hours.
5. Operator, approver, Incident Commander and rollback owner are named.
6. Operator and approver are different people.
7. Every batch contains at most ten migrations and has a rollback reference.
8. The production project reference differs from staging.

## Compile the authorization packet

Run the protected **Supabase Bounded Production Change** workflow with:

- the exact current `main` SHA;
- the successful staging rehearsal run ID;
- a reviewed JSON request stored under `docs/security/evidence/accepted/`.

The compiler returns `BLOCKED` for missing, stale, copied or self-approved evidence. A successful compilation returns `READY_FOR_PROTECTED_PRODUCTION_EXECUTION`, but performs no database write.

## Execution rules

- Execute only the listed batches and only during the approved window.
- Do not add migrations interactively.
- Do not use `--include-all`.
- Keep history-repair operations separate from SQL execution.
- Validate migration history, schema, cross-tenant RLS, authenticated smoke and observability after each batch.
- Stop immediately when a critical check fails or the rollback threshold is met.

## Rollback

The rollback owner decides with the Incident Commander. Preserve before/after migration history, commands, timestamps and outcomes. A rollback must be followed by schema, RLS and application-smoke validation.

## Post-execution attestation

Complete `supabase-production-migration-attestation.json` with workflow provenance, operator, reviewer, batch outcomes and all post-change checks. The reviewer must be independent from the operator.

## Closure rule

Issue #1415 may be closed only when the post-execution drift audit has no unexplained local-only or remote-only versions and the accepted attestation is bound to the deployed SHA. Issue #198 still requires live RLS evidence and the final release gate remains fail-closed.
