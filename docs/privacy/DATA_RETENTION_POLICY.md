# EuroComply Data Retention Policy

Status: production readiness control  
Owner: Privacy Engineering / Security Engineering  
Last reviewed: 2026-06-24

## Purpose

This document records the enterprise privacy retention posture used by the GDPR self-service controls. It is an operational control and implementation reference; customer-specific legal retention commitments must still be confirmed against the customer agreement, DPA, tax obligations and legal holds.

## Retention principles

1. Minimize personal data in product records and audit metadata.
2. Keep tenant-scoped customer data exportable through documented descriptors.
3. Delete or anonymize customer-controlled content after approval unless retention duties apply.
4. Preserve billing, tax, legal, fraud-prevention and immutable audit-chain records when deletion would break legal obligations or security evidence.
5. Never store raw passwords, MFA codes, recovery codes, card PAN/CVV, raw authorization headers, session cookies or raw step-up tokens in logs, audit events or exports.

## Retention classes

| Class | Examples | Default handling | GDPR delete-request handling |
| --- | --- | --- | --- |
| Account data | `users`, auth provider profile, membership references | Keep while account or customer relationship is active. | Anonymize/delete local profile after review; coordinate identity-provider deletion separately. |
| Active customer data | organizations, members, documents, risks, vendors, tasks, notifications | Keep while tenant is active and customer needs the service. | Delete or anonymize after manual approval and safety delay unless legal hold applies. |
| Billing and legal records | subscriptions, billing metadata, Stripe customer/subscription references, invoices/tax metadata | Keep for billing support, tax, dispute and contractual obligations. | Preserve for required retention window; minimize non-required metadata where possible. |
| Security evidence / audit chain | `audit_events`, `audit_logs`, authorization denials, step-up metadata | Keep to preserve chain-of-custody, security investigations and compliance evidence. | Preserve; append request/review/completion events instead of deleting historical chain records. |
| Operational logs | `application_logs`, edge/platform logs, rate-limit/security events | Short operational window for debugging, abuse prevention and availability. | Anonymize or expire according to operational log policy; preserve only if security/legal hold applies. |
| Backups | managed provider backups | Provider-managed rotation and restore procedures. | Apply forward deletion/anonymization to live systems; expired backups age out through provider rotation. |

## Dataset handling matrix

| Dataset | Retention class | Export | Delete/anonymize | Preserve reason |
| --- | --- | --- | --- | --- |
| users | account data | subject id/email plus local row when present | anonymize | maintain references needed for audit/security evidence |
| organizations | active customer data | yes | anonymize | tenant id may be needed for audit-chain continuity |
| organization_members | active customer data | yes | delete | remove active access and collaboration state |
| documents | active customer data | metadata yes | delete | audit events remain as historical evidence |
| risks | active customer data | yes | delete | legal hold may override |
| vendors | active customer data | yes | delete | contracts/legal records may be retained separately |
| tasks / compliance_tasks | active customer data | yes | delete | audit events remain as historical evidence |
| notifications | active customer data | yes | delete | operational messages do not need long-term retention |
| subscriptions | billing/legal records | yes | preserve | billing, tax, dispute and contract retention |
| billing_metadata | billing/legal records | yes | preserve | billing, tax, dispute and contract retention |
| audit_events / audit_logs | security evidence | yes | preserve | immutable audit-chain integrity |
| logs | operational logs | where stored locally | anonymize/expire | debugging, abuse prevention and security investigation windows |

## Workflow controls

- Organization privacy export requires authentication, organization membership, `export_data` RBAC permission, plan entitlement, action-scoped step-up verification, tenant-scope validation and no-store response headers.
- Organization privacy delete-request requires authentication, organization membership, `manage_settings` RBAC permission, trusted origin, plan entitlement, action-scoped step-up verification, literal confirmation and a 72-hour safety delay before manual completion.
- GDPR actions record audit events and include sanitized request context. Audit event metadata must never include raw tokens, secrets, cookies, passwords or MFA codes.
- Delete requests do not break audit-chain continuity. Historical audit rows are preserved and new events are appended for request, review and completion decisions.

## Review cadence

Review this document when data models, providers, billing flows, audit-chain behavior, customer contract terms or customer-facing privacy claims change. Evidence belongs in `docs/security/evidence/runtime/gdpr-privacy-validation.json`.
