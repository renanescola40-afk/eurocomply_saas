# RTO / RPO Runtime Results — reconciled 2026-10-04

## Declared targets

Current continuity documentation defines:
- initial core-application RTO target: **4 hours**
- initial database RPO target: **24 hours**, subject to provider backup configuration
- enterprise roadmap: RTO 1 hour / RPO 4 hours or better

## Provider-managed data restore measurement

A real Supabase `Restore to a New Project` recovery proof completed successfully on 2026-09-19.

Evidence:
- GitHub run: `35454743996`
- exact SHA: `3ca4fb6ee913e686071bcd427db60cd4f7e60991`
- evidence schema: `risck-comply.backup-restore-evidence.v2`
- provider-managed physical backup clone: PASS
- data integrity: PASS
- Auth-user integrity: PASS
- RLS after restore: PASS
- migration-history match: PASS

Measured:
- **RPO = 41,240 seconds (~11h27m20s)**
- **RTO = 10 seconds**

Against the declared initial targets:
- measured database-data RPO is within **24 hours** → PASS
- measured provider restore RTO is within **4 hours** → PASS

These measurements belong to the successful 2026-09-19 provider-managed restore exercise and must not be represented as a fresh measurement for the current main SHA.

## Current schema/control-plane measurement

On 2026-10-03 a clean disposable recovery environment reconstructed:
- 113 / 113 canonical migrations
- 107 / 107 public tables
- 107 / 107 RLS-enabled public tables

Elapsed schema/control-plane replay:
- approximately **2h09m**

Therefore:

`CURRENT_SCHEMA_RECOVERY_RTO_4H_TARGET=PASS`

This is a current-schema/control-plane measurement, not a full application service RTO.

## Provider backup availability revalidation

On 2026-09-28 the protected provider runtime proof observed:
- backup inventory reachable
- backup capability active
- managed backup observed
- **8 completed managed backups**
- PITR disabled

Daily managed physical backup capability was therefore present and healthy after the last real restore exercise.

## Current classification

- PROVIDER_MANAGED_RESTORE_RTO=PROVEN
- DATABASE_DATA_RPO=PROVEN
- DATABASE_DATA_RPO_24H_TARGET=PASS
- PROVIDER_RESTORE_RTO_4H_TARGET=PASS
- CURRENT_SCHEMA_RTO=PROVEN_WITHIN_4H_TARGET
- FULL_APPLICATION_RTO_CURRENT_SHA=OPEN
- CURRENT_SHA_DATA_RPO_REMEASUREMENT=OPEN
- STORAGE_OBJECT_RPO=OPEN

## Important boundary

Supabase database backups do not restore the underlying Storage objects; they restore database content including Storage metadata. Storage-object continuity therefore requires its own object-level backup/replication/recovery evidence and is not inferred from database-restore PASS.
