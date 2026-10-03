# Restore Test Report — 2026-10-03

## Objective

Prove recovery on disposable non-production infrastructure without changing Production or the MaaSec target.

## Result summary

Two different recovery claims are intentionally separated:

1. **Current canonical database/schema replay:** PROVEN.
2. **Customer-data backup/PITR restore:** NOT PROVEN.

A Supabase development branch is not a production-data backup restore. The dedicated DR branch was created with `with_data=false`, so successful schema replay cannot be used as evidence that customer rows were restored.

## Dedicated DR target

- branch: `dr-runtime-proof-20261003`
- project ref: `golphfkmphanlntboxah`
- parent: `tganhbbhfxcpblmgqprg`
- final observed state: `FUNCTIONS_DEPLOYED`

Existing pentest-labelled branches were not modified or used as restore targets.

## Canonical replay proof

Final ledger reconciliation:

- expected canonical migrations: **113**
- applied canonical migrations: **113**
- missing canonical migrations: **0**
- latest canonical migration: `20261003173930_reconcile_ai_incident_atomic_rpc`

Final exposed-table posture:

- DR public tables: **107**
- Production public tables: **107**
- DR RLS-enabled public tables: **107**
- Production RLS-enabled public tables: **107**

Result:

`DATABASE_SCHEMA_REPLAY=PROVEN`

## Replay defects discovered and recovered

The exercise reproduced historical migration/replay drift in a truly clean environment. Instead of weakening production, branch-only compatibility bridges were used to reconstruct missing historical prerequisites and ACL contracts. The replay then progressed through every current canonical migration.

This is positive DR evidence because it demonstrates both a real clean-recovery failure mode and a successful isolated recovery path. It is also evidence that the current migration corpus is not self-sufficient from a pristine environment without compatibility reconstruction.

## Data restore boundary

No production data was copied. Checked core data surfaces remained empty in the isolated branch. Therefore this exercise did not prove:

- backup snapshot recovery
- PITR selection/recovery
- production row counts after restore
- customer-object Storage recovery
- a measurable production-data recovery point

Result:

`CUSTOMER_DATA_RESTORE=NOT_PROVEN`

## Verdict

- SCHEMA_REPLAY=PROVEN
- CANONICAL_MIGRATION_LEDGER=113/113
- TABLE_PARITY=107/107
- RLS_ENABLE_PARITY=107/107
- CUSTOMER_DATA_BACKUP_RESTORE=NOT_PROVEN
- STORAGE_OBJECT_RESTORE=NOT_PROVEN
- PRODUCTION_MUTATION=NONE
