# Data retention policy draft

Status: draft. Requires product, legal, and operations review before external publication.

## Purpose

Define how long EuroComply retains customer data, operational logs, audit events, billing metadata, and backups.

## Draft retention schedule

| Data category | Draft retention period | Deletion trigger | Evidence required |
| --- | --- | --- | --- |
| Active customer workspace data | Duration of active subscription | Customer deletion request or contract termination | Deletion job logs / support ticket |
| Uploaded compliance documents | Duration of active subscription unless deleted by customer | Customer deletion or contract termination | Storage delete event and audit event |
| Audit events | Minimum 12 months draft target | End of retention period or legal request | Audit retention job evidence |
| Billing metadata | As required for tax/accounting/legal obligations | Legal retention expiry | Stripe/accounting evidence |
| Application logs | 30-90 days draft target | Log retention expiry | Provider retention settings |
| Backups | Provider-specific backup retention | Backup expiry schedule | Provider backup settings and restore test |
| Support communications | Duration needed to resolve issue plus legal retention | Ticket closure and retention expiry | Support system retention policy |

## Deletion principles

- Customers should be able to request deletion of organization data, subject to legal retention obligations.
- Deletion should create an audit event where feasible.
- Backups may retain deleted data until backup expiry.
- Support and billing records may be retained where required by law.

## Implementation requirements

Before claiming this policy externally, EuroComply must verify:

1. Database deletion path for organizations, users, and documents.
2. Storage deletion path for uploaded files.
3. Audit-event retention and export behavior.
4. Provider backup retention windows.
5. Restore behavior for deleted data in backups.
6. Customer-facing deletion request workflow.

## Customer-safe answer while draft

EuroComply maintains a draft retention policy and is implementing evidence-backed deletion and retention procedures. Formal contractual retention commitments require final legal and operational approval.
