# RISCK COMPLY — Backup / Restore Evidence Reconciliation

Date: 2026-09-24  
Status: `SCHEMA_RECOVERY_REHEARSAL_EVIDENCED / DATA_RESTORE_NOT_PROVEN`

## Read-only provider evidence

Production Supabase project:
- project: `tganhbbhfxcpblmgqprg`
- region: `eu-west-1`
- state observed: active/healthy

Existing recovery project:
- project: `wsjswdrwhyughactoxcf`
- name: `risck-comply-s1-restore-2026-09-02`
- region: `eu-west-1`
- state observed: active/healthy

The recovery project contains the application schema/migration lineage through the recovery point, but current table inspection shows zero customer/application rows. Therefore it is valid evidence of a schema/recovery rehearsal environment, **not** evidence that customer data was restored from a production backup.

## Integrity conclusion

```text
ISOLATED_RECOVERY_ENVIRONMENT=EVIDENCED
SCHEMA_RECOVERY_PATH=EVIDENCED
PRODUCTION_MUTATION=NONE
CUSTOMER_DATA_RESTORE=NOT_PROVEN
MEASURED_RESTORE_DURATION=NOT_AVAILABLE
MEASURED_RPO=NOT_AVAILABLE
BACKUP_RESTORE_TEST=WAITING_PROVIDER_FACT_OR_SAFE_DATA_RESTORE_EXERCISE
```

No new restore project is required by this reconciliation. A future data-restore exercise must use a provider-supported isolated target or other non-production recovery path, record start/end timestamps, identify the backup/recovery point and run integrity checks without restoring over production.
