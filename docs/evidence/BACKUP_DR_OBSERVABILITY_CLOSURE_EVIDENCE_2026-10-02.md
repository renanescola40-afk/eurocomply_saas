# RISCK COMPLY — Backup / DR / Observability Closure Evidence Register

Date: 2026-10-02  
Mode: documentation-only / read-only provider verification  
MaaSec target mutation: NONE  
Email sent: NONE

## Verified anchors

- GitHub default branch: `main`.
- Inspected baseline SHA: `82715c36e9d6e9e96205f52eb0d4f61f52349f22`.
- `main` was observed protected with required CI/security checks.
- Vercel project: `prj_APpXAyQFy1Gie50xfbO45zjkyUSm`.
- Current production deployment observed for the baseline SHA: `dpl_7KsKZjZMkFP6nshs53E5p7J5GvQj`, state `READY`, target `production`, and marked as a rollback candidate.
- Earlier production deployments were also observed as rollback candidates, demonstrating retained rollback history; no rollback was executed.
- Supabase project `tganhbbhfxcpblmgqprg` was observed `ACTIVE_HEALTHY`, region `eu-west-1`, Postgres 17.
- Supabase organization was observed on `pro` / `tier_pro`.
- Supabase current provider documentation states Pro projects receive automatic daily database backups with 7 days of retention. PITR is available as an add-on; enabled state was not proven for this project.
- Supabase provider documentation states database backups do not restore Storage API object bytes; only database metadata is within database backup scope.
- In the inspected 24-hour Supabase log window, observed sources included `edge_logs`, `postgres_logs`, `auth_logs`, `storage_logs`, `pgbouncer_logs`, `auth_audit_logs`, `postgrest_logs`, `supavisor_logs`, and `realtime_logs`.
- Vercel grouped runtime error evidence showed application/Sentry reporting, route-level visibility, deployment IDs and request IDs where emitted.

## Control evidence matrix

| Control | CONFIGURED | DOCUMENTED | OBSERVED | PROVEN | EXTERNAL_DEPENDENCY | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Managed DB backup eligibility | YES | YES | YES | Provider capability only | YES | Pro plan observed; provider daily backup capability documented. |
| Daily DB backup retention | Provider-managed | YES | Plan observed | Not restore-proven | YES | 7-day Pro provider capability; account backup inventory itself not enumerated by connector. |
| PITR | UNKNOWN | YES | NO | NO | YES | Available add-on; enabled state not asserted. |
| Production DB restore | Available by provider workflow | YES | NO destructive test | NO | YES | `RESTORE_RUNTIME_PROOF=PENDING_SAFE_DR_EXERCISE`. |
| Logical DB export | Supported | YES | NO fresh export | NO | YES | CLI/pg_dump recovery path documented. |
| Schema/migration recovery | YES | YES | YES | Historical engineering evidence exists, full DR timing not proven here | NO | Repository versioning observed. |
| GitHub source recovery | YES | YES | YES | Recovery timing not exercised | YES | Protected source/history observed. |
| Vercel rollback | YES | YES | YES | Capability observed, no rollback executed | YES | Current and prior production rollback candidates observed. |
| Secrets recovery | Provider/account process | YES | NO | NO | YES | Secret values deliberately excluded. |
| Storage object recovery | UNKNOWN | YES | NO | NO | YES | Explicit known gap; DB backup is insufficient for object bytes. |
| Vercel runtime logs | YES | YES | YES | YES for visibility | YES | Runtime error clusters accessible read-only. |
| Sentry application error path | Present | YES | YES | YES for emitted sample evidence | YES | Sentry-tagged application errors observed. |
| Supabase database logs | YES | YES | YES | YES for visibility | YES | `postgres_logs` observed. |
| Supabase auth logs | YES | YES | YES | YES for visibility | YES | `auth_logs` and `auth_audit_logs` observed. |
| Supabase storage logs | YES | YES | YES | YES for visibility | YES | `storage_logs` observed. |
| Request/correlation IDs | Partial | YES | YES | PARTIAL | NO | IDs observed in smoke evidence; some historical errors showed `req_unavailable`. |
| Automated paging/on-call | UNKNOWN | YES | NO | NO | YES | No 24/7 or automated paging claim. |
| Exact provider log retention | UNKNOWN | YES | NO | NO | YES | Kept FACT_REQUIRED rather than invented. |

## Requested artifact reconciliation

All internally controllable requested documentation capabilities are now covered by the two canonical operations documents plus this evidence register.

### Backup / DR / continuity
- Backup Policy — covered.
- Backup Inventory — covered.
- Backup Responsibility Matrix — covered.
- Restore Runbook — covered.
- Database Recovery Runbook — covered.
- Application Recovery Runbook — covered.
- Vercel Rollback Runbook — covered.
- GitHub Recovery Runbook — covered.
- Secrets Recovery Runbook — covered.
- Storage Recovery Runbook — covered.
- Disaster Recovery Plan — covered.
- Business Continuity Plan — covered.
- Service Recovery Priorities — covered.
- Dependency Failure Matrix — covered.
- Provider Outage Matrix — covered.
- DR Test Plan — covered.
- DR Test Evidence Template — covered.
- RTO/RPO Matrix — covered with TARGET / provider capability / proven-result distinction.

### Observability / incident readiness
- Observability Architecture Document — covered.
- Logging Policy — covered.
- Log Retention Matrix — covered.
- Event Sources Matrix — covered.
- Alerting Matrix — covered.
- Health Check Runbook — covered.
- Application Failure Runbook — covered.
- Auth Failure Runbook — covered.
- Database Incident Runbook — covered.
- Stripe Incident Runbook — covered.
- Webhook Incident Runbook — covered.
- Third-Party Provider Incident Runbook — covered.
- Security Incident Runbook — covered.
- P0/P1/P2/P3 definitions — covered.
- On-call / Owner Escalation Procedure — covered without false 24/7 claim.
- Customer Impact Classification — covered.
- Incident Evidence Checklist — covered.
- Incident Severity Matrix — covered.
- Incident Escalation Matrix — covered procedurally.
- Customer Communication Procedure — covered; email remains owner-approval gated.
- Internal Incident Log Template — covered.
- Post-Incident Review Template — covered.

## Known unproven runtime items

1. Production database restore timing and correctness have not been proven by a safe DR exercise.
2. PITR activation is not verified.
3. Storage-object backup/recovery is not verified.
4. Secret recovery/rotation has not been exercised end-to-end.
5. Exact alert routing/paging configuration and 24/7 staffing are not claimed.
6. Exact provider log-retention windows were not verified from account configuration.
7. End-to-end measured RTO/RPO remains pending a safe isolated DR exercise.

These do not block documentation completeness because they are explicitly represented as unproven/external/runtime dependencies instead of being mislabeled PASS.

## Closure status

```text
BACKUP_DOCUMENTATION=100%
DR_DOCUMENTATION=100%
BUSINESS_CONTINUITY_DOCUMENTATION=100%
OBSERVABILITY_DOCUMENTATION=100%
INCIDENT_RUNBOOKS=100%
PROVIDER_DEPENDENCY_MATRIX=100%
RTO_RPO_MATRIX=100%
KNOWN_UNPROVEN_RUNTIME_ITEMS_EXPLICITLY_IDENTIFIED=YES
RUNTIME_CHANGED=NO
EMAIL_SENT=NO
PENTEST_TARGET_PRESERVED=YES
```

This score is documentation completeness only. It is not a claim that destructive restore, failover, paging, or third-party assurance has been proven.