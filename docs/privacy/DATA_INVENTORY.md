# EuroComply Data Inventory

Status: production readiness control  
Owner: Privacy Engineering / Security Engineering  
Last reviewed: 2026-06-22

This inventory maps the personal data and tenant-scoped records used by EuroComply enterprise customers. It is the source of truth for GDPR export/delete scope, retention decisions, and customer-facing privacy claims.

## Scope and assumptions

EuroComply is a multi-tenant SaaS application. Customer records are scoped by `organization_id` where possible. User identity records are scoped by authenticated user id and joined to organizations through `organization_members`. Security and billing records may be retained after a delete request when required for legal, tax, fraud-prevention, dispute, or immutable audit-chain reasons.

## Inventory

| Dataset | Primary tables / stores | Personal data | Tenant scope | Purpose | Export | Delete handling | Notes |
|---|---|---|---|---|---|---|---|
| Users | `users`, auth provider profile | email, name/profile metadata, auth id, login metadata | user id; membership through `organization_members` | authentication, account management, support | included as export subject and linked references | anonymize or delete app profile after legal review; auth deletion follows identity-provider runbook | Passwords/secrets are never exported. |
| Organizations | `organizations` | company name, slug, business identifiers if configured | `id` | tenant boundary, subscription owner, workspace metadata | included | anonymize identifying fields when full deletion is approved | Tenant id is preserved where required for audit-chain referential integrity. |
| Organization members | `organization_members` | user id, role, invite/member timestamps | `organization_id` + `user_id` | RBAC, access control, collaboration | included | delete membership rows after safety delay unless legal hold applies | Critical for proving authorization and cross-tenant isolation. |
| Documents | `documents`, storage object metadata | filenames, document titles, uploader/editor references, expiry/status metadata | `organization_id` | compliance document management | included as metadata; binary storage export is handled by storage runbook | delete storage objects and metadata after approval; preserve audit events | Export route returns metadata only unless file export is explicitly enabled. |
| Risks | `risks` | risk owner ids, descriptions that may contain names or business contacts | `organization_id` | risk register and compliance workflow | included | delete after approval unless litigation/legal hold exists | Free-text fields must be treated as personal-data capable. |
| Vendors | `vendors` | vendor contact name/email, notes, risk contacts | `organization_id` | third-party/vendor management | included | delete after approval unless contract/legal retention applies | Vendor legal records may be retained separately. |
| Tasks | `tasks` | assignee ids, task descriptions/comments, due dates | `organization_id` | workflow, remediation, accountability | included | delete after approval; anonymize assignee references when preserving evidence | Free text may contain personal data. |
| Audit events | `audit_events` | actor user id, action, entity ids, sanitized metadata, timestamps, hash chain | `organization_id` | security auditability, compliance evidence, chain-of-custody | included | preserve; never hard-delete from chain | Delete requests append events rather than removing historical chain entries. |
| Notifications | `notifications` | user id, messages, read status | `organization_id` + `user_id` | in-app notifications and workflow updates | included | delete after approval | Messages may contain personal data. |
| Subscriptions | `subscriptions`, Stripe identifiers | customer id, subscription id, plan/status, billing timestamps | `organization_id` | subscription entitlement and billing support | included | preserve within billing/tax retention window | Do not store card PAN/CVV in EuroComply. Stripe is payment processor. |
| Billing metadata | `billing_metadata`, Stripe metadata, invoices in Stripe | billing customer ids, invoice references, company tax details | `organization_id` | invoicing, tax, dispute handling | included where stored locally | preserve within billing/tax retention window; minimize/anonymize non-required metadata | Tax records must not be broken by GDPR deletion. |
| Logs | application/edge logs, `application_logs`, platform logs | user id, organization id, IP/user-agent where captured, event metadata | `organization_id` when available | security, abuse prevention, debugging, availability | included when stored in application DB; platform log export is operational | anonymize or expire by log retention policy | Logs must not contain secrets, passwords, raw tokens, or payment card data. |

## Data classification

- Customer content: documents, risks, vendors, tasks, notification messages.
- Account data: users, organization members, organization metadata.
- Security evidence: audit events, audit logs, step-up token metadata, authorization denials.
- Billing/legal records: subscriptions, Stripe customer/subscription references, invoice/tax metadata.
- Operational telemetry: application logs and platform logs.

## Processor / subprocessor notes

- Supabase stores application data and authentication/session-related records.
- Stripe processes subscriptions and payments. EuroComply must not store card PAN/CVV.
- Hosting, observability, and email providers may process operational logs or notification metadata under the vendor/subprocessor register.

## Export/delete implementation mapping

The organization GDPR export route uses the inventory descriptors in `src/server/privacy/gdpr.ts`. It scopes every table by `organization_id`, `id`, or `user_id`, returns a no-store JSON download, and records an audit event. Delete requests use the same inventory descriptors to build the review plan and explicitly preserve billing/legal and immutable audit-chain records.
