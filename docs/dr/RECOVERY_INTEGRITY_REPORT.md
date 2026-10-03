# Recovery Integrity Report — reconciled 2026-10-04

## Evidence model

Recovery integrity is supported by two complementary runtime proofs:

1. a **real provider-managed physical backup clone** on 2026-09-19, proving Production-snapshot data/Auth/RLS restore capability;
2. a **current canonical clean replay** on 2026-10-03, proving the present 113-migration schema/control plane can be reconstructed.

Neither proof is discarded or silently promoted beyond its scope.

## Provider-managed restore integrity — 2026-09-19

Successful evidence run `35454743996` records:
- provider-managed restore: PASS
- backup observed on source: PASS
- distinct source/restore databases: PASS
- same organization: PASS
- same region: PASS
- critical data counts observed and validated: PASS
- restored counts not ahead of source: PASS
- Auth-user integrity: PASS
- RLS after restore: PASS
- RLS policies present: PASS
- migration history matches source: PASS
- no foreign servers/tables in restored target: PASS
- forward reconciliation postconditions executed and passed: PASS
- no Production dump created on GitHub runner: PASS

`CUSTOMER_DATA_RESTORE_INTEGRITY=PASS`
`AUTH_DATA_RESTORE_INTEGRITY=PASS`
`POST_RESTORE_RLS_INTEGRITY=PASS`

## Current canonical migration integrity — 2026-10-03

- canonical migrations expected: **113**
- canonical migrations applied: **113**
- canonical migrations missing: **0**

`CURRENT_CANONICAL_MIGRATION_INTEGRITY=PASS`

## Current table / RLS integrity

Current clean replay:
- public tables: **107**
- RLS-enabled public tables: **107**

Production snapshot at the time of the exercise:
- public tables: **107**
- RLS-enabled public tables: **107**

`CURRENT_PUBLIC_TABLE_PARITY=PASS`
`CURRENT_RLS_ENABLE_PARITY=PASS`

## Referential integrity

October clean replay:
- public foreign keys: **238**
- unvalidated foreign keys: **0**

Production at that exercise:
- public foreign keys: **250**
- unvalidated foreign keys: **1**

All foreign keys materialized in the recovered clean-replay environment were validated.

`RECOVERED_FK_VALIDATION=PASS`
`EXACT_FK_PARITY=OPEN`

## Auxiliary-object parity

October clean-replay counts:

| Object | DR | Production |
|---|---:|---:|
| Public functions | 127 | 134 |
| Public indexes | 334 | 417 |
| Public triggers | 68 | 73 |
| Public foreign keys | 238 | 250 |

The current clean replay proves canonical migration completion and table/RLS parity, but it does not prove byte-for-byte auxiliary-object identity.

`EXACT_AUXILIARY_OBJECT_PARITY=OPEN`

## Storage boundary

Provider-managed database restore proves database data and Storage metadata stored in Postgres. It does **not** prove restoration of the underlying Storage objects.

`STORAGE_METADATA_DATABASE_RECOVERY=SUPPORTED_BY_DATABASE_RESTORE`
`STORAGE_OBJECT_RECOVERY=OPEN`

## Current-exact-SHA boundary

The last provider-managed data restore proof predates the current 113-migration schema. The current schema replay is newer but intentionally contains no Production rows.

Therefore:
- provider-managed data-restore capability: PROVEN
- current schema reconstructability: PROVEN
- current-exact-SHA provider data clone: OPEN
- full application smoke against current provider-restored clone: OPEN

## Verdict

- PROVIDER_MANAGED_BACKUP_RESTORE_INTEGRITY=PASS
- CUSTOMER_DATA_RESTORE_INTEGRITY=PASS
- AUTH_RESTORE_INTEGRITY=PASS
- POST_RESTORE_RLS_INTEGRITY=PASS
- CURRENT_CANONICAL_REPLAY_INTEGRITY=PASS
- CURRENT_PUBLIC_TABLE_PARITY=PASS
- CURRENT_RLS_ENABLE_PARITY=PASS
- RECOVERED_FK_VALIDATION=PASS
- STORAGE_OBJECT_RECOVERY=OPEN
- EXACT_AUXILIARY_OBJECT_PARITY=OPEN
- CURRENT_EXACT_SHA_PROVIDER_CLONE=OPEN
