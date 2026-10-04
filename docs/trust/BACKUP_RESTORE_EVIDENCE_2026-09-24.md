# RISCK COMPLY — Backup / Restore Evidence Reconciliation

Date: 2026-09-24  
Status: `DATA_BEARING_RECOVERY_SNAPSHOT_EVIDENCED / TIMING_AVAILABLE_FROM_SEPARATE_PROVIDER_DRILL`

## Read-only provider evidence

Production Supabase project:
- project: `tganhbbhfxcpblmgqprg`
- region: `eu-west-1`
- state observed: `ACTIVE_HEALTHY`

Existing recovery project:
- project: `wsjswdrwhyughactoxcf`
- name: `risck-comply-s1-restore-2026-09-02`
- region: `eu-west-1`
- state observed: `ACTIVE_HEALTHY`
- provider project creation timestamp: `2026-09-02T15:12:12.483578Z`

## Data-bearing recovery lineage verification

A read-only reconciliation was performed on 2026-09-24. No customer/application rows were modified.

For each representative tenant/application table, production was bounded to rows created no later than the recovery project's provider creation timestamp. The resulting row counts and deterministic digests of ordered row IDs were compared with the recovery project.

| Table | Production rows at cutoff | Recovery rows | ID digest match |
| --- | ---: | ---: | --- |
| `organizations` | 255 | 255 | PASS |
| `organization_members` | 193 | 193 | PASS |
| `ai_systems` | 3 | 3 | PASS |
| `documents` | 72 | 72 | PASS |

All four deterministic ID digests matched exactly.

### Read-only revalidation — 2026-10-04

The same bounded lineage comparison was executed again directly against Production and the still-active isolated recovery project `wsjswdrwhyughactoxcf`.

Revalidated results:

| Table | Production rows at cutoff | Recovery rows | Deterministic ID SHA-256 |
| --- | ---: | ---: | --- |
| `organizations` | 255 | 255 | MATCH |
| `organization_members` | 193 | 193 | MATCH |
| `ai_systems` | 3 | 3 | MATCH |
| `documents` | 72 | 72 | MATCH |

`REPRESENTATIVE_ROWSET_LINEAGE_REVALIDATED_2026_10_04=PASS_4_OF_4`

This revalidation proves that the data-bearing recovery project has retained the same representative bounded row lineage. It still does not prove byte-for-byte completeness of every Production table or reconstruct historical updates/deletes outside the bounded comparison.

This supersedes the earlier statement that the recovery environment contained zero application rows. The isolated recovery project is demonstrably data-bearing and its representative tenant/application rowset matches the production lineage at the bounded recovery cutoff.

The comparison does **not** independently identify which Supabase backup/clone mechanism produced the recovery project, and it does not reconstruct historical updates/deletes beyond the evidence represented by the compared rowsets. It therefore must not be described as an independently measured PITR event.

## Provider backup facts

Current Supabase documentation states that Pro projects receive daily backups with a seven-day retention window. PITR is a separate add-on and, when enabled, provides finer-grained recovery points. Provider restore operations can make the source project unavailable during an in-place restore, so no destructive restore is authorized against production for this diligence exercise.

## Integrity conclusion

```text
ISOLATED_RECOVERY_ENVIRONMENT=PASS_EVIDENCED
SCHEMA_RECOVERY_PATH=PASS_EVIDENCED
DATA_BEARING_RECOVERY_SNAPSHOT=PASS_EVIDENCED
REPRESENTATIVE_ROWSET_LINEAGE=PASS_4_OF_4_TABLES
PRODUCTION_MUTATION=NONE
BACKUP_MECHANISM_SOURCE=NOT_INDEPENDENTLY_ATTESTED
MEASURED_RESTORE_DURATION_RTO=AVAILABLE_FROM_SEPARATE_2026_09_19_PROVIDER_DRILL
MEASURED_RPO=AVAILABLE_FROM_SEPARATE_2026_09_19_PROVIDER_DRILL
DESTRUCTIVE_PRODUCTION_RESTORE=NOT_PERFORMED
```

A separate provider-managed isolated restore drill on 2026-09-19 subsequently supplied measured restore timing and RPO evidence. These two evidence sets are complementary but must not be conflated as if they were the same restored project. A future current-release restore should combine provider-timed restore provenance and backup-bound content-completeness evidence in one exact-release exercise.
