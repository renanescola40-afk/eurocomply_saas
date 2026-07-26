# Enterprise Access Runtime SLO

## Purpose

This control plane measures and operates high-volume access changes after policy administration and reconciliation have already decided the intended role, seat type and department.

## Objectives

- operation completion success rate: at least 95% per observation window;
- queue latency warning: oldest pending operation at 15 minutes;
- queue latency critical: oldest pending operation at 60 minutes;
- dead-letter tolerance: zero unreviewed dead-letter operations;
- export integrity: SHA-256 recorded before an export is exposed;
- export retention: generated artifacts expire after 24 hours;
- browser pagination: cursor based and capped at 100 rows per request.

## Snapshot evidence

Each tenant snapshot stores operation totals, completed/failed/dead-letter totals, member-level processed/failed/compensated counts, p50 and p95 duration, oldest pending age and success rate.

Snapshots are append-oriented operational evidence. Browser roles receive no direct table access.

## Alerts

The evaluator creates deterministic tenant-scoped alerts for:

1. any dead-letter operation;
2. queue age at or above 15 minutes;
3. success rate below 95% when at least five operations exist in the window.

Administrators may acknowledge or resolve alerts only through the protected API. Resolution requires a reason and actor evidence.

## Large exports

Large access reports are queued rather than built in a browser request. A worker claims jobs with `FOR UPDATE SKIP LOCKED`, receives a 15-minute lease, writes an object outside the database and completes the job with object key, SHA-256, byte size and row count.

The implementation intentionally does not expose a storage-provider URL. The future download route must mint a short-lived signed URL only after tenant, permission, job status and expiry validation.

## Failure handling

- snapshot failure: report sanitized error and retry the scheduler;
- alert evaluation failure: do not claim runtime health;
- export lease expiry: another worker may safely reclaim the job;
- invalid digest, row count or byte size: reject completion;
- dead-letter alert: human review remains mandatory before closure.

## External validation required

The repository cannot prove production throughput, Microsoft Entra ID behaviour, Okta behaviour, Google Workspace behaviour, storage-provider signed URL behaviour or a real 10,000-user execution. Those remain `EXTERNAL_VALIDATION_REQUIRED`.
