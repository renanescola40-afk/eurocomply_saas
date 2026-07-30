# Risck Comply Data Processing Overview

Status: production readiness control  
Owner: Privacy Engineering / Security Engineering  
Last reviewed: 2026-07-30

## Purpose

This overview explains the implementation-grounded data-processing posture of Risck Comply. It supports the Privacy Policy and DPA review drafts but is not a final legal policy or signed contractual commitment.

Only controls evidenced in code, configuration or runtime artifacts should be used in product or sales claims.

## Processing model

Risck Comply operates as a multi-tenant SaaS platform. Most product records are scoped to an `organization_id`. A user gains access through organisation membership, and privacy operations must resolve the active organisation before reading or planning changes to customer records.

Role allocation depends on the activity:

- Risck Comply is expected to act as controller for its own website, account, commercial, billing, support and security processing, subject to counsel confirmation.
- Customer generally acts as controller for personal data uploaded to its workspace and Risck Comply acts as processor under the DPA, subject to the final agreement.

## Processing purposes

| Purpose | Data categories | Role/legal-basis owner | System handling |
|---|---|---|---|
| Account access and authentication | user id, email, auth/session metadata | Founder facts and counsel review | authenticated context; no raw credentials exported |
| Tenant administration | organisations, members and roles | customer/controller and service administration | tenant-scoped records, RBAC and audit events |
| Compliance workflow | documents, risks, vendors, tasks and notifications | customer/controller | tenant-scoped CRUD and export descriptors |
| Billing and entitlement | subscriptions and billing metadata | Risck Comply controller role; counsel review | billing/tax/dispute retention; payment instruments remain with provider |
| Security and evidence | audit events, denials and step-up metadata | Risck Comply security/legal review | sanitised and integrity-protected records where implemented |
| Operations and abuse prevention | logs and rate-limit metadata | Risck Comply legitimate-interest/legal review | limited retention; secrets and payment instruments excluded |
| Optional analytics | consented usage events | Founder facts and counsel review | enabled only where configured and legally appropriate |

## Export control summary

The GDPR export flow is implemented at `src/app/api/gdpr/export/route.ts` and uses descriptors in `src/server/privacy/gdpr.ts`.

Controls:

- authenticated user required;
- active organisation required;
- optional requested organisation identifier must match the active organisation;
- `export_data` RBAC permission required;
- GDPR self-service entitlement required;
- `export_data` step-up token required;
- no-store download headers;
- sanitised `gdpr_export_requested` or `gdpr_export_denied` audit events.

## Delete-request control summary

The GDPR delete-request flow is implemented at `src/app/api/gdpr/delete-request/route.ts`.

Controls:

- trusted origin and authenticated user required;
- active organisation and `manage_settings` permission required;
- GDPR self-service entitlement and `gdpr_delete` step-up token required;
- literal destructive-action confirmation required;
- no-store response;
- retention-aware pending review plan;
- sanitised requested/denied audit events.

## Retention-aware deletion posture

Delete requests are intake-and-review operations, not silent destructive jobs. Eligible customer content can be deleted or anonymised after review. Billing, tax, disputes, legal holds, fraud prevention, provider backup cycles and audit-chain integrity may justify limited retention where lawful. Retention periods remain `FOUNDER_FACT_REQUIRED` and require privacy counsel approval.

## Provider boundaries

Candidate providers include hosting/deployment, Supabase database/auth/storage, Stripe billing, optional observability/analytics, email, support and optional AI services. The actual production list, legal entities, regions, DPAs, transfers and retention must be confirmed in the subprocessor register.

## Claims allowed when evidence is current

- tenant-scoped organisation GDPR export;
- RBAC and step-up protection for privacy actions;
- no-store privacy downloads/responses;
- audit events for export and deletion-request operations;
- retention-aware deletion-request intake.

Do not claim without additional evidence and approval:

- automatic deletion from every downstream processor;
- export of raw payment instruments, passwords, session cookies, MFA factors or step-up tokens;
- automatic binary document export;
- hard deletion of lawfully retained immutable audit-chain records;
- GDPR compliance certification or guaranteed compliance.

## Legal-pack references

- `docs/legal-review-preparation/legal-pack/PRIVACY_POLICY_REVIEW_DRAFT.md`
- `docs/legal-review-preparation/legal-pack/DATA_PROCESSING_ADDENDUM_REVIEW_DRAFT.md`
- `docs/legal-review-preparation/legal-pack/SUBPROCESSOR_REGISTER_REVIEW_DRAFT.md`
- `docs/legal-review-preparation/FOUNDER_FACTS_TEMPLATE.json`
