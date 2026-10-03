# RISCK COMPLY — Migration Replay Drift Closure Evidence

Date: 2026-10-03
Lane: Enterprise Performance + Scale / Lane A
Production mutation: NONE
Main mutation: NONE
MaaSec target mutation: NONE

## Executive finding

A fresh Supabase performance branch cannot currently replay the production migration history to head.

Observed production migration ledger:
- migration count: 113
- last version: 20261003173930

Observed fresh branch before failure:
- migration count: 26
- last successfully replayed production version: 20260812224650
- next failing historical migration: 20260812225906_consolidate_canonical_rls_and_client_grants

The current GitHub migration source for 20260812225906 contains historical clean-replay compatibility logic that accepts a legitimate 0/N canonical-policy state and fails only after partial materialization. The migration body stored in the production Supabase migration ledger is older/stricter and requires canonical policies that are not materialized at that historical replay point.

Therefore:

SOURCE_MIGRATION != APPLIED_LEDGER_STATEMENT

This is migration-history/source drift, not a production runtime schema failure.

## Reproduction

1. Create a fresh Supabase branch from production with data copying disabled.
2. Branch provisioning applies production migration history.
3. Replay reaches 20260812224650.
4. Replay attempts 20260812225906.
5. Historical guard requires canonical policy names on subscriptions, audit_logs and invitations.
6. Twelve required historical policies are absent at that replay point (4 per table).
7. Migration aborts.
8. Branch reports MIGRATIONS_FAILED.

The same failure pattern is visible on multiple independently-created disposable/preview branches, so this is reproducible and not branch-specific.

## Security interpretation

The current GitHub source is fail-closed and safer for clean replay because it distinguishes:
- 0/N policies materialized: legitimate historical state; continue.
- partial policy materialization: inconsistent state; fail closed.

No recommendation is made to weaken RLS, disable RLS, or convert policies to permissive true predicates.

## Why performance benchmarking is blocked

A performance benchmark branch must have schema/migration parity with production before any result can be treated as evidence.

Required gate:

MIGRATION_PARITY = 113/113
SCHEMA_PARITY = PASS
SECURITY_FINGERPRINT_PARITY = PASS

Until those gates pass, index and load-test results would not represent the current SaaS schema.

## Supported remediation path after MaaSec freeze

Follow Supabase migration-history reconciliation rather than editing production schema ad hoc:

1. Pin current repository/main and production schema fingerprints.
2. Run `supabase migration list` against the linked production project.
3. Pull the current remote schema into a reviewed migration snapshot if required (`supabase db pull --linked`).
4. Reconcile local migration files against remote migration history.
5. Use `supabase migration repair` only for migration tracking entries proven to be incorrect.
6. Do not mark a migration applied/reverted unless the actual production schema state has independently been verified.
7. Recreate a fresh disposable branch.
8. Require replay to reach migration head with no manual SQL bridge.
9. Compare table/function/index/trigger/RLS/policy/grant fingerprints against production.
10. Only then begin performance benchmarks and staged load testing.

## Safety conditions for migration repair

- No `migration repair` during MaaSec freeze.
- No direct edits to `supabase_migrations.schema_migrations` by SQL.
- No destructive production reset.
- No RLS weakening.
- No production schema DDL merely to make branch replay green.
- Every history repair must be backed by repository source + actual production schema evidence.
- Re-run security/performance advisors after any post-freeze reconciliation.

## Performance-lane effect

The performance lane has completed all safe analysis that does not require a schema-faithful isolated environment.

Completed:
- 89 unindexed FK findings reconciled.
- unused-index findings reviewed and demonstrated to be workload-dynamic.
- production connection/cache/lock baseline captured.
- critical query read-only EXPLAIN evidence captured.
- application workload surface mapped.
- staged load-test plan defined.
- Auth absolute-connection finding reconciled.
- disposable performance environment attempted and isolated.
- clean-replay failure reproduced and root-caused.
- paid disposable performance branch deleted after invalidity was established.

Remaining before PERFORMANCE_SCALE=100%:
- post-freeze migration-history reconciliation.
- clean replay 0 -> current migration head.
- schema/security parity proof.
- isolated synthetic data generation.
- candidate index before/after benchmarks.
- staged 10/25/50/100/250/500/1000 load test where safe.
- P50/P95/P99, throughput, error rate and DB/Auth connection headroom.
- final post-freeze production changes only if benchmark evidence supports them.
- production revalidation.

## Current attestation

PRODUCTION_CHANGED=NO
MAIN_CHANGED=NO
RLS_PRODUCTION_CHANGED=NO
AUTH_PRODUCTION_CHANGED=NO
MAASEC_TARGET_CHANGED=NO
PERFORMANCE_DISPOSABLE_BRANCH_ACTIVE=NO
PERFORMANCE_SCALE_STATUS=BLOCKED_BY_MIGRATION_HISTORY_RECONCILIATION
