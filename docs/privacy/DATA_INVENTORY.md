# EuroComply Data Inventory

Status: production readiness control  
Owner: Privacy Engineering / Security Engineering  
Last reviewed: 2026-07-01

This inventory maps the personal data and tenant-scoped records used by EuroComply enterprise customers. It is the source of truth for GDPR export/delete scope, retention decisions, and customer-facing privacy claims.

## Scope and assumptions

EuroComply is a multi-tenant SaaS application. Customer records are scoped by `organization_id` where possible. User identity records are scoped by authenticated user id and joined to organizations through `organization_members`. Security and billing records may be retained after a delete request when required for legal, tax, fraud-prevention, dispute, or immutable audit-chain reasons.

The runtime export implementation is descriptor-driven in `src/server/privacy/gdpr.ts`. A descriptor may be marked unavailable at export time when an optional table is not deployed in a customer environment; the export response includes that status instead of widening scope or failing open.

Internal Sales Console records are not customer tenant workspace data. They are controlled internal lead operations records and must only be processed by platform-authorized RISCK COMPLY users.

## Inventory

| Dataset | Primary tables / stores | Personal data | Tenant scope | Purpose | Export | Delete handling | Notes |
|---|---|---|---|---|---|---|---|
| Users | `users`, auth provider profile | email, app user id, profile metadata, login metadata | user id; membership through `organization_members` | authentication, account management, support | included as export subject; local `users` row exported when present | anonymize or delete app profile after legal review; auth deletion follows identity-provider runbook | Passwords, MFA factors, recovery codes, raw tokens and secrets are never exported. |
| Organizations | `organizations` | company name, slug, business identifiers if configured | `id` | tenant boundary, subscription owner, workspace metadata | included | anonymize identifying fields when full deletion is approved | Tenant id is preserved where required for audit-chain referential integrity. |
| Organization members | `organization_members` | user id, role, invite/member timestamps | `organization_id` + `user_id` | RBAC, access control, collaboration | included | delete membership rows after safety delay unless legal hold applies | Critical for proving authorization and cross-tenant isolation. |
| Documents | `documents`, storage object metadata | filenames, document titles, uploader/editor references, expiry/status metadata | `organization_id` | compliance document management | included as metadata; binary storage export is handled by storage runbook | delete storage objects and metadata after approval; preserve audit events | Export route returns metadata only unless file export is explicitly enabled. |
| Risks | `risks` | risk owner ids, descriptions that may contain names or business contacts | `organization_id` | risk register and compliance workflow | included | delete after approval unless litigation/legal hold exists | Free-text fields must be treated as personal-data capable. |
| Vendors | `vendors` | vendor contact name/email, notes, risk contacts | `organization_id` | third-party/vendor management | included | delete after approval unless contract/legal retention applies | Vendor legal records may be retained separately. |
| Tasks | `tasks`, `compliance_tasks` | assignee ids, task descriptions/comments, due dates | `organization_id` | workflow, remediation, accountability | included | delete after approval; anonymize assignee references when preserving evidence | Free text may contain personal data. |
| Audit events | `audit_events`, `audit_logs` | actor user id, action, entity ids, sanitized metadata, timestamps, hash chain | `organization_id` | security auditability, compliance evidence, chain-of-custody | included | preserve; never hard-delete from chain | Delete requests append new events rather than removing historical chain entries. |
| Notifications | `notifications` | user id, messages, read status | `organization_id` + `user_id` | in-app notifications and workflow updates | included | delete after approval | Messages may contain personal data. |
| Subscriptions | `subscriptions`, Stripe identifiers | customer id, subscription id, plan/status, billing timestamps | `organization_id` | subscription entitlement and billing support | included | preserve within billing/tax retention window | Sensitive payment instrument data stays with Stripe. |
| Billing metadata | `billing_metadata`, Stripe metadata, invoices in Stripe | billing customer ids, invoice references, company tax details | `organization_id` | invoicing, tax, dispute handling | included where stored locally | preserve within billing/tax retention window; minimize/anonymize non-required metadata | Tax records must not be broken by GDPR deletion. |
| Logs | application/edge logs, `application_logs`, platform logs | user id, organization id, IP/user-agent where captured, event metadata | `organization_id` when available | security, abuse prevention, debugging, availability | included when stored in application DB; platform log export is operational | anonymize or expire by log retention policy | Logs must not contain secrets, passwords, raw tokens, session cookies, MFA codes, or payment instrument data. |
| Sales Console leads | `sales_leads`, `sales_lead_notes`, `sales_lead_activity_events`, optional lead webhook processor | name, work email, role, company, region, company size, free-text message, internal notes, activity actor ids, user agent/IP hint where captured | internal platform scope; not customer tenant scoped | demo follow-up, Early Access qualification, controlled B2B revenue operations | export/delete by verified email subject where applicable; not part of customer organization export by default | review, redact or delete after approved data request unless legal/commercial retention applies; stale leads should be reviewed on a retention schedule | Access is restricted to platform-authorized internal users. Notes must be minimized and must not contain sensitive data unnecessary for demo follow-up. |

## Data classification

- Customer content: documents, risks, vendors, tasks, notification messages.
- Account data: users, organization members, organization metadata.
- Security evidence: audit events, audit logs, step-up token metadata, authorization denials.
- Billing/legal records: subscriptions, Stripe customer/subscription references, invoice/tax metadata.
- Operational telemetry: application logs and platform logs.
- Internal revenue operations data: Sales Console leads, lead notes and lead activity events.

## Processor / subprocessor notes

- Supabase stores application data and authentication/session-related records.
- Stripe processes subscriptions and payments. Sensitive payment instrument data stays with Stripe.
- Hosting, observability, and email providers may process operational logs or notification metadata under the vendor/subprocessor register.
- If `RISCK_COMPLY_LEAD_WEBHOOK_URL` is enabled, the receiving system must be treated as a processor/subprocessor for lead data.

## Export/delete implementation mapping

The organization GDPR export route uses the inventory descriptors in `src/server/privacy/gdpr.ts`. It requires authentication, organization membership, `export_data` RBAC permission, action-scoped step-up verification, tenant scope validation, no-store JSON download headers and a chained audit event.

The GDPR delete-request route requires authentication, organization membership, `manage_settings` RBAC permission, trusted origin, action-scoped step-up verification, literal confirmation text, no-store JSON response and a chained audit event. The route creates a reviewed deletion plan rather than silently hard-deleting records, so billing/legal retention and immutable audit-chain integrity are not broken.

Sales Console lead export/delete handling is email-subject driven and internal-platform scoped. It must not widen customer organization export scope or expose prospect records to tenant users.

## Customer-facing privacy claim guardrail

Customer-facing claims must stay limited to controls actually implemented and evidenced here:

- Supported: tenant-scoped organization export, no-store download, RBAC, step-up, audit events, retention-aware delete request intake.
- Supported internally: platform-restricted Sales Console access, lead activity logging, no-store internal pages, RLS-enabled lead tables.
- Not claimed unless separately implemented: automatic hard deletion of every downstream processor record, payment instrument export, binary document export, or deletion of immutable audit-chain records.
