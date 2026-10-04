# DR Runtime Evidence — reconciled 2026-10-04

Status: PROVIDER-MANAGED DATA RESTORE PROVEN HISTORICALLY / CURRENT SCHEMA REPLAY PROVEN / CURRENT-EXACT-SHA FULL APPLICATION RECOVERY OPEN.

## Evidence lineage

This document reconciles valid evidence from three independent dates instead of discarding earlier provider-managed restore proof.

### 1. Provider-managed physical backup clone — 2026-09-19

GitHub Actions run:
- workflow: `Recovery Resilience Proof`
- run id: `35454743996`
- release SHA: `3ca4fb6ee913e686071bcd427db60cd4f7e60991`
- conclusion: `success`
- artifact: `recovery-resilience-proof-3ca4fb6ee913e686071bcd427db60cd4f7e60991`
- artifact digest: `sha256:340fcaf3a60e0624c304e29bc7ba8e03a88b0680eaf3de403ffafbf463d697e6`

The retained `backup-restore-tested.json` is schema `risck-comply.backup-restore-evidence.v2` and records:
- `status=Complete`
- `outcome=passed`
- `backupExists=true`
- `restoreExecuted=true`
- `providerManagedRestore=true`
- `providerBackupObserved=true`
- legacy v2 `dataIntegrity=true` (bounded aggregate relationship only; **not** exact row completeness)
- legacy v2 `authUsersIntegrity=true` (bounded aggregate relationship only; **not** exact Auth-row completeness)
- `rlsAfterRestore=true`
- `rlsPoliciesPresent=true`
- `migrationHistoryMatchesSource=true`
- `noExternalDatabaseBindings=true`
- `productionObservationReadOnly=true`
- `rpoMeasured=true`
- `rtoMeasured=true`

Measured values from that real provider-managed clone:
- RPO: **41,240 seconds** (~11h27m20s)
- RTO: **10 seconds**
- recovery mode: `supabase-provider-managed-physical-backup-clone`
- migration versions compared at that point: **97**
- forward postconditions: executed and passed

The evidence explicitly states that GitHub Actions did not create or retain a Production data dump, row data, credentials, project references, backup identifiers or database URLs.

Important integrity boundary: the retained v2 verifier compared aggregate counts observed after restore with the then-live source and required restored counts not to be ahead of the source. It did **not** retain backup-time expected row counts or row/content digests for the restored clone. Therefore it proves provider-managed restore execution, bounded aggregate consistency, migration/RLS invariants and measured timing, but not exact customer/Auth row completeness.

### 2. Provider backup capability revalidation — 2026-09-28

GitHub Actions run:
- workflow: `Production Provider Runtime Proof`
- run id: `36407725683`
- release SHA: `0fdec34b19b200aaab44e8f5495aebe8a6b77d6c`
- conclusion: `success`

Retained provider evidence records:
- `backupInventoryReachable=true`
- `backupCapabilityObserved=true`
- `managedBackupObserved=true`
- completed managed backups observed: **8**
- `productionEligiblePlan=true`
- `pitrEnabled=false`
- provider blocker count: **0**

This proves the managed-backup control plane remained available after the 2026-09-19 clone exercise.

### 3. Current canonical schema/control-plane recovery — 2026-10-03

A dedicated non-production Supabase recovery environment was exercised with no Production customer rows copied.

Final current-schema result:
- canonical migrations expected through `20261003173930`: **113**
- canonical migrations applied: **113**
- canonical migrations missing: **0**
- public tables: **107 / 107**
- RLS-enabled public tables: **107 / 107**
- branch state: `FUNCTIONS_DEPLOYED`
- schema/control-plane replay elapsed: approximately **2h09m**

The clean replay reproduced historical migration drift and exercised the recovery path before reaching the final current schema.

## Current production binding

At reconciliation time:
- current GitHub `main`: `bd7817e726d9bdb4dba61a2f68f090050df9a607`
- Vercel Production deployment: `dpl_2abhKm9m4QcRGjBqUEr4hwUTuqcR`
- Vercel state: `READY`
- Vercel target: `production`
- deployed Git SHA: `bd7817e726d9bdb4dba61a2f68f090050df9a607`
- rollback candidate: `true`

## What is proven

- SOURCE_RECOVERY=PROVEN
- PROVIDER_MANAGED_BACKUP_AVAILABILITY=PROVEN
- PROVIDER_MANAGED_PHYSICAL_BACKUP_CLONE=PROVEN
- PROVIDER_MANAGED_DATA_RESTORE_EXECUTION=PROVEN
- CUSTOMER_DATA_RESTORE_COMPLETENESS=NOT_FULLY_PROVEN
- AUTH_DATA_RESTORE_COMPLETENESS=NOT_FULLY_PROVEN
- RESTORED_RLS_VALIDATION=PROVEN
- HISTORICAL_RESTORED_PROJECT_TENANT_ISOLATION_RUNTIME=PROVEN
- RESTORED_POLICY_VALIDATION=PROVEN
- RESTORED_MIGRATION_LEDGER_MATCH=PROVEN
- RPO_MEASUREMENT_CAPABILITY=PROVEN
- RTO_MEASUREMENT_CAPABILITY=PROVEN
- CURRENT_CANONICAL_DATABASE_REPLAY=PROVEN
- CURRENT_PUBLIC_TABLE_PARITY=PROVEN
- CURRENT_RLS_ENABLE_PARITY=PROVEN
- CURRENT_SCHEMA_RTO_WITHIN_4H=PROVEN
- CURRENT_MAIN_PRODUCTION_SHA_ALIGNMENT=PROVEN
- VERCEL_ROLLBACK_CANDIDATE_IDENTIFICATION=PROVEN
- LIVE_VERCEL_ROLLBACK_EXECUTION=PROVEN
- VERCEL_FORWARD_RESTORE_TO_INTENDED_DEPLOYMENT=PROVEN
- POST_ROLLBACK_PRODUCTION_HEALTH=PROVEN

## Residual scope that remains open

The September provider-managed clone predates the current 113-migration schema. The October exercise proves the current schema can be reconstructed, but it intentionally used `with_data=false`.

Therefore the following must not be represented as current-exact-SHA proof:
- current-main provider-managed clone repeated against the 113-migration schema;
- full application boot/login/dashboard/inventory/assessment/documents/audit smoke bound to that newly restored clone;
- current-main full-service RTO;
- current-main fresh cross-tenant Auth/RLS fixture executed specifically on a provider-restored clone;
- Storage object restore. Supabase database backups restore Storage metadata stored in Postgres, not the underlying Storage objects themselves;
- exact byte-for-byte auxiliary-object parity of the October clean replay.

## Final classification

- BACKUP=PASS
- PROVIDER_BACKUP_INVENTORY=PASS
- RESTORE_CAPABILITY=PASS
- PROVIDER_MANAGED_DATA_RESTORE_EXECUTION=PASS
- CUSTOMER_DATA_RESTORE_COMPLETENESS=OPEN
- AUTH_DATA_RESTORE_COMPLETENESS=OPEN
- POST_RESTORE_RLS=PASS
- HISTORICAL_POST_RESTORE_TENANT_ISOLATION=PASS
- RPO=PROVEN (measured historical provider-managed restore: ~11h27m20s)
- PROVIDER_RESTORE_RTO=PROVEN (measured historical provider-managed restore: 10s)
- CURRENT_SCHEMA_REPLAY=PASS
- CURRENT_SCHEMA_RTO=PASS
- LIVE_VERCEL_ROLLBACK=PASS
- PRODUCTION_RETURN_AFTER_ROLLBACK=PASS
- FULL_APPLICATION_RECOVERY_CURRENT_SHA=OPEN
- STORAGE_OBJECT_RECOVERY=OPEN
- CURRENT_EXACT_SHA_PROVIDER_CLONE=OPEN

## Live deployment rollback exercise — 2026-10-04

A controlled Vercel rollback was executed from deployment `dpl_DEJ4TPCEPeC7xoyDWdzaJ2wd1TnW` / SHA `bd435ac11b46cab2f0f84a215d74cc63784a6b65` to prior READY deployment `dpl_AkWMF5d9XuBye6Vp8bXNLMoKCEUE` / SHA `8489f7001cd4e98c8d93deb24593fc4cd6937719`.

The production aliases were observed on the rollback target. The intended current deployment was then promoted back. Final Vercel hostname resolution for `www.risckcomply.com` returned `dpl_DEJ4TPCEPeC7xoyDWdzaJ2wd1TnW`, and `/api/health` returned HTTP 200 with `{"status":"ok"}` and no-store cache headers.

See `docs/dr/ROLLBACK_REHEARSAL.md`.

## Safety attestations

- No Production restore was executed during the 2026-10-03 schema replay.
- No Production customer rows were copied into the October disposable branch.
- Historical provider-managed restore evidence was generated through an isolated Restore-to-New-Project target.
- No outbound email was sent by this reconciliation.
