# Backup and recovery

Status: enterprise backup and recovery overview. This document distinguishes planned/expected provider capabilities from completed EuroComply restore evidence.

## Current position

EuroComply uses managed providers for application hosting, database, storage, billing, and operational services. Backup and recovery capabilities therefore depend on the configured provider plan, region, and retention settings. A backup restore test plan exists, but a formal restore exercise has not yet been completed and signed off.

Related plan: `docs/trust/BACKUP_RESTORE_TEST_PLAN.md`.

## In-scope data

| Data store | Data categories | Recovery dependency |
| --- | --- | --- |
| Supabase Postgres | Organizations, memberships, documents metadata, vendors, risks, tasks, subscriptions, audit events. | Supabase backup/restore configuration and tested restore procedure. |
| Supabase Storage | Controlled customer documents where enabled. | Storage bucket configuration, object retention, and restore procedure. |
| Hosting provider | Build artifacts, deployment settings, environment variables. | Vercel/GitHub deployment history and secret store controls. |
| Stripe | Billing customer, subscription, payment events. | Stripe records and webhook replay/reconciliation procedures. |
| GitHub | Source code, migrations, workflow evidence. | Repository controls and branch protection/backup practices. |

## Recovery objectives

No contractual RTO or RPO is currently claimed. Any RTO/RPO must be set in a signed customer agreement after a restore exercise is completed and provider capabilities are confirmed.

## Required evidence before stronger claims

1. Provider backup settings captured with sensitive values redacted.
2. Restore exercise executed in an isolated environment.
3. Database records, document metadata, storage references, and audit events validated after restore.
4. Recovery time and recovery point recorded.
5. Incident and rollback owners assigned.
6. Findings documented and remediated or accepted.
7. Release evidence checklist updated with the restore report.

## Customer-safe answer

Use: "EuroComply has a documented backup restore test plan and is designed to rely on managed provider backup capabilities. Formal restore testing has not yet been completed, so contractual RTO/RPO values must be agreed only after evidence is available."

Do not use: "tested backups", "guaranteed restore", "zero data loss", "disaster recovery tested", or "enterprise RTO/RPO committed" unless the completed evidence exists.
