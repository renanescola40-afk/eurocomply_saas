# EuroComply Data Retention Policy

Status: production readiness control  
Owner: Privacy Engineering / Security Engineering  
Last reviewed: 2026-06-22

## Principles

EuroComply retains personal data only for as long as needed for the contracted service, security, legal compliance, billing/tax obligations, dispute handling, and auditability. Deletion workflows must be tenant-scoped, RBAC-gated, step-up protected, audited, and reversible during the safety delay.

## Default retention schedule

| Data class | Examples | Default retention | GDPR delete behavior |
|---|---|---:|---|
| Active customer data | organizations, members, documents, risks, vendors, tasks, notifications | life of contract + 30 days after termination unless a different DPA/order form applies | delete after approved request and safety delay, unless legal hold applies |
| User account profile | app profile, email, auth linkage | life of account + 30 days | delete/anonymize after approved request; preserve security evidence references where required |
| Billing/legal records | subscriptions, invoice references, tax metadata, Stripe customer/subscription references | 7 years, or longer where local law requires | preserve required records; minimize metadata not required for tax/legal defense |
| Audit chain | `audit_events`, hash-chain metadata, security-critical authorization events | 7 years minimum for enterprise tenants | preserve immutable entries; append deletion/anonymization events rather than deleting history |
| Legacy audit logs | `audit_logs` | 2 years unless promoted to legal/security evidence | preserve if linked to security event, legal hold, or audit-chain verification |
| Operational logs | application logs, platform logs, request metadata | 30-90 days depending on severity and environment | expire automatically; anonymize where retained for incident evidence |
| Step-up token records | token hash, nonce, user id, org id, action, timestamps | 90 days, or until security investigation closes | preserve only token hash/metadata; never export raw token |
| Backups | encrypted database and object backups | 30 days rolling unless enterprise contract says otherwise | deleted data ages out of backups through normal rotation; restore requires reapplying deletion ledger |

## Deletion workflow

1. Requester must be authenticated and a current member of the organization.
2. RBAC must allow organization settings management.
3. Step-up authentication for `gdpr_delete` is required and must be single-use where token persistence is enabled.
4. Request body must include the exact confirmation string `DELETE ORGANIZATION DATA`.
5. The API creates a pending review event and a no-store response with a 72-hour safety delay.
6. Privacy/Security reviewer checks legal hold, open invoices, unpaid disputes, audit-chain obligations, and customer contract terms.
7. Approved deletion deletes customer content and memberships, anonymizes organization/log references where needed, and preserves billing/legal/audit-chain records.
8. Completion appends an audit event. Existing audit-chain entries are never removed.

## Export workflow

1. Requester must be authenticated and a current member of the organization.
2. RBAC must allow `export_data`.
3. Step-up authentication for `export_data` is required.
4. Export is tenant-scoped and rejects explicit cross-tenant `organizationId` attempts.
5. Export response is a no-store JSON attachment with `Content-Disposition: attachment`, `X-Content-Type-Options: nosniff`, and no-store cache headers.
6. Export request appends an audit event and sends an in-app notification.

## Legal and billing preservation

GDPR erasure is not absolute where records must be retained for legal claims, financial compliance, tax obligations, fraud prevention, or security auditability. Preserved records must be minimized, access-controlled, and documented in the audit event metadata for the delete request.

## Backup handling

EuroComply does not surgically edit immutable backups. Approved deletions are recorded in the deletion ledger/audit chain and must be replayed after any restore. Backup retention must stay within the published window unless an incident/legal hold extends it.

## Review cadence

Review this policy at least quarterly, when adding a new personal-data table, when changing vendors/processors, or before signing a customer DPA with stricter retention terms.
